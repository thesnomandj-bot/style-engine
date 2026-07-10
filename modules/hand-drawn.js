/* ============================================================================
   STYLE ENGINE · JS BINDER (Module 1 · Hand-Drawn)
   ----------------------------------------------------------------------------
   WHY THIS EXISTS:
     Pure-CSS effects (wobble, grain opacity, rotation, overshoot, misregistration)
     read their dial directly via calc() and need no JS. Three effects live on SVG
     filter *attributes* that CSS custom properties cannot target:
       - feDisplacementMap "scale"   (roughen strength, from --hd-sketchiness)
       - <animate> "dur"             (boil speed,       from --hd-boil-speed)
       - <animate> begin/end          (boil freeze/run)
     This binder is the ONLY place those attributes are written, and it writes them
     FROM the dials. The dial stays the single source of truth.

   REGISTRY (this is what lets future modules bolt on WITHOUT rework):
     StyleEngine is a shared REGISTRY, not a single function. Each module registers
     its own sync function; setDial() re-runs EVERY registered sync. A future glitch
     module calls StyleEngine.register('glitch', glitchSync) instead of overwriting
     StyleEngine.setDial, so one macro can drive dials across many modules and every
     module's binder still fires.

   PUBLIC API (the macro-layer seam):
     StyleEngine.register(id, syncFn)   -> add a module's syncer (runs it once)
     StyleEngine.setDial(name, value)   -> set a --*-* var + re-run ALL syncers
     StyleEngine.sync()                 -> re-run all syncers (no var change)
     StyleEngine.drawLines(selector)    -> (re)run hand-drawn self-drawing lines
   ========================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- shared registry (module-agnostic) ---------- */
  var SE = (window.StyleEngine = window.StyleEngine || {});
  if (!SE._registry) {
    SE._registry = [];
    SE.register = function (id, fn) {
      SE._registry = SE._registry.filter(function (r) { return r.id !== id; });
      SE._registry.push({ id: id, fn: fn });
      try { fn(); } catch (e) {}
    };
    SE.sync = function () {
      for (var i = 0; i < SE._registry.length; i++) {
        try { SE._registry[i].fn(); } catch (e) {}
      }
    };
    SE.setDial = function (name, value) {
      root.style.setProperty(name, value);
      SE.sync();
    };
  }

  /* ---------- hand-drawn syncer ---------- */
  function dial(name) {
    var v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return isNaN(v) ? 0 : v;
  }
  // sketchiness 0-100 -> feDisplacementMap scale 0-7 (roughen sweet spot 2-6)
  function roughenScale() { return (dial("--hd-sketchiness") * 0.07).toFixed(2); }
  // boil-speed 0-100 -> <animate> dur; fast dial = short dur
  function boilDur() { return Math.max(0.08, (110 - dial("--hd-boil-speed")) * 0.012).toFixed(3) + "s"; }

  function handDrawnSync() {
    var reduce = reduceMQ.matches;
    var speed = dial("--hd-boil-speed");

    // roughen: cheap, non-restarting — write unconditionally.
    var maps = document.querySelectorAll("feDisplacementMap[data-hd-roughen]");
    for (var i = 0; i < maps.length; i++) maps[i].setAttribute("scale", roughenScale());

    // boil: freeze when reduced-motion OR dial at/near 0; otherwise run. Only call
    // beginElement() when the run-state or dur actually CHANGES, so dragging an
    // unrelated dial (or a 7-dial macro sweep) does not restart the SMIL each frame.
    var frozen = reduce || speed <= 1;
    var boils = document.querySelectorAll("animate[data-hd-boil]");
    for (var j = 0; j < boils.length; j++) {
      var a = boils[j];
      if (frozen) {
        if (a._hdRunning !== false) {
          try { if (a.endElement) a.endElement(); } catch (e1) {}
          a.setAttribute("dur", "9999s");
          a._hdRunning = false; a._hdLastDur = null;
        }
        continue;
      }
      var dur = boilDur();
      if (a.getAttribute("dur") !== dur) a.setAttribute("dur", dur);
      if (a._hdRunning !== true || a._hdLastDur !== dur) {
        try { if (a.beginElement) a.beginElement(); } catch (e2) {}
        a._hdRunning = true; a._hdLastDur = dur;
      }
    }
  }

  /* Self-drawing lines: measure each path, prime the dash vars, run (or draw
     instantly under reduced motion). */
  function drawLines(selector) {
    var paths = document.querySelectorAll(selector || ".hd-draw-path");
    var reduce = reduceMQ.matches;
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      var len = 1000;
      try { len = p.getTotalLength(); } catch (e) {}
      p.style.setProperty("--hd-path-len", len);
      p.classList.remove("hd-draw-run");
      void p.getBoundingClientRect(); // reflow so the animation can re-trigger
      if (!reduce) p.classList.add("hd-draw-run");
      else p.style.strokeDashoffset = "0";
    }
  }
  SE.drawLines = drawLines;

  // Re-sync when the user toggles their reduced-motion preference live.
  try { reduceMQ.addEventListener("change", SE.sync); }
  catch (e) { if (reduceMQ.addListener) reduceMQ.addListener(SE.sync); }

  function init() {
    SE.register("hand-drawn", handDrawnSync); // registers AND runs the syncer once
    drawLines();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
