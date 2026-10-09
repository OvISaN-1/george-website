//! TIKI-TAKA: pass, pass, pass, shoot.
//!
//! The whole game lives in this Rust file and is compiled to WebAssembly
//! (see build.sh). The web page (quiz-zone/tiki-taka/tiki-taka.js) only draws
//! the picture and passes the player's finger or mouse to this engine.
//!
//! How it plays
//! * A timed match against a team: score as many goals as you can in three
//!   minutes. You only attack. Each attack ends in a goal, a save, a miss, a
//!   block, or the defenders winning the ball (then a fresh attack starts,
//!   and you lose a couple of seconds).
//! * Drag to pass: the direction is the way you drag, and how far you drag is
//!   how far the ball goes. A pass that points at a team-mate is nudged onto him.
//!   Three kinds: ground, lob (over the defenders) and through-ball (to a runner).
//!   The pass line shows green (safe), amber (risky) or red (a defender is in it).
//! * Shooting takes skill: hold to charge the power, let go in the green zone,
//!   and aim by sliding across the goal.
//! * Defenders press the ball, mark your players and cut off passing lanes.
//!   The goalkeeper tracks the ball and dives for shots, super shots included.
//!
//! The pitch: 680 wide, 800 tall. Our goal is at the top (y = 0), the
//! attackers start at the bottom and play up the pitch.
//!
//! The engine hands the page everything it needs to draw in one flat list of
//! numbers (see the IDX_* and PLAYER_* constants), plus a list of events
//! (kick, goal, save...) for sounds and effects.

use std::f32::consts::PI;

// ---------------------------------------------------------------- pitch
pub const W: f32 = 680.0;
pub const H: f32 = 800.0;
pub const GOAL_L: f32 = 265.0;
pub const GOAL_R: f32 = 415.0;
pub const GOAL_C: f32 = 340.0;
const POST_R: f32 = 5.0;

// ---------------------------------------------------------------- tuning
const PLAYER_R: f32 = 14.0;
const BALL_R: f32 = 7.0;
/// How quickly a rolling ball slows down (units per second per second).
const FRICTION: f32 = 420.0;
const MIN_PASS: f32 = 45.0;
pub const MAX_PASS: f32 = 560.0;
/// A pass aimed within this angle of a team-mate is nudged onto him (cos 19 degrees).
const ASSIST_COS: f32 = 0.9455;
const ATT_SPEED: f32 = 150.0;
const SHOT_SPEED: f32 = 720.0;
const PICK_R: f32 = PLAYER_R + BALL_R + 6.0;
const MAX_RECEIVE: f32 = 640.0;
const TACKLE_R: f32 = 23.0;
const TACKLE_TIME: f32 = 0.42;
const KEEPER_R: f32 = 27.0;
const STEP: f32 = 1.0 / 60.0;
/// A match is this many seconds of play.
pub const MATCH_SECS: f32 = 180.0;
/// Losing the ball costs this much of the match clock.
const TURNOVER_COST: f32 = 2.5;
/// Pass kinds
pub const PK_GROUND: u8 = 0;
pub const PK_LOB: u8 = 1;
pub const PK_THROUGH: u8 = 2;
/// Shot charge: seconds to go from nothing to full power, and the sweet spot.
const CHARGE_SECS: f32 = 0.9;
const SWEET: f32 = 0.80;
const SWEET_HALF: f32 = 0.10;
/// Real seconds of slow motion while charging a shot.
const SHOT_SLOW_BUDGET: f32 = 1.6;
/// While you line up a pass, the game runs at this fraction of normal speed...
const SLOW_FACTOR: f32 = 0.08;
/// ...for up to this many real seconds each time you get the ball.
pub const SLOW_BUDGET: f32 = 1.2;

// ---------------------------------------------------------------- results
pub const R_NONE: u8 = 0;
pub const R_GOAL: u8 = 1;
pub const R_SAVED: u8 = 2;
pub const R_MISS: u8 = 3;
pub const R_BLOCKED: u8 = 4;
pub const R_TACKLED: u8 = 5;
pub const R_POST: u8 = 6;
pub const R_OUT: u8 = 7;

// ---------------------------------------------------------------- events (for sounds and effects)
pub const E_KICK: u8 = 1;
pub const E_PASS: u8 = 2; // a team-mate received the ball
pub const E_SHOT: u8 = 3;
pub const E_TACKLE: u8 = 4;
pub const E_SAVE: u8 = 5;
pub const E_POST: u8 = 6;
pub const E_GOAL: u8 = 7;
pub const E_MISS: u8 = 8;
pub const E_BLOCK: u8 = 9;
pub const E_START: u8 = 11;
pub const E_OVER: u8 = 12;
pub const E_SUPER: u8 = 13;
pub const E_FREEZE: u8 = 14;
pub const E_METER_FULL: u8 = 15;

// ---------------------------------------------------------------- phases
pub const PH_MENU: u8 = 0;
pub const PH_PLAY: u8 = 1;
pub const PH_RESULT: u8 = 2;
pub const PH_OVER: u8 = 3;
pub const PH_CINE: u8 = 4; // the slow-motion cinematic before a super skill

pub const SK_ROCKET: u8 = 0; // super shot
pub const SK_FREEZE: u8 = 1; // time stop

// ---------------------------------------------------------------- the list of numbers handed to the page
pub const IDX_PHASE: usize = 0;
pub const IDX_SCORE: usize = 1;
pub const IDX_MATCH_T: usize = 2;   // seconds of the match left
pub const IDX_ATTACK_NO: usize = 3;
pub const IDX_CHAIN: usize = 4;
pub const IDX_RESULT: usize = 5;
pub const IDX_PHASE_T: usize = 6;
pub const IDX_TIME: usize = 7;
pub const IDX_GOALS: usize = 8;
pub const IDX_OWNER: usize = 9;
pub const IDX_N_ATT: usize = 10;
pub const IDX_N_DEF: usize = 11;
pub const IDX_AIM_ACTIVE: usize = 12;
pub const IDX_AIM_LEN: usize = 13;
pub const IDX_AIM_DX: usize = 14;
pub const IDX_AIM_DY: usize = 15;
pub const IDX_AIM_TARGET: usize = 16;
pub const IDX_AIM_END_X: usize = 17;
pub const IDX_AIM_END_Y: usize = 18;
pub const IDX_INTRO: usize = 19;
pub const IDX_SHIELD: usize = 20;
pub const IDX_SHOT_LIVE: usize = 21;
pub const IDX_BEST_CHAIN: usize = 22;
pub const IDX_PASSES: usize = 23;
pub const IDX_PRESSURE: usize = 24;
pub const IDX_BALL_X: usize = 25;
pub const IDX_BALL_Y: usize = 26;
pub const IDX_BALL_VX: usize = 27;
pub const IDX_BALL_VY: usize = 28;
pub const IDX_RECEIVER: usize = 29;
pub const IDX_CAN_SHOOT: usize = 30;
pub const IDX_LAST_BONUS: usize = 31;
pub const IDX_LEVEL: usize = 32;
pub const IDX_METER: usize = 33;
pub const IDX_FREEZE: usize = 34;
pub const IDX_CINE_T: usize = 35;
pub const IDX_SKILL: usize = 36;
pub const IDX_CINE_KIND: usize = 37;
pub const IDX_SUPER_SHOT: usize = 38;
pub const IDX_SLOW_LEFT: usize = 39;
pub const IDX_AIM_SAFE: usize = 40;      // 0 clear, 1 risky, 2 a defender is in the way
pub const IDX_AIM_KIND: usize = 41;
pub const IDX_PASS_KIND: usize = 42;     // the kind chosen for the next pass
pub const IDX_BALL_Z: usize = 43;        // height of a lobbed ball
pub const IDX_SHOT_MODE: usize = 44;     // 1 while a shot is being charged
pub const IDX_POWER: usize = 45;         // the charge needle, 0 to 1
pub const IDX_SHOT_X: usize = 46;        // where along the goal the shot is aimed
pub const IDX_SHOT_SLOW: usize = 47;     // slow motion left while charging
pub const IDX_TEAM: usize = 48;
pub const IDX_LOB_FRAC: usize = 49;      // how far through a lob the ball is
pub const IDX_SHOTS: usize = 50;
pub const IDX_SAVES: usize = 51;
pub const IDX_TURNOVERS: usize = 52;
pub const IDX_TIME_UP: usize = 53;
pub const IDX_LOB_EX: usize = 54;
pub const IDX_LOB_EY: usize = 55;
/// Players start here, PLAYER_STRIDE numbers each: x, y, vx, vy, facing, kind (0 attacker, 1 defender, 2 keeper), number, pressure/tackle, open (0 none, 1 clear, 2 risky, 3 blocked), spare
pub const PLAYER_BASE: usize = 60;
pub const PLAYER_STRIDE: usize = 10;
pub const MAX_PLAYERS: usize = 14;
pub const OUT_LEN: usize = PLAYER_BASE + MAX_PLAYERS * PLAYER_STRIDE;

// ================================================================ small helpers
struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }
    /// 0 to 1
    fn f(&mut self) -> f32 { ((self.next() >> 40) as f32) / 16_777_216.0 }
    fn range(&mut self, a: f32, b: f32) -> f32 { a + (b - a) * self.f() }
    /// roughly a bell curve with spread 1
    fn gauss(&mut self) -> f32 { (self.f() + self.f() + self.f() - 1.5) * 2.0 }
}

fn hyp(x: f32, y: f32) -> f32 { (x * x + y * y).sqrt() }
fn dist(ax: f32, ay: f32, bx: f32, by: f32) -> f32 { hyp(ax - bx, ay - by) }
fn clamp(v: f32, a: f32, b: f32) -> f32 { v.max(a).min(b) }

/// Distance from point (px, py) to the line segment a-b.
fn seg_dist(px: f32, py: f32, ax: f32, ay: f32, bx: f32, by: f32) -> f32 {
    let (dx, dy) = (bx - ax, by - ay);
    let l2 = dx * dx + dy * dy;
    if l2 < 1e-6 { return dist(px, py, ax, ay); }
    let t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0.0, 1.0);
    dist(px, py, ax + dx * t, ay + dy * t)
}

#[derive(Clone, Copy, Default)]
struct Pl {
    x: f32, y: f32, vx: f32, vy: f32, face: f32,
    tx: f32, ty: f32,
    think: f32,
    tackle: f32,
}

impl Pl {
    fn at(x: f32, y: f32) -> Pl { Pl { x, y, tx: x, ty: y, face: -PI / 2.0, ..Default::default() } }
    /// Run towards (tx, ty) at up to `speed`, with a little acceleration.
    fn run(&mut self, tx: f32, ty: f32, speed: f32, dt: f32) {
        let (dx, dy) = (tx - self.x, ty - self.y);
        let d = hyp(dx, dy);
        let (wx, wy) = if d > 3.0 { (dx / d * speed.min(d / dt.max(1e-3) * 0.9 + 20.0), dy / d * speed.min(d / dt.max(1e-3) * 0.9 + 20.0)) } else { (0.0, 0.0) };
        let k = (dt * 9.0).min(1.0);
        self.vx += (wx - self.vx) * k;
        self.vy += (wy - self.vy) * k;
        self.x = clamp(self.x + self.vx * dt, 14.0, W - 14.0);
        self.y = clamp(self.y + self.vy * dt, 20.0, H - 14.0);
        if hyp(self.vx, self.vy) > 12.0 { self.face = self.vy.atan2(self.vx); }
    }
}

