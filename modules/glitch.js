/* ==========================================================================
   Style Engine — GLITCH module binder
   - Registers with the SHARED StyleEngine registry (created by hand-drawn.js).
   - Does NOT redefine window.StyleEngine or the registry itself.
   - Stepped animation only (setInterval firing at --gl-rate steps/sec).
   - Seeded per-element PRNG (mulberry32) → identical output across reloads.
   Public API: StyleEngine.glitch.burst(el, ms)
   ========================================================================== */
(function () {
  "use strict";

  var SE = (window.StyleEngine = window.StyleEngine || {});
  SE.glitch = SE.glitch || {};

  /* Elements that need per-step JS work (pure-CSS effects are excluded). */
  var STEP_SELECTOR = ".gl-target, .gl-jitter, .gl-dropout, .gl-block-shift, .gl-block";

  var state = {
    interval: null,
    step: 0,
    rate: 0,                                  /* steps per second            */
    lastSyncedRate: -1,                       /* cache for rate-change check */
    amps: { jitter: 0, block: 0, dropout: 0 },/* resolved px / fraction      */
    els: []
  };

  /* ---- host used to resolve CSS calc() values to real px ---------------- */
  function hostRoot() {
    return document.body || document.documentElement;
  }

  /* ---- Resolve a CSS length expression to a px number, honoring the
         cascade at `host` (so per-element dial overrides are respected). --- */
  function resolveLen(host, expr) {
    if (!host) return 0;
    var p = document.createElement("span");
    p.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;visibility:hidden;" +
      "height:0;padding:0;border:0;width:" + expr + ";";
    host.appendChild(p);
    var v = parseFloat(getComputedStyle(p).width) || 0;
    host.removeChild(p);
    return v;
  }

  /* ---- read raw dial numbers straight from computed style --------------- */
  function readDials() {
    var cs = getComputedStyle(document.documentElement);
    function n(name) { return parseFloat(cs.getPropertyValue(name)) || 0; }
    return {
      rgbSplit:   n("--gl-rgb-split"),
      jitter:     n("--gl-jitter"),
      dropout:    n("--gl-dropout"),
      blockShift: n("--gl-block-shift"),
      scanlines:  n("--gl-scanlines"),
      staticN:    n("--gl-static"),
      rate:       n("--gl-rate")
    };
  }

  /* ---- resolve the derived magnitudes (px / fraction) from CSS ---------- */
  function resolveAmps(host) {
    return {
      jitter:  resolveLen(host, "var(--_gl-jitter-amp)"),
      block:   resolveLen(host, "var(--_gl-block-amp)"),
      dropout: resolveLen(host, "calc(var(--_gl-dropout-frac) * 100px)") / 100
    };
  }
  function resolveRate(host) {
    return resolveLen(host, "calc(var(--_gl-rate) * 1px)");
  }

  /* ---- seeded PRNG (mulberry32) ---------------------------------------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function seedFor(el, i) {
    var s = el.getAttribute("data-gl-seed");
    if (s !== null && s !== "") {
      var num = parseInt(s, 10);
      return (isNaN(num) ? hashStr(s) : (num >>> 0));
    }
    /* stable fallback derived from the element's DOM index */
    return (0x9e3779b9 ^ Math.imul(i + 1, 2654435761)) >>> 0;
  }

  /* ---- ensure an element carries its own PRNG -------------------------- */
  function ensureEl(el, i) {
    if (!el.__glRng) {
      el.__glSeed = seedFor(el, i);
      el.__glRng = mulberry32(el.__glSeed);
    }
    return el;
  }

  /* ---- write the neutral (clean) live state to an element -------------- */
  function resetLive(el) {
    el.style.setProperty("--_gl-jx", "0px");
    el.style.setProperty("--_gl-jy", "0px");
    el.style.setProperty("--_gl-bx", "0px");
    el.style.setProperty("--_gl-bt", "50%");
    el.style.setProperty("--_gl-bb", "50%");
    el.style.setProperty("--_gl-vis", "1");
  }

  /* ---- ONE discrete step for ONE element ------------------------------- */
  function stepElement(el, amps) {
    var r = el.__glRng;
    if (!r) return;

    /* jitter — random offset within ±amp (px magnitude comes from the dial) */
    el.style.setProperty("--_gl-jx", ((r() * 2 - 1) * amps.jitter).toFixed(2) + "px");
    el.style.setProperty("--_gl-jy", ((r() * 2 - 1) * amps.jitter).toFixed(2) + "px");

    /* dropout — blink out when the draw falls under the dropout fraction */
    el.style.setProperty("--_gl-vis", r() < amps.dropout ? "0" : "1");

    /* block shift — on ~half the steps, displace a random horizontal band.
       Band POSITION (percent) is geometry, not a magnitude; the displacement
       distance (px) derives from the --gl-block-shift dial via amps.block. */
    if (r() < 0.5 && amps.block > 0) {
      var top = r() * 80;                 /* 0–80% down the element */
      var h = 5 + r() * 25;               /* 5–30% band height      */
      var bottom = Math.max(0, 100 - top - h);
      el.style.setProperty("--_gl-bt", top.toFixed(1) + "%");
      el.style.setProperty("--_gl-bb", bottom.toFixed(1) + "%");
      el.style.setProperty("--_gl-bx", ((r() * 2 - 1) * amps.block).toFixed(2) + "px");
    } else {
      el.style.setProperty("--_gl-bx", "0px");
    }
  }

  /* ---- collect + seed every stepping element --------------------------- */
  function collectElements() {
    state.els = [];
    var list = document.querySelectorAll(STEP_SELECTOR);
    for (var i = 0; i < list.length; i++) {
      state.els.push(ensureEl(list[i], i));
    }
  }

  /* ---- SVG binder: write filter attributes CSS cannot reach ------------ */
  function bindSvg() {
    /* Static — feTurbulence baseFrequency scales with the --gl-static dial.
       The MAX frequency lives in the SVG markup (data-gl-base-freq-max),
       so no magnitude is hard-coded here. */
    var staticN = readDials().staticN;
    var noises = document.querySelectorAll("[data-gl-static-noise]");
    for (var j = 0; j < noises.length; j++) {
      var max = parseFloat(noises[j].getAttribute("data-gl-base-freq-max") || "0");
      noises[j].setAttribute("baseFrequency", (staticN / 100 * max).toFixed(4));
    }
  }

  /* ---- interval control ------------------------------------------------ */
  function stopInterval() {
    if (state.interval !== null) {
      clearInterval(state.interval);
      state.interval = null;
    }
  }
  function tick() {
    state.step++;
    for (var i = 0; i < state.els.length; i++) {
      var el = state.els[i];
      /* burst-active elements use their own maxed amps */
      var amps = el.__glBurst ? el.__glAmps : state.amps;
      stepElement(el, amps);
    }
  }
  function restartInterval() {
    stopInterval();
    var ms = 1000 / state.rate;             /* rate > 0 guaranteed by caller */
    state.interval = setInterval(tick, ms);
  }

  function prefersReduced() {
    return !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ---- reduced-motion / frozen static state ---------------------------- */
  function applyStaticFinalState() {
    for (var i = 0; i < state.els.length; i++) resetLive(state.els[i]);
  }

  /* ======================================================================
     SYNC — called once on register and again on every StyleEngine.setDial
     ====================================================================== */
  function glitchSync() {
    var host = hostRoot();
    state.amps = resolveAmps(host);
    state.rate = resolveRate(host);
    collectElements();
    bindSvg();

    if (prefersReduced()) {
      stopInterval();
      state.lastSyncedRate = -1;
      applyStaticFinalState();              /* movement off, overlays remain */
      return;
    }
    if (state.rate <= 0) {
      stopInterval();                       /* FREEZE — keep last glitch state */
      state.lastSyncedRate = 0;
      return;                               /* (do NOT reset to clean)         */
    }
    /* Only restart the interval when the rate actually changed */
    if (state.rate !== state.lastSyncedRate) {
      restartInterval();
      state.lastSyncedRate = state.rate;
    }
  }

  /* ======================================================================
     PUBLIC API — StyleEngine.glitch.burst(el, ms)
     Max glitch on `el` for `ms` milliseconds, then restore prior state.
     Runs on its own interval so it fires even when the global rate is 0.
     ====================================================================== */
  SE.glitch.burst = function (el, ms) {
    if (!el) return;
    /* re-entrancy guard — skip if a burst is already running on this element */
    if (el.__glBursting) return;
    el.__glBursting = true;

    ms = ms || 400;
    el.classList.add("gl-target");
    ensureEl(el, state.els.length);

    /* remember any inline dial overrides so we can restore them exactly */
    var DIALS = ["--gl-jitter", "--gl-dropout", "--gl-block-shift",
                 "--gl-static", "--gl-scanlines", "--gl-rgb-split"];
    var saved = {};
    DIALS.forEach(function (d) { saved[d] = el.style.getPropertyValue(d); });

    /* push every dial to max on THIS element only */
    DIALS.forEach(function (d) { el.style.setProperty(d, "100"); });

    /* resolve max amps under el's overridden cascade — no hard-coded numbers */
    el.__glAmps = resolveAmps(el);
    el.__glBurst = true;

    var iv = setInterval(function () { stepElement(el, el.__glAmps); }, 1000 / 15);

    setTimeout(function () {
      clearInterval(iv);
      el.__glBurst = false;
      el.__glAmps = null;
      DIALS.forEach(function (d) {
        if (saved[d] === "" || saved[d] == null) el.style.removeProperty(d);
        else el.style.setProperty(d, saved[d]);
      });
      resetLive(el);
      el.__glBursting = false;
      if (typeof SE.sync === "function") SE.sync();   /* fold back into normal */
      else glitchSync();
    }, ms);
  };

  /* ======================================================================
     REGISTER with the shared registry (never redefine it).
     ====================================================================== */
  if (typeof SE.register === "function") {
    SE.register("glitch", glitchSync);
  } else {
    /* Registry not present yet — run once without creating a registry. */
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", glitchSync);
    } else {
      glitchSync();
    }
  }

  /* Re-sync when the user's motion preference changes at runtime. */
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var onChange = function () {
      if (typeof SE.sync === "function") SE.sync();
      else glitchSync();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();
