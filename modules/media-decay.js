/* =============================================================================
   media-decay.js — Analog Wear binder for the Style Engine
   -----------------------------------------------------------------------------
   Responsibilities CSS can't cover:
     - write SVG filter params (grain turbulence, dust sparsity threshold)
     - drive warble + flutter with DISCRETE stepping (never smooth easing)
     - place seeded dust specks / hairline scratches
     - build a soft duplicate "ghost" layer (analog bleed, not rgb-split)
   Registers as StyleEngine.register('media-decay', mdSync).
   Independent of the glitch module — no references to it whatsoever.
   ============================================================================= */
(function () {
  "use strict";

  // Reuse the existing registry; NEVER redefine window.StyleEngine.
  var SE = (window.StyleEngine = window.StyleEngine || {});

  // ---- Namespace for this module's public surface -------------------------
  SE.mediaDecay = SE.mediaDecay || {};

  // ---- Named presets (ship these) -----------------------------------------
  SE.mediaDecay.presets = {
    VINYL:    { grain: 30, dust: 70, warble: 10, ghosting: 0,  tint: 40, vignette: 20, flutter: 5  },
    VHS:      { grain: 20, dust: 15, warble: 20, ghosting: 60, tint: 15, vignette: 30, flutter: 40 },
    CASSETTE: { grain: 40, dust: 25, warble: 50, ghosting: 10, tint: 30, vignette: 10, flutter: 15 },
    CLEAN:    { grain: 0,  dust: 0,  warble: 0,  ghosting: 0,  tint: 0,  vignette: 0,  flutter: 0  }
  };

  var DIAL_NAMES = ["grain", "dust", "warble", "ghosting", "tint", "vignette", "flutter"];

  // ---- Seeded RNG (mulberry32) — deterministic dust placement -------------
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var DUST_SEED = 0x9e3779b9; // fixed → same dust pattern every run

  // ---- Helpers ------------------------------------------------------------
  function readDial(name) {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--md-" + name);
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
  }

  function setRootVar(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function targets() {
    return document.querySelectorAll(".md-target");
  }

  // ---- SVG filter params (attributes CSS cannot reach) --------------------
  function syncSvgParams(grain, dust) {
    var g = document.getElementById("md-grain-turb");
    if (g) {
      // Fine, high-frequency noise. Slight frequency lift with grain amount.
      var freq = (0.72 + grain / 100 * 0.20).toFixed(3);
      g.setAttribute("baseFrequency", freq);
      g.setAttribute("numOctaves", grain > 60 ? "3" : "2");
    }
    var d = document.getElementById("md-dust-turb");
    var a = document.getElementById("md-dust-alpha");
    if (d) d.setAttribute("baseFrequency", "0.018 0.02");
    if (a) {
      // Higher dust dial => lower alpha threshold => more specks survive.
      // intercept pushes most of the noise below 0 (invisible); dust raises it.
      var intercept = (-0.85 + dust / 100 * 0.75).toFixed(3);
      a.setAttribute("intercept", intercept);
      a.setAttribute("slope", "3");
    }
  }

  // ---- Dust: seeded specks + occasional hairline scratches ----------------
  function syncDust(dust) {
    document.querySelectorAll(".md-target, .md-dust").forEach(function (el) {
      var layer = el.querySelector(":scope > .md-dust-layer");
      if (dust <= 0) {
        if (layer) layer.remove();
        return;
      }
      // Rebuild deterministically so count tracks the dial.
      if (layer) layer.remove();
      layer = document.createElement("div");
      layer.className = "md-dust-layer";

      var rng = makeRng(DUST_SEED);
      var speckCount = Math.round(dust / 100 * 46);
      for (var i = 0; i < speckCount; i++) {
        var s = document.createElement("span");
        s.className = "md-speck" + (rng() > 0.55 ? " md-speck-dark" : "");
        var size = (0.5 + rng() * 1.8).toFixed(2);
        s.style.left = (rng() * 100).toFixed(2) + "%";
        s.style.top = (rng() * 100).toFixed(2) + "%";
        s.style.width = size + "px";
        s.style.height = size + "px";
        layer.appendChild(s);
      }
      // Scratches only appear once dust gets heavy.
      if (dust > 50) {
        var scratchCount = Math.round((dust - 50) / 50 * 3);
        for (var j = 0; j < scratchCount; j++) {
          var sc = document.createElement("span");
          sc.className = "md-scratch";
          sc.style.left = (rng() * 100).toFixed(2) + "%";
          sc.style.opacity = (0.3 + rng() * 0.5).toFixed(2);
          layer.appendChild(sc);
        }
      }
      el.appendChild(layer);
    });
  }

  // ---- Ghosting: soft duplicate content layer (analog bleed) --------------
  function syncGhost(ghosting) {
    document.querySelectorAll(".md-target, .md-ghosting").forEach(function (el) {
      var ghost = el.querySelector(":scope > .md-ghost-layer");
      if (ghosting <= 0) {
        if (ghost) ghost.remove();
        return;
      }
      if (!ghost) {
        ghost = document.createElement("div");
        ghost.className = "md-ghost-layer";
        ghost.setAttribute("aria-hidden", "true");
        el.appendChild(ghost);
      }
      // Duplicate the real content, minus our own overlay layers, softly.
      var clone = el.cloneNode(true);
      // Strip all id attributes from the clone to avoid duplicate IDs in the DOM.
      if (clone.id) clone.removeAttribute("id");
      Array.prototype.forEach.call(
        clone.querySelectorAll("[id]"),
        function (n) { n.removeAttribute("id"); }
      );
      Array.prototype.forEach.call(
        clone.querySelectorAll(".md-dust-layer, .md-ghost-layer"),
        function (n) { n.remove(); }
      );
      ghost.innerHTML = clone.innerHTML;
    });
  }

  // ---- Warble: DISCRETE horizontal wave stepping --------------------------
  // Fixed wave lookup; we step index-by-index, never interpolate.
  var WARBLE_WAVE = [0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5];
  var warbleTimer = null;
  var warbleIdx = 0;

  function stopWarble() {
    if (warbleTimer) { clearInterval(warbleTimer); warbleTimer = null; }
    setRootVar("--_md-warble-x", "0px");
  }

  function startWarble(warble) {
    stopWarble();
    if (warble <= 0 || prefersReducedMotion()) return;
    var ampPx = warble / 100 * 5;                 // matches --_md-warble-amp
    var stepMs = Math.max(90, 200 - warble);      // faster warble at higher dial
    warbleTimer = setInterval(function () {
      warbleIdx = (warbleIdx + 1) % WARBLE_WAVE.length;
      var x = (WARBLE_WAVE[warbleIdx] * ampPx).toFixed(2);
      setRootVar("--_md-warble-x", x + "px");     // discrete jump, no easing
    }, stepMs);
  }

  // ---- Flutter: DISCRETE brightness stepping (projector flicker) ----------
  var FLUTTER_STEPS = [1.00, 1.06, 0.96, 1.03, 0.94, 1.02, 0.98, 1.05];
  var flutterTimer = null;
  var flutterIdx = 0;

  function stopFlutter() {
    if (flutterTimer) { clearInterval(flutterTimer); flutterTimer = null; }
    setRootVar("--_md-flutter-b", "1");
  }

  function startFlutter(flutter) {
    stopFlutter();
    if (flutter <= 0 || prefersReducedMotion()) return;
    var depth = flutter / 100;
    var stepMs = Math.max(70, 160 - flutter);
    flutterTimer = setInterval(function () {
      flutterIdx = (flutterIdx + 1) % FLUTTER_STEPS.length;
      // Scale each step's deviation from 1 by depth → discrete brightness jump.
      var b = (1 + (FLUTTER_STEPS[flutterIdx] - 1) * depth).toFixed(3);
      setRootVar("--_md-flutter-b", b);
    }, stepMs);
  }

  // ---- Main sync ----------------------------------------------------------
  function mdSync() {
    var grain    = readDial("grain");
    var dust     = readDial("dust");
    var warble   = readDial("warble");
    var ghosting = readDial("ghosting");
    var flutter  = readDial("flutter");
    // tint + vignette are pure CSS (driven by --md-* directly) — nothing to do.

    syncSvgParams(grain, dust);
    syncDust(dust);
    syncGhost(ghosting);

    if (prefersReducedMotion()) {
      stopWarble();
      stopFlutter();
    } else {
      startWarble(warble);
      startFlutter(flutter);
    }
  }

  // ---- Preset application -------------------------------------------------
  SE.mediaDecay.applyPreset = function (name) {
    var preset = SE.mediaDecay.presets[name];
    if (!preset) {
      console.warn("[media-decay] unknown preset:", name);
      return false;
    }
    DIAL_NAMES.forEach(function (dial) {
      var value = preset[dial];
      // Prefer the registry's setDial if present; fall back to direct set.
      if (typeof SE.setDial === "function") {
        SE.setDial("--md-" + dial, value);
      } else {
        setRootVar("--md-" + dial, value);
      }
    });
    // Ensure syncers run even if setDial was unavailable.
    if (typeof SE.sync === "function") SE.sync();
    else mdSync();
    return true;
  };

  // Expose sync for external callers / tests.
  SE.mediaDecay.sync = mdSync;

  // Re-evaluate if the user toggles reduced-motion at runtime.
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var onChange = function () { mdSync(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // ---- Register with the engine (runs mdSync once immediately) ------------
  if (typeof SE.register === "function") {
    SE.register("media-decay", mdSync);
  } else {
    // Engine core not loaded yet — run once so the module is at least usable.
    console.warn("[media-decay] StyleEngine.register missing; running standalone");
    mdSync();
  }
})();