/// Upgrades the player has bought (each 0 to 10).
#[derive(Clone, Copy, Default)]
pub struct Stats { pub speed: f32, pub power: f32, pub technique: f32, pub composure: f32 }
impl Stats { fn total(&self) -> f32 { self.speed + self.power + self.technique + self.composure } }

/// The teams you can play, easiest first.
#[derive(Clone, Copy)]
pub struct Team { pub n_def: usize, pub speed: f32, pub tackle: f32, pub line: f32, pub chase: f32, pub keeper: f32, pub react: f32, pub read: f32 }
pub const TEAMS: [Team; 6] = [
    Team { n_def: 3, speed: 58.0, tackle: 1.45, line: 1.0, chase: 0.95, keeper: 0.9, react: 0.32, read: 0.20 },   // Sunday Starters: slow and friendly
    Team { n_def: 3, speed: 68.0, tackle: 1.25, line: 1.0, chase: 1.0, keeper: 1.0, react: 0.26, read: 0.30 },    // Park Rovers
    Team { n_def: 4, speed: 80.0, tackle: 0.95, line: 1.15, chase: 1.22, keeper: 1.05, react: 0.20, read: 0.40 },  // Red Lane United: press high
    Team { n_def: 5, speed: 70.0, tackle: 1.1, line: 0.62, chase: 0.95, keeper: 1.1, react: 0.18, read: 0.40 },   // Stonewall FC: park the bus
    Team { n_def: 4, speed: 92.0, tackle: 1.0, line: 1.0, chase: 1.05, keeper: 1.05, react: 0.18, read: 0.40 },   // Quickfoot City: fast
    Team { n_def: 5, speed: 86.0, tackle: 0.95, line: 1.1, chase: 1.1, keeper: 1.25, react: 0.11, read: 0.60 },   // Galaxy Giants: all round
];

// ================================================================ the game
pub struct Game {
    team: usize,
    match_t: f32,
    time_up: bool,
    pass_kind: u8,
    // a lobbed ball in the air
    lob_on: bool, lob_t: f32, lob_dur: f32, lob_sx: f32, lob_sy: f32, lob_ex: f32, lob_ey: f32, lob_h: f32,
    // charging a shot
    shot_mode: bool, shot_charge_t: f32, shot_x: f32, shot_slow: f32,
    shots: u32, saves_n: u32, turnovers: u32,
    gk_lean: f32,
    shot_auto: bool, aim_noise: f32,
    through_on: bool,
    sup_keeper: f32,
    stats: Stats,
    skill: u8,
    meter: f32,
    cine_t: f32,
    cine_kind: u8,
    freeze_t: f32,
    shot_super: bool,
    /// Real seconds of slow motion left while lining up the current pass.
    slow_left: f32,
    rng: Rng,
    att: Vec<Pl>,
    def: Vec<Pl>,
    gk: Pl,
    gk_react: f32,

    bx: f32, by: f32, bvx: f32, bvy: f32,
    owner: i32,
    passer: i32,
    nopick: f32,
    receiver: i32,
    shot_live: bool,
    shot_from: f32,

    shield: f32,
    intro: f32,

    phase: u8,
    phase_t: f32,
    score: u32,
    attacks_left: u32,
    attack_no: u32,
    chain: u32,
    best_chain: u32,
    goals: u32,
    passes_total: u32,
    result: u8,
    last_bonus: u32,

    aim_active: bool,
    aim_dx: f32, aim_dy: f32,

    acc: f32,
    time: f32,
    events: Vec<u8>,
    out: Vec<f32>,
}

/// (len, direction x, direction y, snapped team-mate or -1, end x, end y)
struct Aim { len: f32, dx: f32, dy: f32, target: i32, ex: f32, ey: f32, kind: u8, safe: u8 }

impl Game {
    pub fn new(seed: u32) -> Game { Game::with(seed, Stats::default(), SK_ROCKET) }

    pub fn with(seed: u32, stats: Stats, skill: u8) -> Game { Game::versus(seed, stats, skill, 1) }

    pub fn versus(seed: u32, stats: Stats, skill: u8, team: usize) -> Game {
        let mut g = Game {
            team: team.min(TEAMS.len() - 1), match_t: MATCH_SECS, time_up: false, pass_kind: PK_GROUND,
            lob_on: false, lob_t: 0.0, lob_dur: 1.0, lob_sx: 0.0, lob_sy: 0.0, lob_ex: 0.0, lob_ey: 0.0, lob_h: 0.0,
            shot_mode: false, shot_charge_t: 0.0, shot_x: GOAL_C, shot_slow: SHOT_SLOW_BUDGET,
            gk_lean: 0.0, shot_auto: false, aim_noise: 0.0, shots: 0, saves_n: 0, turnovers: 0, through_on: false, sup_keeper: 1.0,
            stats, skill, meter: 0.0, cine_t: 0.0, cine_kind: 0, freeze_t: 0.0, shot_super: false, slow_left: SLOW_BUDGET,
            rng: Rng(0x9E37_79B9_7F4A_7C15 ^ ((seed as u64) << 17) ^ (seed as u64) | 1),
            att: Vec::new(), def: Vec::new(), gk: Pl::at(GOAL_C, 16.0), gk_react: 0.0,
            bx: 0.0, by: 0.0, bvx: 0.0, bvy: 0.0, owner: -1, passer: -1, nopick: 0.0, receiver: -1,
            shot_live: false, shot_from: 0.0,
            shield: 0.0, intro: 0.0,
            phase: PH_PLAY, phase_t: 0.0,
            score: 0, attacks_left: 0, attack_no: 1, chain: 0, best_chain: 0, goals: 0, passes_total: 0,
            result: R_NONE, last_bonus: 0,
            aim_active: false, aim_dx: 0.0, aim_dy: 0.0,
            acc: 0.0, time: 0.0, events: Vec::new(), out: vec![0.0; OUT_LEN],
        };
        g.setup_attack();
        g.export();
        g
    }

    fn level(&self) -> f32 { 1.0 + self.team as f32 * 0.6 }
    fn t(&self) -> Team { TEAMS[self.team] }
    fn max_pass(&self) -> f32 { MAX_PASS + 6.0 * self.stats.power }
    fn assist_cos(&self) -> f32 { ASSIST_COS - 0.006 * self.stats.technique }
    fn att_speed(&self) -> f32 { ATT_SPEED * (1.0 + 0.04 * self.stats.speed) }
    fn tackle_time(&self) -> f32 { (TACKLE_TIME + 0.02 * self.stats.composure) * self.t().tackle }

    /// Put everybody in place for the next attack. Each one is a bit harder.
    fn setup_attack(&mut self) {
        let lvl = self.level();
        self.att.clear();
        self.def.clear();
        // attackers: two midfielders, two wingers, and the striker (George)
        for &(x, y) in &[(300.0, 650.0), (390.0, 660.0), (120.0, 540.0), (560.0, 540.0), (340.0, 450.0)] {
            self.att.push(Pl::at(x, y));
        }
        // defenders: how many, and how high up the pitch they stand, depends on the team
        let tm = self.t();
        let spots = [(340.0, 330.0), (200.0, 360.0), (480.0, 360.0), (120.0, 300.0), (560.0, 300.0)];
        for i in 0..tm.n_def.min(spots.len()) {
            let (x, y) = spots[i];
            // the first three stand where the team's style puts them; the wide ones always keep back
            let line = if i < 3 { tm.line } else { tm.line.min(0.85) };
            self.def.push(Pl::at(x + self.rng.range(-12.0, 12.0), (y * line + self.rng.range(-12.0, 12.0)).max(150.0)));
        }
        self.gk = Pl::at(GOAL_C, 16.0);
        self.gk_react = 0.0;
        self.owner = 0;
        self.passer = -1;
        self.nopick = 0.0;
        self.receiver = -1;
        self.shot_live = false;
        self.shot_super = false;
        self.slow_left = SLOW_BUDGET;
        self.freeze_t = 0.0;
        self.chain = 0;
        self.result = R_NONE;
        self.last_bonus = 0;
        self.aim_active = false;
        self.shield = 0.6;
        self.intro = (1.6 - (lvl - 1.0) * 0.2).max(0.9);
        self.lob_on = false;
        self.through_on = false;
        self.shot_mode = false;
        self.pass_kind = PK_GROUND;
        self.bvx = 0.0;
        self.bvy = 0.0;
        self.sync_ball_to_owner();
        self.events.push(E_START);
    }

    fn sync_ball_to_owner(&mut self) {
        if self.owner >= 0 {
            let o = self.att[self.owner as usize];
            self.bx = o.x;
            self.by = o.y - 13.0;
        }
    }

    // ------------------------------------------------------------ input from the page
    /// Start a pass drag. (Only if somebody has the ball.)
    pub fn aim_begin(&mut self) {
        if self.phase == PH_PLAY && self.owner >= 0 && !self.shot_mode {
            self.aim_active = true;
            self.aim_dx = 0.0;
            self.aim_dy = 0.0;
        }
    }
    /// The drag so far, as the distance and direction the player wants the ball to go.
    pub fn aim_update(&mut self, dx: f32, dy: f32) {
        if self.aim_active { self.aim_dx = dx; self.aim_dy = dy; }
    }
    pub fn aim_cancel(&mut self) { self.aim_active = false; }
    /// Let go: pass. Returns true if a pass was made.
    pub fn aim_release(&mut self) -> bool {
        if !self.aim_active { return false; }
        self.aim_active = false;
        if self.phase != PH_PLAY || self.owner < 0 { return false; }
        let a = self.compute_aim();
        if a.len < MIN_PASS { return false; }
        self.pass(a);
        true
    }

    pub fn set_pass_kind(&mut self, k: u8) { self.pass_kind = if k <= PK_THROUGH { k } else { PK_GROUND }; }

    /// How risky is a pass from (ax, ay) to (bx, by)? 0 clear, 1 risky, 2 a defender is in the way.
    fn lane_safety(&self, ax: f32, ay: f32, bx: f32, by: f32, kind: u8) -> u8 {
        let mut m = f32::MAX;
        if kind == PK_LOB { for d in &self.def { m = m.min(dist(d.x, d.y, bx, by)); } return if m > 48.0 { 0 } else if m > 32.0 { 1 } else { 2 }; }
        for d in &self.def { m = m.min(seg_dist(d.x, d.y, ax, ay, bx, by)); }
        if m > 44.0 { 0 } else if m > 29.0 { 1 } else { 2 }
    }

