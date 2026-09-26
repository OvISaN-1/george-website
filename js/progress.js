/* ================================================================
   MOVE MY PROGRESS
   Everything the games save lives in this browser's localStorage,
   which belongs to one web address on one device. This page packs
   the site's saves into a file (or a code) and unpacks them again
   somewhere else. Only the site's own keys are touched.
   ================================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const OURS = /^(gz_|gamezone_|gw_)/;
  const FORMAT = "george-website-progress";

  function collect() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (OURS.test(k)) data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return data;
  }
  function pack() { return { format: FORMAT, v: 1, saved: new Date().toISOString(), from: location.host, data: collect() }; }

  // A short, readable description of what a save holds.
  function describe(data) {
    const j = (k) => { try { return JSON.parse(data[k]); } catch (e) { return null; } };
    const out = [];
    const md = j("gz_matchday_v1"), car = j("gz_matchday_career_v1"), brain = j("gz_matchday_brain_v1");
    if (md && md.played) out.push(`🏟️ Matchday: ${md.played} match${md.played === 1 ? "" : "es"} (won ${md.wins || 0}, drew ${md.draws || 0}, lost ${md.losses || 0}), ${md.georgeGoals || 0} George goals`);
    if (car) out.push(`⭐ George's card: ${(car.xp || 0).toLocaleString("en-GB")} XP, ${car.matches || 0} career matches`);
    if (brain) out.push(`🧠 ${Object.keys(brain).length} questions the game has learned about`);
    if (data.gz_freekick_v1) out.push("🎯 Free Kick Masters save");
    const st = j("gamezone_stats_v1");
    if (st) out.push("🏅 Game Zone stats and badges");
    const other = Object.keys(data).filter((k) => /sound|voice|pin/.test(k)).length;
    if (other) out.push(`⚙️ ${other} setting${other === 1 ? "" : "s"} (sound, voice…)`);
    if (!out.length) out.push("Nothing saved yet");
    return out;
  }
  const list = (el, items) => { el.innerHTML = items.map((t) => `<li>${t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</li>`).join(""); };

  /* ---- Codes: JSON, gzipped when the browser can, then base64 ---- */
  const toB64 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
  async function toCode(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) { try { return "GEORGE1Z:" + toB64(await pipe(raw, new CompressionStream("gzip"))); } catch (e) {} }
    return "GEORGE1:" + toB64(raw);
  }
  async function fromText(text) {
    const t = text.trim().replace(/\s+/g, "");
    if (t.startsWith("{")) return JSON.parse(text);
    if (t.startsWith("GEORGE1Z:")) {
      if (!window.DecompressionStream) throw new Error("old browser");
      return JSON.parse(new TextDecoder().decode(await pipe(fromB64(t.slice(9)), new DecompressionStream("gzip"))));
    }
    if (t.startsWith("GEORGE1:")) return JSON.parse(new TextDecoder().decode(fromB64(t.slice(8))));
    throw new Error("not a code");
  }

  /* ---- Save ---- */
  list($("here"), describe(collect()));
  const saveMsg = (t, ok) => { $("save-msg").textContent = t; $("save-msg").className = "msg " + (ok ? "good" : "bad"); };
  $("save-file").addEventListener("click", () => {
    const p = pack();
    if (!Object.keys(p.data).length) return saveMsg("There's nothing saved on this device yet.", false);
    const blob = new Blob([JSON.stringify(p)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `george-progress-${p.saved.slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    saveMsg("✓ Saved. Now open it on the other device or web address.", true);
  });
  $("save-code").addEventListener("click", async () => {
    const p = pack();
    if (!Object.keys(p.data).length) return saveMsg("There's nothing saved on this device yet.", false);
    const code = await toCode(p);
    try { await navigator.clipboard.writeText(code); saveMsg(`✓ Code copied (${code.length.toLocaleString("en-GB")} characters). Paste it into a message to yourself.`, true); }
    catch (e) {
      // Clipboard blocked: show the code so it can be copied by hand.
      $("show-paste").click(); $("code").value = code; $("code").select();
      saveMsg("Couldn't copy automatically. The code is in the box below: select it all and copy.", false);
    }
  });

  /* ---- Load ---- */
  let pending = null;
  const loadMsg = (t, ok) => { $("load-msg").textContent = t; $("load-msg").className = "msg " + (ok ? "good" : "bad"); };
  function check(obj) {
    if (!obj || obj.format !== FORMAT || typeof obj.data !== "object") throw new Error("wrong format");
    const data = {};
    Object.entries(obj.data).forEach(([k, v]) => { if (OURS.test(k) && typeof v === "string") data[k] = v; });
    if (!Object.keys(data).length) throw new Error("empty");
    pending = data;
    list($("there"), describe(data).concat(obj.saved ? [`🕒 Saved ${new Date(obj.saved).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}${obj.from ? " on " + obj.from : ""}`] : []));
    $("confirm").hidden = false;
    loadMsg("", true);
  }
  function fail() { pending = null; $("confirm").hidden = true; loadMsg("That doesn't look like a George progress file or code. Try saving it again.", false); }
  $("load-file").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try { check(await fromText(await f.text())); } catch (err) { fail(); }
    e.target.value = "";
  });
  $("show-paste").addEventListener("click", () => { $("paste").hidden = false; $("code").focus(); });
  $("use-code").addEventListener("click", async () => { try { check(await fromText($("code").value)); } catch (err) { fail(); } });
  $("load-go").addEventListener("click", () => {
    if (!pending) return;
    try {
      // Replace this device's saves with the loaded ones.
      Object.keys(collect()).forEach((k) => localStorage.removeItem(k));
      Object.entries(pending).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch (e) { return loadMsg("Couldn't save on this device (is it in private browsing?).", false); }
    pending = null;
    $("confirm").hidden = true;
    list($("here"), describe(collect()));
    loadMsg("✓ Loaded! Everything is back. Off you go and play. ⚽", true);
  });
})();
