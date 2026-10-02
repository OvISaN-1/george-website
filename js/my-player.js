/* ================================================================
   MY PLAYER
   Make George look the way you want: hair, shirt number, kit, boots
   and goal celebration. Saved by quiz-zone/george-look.js and used by
   every game. Hair and number are free; kits, boots and celebrations
   are unlocked by levelling up in Matchday or Free Kick Masters.
   ================================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  if (!window.GL || !window.GK) return;

  const msg = (t) => { $("msg").textContent = t || ""; };
  const QUICK = [7, 9, 10, 11, 14, 17, 19, 21, 23, 99];

  // What a locked item needs, in words.
  function needOf(x) {
    if (x.ach) return "🏆 " + x.how;
    const alt = x.fk ? (x.fk.stars != null ? ` or ${x.fk.stars} ★ in Free Kick` : ` or Free Kick level ${x.fk.level}`) : "";
    return `Level ${x.need}${alt}`;
  }

  function render() {
    const L = GL.get();
    const kit = GL.pick("kit", "home"), bootsId = GL.pick("boots", "black"), celeId = GL.pick("cele", "armsup");
    const P = GL.progress();

    $("prog").textContent = `You are level ${P.mdLevel} in Matchday and level ${P.fkLevel} in Free Kick Masters (${P.fkStars} ★). Either one unlocks things.`;

    // The preview: face on, and from behind in his kit.
    $("pv-front").innerHTML = GK.avatar({ pose: "idle", kit, happy: true });
    $("pv-back").innerHTML = `<svg viewBox="-45 -160 90 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="George from behind">${GK.georgeStriker(kit, GL.bootsColour(bootsId))}</svg>`;
    $("pv-num").textContent = L.number;

    // Hair styles, each shown on a little George in the colour chosen.
    $("hair-styles").innerHTML = GL.HAIRS.map((h) => `
      <button type="button" class="opt" data-hair="${h.id}" aria-pressed="${L.hair === h.id}" aria-label="${esc(h.name)} hair">
        <span style="width:58px;display:block">${GK.avatar({ pose: "idle", kit, happy: true, look: { hair: h.id, hairColour: L.hairColour } })}</span>
        <span class="n">${esc(h.name)}</span></button>`).join("");
    $("hair-colours").innerHTML = GL.HAIR_COLOURS.map((c) => `
      <button type="button" class="sw" data-colour="${c.id}" aria-pressed="${L.hairColour === c.id}" aria-label="${esc(c.name)}" title="${esc(c.name)}" style="background:${c.base}"></button>`).join("");

    // Number
    $("num").value = L.number;
    $("num-chips").innerHTML = QUICK.map((n) => `<button type="button" class="chip" data-n="${n}" aria-pressed="${L.number === n}">${n}</button>`).join("");

    // Kits, boots, celebrations
    const opt = (type, x, art, selected) => {
      const open = GL.unlocked(type, x.id);
      return `<button type="button" class="opt${open ? "" : " locked"}" data-${type}="${x.id}" aria-pressed="${selected}" ${open ? "" : 'aria-disabled="true"'}>
        ${art}<span class="n">${esc(x.name)}</span><span class="need">${selected ? "✓ Chosen" : open ? "Tap to choose" : "🔒 " + esc(needOf(x))}</span></button>`;
    };
    $("kits").innerHTML = GL.CATALOG.kit.map((x) => {
      const k = GK.KITS[x.id];
      return opt("kit", x, `<span class="art" style="background:${k.shirt};color:${k.text};border-color:${k.trim}">${L.number}</span>`, kit === x.id);
    }).join("");
    $("boots").innerHTML = GL.CATALOG.boots.map((x) => opt("boots", x, `<span class="art boot" style="background:${x.colour}"></span>`, bootsId === x.id)).join("");
    $("celes").innerHTML = GL.CATALOG.cele.map((x) => opt("cele", x, `<span class="e" aria-hidden="true">${x.icon || "🎉"}</span>`, celeId === x.id)).join("");
  }

  function play() { return GL.celebrate($("pv-host"), { ms: 2100 }); }

  // Changing the number updates things in place (not re-drawing the buttons), so a tap on a kit
  // straight after typing a number is not lost when the box loses focus.
  function setNumber(n) {
    n = Math.max(1, Math.min(99, parseInt(n, 10) || 10));
    GL.set({ number: n });
    const kit = GL.pick("kit", "home");
    $("pv-num").textContent = n;
    if (document.activeElement !== $("num")) $("num").value = n;
    $("pv-back").innerHTML = `<svg viewBox="-45 -160 90 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="George from behind">${GK.georgeStriker(kit, GL.bootsColour(GL.pick("boots", "black")))}</svg>`;
    document.querySelectorAll("#kits .art").forEach((el) => { el.textContent = n; });
    document.querySelectorAll("#num-chips .chip").forEach((el) => el.setAttribute("aria-pressed", String(+el.dataset.n === n)));
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.hair) { GL.set({ hair: b.dataset.hair }); render(); msg(""); return; }
    if (b.dataset.colour) { GL.set({ hairColour: b.dataset.colour }); render(); msg(""); return; }
    if (b.dataset.n) { setNumber(b.dataset.n); msg(""); return; }
    for (const type of ["kit", "boots", "cele"]) {
      if (!b.dataset[type]) continue;
      const x = GL.find(type, b.dataset[type]);
      if (!GL.unlocked(type, x.id)) { msg(`Locked: ${x.name} needs ${needOf(x)}.`); return; }
      GL.set({ [type]: x.id });
      render(); msg("");
      if (type === "cele") play();
      return;
    }
  });
  $("num-up").addEventListener("click", () => setNumber(GL.get().number + 1));
  $("num-down").addEventListener("click", () => setNumber(GL.get().number - 1));
  $("num").addEventListener("change", () => setNumber($("num").value));
  $("pv-play").addEventListener("click", play);
  $("pv-reset").addEventListener("click", () => { GL.reset(); render(); msg("Back to the normal George. Your unlocks are still safe."); });
  window.addEventListener("storage", (e) => { if (e.key === GL.KEY) render(); });

  render();
})();