    /// Work out where a drag would send the ball, nudging it onto a team-mate if it is aimed at one.
    fn compute_aim(&self) -> Aim {
        let o = self.att[self.owner.max(0) as usize];
        let kind = self.pass_kind;
        let raw = hyp(self.aim_dx, self.aim_dy);
        if raw < 1.0 { return Aim { len: 0.0, dx: 0.0, dy: -1.0, target: -1, ex: o.x, ey: o.y, kind, safe: 0 }; }
        let (dx, dy) = (self.aim_dx / raw, self.aim_dy / raw);
        let maxp = if kind == PK_LOB { self.max_pass().min(520.0) } else { self.max_pass() };
        let mut len = clamp(raw, 0.0, maxp);
        let mut target = -1;
        let mut best = f32::MAX;
        for (j, t) in self.att.iter().enumerate() {
            if j as i32 == self.owner { continue; }
            let (vx, vy) = (t.x - o.x, t.y - o.y);
            let d = hyp(vx, vy);
            if d < 25.0 { continue; }
            let cos = (vx * dx + vy * dy) / d;
            if cos < self.assist_cos() { continue; }
            if (d - len).abs() > 0.45 * len + 30.0 { continue; }
            let score = (1.0 - cos) * 10.0 + (d - len).abs() / len.max(60.0);
            if score < best { best = score; target = j as i32; }
        }
        let (mut ex, mut ey) = (o.x + dx * len, o.y + dy * len);
        let (mut ddx, mut ddy) = (dx, dy);
        if target >= 0 {
            let t = self.att[target as usize];
            let (px, py, extra) = match kind {
                // a through-ball goes ahead of the runner, towards goal
                PK_THROUGH => {
                    let (gx, gy) = (GOAL_C - t.x, -t.y);
                    let gl = hyp(gx, gy).max(1.0);
                    (clamp(t.x + t.vx * 0.5 + gx / gl * 85.0, 30.0, W - 30.0), clamp(t.y + t.vy * 0.5 + gy / gl * 85.0, 60.0, H - 40.0), 0.0)
                }
                // a lob drops onto the team-mate
                PK_LOB => (t.x + t.vx * 0.55, t.y + t.vy * 0.55, 0.0),
                // a ground pass arrives at his feet
                _ => (t.x + t.vx * 0.3, t.y + t.vy * 0.3, 16.0),
            };
            let d = dist(o.x, o.y, px, py).max(1.0);
            ddx = (px - o.x) / d;
            ddy = (py - o.y) / d;
            len = clamp(d + extra, MIN_PASS, maxp);
            ex = o.x + ddx * len;
            ey = o.y + ddy * len;
        }
        if kind == PK_LOB {
            ex = clamp(ex, 24.0, W - 24.0);
            ey = clamp(ey, 50.0, H - 24.0);
            len = dist(o.x, o.y, ex, ey).max(MIN_PASS);
            ddx = (ex - o.x) / len;
            ddy = (ey - o.y) / len;
        }
        let safe = self.lane_safety(o.x, o.y, ex, ey, kind);
        Aim { len, dx: ddx, dy: ddy, target, ex, ey, kind, safe }
    }

    fn pass(&mut self, a: Aim) {
        let o = self.owner as usize;
        self.sync_ball_to_owner();
        self.passer = self.owner;
        self.owner = -1;
        self.nopick = 0.35;
        self.shot_live = false;
        self.through_on = a.kind == PK_THROUGH && a.target >= 0;
        self.pass_kind = PK_GROUND;           // each pass starts as a ground pass again
        let (sx, sy) = (self.bx, self.by);
        if a.kind == PK_LOB {
            // up in the air: it can not be cut out until it lands, but it is less exact
            let scatter = (5.0 + 0.03 * a.len) * (1.0 - 0.05 * self.stats.technique);
            let ex = clamp(a.ex + self.rng.gauss() * scatter, 24.0, W - 24.0);
            let ey = clamp(a.ey + self.rng.gauss() * scatter, 40.0, H - 24.0);
            self.lob_on = true; self.lob_t = 0.0;
            self.lob_dur = 0.5 + a.len / 640.0;
            self.lob_sx = sx; self.lob_sy = sy; self.lob_ex = ex; self.lob_ey = ey;
            self.lob_h = 26.0 + a.len * 0.16;
            self.bvx = (ex - sx) / self.lob_dur;
            self.bvy = (ey - sy) / self.lob_dur;
            self.receiver = if a.target >= 0 { a.target } else {
                let mut best = (-1, 190.0);
                for (j, t) in self.att.iter().enumerate() {
                    if j == o { continue; }
                    let d = dist(t.x, t.y, ex, ey);
                    if d < best.1 { best = (j as i32, d); }
                }
                best.0
            };
            self.events.push(E_KICK);
            return;
        }
        // choose a speed so the ball rolls to a stop about `len` away
        let v0 = (2.0 * FRICTION * a.len).sqrt();
        self.bvx = a.dx * v0;
        self.bvy = a.dy * v0;
        // who goes to collect it: the snapped team-mate, or whoever is nearest where it will stop
        self.receiver = if a.target >= 0 { a.target } else {
            let (ex, ey) = (self.att[o].x + a.dx * a.len, self.att[o].y + a.dy * a.len);
            let mut best = (-1, 190.0);
            for (j, t) in self.att.iter().enumerate() {
                if j == o { continue; }
                let d = dist(t.x, t.y, ex, ey);
                if d < best.1 { best = (j as i32, d); }
            }
            best.0
        };
        self.events.push(E_KICK);
    }

    /// Shoot at once with a perfectly timed charge. `tx` is where along the goal to aim, or NaN for a corner away from the keeper.
    pub fn shoot(&mut self, tx: f32) -> bool { self.fire_shot(tx, SWEET, false) }

    fn shoot_inner(&mut self, tx: f32, sup: bool) -> bool { self.fire_shot(tx, SWEET, sup) }

    /// The corner of the goal furthest from the keeper.
    fn far_corner(&mut self) -> f32 {
        let half = (GOAL_R - GOAL_L) / 2.0;
        let side = if (self.gk.x - GOAL_C).abs() < 10.0 { if self.rng.f() < 0.5 { -1.0 } else { 1.0 } } else if self.gk.x < GOAL_C { 1.0 } else { -1.0 };
        GOAL_C + side * (half - 20.0)
    }

    // ---- charging a shot: hold to build power, slide to aim, let go in the green
    pub fn shot_begin(&mut self, tx: f32) -> bool {
        if self.phase != PH_PLAY || self.owner < 0 || self.shot_mode || self.aim_active { return false; }
        self.shot_mode = true;
        self.shot_charge_t = 0.0;
        self.shot_slow = SHOT_SLOW_BUDGET;
        self.shot_auto = !tx.is_finite();   // no aim chosen: the game aims for a corner, not very exactly
        self.shot_x = if tx.is_finite() { clamp(tx, GOAL_L + 4.0, GOAL_R - 4.0) } else { self.far_corner() };
        true
    }
    pub fn shot_aim(&mut self, tx: f32) { if self.shot_mode && tx.is_finite() { self.shot_auto = false; self.shot_x = clamp(tx, GOAL_L + 4.0, GOAL_R - 4.0); } }
    pub fn shot_cancel(&mut self) { self.shot_mode = false; }
    fn charge_power(&self) -> f32 { (self.shot_charge_t / CHARGE_SECS).min(1.0) }
    /// Let go: the shot leaves at whatever power has built up.
    pub fn shot_fire(&mut self) -> bool {
        if !self.shot_mode { return false; }
        self.shot_mode = false;
        let p = self.charge_power();
        self.aim_noise = if self.shot_auto { 16.0 } else { 0.0 };
        self.fire_shot(self.shot_x, p, false)
    }

    /// `power` is 0 to 1; the sweet spot is around 0.8. Too soft is weak, too hard is wild.
    fn fire_shot(&mut self, tx: f32, power: f32, sup: bool) -> bool {
        if self.phase != PH_PLAY || self.owner < 0 { return false; }
        self.aim_active = false;
        self.shot_mode = false;
        self.sync_ball_to_owner();
        let o = self.att[self.owner as usize];
        let d_goal = dist(o.x, o.y, GOAL_C, 0.0);
        let mut target_x = if tx.is_nan() { self.far_corner() } else { clamp(tx, GOAL_L + 4.0, GOAL_R - 4.0) };
        if self.aim_noise > 0.0 { target_x += self.rng.gauss() * self.aim_noise; self.aim_noise = 0.0; }
        // the nearer a defender is, and the further out you are, the less accurate you are
        let mut near = f32::MAX;
        for d in &self.def { near = near.min(dist(d.x, d.y, o.x, o.y)); }
        let p = clamp(power, 0.0, 1.0);
        let err = ((p - SWEET).abs() - SWEET_HALF - 0.01 * self.stats.technique).max(0.0);       // 0 anywhere in the green (technique widens it)
        let base = (0.010 + d_goal * 0.00006 + if near < 60.0 { 0.02 } else { 0.0 }) * (1.0 - 0.05 * self.stats.technique);
        let mut sigma = if sup { 0.002 } else { base * (1.0 + 7.0 * err) };
        if !sup && p > 0.93 + 0.004 * self.stats.technique { sigma += 0.045; }                    // blazed it
        let speed = if sup { SHOT_SPEED * 1.3 * (1.0 + 0.03 * self.stats.power) } else { SHOT_SPEED * (0.62 + 0.5 * p) * (1.0 + 0.03 * self.stats.power) };
        let ang = (0.0 - o.y).atan2(target_x - o.x) + self.rng.gauss() * sigma;
        self.bvx = ang.cos() * speed;
        self.bvy = ang.sin() * speed;
        self.passer = self.owner;
        self.owner = -1;
        self.nopick = 0.6;
        self.receiver = -1;
        self.shot_live = true;
        self.shot_from = d_goal;
        self.shot_super = sup;
        self.shots += 1;
        if sup {
            // a super shot is not unstoppable: from close in the keeper has no time, from far out he does
            let f = clamp((d_goal - 130.0) / 150.0, 0.0, 1.0);
            let wide = (o.x - GOAL_C).abs() / 340.0;
            self.sup_keeper = (0.4 + 0.9 * f) * if wide > 0.45 { 1.15 } else { 1.0 };
            self.gk_react = clamp(0.5 - 0.38 * f - (0.2 - self.t().react) * 0.5, 0.06, 0.5);
        } else {
            self.sup_keeper = 1.0;
            // a shot tucked right into the corner is harder to read
            let corner = (target_x - GOAL_C).abs() > 50.0;
            // sometimes he reads the shooter and leans the right way before the ball is even hit
            let guess = self.rng.f() < self.t().read;
            self.gk_lean = if guess { if target_x > self.gk.x { 38.0 } else { -38.0 } } else { 0.0 };
            self.gk_react = clamp(self.t().react + 0.008 * self.stats.power + if corner { 0.03 } else { 0.0 }, 0.08, 0.5);
        }
        self.events.push(E_KICK);
        self.events.push(E_SHOT);
        true
    }

