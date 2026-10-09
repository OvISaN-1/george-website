/* ================================================================
   TIKI-TAKA COMMENTARY
   The words the commentator says. tiki-taka.js tells this file what
   just happened and it hands back a line. Lines are picked at random
   and never the same one twice in a row.
   ================================================================ */
(function () {
  "use strict";

  const LINES = {
    start1: ["And we're underway! Three minutes on the clock!", "Here comes George with the ball at his feet. Let's see some tiki-taka!", "Kick-off! Be patient, pass it quickly, then strike!"],
    startN: ["Here we go again! Another attack!", "Fresh legs, fresh attack!", "Back to the kick-off spot. Let's go again!"],
    startLast: ["The last attack! Everything on this one!", "Final attack of the match. Make it count, George!"],

    pass1: ["Nice and simple.", "Quick feet, good ball.", "Neat little pass.", "Lovely and tidy."],
    pass2: ["Two in a row! That's tiki-taka!", "A one-two! They can't get near it!", "Lovely passing, keeping it moving!"],
    pass3: ["Three passes! They're chasing shadows!", "The defence is being pulled all over the place!", "Beautiful football, this!"],
    pass5: ["{n} passes in a row! This is a masterclass!", "Pass, pass, pass! The crowd are loving it!", "They haven't touched it for {n} passes! Unreal!"],
    passLob: ["What a lob! Right over the top of them!", "Chipped over the defence, lovely touch!", "Up it goes... and it drops perfectly!"],
    passThrough: ["Threaded through! He's in behind!", "A killer ball, splitting the defence!", "Through the middle, he's away!"],
    shotPerfect: ["Perfectly struck!", "Right in the sweet spot!", "Pure timing on that one!"],
    shotBlazed: ["He's blazed that!", "Way too hard, that's going anywhere!", "Overhit! He's gone for power over placement!"],
    shotWeak: ["That's a soft one...", "He's scuffed it, no power at all.", "A tame effort, the keeper will gather that."],
    passLong: ["What a ball! Straight through the middle of them!", "Long and accurate, brilliant vision!", "That is a pass and a half!"],
    passLocked: ["Right on the money, straight to his feet!", "Perfect weight on that one!"],

    pressure: ["Defender closing in! Get rid of it!", "Here comes the pressure, move it quickly!", "He's got company! Pass or shoot!"],
    meter: ["He's charged up! Super skill ready!", "The power is building... and it's ready!"],

    shot: ["He's going to shoot!", "George lets fly!", "Here comes the strike!", "He's pulled the trigger!"],
    shotFar: ["From distance! He's having a go!", "A long way out, but he's shooting!"],
    rocket: ["ROCKET SHOT! Hold on to your hats!", "He's winding up a screamer!", "This is going to be special!"],
    freeze: ["TIME STOP! The defenders are frozen to the spot!", "Everything stops! Nobody can move!", "Frozen! They've turned into statues!"],

    goal: ["GOAAAL! What a finish!", "It's in! Georgeeee!", "Back of the net! Unbelievable!", "GOAL! The crowd go wild!"],
    goalChain: ["GOAL! And what a move! {n} passes before the finish!", "Tiki-taka at its finest! {n} passes and a goal!", "GOAL! Sublime! That was {n} passes of pure class!"],
    goalFar: ["GOAL! From miles out! Absolute rocket!", "WHAT A STRIKE! From way out there!"],
    goalSuper: ["GOAL! Unstoppable! Nobody was stopping that!", "GOAL! The keeper never saw it!"],

    save: ["Saved! The keeper gets a hand to it!", "What a stop! Brilliant goalkeeping!", "Denied! The keeper was equal to it!"],
    miss: ["Off target! That's gone wide.", "Oh, he's put it the wrong side of the post.", "Wide! He'll want that one back."],
    post: ["OFF THE POST! So close!", "Hits the woodwork! Unlucky!", "The post saves them! Inches away!"],
    block: ["Blocked! A defender throws himself in the way!", "Great block! Bodies on the line!"],
    tackle: ["Tackled! The defender wins it.", "Lost the ball! He held on too long.", "They've won it back! Pass it quicker next time."],

    end0: ["Full time. No goals this time, but plenty of effort!"],
    end1: ["Full time. One goal. Not bad at all!"],
    end3: ["Full time! {g} goals, a great performance!"],
    end4: ["Full time! {g} goals! An absolute masterclass!"],
  };

  const lastOf = {};
  function say(key, vars) {
    const pool = LINES[key] || [""];
    let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && lastOf[key] === i) i = (i + 1) % pool.length;
    lastOf[key] = i;
    let t = pool[i];
    for (const k in vars || {}) t = t.split("{" + k + "}").join(vars[k]);
    return t;
  }

  window.TTCommentary = { say, LINES };
})();
