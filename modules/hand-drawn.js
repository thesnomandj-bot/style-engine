/* ============================================================================
   STYLE ENGINE · MODULE 1 · HAND-DRAWN · JS BINDER
   ----------------------------------------------------------------------------
   WHY THIS EXISTS (honest architectural note):
     Pure-CSS effects (wobble, grain opacity, rotation, misregistration) read
     their dial directly through calc() and need no JS. But three effects live
     on SVG filter *attributes* that CSS custom properties cannot target:
       - feDisplacementMap "scale"   (the roughen strength)
       - <animate> "dur"             (the boil speed)
       - feTurbulence base frequency (boil steps)
     This binder is the ONLY place those attributes are written, and it writes
     them FROM the dials. So the dial is still the single source of truth;
     the binder is just the courier for props CSS can't carry.

   PUBLIC API (this is the seam the future MACRO layer plugs into):
     StyleEngine.setDial('--hd-wobble', 80)  -> sets the var + re-syncs SVG
     StyleEngine.sync()                       -> re-read all dials, re-apply
     StyleEngine.drawLines(selector)          -> (re)run self-drawing lines
   A macro will simply call setDial() many times from one 0-100 input.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  function dial(name) {
    var v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return isNaN(v) ? 0 : v;
  }

  /* Map the sketchiness dial (0-100) onto feDisplacementMap scale.
     Sweet spot for the roughen look is scale 2-6; 0-100 -> 0-7 covers it. */
  function roughenScale() { return (dial("--hd-sketchiness") * 0.07).toFixed(2); }

  /* Boil speed dial (0-100) -> <animate> dur. Fast dial = short dur.
     ~ (110 - v) * 0.012s  => v=0 -> 1.32s, v=50 -> 0.72s, v=100 -> 0.12s. */
  function boilDur() { return Math.max(0.08, (110 - dial("--hd-boil-speed")) * 0.012).toFixed(3) + "s"; }

  function sync() {
    var reduce = reduceMQ.matches;

    // Roughen: push displacement scale from the sketchiness dial.
    var maps = document.querySelectorAll("feDisplacementMap[data-hd-roughen]");
    for (var i = 0; i < maps.length; i++) maps[i].setAttribute("scale", roughenScale());

    // Boil: push dur from the boil-speed dial; freeze entirely under reduce.
    var boils = document.querySelectorAll("animate[data-hd-boil]");
    for (var j = 0; j < boils.length; j++) {
      var a = boils[j];
      if (reduce) {
        // SVG <animate> ignores prefers-reduced-motion, so we stop it ourselves.
        try { a.setAttribute("dur", "9999s"); if (typeof a.endElement === "function") a.endElement(); } catch (e) {}
      } else {
        a.setAttribute("dur", boilDur());
        try { if (typeof a.beginElement === "function") a.beginElement(); } catch (e2) {}
      }
    }
  }

  /* Self-drawing lines: measure each path and prime the dash vars, then run.
     Skips the animation (draws instantly) when reduced motion is requested. */
  function drawLines(selector) {
    var paths = document.querySelectorAll(selector || ".hd-draw-path");
    var reduce = reduceMQ.matches;
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      var len = 1000;
      try { len = p.getTotalLength(); } catch (e) {}
      p.style.setProperty("--hd-path-len", len);
      p.classList.remove("hd-draw-run");
      // force reflow so the animation can be re-triggered
      void p.getBoundingClientRect();
      if (!reduce) p.classList.add("hd-draw-run");
      else { p.style.strokeDashoffset = "0"; }
    }
  }

  function setDial(name, value) {
    root.style.setProperty(name, value);
    sync();
  }

  // React to the user toggling their reduced-motion preference live.
  try { reduceMQ.addEventListener("change", sync); }
  catch (e) { if (reduceMQ.addListener) reduceMQ.addListener(sync); }

  window.StyleEngine = window.StyleEngine || {};
  window.StyleEngine.setDial = setDial;
  window.StyleEngine.sync = sync;
  window.StyleEngine.drawLines = drawLines;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { sync(); drawLines(); });
  } else { sync(); drawLines(); }
})();