    // ------------------------------------------------------------ the simulation
    /// Advance by `dt_ms` milliseconds of real time (done in fixed steps).
    pub fn tick(&mut self, dt_ms: f32) {
        let real = clamp(dt_ms, 0.0, 100.0) / 1000.0;
        // lining up a pass: time almost stops, for a limited time
        let playing = self.phase == PH_PLAY && self.owner >= 0;
        let mut slow = self.aim_active && playing && self.slow_left > 0.0;
        if slow { self.slow_left = (self.slow_left - real).max(0.0); }
        if self.shot_mode && playing {
            // the charge builds in real time even while the world is crawling
            self.shot_charge_t += real;
            if self.shot_slow > 0.0 { slow = true; self.shot_slow = (self.shot_slow - real).max(0.0); }
        }
        self.acc += if slow { real * SLOW_FACTOR } else { real };
        while self.acc >= STEP {
            self.acc -= STEP;
            self.step(STEP);
        }
        self.export();
    }

    fn step(&mut self, dt: f32) {
        self.time += dt;
        match self.phase {
            PH_PLAY => self.step_play(dt),
            PH_RESULT => self.step_result(dt),
            PH_CINE => self.step_cine(dt),
            _ => {}
        }
    }

    /// Time is frozen for the cinematic; then the skill happens.
    fn step_cine(&mut self, dt: f32) {
        self.cine_t -= dt;
        if self.cine_t > 0.0 { return; }
        self.phase = PH_PLAY;
        if self.cine_kind == SK_ROCKET {
            if self.owner >= 0 { self.shoot_inner(f32::NAN, true); }
        } else {
            self.freeze_t = 4.5;
            self.events.push(E_FREEZE);
        }
    }

    /// Fire the super skill (needs a full meter and the ball).
    pub fn use_super(&mut self) -> bool {
        if self.phase != PH_PLAY || self.owner < 0 || self.meter < 1.0 { return false; }
        self.aim_active = false;
        self.shot_mode = false;
        self.meter = 0.0;
        self.phase = PH_CINE;
        self.cine_kind = self.skill;
        self.cine_t = if self.skill == SK_ROCKET { 1.5 } else { 1.1 };
        self.events.push(E_SUPER);
        true
    }

    fn step_play(&mut self, dt: f32) {
        self.freeze_t = (self.freeze_t - dt).max(0.0);
        self.intro = (self.intro - dt).max(0.0);
        self.shield = (self.shield - dt).max(0.0);
        self.nopick = (self.nopick - dt).max(0.0);
        self.match_t = (self.match_t - dt).max(0.0);
        if self.match_t <= 0.0 { self.time_up = true; }
        self.update_ball(dt);
        if self.phase != PH_PLAY { return; }
        self.update_attackers(dt);
        if self.freeze_t <= 0.0 { self.update_defenders(dt); self.update_keeper(dt); } else { self.hold_still(dt); }
        self.separate();
        self.sync_ball_to_owner();
        self.check_pickups(dt);
        // the final whistle, once any shot in the air has been settled
        if self.phase == PH_PLAY && self.time_up && !self.shot_live && !self.lob_on { self.end_match(); }
    }

    fn end_match(&mut self) {
        self.best_chain = self.best_chain.max(self.chain);
        self.phase = PH_OVER;
        self.aim_active = false;
        self.shot_mode = false;
        self.events.push(E_OVER);
    }

    fn step_result(&mut self, dt: f32) {
        self.phase_t -= dt;
        // the ball keeps rolling (into the net, if it went in)
        self.roll_ball(dt);
        if self.result == R_GOAL {
            self.by = self.by.max(-34.0);
            if self.by <= -30.0 { self.bvx *= 0.5; self.bvy = 0.0; }
        }
        // everybody stands about, the keeper too
        for p in self.att.iter_mut().chain(self.def.iter_mut()) { let (x, y) = (p.x, p.y); p.run(x, y, 0.0, dt); }
        if self.phase_t <= 0.0 {
            if self.match_t > 0.0 {
                self.attack_no += 1;
                self.phase = PH_PLAY;
                self.setup_attack();
            } else {
                self.phase = PH_OVER;
                self.events.push(E_OVER);
            }
        }
    }

    fn roll_ball(&mut self, dt: f32) {
        let sp = hyp(self.bvx, self.bvy);
        if sp > 0.0 {
            let ns = (sp - FRICTION * dt).max(0.0);
            self.bvx *= ns / sp;
            self.bvy *= ns / sp;
        }
        self.bx += self.bvx * dt;
        self.by += self.bvy * dt;
    }

    fn update_ball(&mut self, dt: f32) {
        if self.owner >= 0 { return; }
        if self.lob_on {
            // a lobbed ball flies over everybody, and comes down where it was aimed
            self.lob_t += dt;
            let f = (self.lob_t / self.lob_dur).min(1.0);
            self.bx = self.lob_sx + (self.lob_ex - self.lob_sx) * f;
            self.by = self.lob_sy + (self.lob_ey - self.lob_sy) * f;
            if f >= 1.0 {
                self.lob_on = false;
                let (ux, uy) = (self.lob_ex - self.lob_sx, self.lob_ey - self.lob_sy);
                let l = hyp(ux, uy).max(1.0);
                self.bvx = ux / l * 70.0;
                self.bvy = uy / l * 70.0;
            }
            return;
        }
        // a shot barely slows down; a pass rolls to a stop
        if self.shot_live {
            self.bx += self.bvx * dt;
            self.by += self.bvy * dt;
        } else {
            self.roll_ball(dt);
        }
        // across the goal line?
        if self.by < 0.0 && self.bvy < 0.0 {
            let inside = self.bx > GOAL_L + POST_R && self.bx < GOAL_R - POST_R;
            let at_post = (self.bx - GOAL_L).abs() < POST_R + BALL_R * 0.6 || (self.bx - GOAL_R).abs() < POST_R + BALL_R * 0.6;
            if inside {
                self.score_goal();
            } else if at_post {
                self.bvy = self.bvy.abs() * 0.5;
                self.bvx = -self.bvx * 0.6 + self.rng.range(-60.0, 60.0);
                self.by = 2.0;
                self.shot_live = false;
                self.events.push(E_POST);
                self.finish(R_POST);
            } else {
                self.finish(R_MISS);
            }
            return;
        }
        // off the sides or the bottom
        if self.bx < -8.0 || self.bx > W + 8.0 || self.by > H + 8.0 {
            self.finish(R_OUT);
        }
    }

    fn score_goal(&mut self) {
        let long = if self.shot_live && self.shot_from > 270.0 { 50 } else { 0 };
        let bonus = 100 + 15 * self.chain + long;
        self.score += bonus;
        self.last_bonus = bonus;
        self.goals += 1;
        self.events.push(E_GOAL);
        self.finish(R_GOAL);
    }

    /// The attack is over.
    fn finish(&mut self, r: u8) {
        if self.phase != PH_PLAY { return; }
        self.phase = PH_RESULT;
        self.phase_t = if r == R_GOAL { 2.4 } else { 1.3 };
        self.result = r;
        self.shot_live = false;
        self.aim_active = false;
        self.best_chain = self.best_chain.max(self.chain);
        self.lob_on = false;
        self.through_on = false;
        self.shot_mode = false;
        if r == R_TACKLED { self.turnovers += 1; self.match_t = (self.match_t - TURNOVER_COST).max(0.0); }
        if r == R_SAVED { self.saves_n += 1; }
        match r {
            R_MISS | R_OUT => self.events.push(E_MISS),
            R_BLOCKED => self.events.push(E_BLOCK),
            R_TACKLED => self.events.push(E_TACKLE),
            R_SAVED => self.events.push(E_SAVE),
            _ => {}
        }
        self.owner = -1;
    }

    // ------------------------------------------------------------ the attackers (your team-mates)
    fn update_attackers(&mut self, dt: f32) {
        let (rx, ry) = if self.owner >= 0 { let o = self.att[self.owner as usize]; (o.x, o.y) } else { (self.bx, self.by) };
        // where the ball will end up, and which team-mate goes for it
        let stop = self.ball_stop();
        for i in 0..self.att.len() {
            if i as i32 == self.owner { // the ball carrier stands his ground
                let p = &mut self.att[i];
                let (x, y) = (p.x, p.y);
                p.run(x, y, 0.0, dt);
                continue;
            }
            let mut p = self.att[i];
            p.think -= dt;
            if p.think <= 0.0 {
                p.think = 0.3 + self.rng.f() * 0.15;
                let (sx, sy) = self.slot(i, rx, ry);
                // find the open spot near that slot, away from defenders
                let mut best = (sx, sy, -1e9);
                for &(ox, oy) in &[(0.0, 0.0), (-45.0, 0.0), (45.0, 0.0), (0.0, -45.0), (0.0, 45.0), (-32.0, -32.0), (32.0, -32.0), (-32.0, 32.0), (32.0, 32.0)] {
                    let (cx, cy) = (clamp(sx + ox, 40.0, W - 40.0), clamp(sy + oy, 70.0, H - 40.0));
                    let mut open = 120.0f32;
                    for d in &self.def { open = open.min(dist(d.x, d.y, cx, cy)); }
                    // a lane to the ball carrier that is not cut off is worth more
                    let mut lane = 80.0f32;
                    for d in &self.def { lane = lane.min(seg_dist(d.x, d.y, rx, ry, cx, cy)); }
                    let score = open + lane * 0.8 - 0.25 * dist(cx, cy, sx, sy);
                    if score > best.2 { best = (cx, cy, score); }
                }
                p.tx = best.0;
                p.ty = best.1;
            }
            let (mut tx, mut ty) = (p.tx, p.ty);
            if self.owner < 0 && !self.shot_live && self.receiver == i as i32 {
                // go and meet the pass
                let (ix, iy) = if self.lob_on { (self.lob_ex, self.lob_ey) } else { self.intercept_point(p.x, p.y, self.att_speed() * 1.25).unwrap_or(stop) };
                tx = ix;
                ty = iy;
            } else if self.owner < 0 && !self.shot_live && self.receiver < 0 {
                // loose ball and nobody sent: the nearest one fetches it
                let mut nearest = i;
                let mut nd = f32::MAX;
                for (k, q) in self.att.iter().enumerate() { let d = dist(q.x, q.y, stop.0, stop.1); if d < nd { nd = d; nearest = k; } }
                if nearest == i { tx = stop.0; ty = stop.1; }
            }
            let sp = if self.receiver == i as i32 && self.owner < 0 { self.att_speed() * if self.through_on { 1.6 } else { 1.25 } } else { self.att_speed() };
            p.run(tx, ty, sp, dt);
            self.att[i] = p;
        }
    }

    /// A good place for team-mate `i` to stand, given where the ball is.
    fn slot(&self, i: usize, rx: f32, ry: f32) -> (f32, f32) {
        match i {
            4 => (clamp(GOAL_C + (GOAL_C - rx) * 0.25, 210.0, 470.0), clamp(ry - 190.0, 80.0, 230.0)),   // the striker
            2 => (120.0, clamp(ry - 110.0, 170.0, 520.0)),                                               // left wing
            3 => (560.0, clamp(ry - 110.0, 170.0, 520.0)),                                               // right wing
            0 => (rx - 140.0, ry + 20.0),                                                                // midfield, left
            _ => (rx + 140.0, ry + 20.0),                                                                // midfield, right
        }
    }

    /// Where the loose ball will come to rest.
    fn ball_stop(&self) -> (f32, f32) {
        if self.lob_on { return (self.lob_ex, self.lob_ey); }
        let sp = hyp(self.bvx, self.bvy);
        if sp < 1.0 { return (self.bx, self.by); }
        let d = sp * sp / (2.0 * FRICTION);
        (self.bx + self.bvx / sp * d, self.by + self.bvy / sp * d)
    }

    /// The first point on the ball's path that a runner at (x, y) can reach in time.
    fn intercept_point(&self, x: f32, y: f32, speed: f32) -> Option<(f32, f32)> {
        let sp = hyp(self.bvx, self.bvy);
        if sp < 1.0 { return Some((self.bx, self.by)); }
        let (ux, uy) = (self.bvx / sp, self.bvy / sp);
        let mut t: f32 = 0.05;
        while t < 2.4 {
            // distance rolled after t seconds, with friction
            let tt = t.min(sp / FRICTION);
            let d = sp * tt - 0.5 * FRICTION * tt * tt;
            let (px, py) = (self.bx + ux * d, self.by + uy * d);
            if dist(x, y, px, py) <= speed * t + 6.0 { return Some((px, py)); }
            t += 0.05;
        }
        None
    }

    // ------------------------------------------------------------ the defenders
    fn update_defenders(&mut self, dt: f32) {
        let lvl = self.level();
        let base = self.t().speed + 0.1 * self.stats.total() + 0.0 * lvl;
        // slow to react at the very start, so you can get going
        let eager = 0.45 + 0.55 * (1.0 - self.intro.min(1.0));
        let speed = base * eager;
        let n = self.def.len();
        if n == 0 { return; }
        let carrier = if self.owner >= 0 { Some(self.att[self.owner as usize]) } else { None };
        let (rx, ry) = match carrier { Some(c) => (c.x, c.y), None => (self.bx, self.by) };

        // who goes for the ball? the nearest to the carrier, or whoever can meet a loose ball first
        let mut chaser = 0usize;
        let mut chase_pt = (rx, ry);
        if carrier.is_some() {
            let mut best = f32::MAX;
            for (i, d) in self.def.iter().enumerate() { let dd = dist(d.x, d.y, rx, ry); if dd < best { best = dd; chaser = i; } }
        } else if self.lob_on {
            // a lob is coming down: the nearest defender goes to where it will land
            let mut b = f32::MAX;
            for (i, d) in self.def.iter().enumerate() { let dd = dist(d.x, d.y, self.lob_ex, self.lob_ey); if dd < b { b = dd; chaser = i; chase_pt = (self.lob_ex, self.lob_ey); } }
        } else {
            let mut best = f32::MAX;
            for (i, d) in self.def.iter().enumerate() {
                if let Some((px, py)) = self.intercept_point(d.x, d.y, speed * 1.1) {
                    let dd = dist(d.x, d.y, px, py);
                    if dd < best { best = dd; chaser = i; chase_pt = (px, py); }
                }
            }
            if best == f32::MAX { // nobody can reach it: the nearest one heads for where it stops
                let stop = self.ball_stop();
                let mut b = f32::MAX;
                for (i, d) in self.def.iter().enumerate() { let dd = dist(d.x, d.y, stop.0, stop.1); if dd < b { b = dd; chaser = i; chase_pt = stop; } }
            }
        }

        // everybody else marks an attacker, standing goal-side and across the passing lane
        let mut taken = vec![false; self.att.len()];
        if let Some(c) = carrier { let _ = c; taken[self.owner as usize] = true; }
        let mut targets = vec![(0.0f32, 0.0f32); n];
        targets[chaser] = if carrier.is_some() {
            // run at him, a little ahead of where he is
            // (but he holds back at arm's length while the ball carrier is still settling)
            if self.shield > 0.0 || self.intro > 0.0 {
                let c = self.def[chaser];
                let (vx, vy) = (c.x - rx, c.y - ry);
                let vl = hyp(vx, vy).max(1.0);
                (rx + vx / vl * 46.0, ry + vy / vl * 46.0)
            } else { (rx, ry - 6.0) }
        } else { chase_pt };
        // dangerous attackers (nearest the goal) get marked first
        let mut order: Vec<usize> = (0..n).filter(|&i| i != chaser).collect();
        order.sort_by(|&a, &b| {
            let da = self.def[a].y;
            let db = self.def[b].y;
            da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
        });
        for &i in &order {
            let d = self.def[i];
            let mut pick = None;
            let mut best = f32::MAX;
            for (j, a) in self.att.iter().enumerate() {
                if taken[j] { continue; }
                // closer to goal means more dangerous
                let cost = dist(d.x, d.y, a.x, a.y) + a.y * 0.15;
                if cost < best { best = cost; pick = Some(j); }
            }
            match pick {
                Some(j) => {
                    taken[j] = true;
                    let a = self.att[j];
                    // between him and the ball (to cut the pass), a bit goal-side
                    let (vx, vy) = (rx - a.x, ry - a.y);
                    let vl = hyp(vx, vy).max(1.0);
                    // stand about 44 away from him on the ball side: close enough to cut the pass, too far to tackle
                    targets[i] = (a.x + vx / vl * 50.0, a.y + vy / vl * 50.0 - 10.0);
                }
                None => targets[i] = (GOAL_C + (rx - GOAL_C) * 0.5, 130.0),   // spare defenders drop back to cover
            }
        }
        for i in 0..n {
            let mut d = self.def[i];
            let sp = if i == chaser { speed * self.t().chase } else { speed * 0.92 };
            d.run(targets[i].0, targets[i].1, sp, dt);
            self.def[i] = d;
        }
    }

    // ------------------------------------------------------------ the goalkeeper
    /// While time is stopped the defenders and keeper stand like statues.
    fn hold_still(&mut self, dt: f32) {
        for d in self.def.iter_mut() { d.vx = 0.0; d.vy = 0.0; d.tackle = 0.0; }
        self.gk.vx = 0.0; self.gk.vy = 0.0;
        let _ = dt;
    }

    fn update_keeper(&mut self, dt: f32) {
        let lvl = self.level();
        let mut k = self.gk;
        let half = (GOAL_R - GOAL_L) / 2.0;
        let (target_x, speed);
        if self.owner < 0 && self.by < 380.0 && self.bvy < -40.0 && (self.shot_live || hyp(self.bvx, self.bvy) > 150.0) {
            // a shot (or a hard ball) heading for goal: read where it crosses the line, then dive
            let t = self.by.max(0.0) / (-self.bvy);
            let xg = self.bx + self.bvx * t;
            if self.gk_react > 0.0 { self.gk_react -= dt; target_x = clamp(k.x + self.gk_lean, GOAL_L + 8.0, GOAL_R - 8.0); } else { target_x = clamp(xg, GOAL_L + 8.0, GOAL_R - 8.0); }
            speed = 380.0 * self.t().keeper * if self.shot_super { self.sup_keeper } else { 1.0 };
        } else {
            // stand between the ball and the middle of the goal
            let (rx, _) = if self.owner >= 0 { let o = self.att[self.owner as usize]; (o.x, o.y) } else { (self.bx, self.by) };
            target_x = clamp(GOAL_C + (rx - GOAL_C) * 0.5, GOAL_L + 18.0, GOAL_R - 18.0);
            speed = (105.0 + 17.0 * lvl) * self.t().keeper;
        }
        let _ = half;
        k.run(target_x, 16.0, speed, dt);
        self.gk = k;
        // does he get a hand to it?
        if self.owner < 0 && dist(self.bx, self.by, k.x, k.y) < KEEPER_R && self.by < 120.0 {
            self.bvx = self.rng.range(-110.0, 110.0);
            self.bvy = 140.0;
            self.shot_live = false;
            self.finish(R_SAVED);
        }
    }

    /// Players do not stand on top of each other.
    fn separate(&mut self) {
        let mut all: Vec<(bool, usize)> = Vec::new();
        for i in 0..self.att.len() { all.push((true, i)); }
        for i in 0..self.def.len() { all.push((false, i)); }
        let get = |g: &Game, (a, i): (bool, usize)| if a { g.att[i] } else { g.def[i] };
        for x in 0..all.len() {
            for y in (x + 1)..all.len() {
                let (pa, pb) = (get(self, all[x]), get(self, all[y]));
                // the ball carrier and a defender are allowed to touch (that is a tackle)
                let carrier_vs_def = |c: (bool, usize), d: (bool, usize)| c.0 && !d.0 && c.1 as i32 == self.owner;
                if carrier_vs_def(all[x], all[y]) || carrier_vs_def(all[y], all[x]) { continue; }
                let d = dist(pa.x, pa.y, pb.x, pb.y);
                if d < 23.0 && d > 0.01 {
                    let push = (23.0 - d) * 0.5;
                    let (nx, ny) = ((pa.x - pb.x) / d, (pa.y - pb.y) / d);
                    if all[x].0 { self.att[all[x].1].x += nx * push; self.att[all[x].1].y += ny * push; } else { self.def[all[x].1].x += nx * push; self.def[all[x].1].y += ny * push; }
                    if all[y].0 { self.att[all[y].1].x -= nx * push; self.att[all[y].1].y -= ny * push; } else { self.def[all[y].1].x -= nx * push; self.def[all[y].1].y -= ny * push; }
                }
            }
        }
    }

    // ------------------------------------------------------------ who gets the ball
    fn check_pickups(&mut self, dt: f32) {
        // tackles on the ball carrier
        if self.owner >= 0 {
            let c = self.att[self.owner as usize];
            let mut tackled = false;
            let tt = self.tackle_time();
            for d in self.def.iter_mut() {
                if dist(d.x, d.y, c.x, c.y) < TACKLE_R && self.shield <= 0.0 && self.intro <= 0.0 && self.freeze_t <= 0.0 {
                    d.tackle += dt;
                    if d.tackle >= tt { tackled = true; }
                } else {
                    d.tackle = (d.tackle - dt * 2.0).max(0.0);
                }
            }
            if tackled {
                self.owner = -1;
                self.bvx = self.rng.range(-80.0, 80.0);
                self.bvy = self.rng.range(20.0, 90.0);
                self.finish(R_TACKLED);
            }
            return;
        }
        if self.lob_on { return; }          // nobody can touch a ball in the air
        let sp = hyp(self.bvx, self.bvy);
        // a defender in the way of a shot blocks it
        if self.shot_live {
            if self.shot_super || self.freeze_t > 0.0 { return; }
            for d in &self.def {
                if dist(d.x, d.y, self.bx, self.by) < PLAYER_R + BALL_R + 2.0 {
                    self.bvx *= 0.15;
                    self.bvy = self.bvy.abs() * 0.2;
                    self.shot_live = false;
                    self.finish(R_BLOCKED);
                    return;
                }
            }
            return;
        }
        // loose ball: a team-mate collects it, or a defender cuts it out
        let mut best_att: Option<(usize, f32)> = None;
        for (i, a) in self.att.iter().enumerate() {
            if self.nopick > 0.0 && i as i32 == self.passer { continue; }
            let d = dist(a.x, a.y, self.bx, self.by);
            if d < PICK_R && sp < MAX_RECEIVE && best_att.map_or(true, |b| d < b.1) { best_att = Some((i, d)); }
        }
        let mut best_def: Option<(usize, f32)> = None;
        for (i, d) in self.def.iter().enumerate() {
            let dd = dist(d.x, d.y, self.bx, self.by);
            if self.freeze_t <= 0.0 && dd < PLAYER_R + BALL_R + 3.0 && sp < 470.0 && best_def.map_or(true, |b| dd < b.1) { best_def = Some((i, dd)); }
        }
        match (best_att, best_def) {
            (Some((i, da)), Some((_, dd))) if dd < da => { let _ = i; self.cut_out(); }
            (Some((i, _)), _) => {
                self.owner = i as i32;
                self.slow_left = SLOW_BUDGET;
                self.bvx = 0.0;
                self.bvy = 0.0;
                self.receiver = -1;
                self.shield = 1.0 + 0.06 * self.stats.composure;
                self.through_on = false;
                if self.passer >= 0 && self.passer != i as i32 {
                    self.chain += 1;
                    self.passes_total += 1;
                    let was = self.meter;
                    self.meter = (self.meter + 0.2 + 0.01 * self.stats.technique).min(1.0);
                    if was < 1.0 && self.meter >= 1.0 { self.events.push(E_METER_FULL); }
                    self.score += 10;
                    self.events.push(E_PASS);
                }
                self.passer = -1;
            }
            (None, Some(_)) => self.cut_out(),
            _ => {}
        }
    }

    fn cut_out(&mut self) {
        self.bvx *= 0.2;
        self.bvy *= 0.2;
        self.finish(R_TACKLED);
    }

    // ------------------------------------------------------------ what the page sees
    fn export(&mut self) {
        let mut near = f32::MAX;
        let mut aim = Aim { len: 0.0, dx: 0.0, dy: -1.0, target: -1, ex: 0.0, ey: 0.0, kind: 0, safe: 0 };
        if self.owner >= 0 {
            let c = self.att[self.owner as usize];
            for d in &self.def { near = near.min(dist(d.x, d.y, c.x, c.y)); }
            if self.aim_active { aim = self.compute_aim(); }
        }
        let lvl = self.level();
        let ttime = self.tackle_time();
        let slow_left = self.slow_left;
        let match_t = self.match_t;
        let (lob_z, lob_f) = if self.lob_on { let f = (self.lob_t / self.lob_dur).min(1.0); ((f * PI).sin() * self.lob_h, f) } else { (0.0, 0.0) };
        // is each team-mate a safe pass? (0 none, 1 clear, 2 risky, 3 blocked)
        let mut open = vec![0.0f32; self.att.len()];
        if self.owner >= 0 {
            let c = self.att[self.owner as usize];
            for (j, t) in self.att.iter().enumerate() {
                if j as i32 == self.owner { continue; }
                open[j] = 1.0 + self.lane_safety(c.x, c.y, t.x, t.y, self.pass_kind) as f32;
            }
        }
        let (meter, freeze, cine_t, skill, cine_kind, sup) = (self.meter, self.freeze_t, self.cine_t.max(0.0), self.skill as f32, self.cine_kind as f32, self.shot_super);
        let o = &mut self.out;
        for v in o.iter_mut() { *v = 0.0; }
        o[IDX_PHASE] = self.phase as f32;
        o[IDX_SCORE] = self.score as f32;
        o[IDX_MATCH_T] = match_t;
        o[IDX_ATTACK_NO] = self.attack_no as f32;
        o[IDX_CHAIN] = self.chain as f32;
        o[IDX_RESULT] = self.result as f32;
        o[IDX_PHASE_T] = self.phase_t.max(0.0);
        o[IDX_TIME] = self.time;
        o[IDX_GOALS] = self.goals as f32;
        o[IDX_OWNER] = self.owner as f32;
        o[IDX_N_ATT] = self.att.len() as f32;
        o[IDX_N_DEF] = self.def.len() as f32;
        o[IDX_AIM_ACTIVE] = if self.aim_active { 1.0 } else { 0.0 };
        o[IDX_AIM_LEN] = aim.len;
        o[IDX_AIM_DX] = aim.dx;
        o[IDX_AIM_DY] = aim.dy;
        o[IDX_AIM_TARGET] = aim.target as f32;
        o[IDX_AIM_END_X] = aim.ex;
        o[IDX_AIM_END_Y] = aim.ey;
        o[IDX_INTRO] = self.intro;
        o[IDX_SHIELD] = self.shield;
        o[IDX_SHOT_LIVE] = if self.shot_live { 1.0 } else { 0.0 };
        o[IDX_BEST_CHAIN] = self.best_chain as f32;
        o[IDX_PASSES] = self.passes_total as f32;
        o[IDX_PRESSURE] = if near == f32::MAX { 999.0 } else { near };
        o[IDX_BALL_X] = self.bx;
        o[IDX_BALL_Y] = self.by;
        o[IDX_BALL_VX] = self.bvx;
        o[IDX_BALL_VY] = self.bvy;
        o[IDX_RECEIVER] = self.receiver as f32;
        o[IDX_CAN_SHOOT] = if self.phase == PH_PLAY && self.owner >= 0 { 1.0 } else { 0.0 };
        o[IDX_LAST_BONUS] = self.last_bonus as f32;
        o[IDX_LEVEL] = lvl;
        o[IDX_SLOW_LEFT] = slow_left;
        o[IDX_METER] = meter;
        o[IDX_FREEZE] = freeze;
        o[IDX_CINE_T] = cine_t;
        o[IDX_SKILL] = skill;
        o[IDX_CINE_KIND] = cine_kind;
        o[IDX_SUPER_SHOT] = if sup && self.shot_live { 1.0 } else { 0.0 };
        o[IDX_AIM_SAFE] = aim.safe as f32;
        o[IDX_AIM_KIND] = aim.kind as f32;
        o[IDX_PASS_KIND] = self.pass_kind as f32;
        o[IDX_BALL_Z] = lob_z;
        o[IDX_SHOT_MODE] = if self.shot_mode { 1.0 } else { 0.0 };
        o[IDX_POWER] = if self.shot_mode { (self.shot_charge_t / CHARGE_SECS).min(1.0) } else { 0.0 };
        o[IDX_SHOT_X] = self.shot_x;
        o[IDX_SHOT_SLOW] = self.shot_slow;
        o[IDX_TEAM] = self.team as f32;
        o[IDX_LOB_FRAC] = lob_f;
        o[IDX_SHOTS] = self.shots as f32;
        o[IDX_SAVES] = self.saves_n as f32;
        o[IDX_TURNOVERS] = self.turnovers as f32;
        o[IDX_TIME_UP] = if self.time_up { 1.0 } else { 0.0 };
        o[IDX_LOB_EX] = self.lob_ex;
        o[IDX_LOB_EY] = self.lob_ey;
        let mut k = PLAYER_BASE;
        let nums = [8.0, 7.0, 11.0, 9.0, 10.0];
        for (i, p) in self.att.iter().enumerate() {
            o[k] = p.x; o[k + 1] = p.y; o[k + 2] = p.vx; o[k + 3] = p.vy; o[k + 4] = p.face;
            o[k + 5] = 0.0; o[k + 6] = nums[i.min(4)]; o[k + 7] = if i as i32 == self.owner { 1.0 } else { 0.0 }; o[k + 8] = open[i];
            k += PLAYER_STRIDE;
        }
        for (i, p) in self.def.iter().enumerate() {
            o[k] = p.x; o[k + 1] = p.y; o[k + 2] = p.vx; o[k + 3] = p.vy; o[k + 4] = p.face;
            o[k + 5] = 1.0; o[k + 6] = (i + 2) as f32; o[k + 7] = p.tackle / ttime;
            k += PLAYER_STRIDE;
        }
        let p = self.gk;
        o[k] = p.x; o[k + 1] = p.y; o[k + 2] = p.vx; o[k + 3] = p.vy; o[k + 4] = p.face;
        o[k + 5] = 2.0; o[k + 6] = 1.0;
    }
}

// ================================================================ the doorway the web page uses
static mut GAME: Option<Game> = None;

fn game() -> &'static mut Game {
    // The page runs one game at a time on one thread, so this is safe.
    unsafe {
        let slot = &raw mut GAME;
        (*slot).get_or_insert_with(|| Game::new(1))
    }
}

#[no_mangle] pub extern "C" fn new_game(seed: u32, speed: f32, power: f32, technique: f32, composure: f32, skill: u32, team: u32) {
    let st = Stats { speed: clamp(speed, 0.0, 10.0), power: clamp(power, 0.0, 10.0), technique: clamp(technique, 0.0, 10.0), composure: clamp(composure, 0.0, 10.0) };
    unsafe { let slot = &raw mut GAME; *slot = Some(Game::versus(seed, st, if skill == 1 { SK_FREEZE } else { SK_ROCKET }, team as usize)); }
}
#[no_mangle] pub extern "C" fn use_super() -> u32 { let g = game(); let r = g.use_super(); g.export(); r as u32 }
#[no_mangle] pub extern "C" fn tick(dt_ms: f32) { game().tick(dt_ms); }
#[no_mangle] pub extern "C" fn set_pass_kind(k: u32) { let g = game(); g.set_pass_kind(k as u8); g.export(); }
#[no_mangle] pub extern "C" fn shot_begin(tx: f32) -> u32 { let g = game(); let r = g.shot_begin(tx); g.export(); r as u32 }
#[no_mangle] pub extern "C" fn shot_aim(tx: f32) { let g = game(); g.shot_aim(tx); g.export(); }
#[no_mangle] pub extern "C" fn shot_fire() -> u32 { let g = game(); let r = g.shot_fire(); g.export(); r as u32 }
#[no_mangle] pub extern "C" fn shot_cancel() { let g = game(); g.shot_cancel(); g.export(); }
#[no_mangle] pub extern "C" fn aim_begin() { let g = game(); g.aim_begin(); g.export(); }
#[no_mangle] pub extern "C" fn aim_update(dx: f32, dy: f32) { let g = game(); g.aim_update(dx, dy); g.export(); }
#[no_mangle] pub extern "C" fn aim_cancel() { let g = game(); g.aim_cancel(); g.export(); }
#[no_mangle] pub extern "C" fn aim_release() -> u32 { let g = game(); let r = g.aim_release(); g.export(); r as u32 }
/// Shoot at x along the goal line, or pass NaN to let the game pick the corner.
#[no_mangle] pub extern "C" fn shoot(tx: f32) -> u32 { let g = game(); let r = g.shoot(tx); g.export(); r as u32 }
#[no_mangle] pub extern "C" fn state_ptr() -> *const f32 { game().out.as_ptr() }
#[no_mangle] pub extern "C" fn state_len() -> u32 { OUT_LEN as u32 }
#[no_mangle] pub extern "C" fn events_ptr() -> *const u8 { game().events.as_ptr() }
#[no_mangle] pub extern "C" fn events_len() -> u32 { game().events.len() as u32 }
#[no_mangle] pub extern "C" fn events_clear() { game().events.clear(); }
#[no_mangle] pub extern "C" fn world_w() -> f32 { W }
#[no_mangle] pub extern "C" fn world_h() -> f32 { H }
#[no_mangle] pub extern "C" fn max_pass() -> f32 { MAX_PASS }

// ================================================================ tests
#[cfg(test)]
mod tests {
    use super::*;

    fn run(g: &mut Game, secs: f32) { for _ in 0..(secs * 60.0) as usize { g.step(STEP); } }

    #[test]
    fn a_pass_rolls_about_as_far_as_you_drag() {
        let mut g = Game::new(7);
        g.att.truncate(1);
        g.def.clear();
        g.owner = 0;
        g.intro = 0.0;
        let x0 = g.att[0].x;
        g.aim_begin();
        g.aim_update(-200.0, 0.0);
        assert!(g.aim_release());
        let stop = g.ball_stop();
        let moved = x0 - stop.0;
        assert!((moved - 200.0).abs() < 12.0, "ball moved {moved}");
    }

    #[test]
    fn dragging_further_passes_further() {
        let mut ends = Vec::new();
        for len in [100.0f32, 250.0, 450.0] {
            let mut g = Game::new(3);
            g.att.truncate(1);
            g.def.clear();
            g.owner = 0;
            g.aim_begin();
            g.aim_update(0.0, -len);
            g.aim_release();
            run(&mut g, 5.0);
            ends.push(650.0 - g.by);
        }
        assert!(ends[0] < ends[1] && ends[1] < ends[2], "{ends:?}");
    }

    #[test]
    fn a_pass_aimed_at_a_team_mate_reaches_him() {
        let mut g = Game::new(5);
        g.def.clear();
        g.intro = 0.0;
        // pass from the first midfielder towards the left winger
        let (o, t) = (g.att[0], g.att[2]);
        g.aim_begin();
        g.aim_update((t.x - o.x) * 0.92, (t.y - o.y) * 0.92);
        let a = g.compute_aim();
        assert_eq!(a.target, 2, "should snap to the winger");
        assert!(g.aim_release());
        run(&mut g, 3.0);
        assert_eq!(g.owner, 2, "winger should have the ball");
        assert_eq!(g.chain, 1);
    }

    #[test]
    fn a_defender_on_you_wins_the_ball() {
        let mut g = Game::new(9);
        g.def.truncate(1);
        g.intro = 0.0;
        g.shield = 0.0;
        let c = g.att[0];
        g.def[0] = Pl::at(c.x + 18.0, c.y);
        let before = g.match_t;
        run(&mut g, 1.0);
        assert!(g.match_t <= before - TURNOVER_COST, "losing the ball should cost match time");
        assert_eq!(g.phase, PH_RESULT);
        assert_eq!(g.result, R_TACKLED);
    }

    #[test]
    fn a_shot_into_an_empty_corner_scores_but_one_at_the_keeper_is_saved() {
        let mut g = Game::new(11);
        g.def.clear();
        g.att[0] = Pl::at(340.0, 160.0);
        g.owner = 0;
        g.intro = 0.0;
        g.shield = 0.0;
        g.gk.x = 300.0; // keeper has drifted to the left
        assert!(g.shoot(GOAL_R - 25.0));
        run(&mut g, 1.0);
        assert_eq!(g.result, R_GOAL, "corner shot should go in");

        let mut h = Game::new(11);
        h.def.clear();
        h.att[0] = Pl::at(340.0, 160.0);
        h.owner = 0;
        h.intro = 0.0;
        h.shield = 0.0;
        h.gk.x = 340.0;
        assert!(h.shoot(340.0));
        run(&mut h, 1.0);
        assert_eq!(h.result, R_SAVED, "shot at the keeper should be saved");
    }

    #[test]
    fn a_defender_in_the_way_blocks_the_shot() {
        let mut g = Game::new(13);
        g.def.truncate(1);
        g.att[0] = Pl::at(340.0, 300.0);
        g.def[0] = Pl::at(340.0, 240.0);
        g.owner = 0;
        g.intro = 0.0;
        g.shield = 0.0;
        g.def[0].tackle = 0.0;
        assert!(g.shoot(340.0));
        run(&mut g, 1.0);
        assert!(g.result == R_BLOCKED || g.result == R_TACKLED, "result {}", g.result);
    }

    #[test]
    fn the_match_ends_after_three_minutes() {
        let mut g = Game::new(21);
        let mut steps = 0;
        while g.phase != PH_OVER && steps < 60 * 400 { g.step(STEP); steps += 1; }
        assert_eq!(g.phase, PH_OVER);
        assert!(g.match_t <= 0.001, "clock {}", g.match_t);
        assert!(g.attack_no > 1, "losing the ball should start new attacks, not end the game");
    }

    #[test]
    fn a_lob_flies_over_a_defender_and_lands_where_aimed() {
        let mut g = Game::new(31);
        g.def.truncate(1);
        g.intro = 0.0;
        g.shield = 5.0;
        let (o, t) = (g.att[0], g.att[2]);
        // a defender stands right on the line of the pass
        g.def[0] = Pl::at((o.x + t.x) / 2.0, (o.y + t.y) / 2.0);
        g.set_pass_kind(PK_LOB);
        g.aim_begin();
        g.aim_update((t.x - o.x) * 0.95, (t.y - o.y) * 0.95);
        let a = g.compute_aim();
        assert_eq!(a.target, 2);
        assert!(g.aim_release());
        assert!(g.lob_on);
        assert_eq!(g.pass_kind, PK_GROUND, "the next pass is a ground pass again");
        let mut max_z = 0.0f32;
        for _ in 0..60 * 3 {
            g.step(STEP);
            if g.lob_on { max_z = max_z.max(((g.lob_t / g.lob_dur).min(1.0) * PI).sin() * g.lob_h); }
            if g.phase != PH_PLAY || g.owner >= 0 { break; }
        }
        assert!(max_z > 20.0, "the ball should go up in the air");
        assert_eq!(g.phase, PH_PLAY, "the defender must not have cut it out");
        assert_eq!(g.owner, 2, "the winger should collect the lob");
    }

    #[test]
    fn a_through_ball_sends_the_runner_ahead() {
        let mut g = Game::new(32);
        g.def.clear();
        g.intro = 0.0;
        g.shield = 5.0;
        let (o, t) = (g.att[0], g.att[2]);
        g.set_pass_kind(PK_THROUGH);
        g.aim_begin();
        g.aim_update((t.x - o.x) * 0.95, (t.y - o.y) * 0.95);
        let a = g.compute_aim();
        assert_eq!(a.target, 2);
        assert!(a.ey < t.y - 40.0, "through ball should aim ahead of him ({} vs {})", a.ey, t.y);
        assert!(g.aim_release());
        assert!(g.through_on);
        run(&mut g, 4.0);
        assert_eq!(g.owner, 2, "the winger should run onto it");
    }

    #[test]
    fn the_pass_line_shows_when_a_defender_is_in_the_way() {
        let mut g = Game::new(33);
        g.intro = 0.0;
        let (o, t) = (g.att[0], g.att[2]);
        g.def[0] = Pl::at((o.x + t.x) / 2.0, (o.y + t.y) / 2.0);
        g.aim_begin();
        g.aim_update((t.x - o.x) * 0.95, (t.y - o.y) * 0.95);
        assert_eq!(g.compute_aim().safe, 2, "red: blocked");
        g.def[0] = Pl::at((o.x + t.x) / 2.0 + 130.0, (o.y + t.y) / 2.0);
        assert_eq!(g.compute_aim().safe, 0, "green: clear");
        g.export();
        assert!(g.out[PLAYER_BASE + 2 * PLAYER_STRIDE + 8] >= 1.0, "team-mates carry an open marker");
    }

    #[test]
    fn charging_a_shot_needs_timing() {
        // goals from 220 away with the power at: too soft, in the green, blazed
        let mut goals = [0u32; 3];
        for (k, power) in [0.30f32, 0.80, 1.0].iter().enumerate() {
            for seed in 0..60u32 {
                let mut g = Game::versus(seed + 400, Stats::default(), SK_ROCKET, 1);
                g.def.clear();
                g.att[0] = Pl::at(340.0, 220.0);
                g.sync_ball_to_owner();
                g.owner = 0; g.intro = 0.0; g.shield = 0.0;
                let corner = g.far_corner();
                g.fire_shot(corner, *power, false);
                run(&mut g, 1.5);
                if g.result == R_GOAL { goals[k] += 1; }
            }
        }
        println!("goals out of 60: soft {}, green {}, blazed {}", goals[0], goals[1], goals[2]);
        assert!(goals[1] > goals[0] && goals[1] > goals[2], "timing the shot should matter: {goals:?}");
    }

    #[test]
    fn holding_the_button_builds_power() {
        let mut g = Game::new(40);
        g.def.clear();
        g.intro = 0.0; g.shield = 5.0;
        assert!(g.shot_begin(300.0));
        for _ in 0..30 { g.tick(16.7); }
        assert!(g.charge_power() > 0.4 && g.charge_power() < 0.7, "power {}", g.charge_power());
        assert!(g.shot_fire());
        assert!(g.shot_live);
    }

    #[test]
    fn a_super_shot_is_unstoppable_close_in_but_can_be_saved_from_far() {
        let (mut close, mut far) = (0, 0);
        for seed in 0..40u32 {
            for (dist_y, count) in [(170.0f32, &mut close), (440.0f32, &mut far)] {
                let mut g = Game::versus(seed + 700, Stats::default(), SK_ROCKET, 3);
                g.def.clear();
                g.att[0] = Pl::at(340.0 + (seed as f32 - 20.0) * 1.5, dist_y);
                g.sync_ball_to_owner();
                g.owner = 0; g.intro = 0.0; g.shield = 0.0;
                g.gk.x = 340.0 + (seed % 5) as f32 * 8.0 - 16.0;
                g.fire_shot(f32::NAN, SWEET, true);
                run(&mut g, 2.0);
                if g.result == R_GOAL { *count += 1; }
            }
        }
        println!("super shot goals out of 40: close {close}, far {far}");
        assert_eq!(close, 40, "from close in nobody stops a super shot");
        assert!(far < 20, "from long range the keeper should save most of them ({far})");
    }

    #[test]
    fn passing_charges_the_meter_and_a_super_shot_scores() {
        for seed in 0..30u32 {
            let mut g = Game::new(seed + 100);
            g.def.truncate(3);
            g.intro = 0.0;
            assert!(!g.use_super(), "meter is empty at the start");
            g.meter = 1.0;
            g.att[0] = Pl::at(340.0, 190.0);
            g.sync_ball_to_owner();
            g.owner = 0;
            g.shield = 5.0;
            assert!(g.use_super());
            assert_eq!(g.phase, PH_CINE);
            run(&mut g, 3.0);
            assert_eq!(g.result, R_GOAL, "seed {seed}: super shot should always go in");
            assert_eq!(g.meter, 0.0);
        }
    }

    #[test]
    fn lining_up_a_pass_slows_time_for_a_moment() {
        let mut g = Game::new(8);
        g.intro = 0.0;
        g.shield = 0.0;
        let before = g.def[0].y;
        // 0.5s of real time while aiming: almost nothing happens
        g.aim_begin();
        for _ in 0..30 { g.tick(16.7); }
        let slowed = (g.def[0].y - before).abs();
        assert!(g.slow_left < SLOW_BUDGET - 0.4 && g.slow_left > 0.4, "left {}", g.slow_left);
        // once the budget is used up, time runs normally again
        for _ in 0..120 { g.tick(16.7); }
        assert_eq!(g.slow_left, 0.0);
        let mut h = Game::new(8);
        h.intro = 0.0;
        h.shield = 0.0;
        for _ in 0..30 { h.tick(16.7); }
        let normal = (h.def[0].y - before).abs();
        assert!(slowed < normal * 0.4, "slowed {slowed} vs normal {normal}");
    }

    #[test]
    fn time_stop_freezes_the_defenders() {
        let mut g = Game::with(4, Stats::default(), SK_FREEZE);
        g.intro = 0.0;
        g.shield = 0.0;
        g.meter = 1.0;
        assert!(g.use_super());
        run(&mut g, 1.3);
        assert!(g.freeze_t > 3.0, "freeze {}", g.freeze_t);
        let before: Vec<(f32, f32)> = g.def.iter().map(|d| (d.x, d.y)).collect();
        run(&mut g, 2.0);
        for (d, b) in g.def.iter().zip(before) { assert!(dist(d.x, d.y, b.0, b.1) < 1.0, "defender moved while frozen"); }
        assert_eq!(g.phase, PH_PLAY, "nobody can tackle while time is stopped");
    }

    #[test]
    fn upgrades_help() {
        let tough = Stats { speed: 10.0, power: 10.0, technique: 10.0, composure: 10.0 };
        let mut g = Game::with(1, tough, SK_ROCKET);
        assert!(g.max_pass() > MAX_PASS + 50.0 && g.assist_cos() < ASSIST_COS && g.att_speed() > ATT_SPEED * 1.3);
        g.intro = 0.0;
        g.shield = 0.0;
        g.att[0] = Pl::at(340.0, 400.0);
        g.sync_ball_to_owner();
        g.shoot(340.0);
        assert!(hyp(g.bvx, g.bvy) > SHOT_SPEED * 1.25);
    }

    // ---- a simple computer player, to check the game is fair: not impossible, not a pushover.
    // It thinks about four times a second, passes along clear lanes (lobbing when they are not),
    // and times its shots like a person would: usually in the green, sometimes not.
    pub fn bot_pub(g: &mut Game) { bot(g, true); }
    fn human_power(g: &mut Game) -> f32 { clamp(SWEET + g.rng.gauss() * 0.14, 0.2, 1.0) }
    fn bot(g: &mut Game, smart: bool) {
        if g.phase != PH_PLAY || g.owner < 0 || g.shield > 0.25 { return; }
        let o = g.att[g.owner as usize];
        if smart && g.meter >= 1.0 && o.y < 320.0 { g.use_super(); return; }
        let mut near = f32::MAX;
        for d in &g.def { near = near.min(dist(d.x, d.y, o.x, o.y)); }
        if !smart {
            if g.rng.f() < 0.05 { let p = human_power(g); g.fire_shot(f32::NAN, p, false); } else {
                g.aim_begin();
                let (dx, dy) = (g.rng.range(-300.0, 300.0), g.rng.range(-300.0, 100.0));
                g.aim_update(dx, dy);
                g.aim_release();
            }
            return;
        }
        let d_goal = dist(o.x, o.y, GOAL_C, 0.0);
        let angle_ok = (o.x - GOAL_C).abs() < d_goal * 0.9;
        // people sometimes just hit it somewhere
        if g.rng.f() < 0.12 {
            g.aim_begin();
            let (dx, dy) = (g.rng.range(-200.0, 200.0), g.rng.range(-220.0, 60.0));
            g.aim_update(dx, dy);
            g.aim_release();
            return;
        }
        if (o.y < 250.0 && angle_ok) || (near < 60.0 && o.y < 330.0) { let p = human_power(g); g.fire_shot(f32::NAN, p, false); return; }
        // pass to the most advanced team-mate whose lane is clear; if none, try a lob
        let mut best: Option<(usize, f32, bool)> = None;
        for (j, t) in g.att.iter().enumerate() {
            if j as i32 == g.owner { continue; }
            let mut lane = f32::MAX;
            let mut around = f32::MAX;
            for d in &g.def { lane = lane.min(seg_dist(d.x, d.y, o.x, o.y, t.x, t.y)); around = around.min(dist(d.x, d.y, t.x, t.y)); }
            let score = (o.y - t.y) * 0.4 + lane.min(60.0) * 1.2 + around.min(80.0);
            if lane > 48.0 && best.map_or(true, |b| score > b.1) { best = Some((j, score, false)); }
            else if around > 60.0 && best.map_or(true, |b| b.2 && score > b.1) && best.map_or(true, |b| b.2) { best = Some((j, score - 40.0, true)); }
        }
        if let Some((j, _, lob)) = best {
            let t = g.att[j];
            g.set_pass_kind(if lob { PK_LOB } else { PK_GROUND });
            g.aim_begin();
            g.aim_update(t.x - o.x, t.y - o.y);
            g.aim_release();
        } else if o.y < 380.0 { let p = human_power(g); g.fire_shot(f32::NAN, p, false); } else {
            g.aim_begin();
            g.aim_update(0.0, -150.0);
            g.aim_release();
        }
    }

    fn average_score(smart: bool, games: u32) -> (f32, f32) { average_with(smart, games, Stats::default(), SK_ROCKET, 1) }

    fn average_with(smart: bool, games: u32, st: Stats, skill: u8, team: usize) -> (f32, f32) {
        let (mut total, mut goals) = (0.0, 0.0);
        for seed in 0..games {
            let mut g = Game::versus(seed * 7 + 1, st, skill, team);
            let mut guard = 0;
            while g.phase != PH_OVER && guard < 60 * 600 {
                if guard % 36 == 0 { bot(&mut g, smart); }
                g.step(STEP);
                guard += 1;
            }
            assert_eq!(g.phase, PH_OVER, "game {seed} never ended");
            total += g.score as f32;
            goals += g.goals as f32;
        }
        (total / games as f32, goals / games as f32)
    }

    #[test]
    fn harder_teams_are_harder() {
        let mut row = Vec::new();
        for team in 0..TEAMS.len() { row.push(average_with(true, 40, Stats::default(), SK_ROCKET, team).1); }
        println!("goals a match by team: {row:.1?}");
        assert!(row[0] > row[5] * 1.4, "the first team should be much easier than the last: {row:?}");
        assert!(row[5] > 2.0, "even the best team can be beaten sometimes: {row:?}");
        assert!(row[0] > row[2] && row[1] > row[4], "teams should get harder up the ladder: {row:?}");
    }

    #[test]
    fn upgrades_make_it_easier_but_never_a_walkover() {
        let (_, base) = average_with(true, 60, Stats::default(), SK_ROCKET, 3);
        let maxed = Stats { speed: 10.0, power: 10.0, technique: 10.0, composure: 10.0 };
        let (_, rocket) = average_with(true, 60, maxed, SK_ROCKET, 3);
        let (_, freeze) = average_with(true, 60, maxed, SK_FREEZE, 3);
        println!("goals a game: no upgrades {base:.2}, maxed + rocket {rocket:.2}, maxed + time stop {freeze:.2}");
        assert!(rocket > base * 0.8 && freeze > base * 0.8, "upgrades must not make it worse ({base} {rocket} {freeze})");
        assert!(rocket < base * 2.2 && freeze < base * 2.2, "a maxed player must not run away with it");
    }

    #[test]
    fn the_game_is_fair() {
        let (rs, rg) = average_score(false, 120);
        let (ss, sg) = average_score(true, 120);
        println!("random player: {rs:.0} points, {rg:.2} goals a game; sensible player: {ss:.0} points, {sg:.2} goals a game");
        assert!(sg > rg * 4.0, "a sensible player should beat random play by a mile");
        assert!(sg > 3.0, "a sensible player should score sometimes ({sg})");
    }
}

#[cfg(test)]
mod trace {
    use super::*;
    #[test]
    fn trace_one() { for sd in 2..4 { trace_seed(sd); } }
    fn trace_seed(sd: u32) {
        println!("--- seed {sd}");
        let mut g = Game::new(sd);
        let mut last_owner = -2;
        for f in 0..900 {
            if f % 10 == 0 { super::tests::bot_pub(&mut g); }
            g.step(STEP);
            if g.owner != last_owner || g.phase != PH_PLAY {
                println!("t={:.2} owner {} phase {} res {} chain {} carrier {:?}", g.time, g.owner, g.phase, g.result, g.chain, if g.owner>=0 {Some((g.att[g.owner as usize].x as i32, g.att[g.owner as usize].y as i32))} else {None});
                last_owner = g.owner;
                if g.phase != PH_PLAY { break; }
            }
        }
        for d in &g.def { println!("def {} {} tackle {}", d.x as i32, d.y as i32, d.tackle); }
    }
}

#[cfg(test)]
mod debug {
    use super::*;
    #[test]
    fn where_goals_come_from() {
        for team in [0usize, 5] {
            let (mut sup, mut norm, mut dists) = (0, 0, Vec::new());
            for seed in 0..20u32 {
                let mut g = Game::versus(seed * 7 + 1, Stats::default(), SK_ROCKET, team);
                let mut guard = 0;
                while g.phase != PH_OVER && guard < 60 * 600 {
                    if guard % 36 == 0 { super::tests::bot_pub(&mut g); }
                    let was = g.phase;
                    let sup_flag = g.shot_super;
                    let from = g.shot_from;
                    g.step(STEP);
                    if was == PH_PLAY && g.phase == PH_RESULT && g.result == R_GOAL { if sup_flag { sup += 1; } else { norm += 1; dists.push(from as i32); } }
                    guard += 1;
                }
            }
            dists.sort();
            println!("team {team}: super goals {sup}, normal goals {norm}, median shot distance {:?}", dists.get(dists.len() / 2));
        }
    }
}

#[cfg(test)]
mod probe {
    use super::*;
    #[test]
    fn shot_rates() {
        for team in 0..TEAMS.len() {
            let mut row = Vec::new();
            for y in [140.0f32, 200.0, 260.0, 330.0] {
                let mut goals = 0;
                for seed in 0..80u32 {
                    let mut g = Game::versus(seed + 900, Stats::default(), SK_ROCKET, team);
                    g.def.clear();
                    g.att[0] = Pl::at(300.0 + (seed % 9) as f32 * 10.0, y);
                    g.gk.x = 340.0 + ((seed % 7) as f32 - 3.0) * 6.0;
                    g.sync_ball_to_owner();
                    g.owner = 0; g.intro = 0.0; g.shield = 0.0;
                    let c = g.far_corner();
                    g.fire_shot(c, SWEET, false);
                    for _ in 0..120 { g.step(STEP); if g.phase != PH_PLAY { break; } }
                    if g.result == R_GOAL { goals += 1; }
                }
                row.push(goals * 100 / 80);
            }
            println!("team {team}: goal % from 140/200/260/330 away: {row:?}");
        }
    }
}
