/*
 * Style Engine — Macro Engine (the routing layer)
 * ------------------------------------------------
 * A macro is a single 0-100 knob that drives many module dials at once,
 * each with its own range, curve, and active window — exactly like an
 * Ableton Live effect-rack macro knob.
 *
 * This module adds NO CSS custom properties of its own. It is pure JS
 * routing: it reads/writes OTHER modules' dials by calling
 * StyleEngine.setDial(name, value). It never touches the DOM or CSS vars
 * directly (except optional non-:root elementScope writes, and reading
 * computed style during serialize()).
 *
 * NOTE: Multiple macros targeting the same dial is last-write-wins behavior.
 * Whichever macro's setValue() runs last determines the dial's final value.
 * There is no merge, blend, or priority system — design macro mappings
 * with non-overlapping targets when possible, or accept last-write-wins.
 *
 * Depends only on the global `StyleEngine`.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var StyleEngine = window.StyleEngine;
  if (!StyleEngine) {
    // Nothing to attach to. Fail quietly rather than throwing at load time.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[macro] StyleEngine global not found — macro engine not installed.');
    }
    return;
  }

  // ---- Canonical dial registry ------------------------------------------
  // The complete set of dials across every module. Used by serialize() so
  // that a preset captures the full state even for modules whose dials the
  // macros do not touch. Missing modules are handled gracefully: reading a
  // computed var that is unset yields '' and is simply skipped.
  var ALL_DIALS = [
    // Hand-drawn
    '--hd-wobble', '--hd-grain', '--hd-rotation', '--hd-boil-speed',
    '--hd-sketchiness', '--hd-line-weight', '--hd-overshoot',
    // Glitch
    '--gl-rgb-split', '--gl-jitter', '--gl-dropout', '--gl-block-shift',
    '--gl-scanlines', '--gl-static', '--gl-rate',
    // Text-motion
    '--tm-speed', '--tm-stagger', '--tm-randomness', '--tm-scramble-pool',
    '--tm-overshoot',
    // Media-decay
    '--md-grain', '--md-dust', '--md-warble', '--md-ghosting', '--md-tint',
    '--md-vignette', '--md-flutter'
  ];

  // ---- Internal state ---------------------------------------------------
  var macros = {};      // id -> macro definition
  var autoSeq = 0;      // fallback id counter

  function nextId() {
    autoSeq += 1;
    return 'macro-' + autoSeq;
  }

  function clamp(v, lo, hi) {
    v = Number(v);
    if (isNaN(v)) v = lo;
    return v < lo ? lo : (v > hi ? hi : v);
  }

  // ---- Curve math -------------------------------------------------------
  function easeInOut(t) {
    // Cubic ease-in-out.
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function applyCurve(curve, t) {
    switch (curve) {
      case 'ease': return easeInOut(t);
      case 'exp':  return t * t;
      case 'linear':
      default:     return t;
    }
  }

  // ---- Mapping normalization -------------------------------------------
  function normalizeMapping(m) {
    m = m || {};
    var win = m.window;
    if (!win || win.length !== 2) win = [0, 100];
    var start = Number(win[0]);
    var end = Number(win[1]);
    if (isNaN(start)) start = 0;
    if (isNaN(end)) end = 100;
    // Guard against a zero-width or inverted window (avoids divide-by-zero).
    if (end <= start) end = start + 0.0001;
    return {
      cssVar: m.cssVar,
      elementScope: m.elementScope || ':root',
      min: m.min == null ? 0 : Number(m.min),
      max: m.max == null ? 100 : Number(m.max),
      curve: m.curve || 'linear',
      window: [start, end]
    };
  }

  // ---- Window + curve evaluation ---------------------------------------
  // Given a macro value and one mapping, return the output dial value.
  //   macroValue < window[0]  -> min  (not yet engaged)
  //   macroValue > window[1]  -> max  (fully engaged)
  //   between                 -> interpolate along the chosen curve
  function evalMapping(m, macroValue) {
    var start = m.window[0];
    var end = m.window[1];
    if (macroValue <= start) return m.min;
    if (macroValue >= end)   return m.max;
    var t = (macroValue - start) / (end - start);
    var shaped = applyCurve(m.curve, t);
    return m.min + (m.max - m.min) * shaped;
  }

  // ---- Dial writing -----------------------------------------------------
  // For :root targets, route through StyleEngine.setDial so every module's
  // registered sync function fires. For non-:root scopes, write the var
  // directly on the target element (module sync functions run relative to
  // :root, so scoped writes are the caller's explicit choice).
  //
  // NOTE: If multiple macros map to the same cssVar, the last setValue()
  // call wins. There is no conflict resolution — this is intentional
  // last-write-wins behavior, matching how Ableton rack macros work when
  // two macros target the same parameter.
  function writeDial(mapping, value) {
    if (mapping.elementScope && mapping.elementScope !== ':root') {
      try {
        var el = document.querySelector(mapping.elementScope);
        if (el) el.style.setProperty(mapping.cssVar, String(value));
      } catch (e) {
        if (console && console.warn) console.warn('[macro] bad elementScope ' + mapping.elementScope, e);
      }
      return;
    }
    if (typeof StyleEngine.setDial === 'function') {
      StyleEngine.setDial(mapping.cssVar, value);
    }
  }

  // ---- Read a dial's current numeric value from :root -------------------
  function readDial(cssVar) {
    try {
      var raw = getComputedStyle(document.documentElement)
        .getPropertyValue(cssVar).trim();
      if (raw === '') return null;
      var n = parseFloat(raw);
      return isNaN(n) ? null : n;
    } catch (e) {
      return null;
    }
  }

  // ---- Public API -------------------------------------------------------
  var api = {
    /**
     * create({ id?, name?, description?, value?, mappings? }) -> id
     */
    create: function (opts) {
      opts = opts || {};
      var id = opts.id || nextId();
      macros[id] = {
        id: id,
        name: opts.name || id,
        description: opts.description || '',
        value: opts.value == null ? 0 : clamp(opts.value, 0, 100),
        mappings: (opts.mappings || []).map(normalizeMapping)
      };
      return id;
    },

    /**
     * delete(id) -> boolean  (removes the macro and all its mappings)
     *
     * NOTE: Driven dials are left at their last macro-driven values.
     * This is intentional — the macro engine does not track "pre-macro"
     * dial state, so there is no original value to restore. If you need
     * dials reset after deletion, call StyleEngine.setDial() explicitly
     * for each affected dial, or load a preset that sets the desired
     * baseline values.
     */
    delete: function (id) {
      if (macros[id]) { delete macros[id]; return true; }
      return false;
    },

    /** get(id) -> macro definition (live reference) or null */
    get: function (id) {
      return macros[id] || null;
    },

    /** list() -> array of macro ids */
    list: function () {
      return Object.keys(macros);
    },

    /** addMapping(id, mapping) -> index of the new mapping, or -1 */
    addMapping: function (id, mapping) {
      var mac = macros[id];
      if (!mac) return -1;
      mac.mappings.push(normalizeMapping(mapping));
      return mac.mappings.length - 1;
    },

    /** removeMapping(id, index) -> boolean */
    removeMapping: function (id, index) {
      var mac = macros[id];
      if (!mac || index < 0 || index >= mac.mappings.length) return false;
      mac.mappings.splice(index, 1);
      return true;
    },

    /**
     * setValue(id, value) — set the macro to 0-100 and apply every mapping
     * live. For each mapping: compute the output via window + curve, then
     * drive the target dial through StyleEngine.setDial (or a scoped write).
     */
    setValue: function (id, value) {
      var mac = macros[id];
      if (!mac) return false;
      mac.value = clamp(value, 0, 100);
      for (var i = 0; i < mac.mappings.length; i++) {
        var m = mac.mappings[i];
        writeDial(m, evalMapping(m, mac.value));
      }
      return true;
    },

    /** getValue(id) -> current 0-100 value, or null */
    getValue: function (id) {
      return macros[id] ? macros[id].value : null;
    },

    /**
     * serialize() -> preset object (versioned).
     * Captures ALL current dial values (read from computed style on :root)
     * plus every macro definition.
     */
    serialize: function () {
      var dials = {};
      for (var i = 0; i < ALL_DIALS.length; i++) {
        var v = readDial(ALL_DIALS[i]);
        if (v != null) dials[ALL_DIALS[i]] = v;
      }
      var out = [];
      var ids = Object.keys(macros);
      for (var j = 0; j < ids.length; j++) {
        var mac = macros[ids[j]];
        out.push({
          id: mac.id,
          name: mac.name,
          description: mac.description,
          value: mac.value,
          mappings: mac.mappings.map(function (m) {
            return {
              cssVar: m.cssVar,
              elementScope: m.elementScope,
              min: m.min,
              max: m.max,
              curve: m.curve,
              window: [m.window[0], m.window[1]]
            };
          })
        });
      }
      return {
        styleEnginePreset: 1,
        name: 'Untitled',
        description: '',
        dials: dials,
        macros: out
      };
    },

    /**
     * load(json) — import a preset. Accepts an object or a JSON string.
     *   1. Validate the version field.
     *   2. Recreate all macros from the "macros" array (data only, no side effects).
     *   3. Set all dials from the "dials" object (static baseline).
     *   4. Apply each macro's stored value (macro-driven dials override the
     *      static baseline from step 3, which is the correct round-trip order).
     * Returns true on success. Gracefully skips dials for modules that
     * are not loaded (setDial is a no-op for unknown vars in most builds).
     */
    load: function (json) {
      var preset = json;
      if (typeof json === 'string') {
        try {
          preset = JSON.parse(json);
        } catch (e) {
          throw new Error('[macro] Failed to parse preset JSON: ' + e.message);
        }
      }
      if (!preset || preset.styleEnginePreset !== 1) {
        throw new Error('[macro] Unsupported or missing preset version (expected styleEnginePreset: 1).');
      }

      // 2. Recreate all macros first (data only — setValue is not called yet).
      macros = {};
      var list = preset.macros || [];
      for (var j = 0; j < list.length; j++) {
        var def = list[j];
        api.create({
          id: def.id,
          name: def.name,
          description: def.description,
          value: def.value,
          mappings: def.mappings
        });
      }

      // 3. Set all static dials (baseline values from the preset snapshot).
      if (preset.dials && typeof StyleEngine.setDial === 'function') {
        var names = Object.keys(preset.dials);
        for (var i = 0; i < names.length; i++) {
          StyleEngine.setDial(names[i], preset.dials[names[i]]);
        }
      }

      // 4. Apply each macro's stored value. This overwrites the static dial
      //    values from step 3 for any dials that a macro targets — which is
      //    correct, because the macro's knob position is the authoritative
      //    source for those dials.
      var ids = Object.keys(macros);
      for (var k = 0; k < ids.length; k++) {
        api.setValue(ids[k], macros[ids[k]].value);
      }
      return true;
    }
  };

  // ---- Starter presets --------------------------------------------------
  // Each is a full versioned preset object, ready to hand to load(), OR to
  // read its single macro's mappings from. They define macros only (dials
  // default to whatever the modules already hold) so they compose cleanly.
  api.starterPresets = {

    // 1. DECAY (flagship): progressive cross-module decay from one knob.
    //    grain enters early, tint mid, warble mid, ghosting later,
    //    dropouts only past 70. Drives media-decay + glitch.
    DECAY: {
      styleEnginePreset: 1,
      name: 'DECAY',
      description: 'Flagship cross-module macro — progressive media rot from a single knob.',
      dials: {},
      macros: [{
        id: 'decay-master',
        name: 'DECAY',
        description: 'Turn it up and the medium falls apart in stages.',
        value: 0,
        mappings: [
          { cssVar: '--md-grain',    elementScope: ':root', min: 0, max: 85, curve: 'ease',   window: [0, 40] },
          { cssVar: '--md-tint',     elementScope: ':root', min: 0, max: 70, curve: 'linear', window: [20, 60] },
          { cssVar: '--md-warble',   elementScope: ':root', min: 0, max: 65, curve: 'ease',   window: [30, 70] },
          { cssVar: '--md-ghosting', elementScope: ':root', min: 0, max: 80, curve: 'exp',    window: [50, 90] },
          { cssVar: '--gl-dropout',  elementScope: ':root', min: 0, max: 60, curve: 'exp',    window: [70, 100] }
        ]
      }]
    },

    // 2. VINYL: dust-heavy + warm tint, with a touch of physical wobble.
    VINYL: {
      styleEnginePreset: 1,
      name: 'VINYL',
      description: 'Warm dusty record — surface noise and analog wobble.',
      dials: {},
      macros: [{
        id: 'vinyl-master',
        name: 'VINYL',
        description: 'Dust and warmth first, wobble as it wears.',
        value: 0,
        mappings: [
          { cssVar: '--md-dust',   elementScope: ':root', min: 0, max: 90, curve: 'ease',   window: [0, 50] },
          { cssVar: '--md-tint',   elementScope: ':root', min: 0, max: 60, curve: 'linear', window: [0, 40] },
          { cssVar: '--md-grain',  elementScope: ':root', min: 0, max: 45, curve: 'linear', window: [10, 70] },
          { cssVar: '--md-warble', elementScope: ':root', min: 0, max: 40, curve: 'ease',   window: [30, 90] },
          { cssVar: '--hd-wobble', elementScope: ':root', min: 0, max: 35, curve: 'ease',   window: [40, 100] }
        ]
      }]
    },

    // 3. VHS: ghosting + flutter (media-decay) + scanlines (glitch).
    VHS: {
      styleEnginePreset: 1,
      name: 'VHS',
      description: 'Tracking-error tape — ghosting, flutter, and scanlines.',
      dials: {},
      macros: [{
        id: 'vhs-master',
        name: 'VHS',
        description: 'Scanlines and flutter first, ghosting as the tape degrades.',
        value: 0,
        mappings: [
          { cssVar: '--gl-scanlines', elementScope: ':root', min: 0, max: 75, curve: 'linear', window: [0, 40] },
          { cssVar: '--md-flutter',   elementScope: ':root', min: 0, max: 70, curve: 'ease',   window: [0, 50] },
          { cssVar: '--md-ghosting',  elementScope: ':root', min: 0, max: 85, curve: 'exp',    window: [30, 90] },
          { cssVar: '--md-warble',    elementScope: ':root', min: 0, max: 50, curve: 'ease',   window: [40, 100] }
        ]
      }]
    },

    // 4. CASSETTE: warble + grain, the classic tape-hiss wow-and-flutter.
    CASSETTE: {
      styleEnginePreset: 1,
      name: 'CASSETTE',
      description: 'Bedroom-tape wow & flutter with a bed of hiss.',
      dials: {},
      macros: [{
        id: 'cassette-master',
        name: 'CASSETTE',
        description: 'Warble and grain climb together.',
        value: 0,
        mappings: [
          { cssVar: '--md-warble',  elementScope: ':root', min: 0, max: 80, curve: 'ease',   window: [0, 60] },
          { cssVar: '--md-grain',   elementScope: ':root', min: 0, max: 65, curve: 'linear', window: [0, 70] },
          { cssVar: '--md-flutter', elementScope: ':root', min: 0, max: 45, curve: 'ease',   window: [20, 90] },
          { cssVar: '--md-tint',    elementScope: ':root', min: 0, max: 35, curve: 'linear', window: [30, 100] }
        ]
      }]
    },

    // 5. HAND-MADE: drives all --hd-* dials proportionally.
    'HAND-MADE': {
      styleEnginePreset: 1,
      name: 'HAND-MADE',
      description: 'One knob from crisp to fully hand-drawn — every --hd-* dial at once.',
      dials: {},
      macros: [{
        id: 'handmade-master',
        name: 'HAND-MADE',
        description: 'Proportional sketchiness across the whole hand-drawn module.',
        value: 0,
        mappings: [
          { cssVar: '--hd-wobble',      elementScope: ':root', min: 0, max: 80, curve: 'ease',   window: [0, 100] },
          { cssVar: '--hd-rotation',    elementScope: ':root', min: 0, max: 60, curve: 'linear', window: [0, 100] },
          { cssVar: '--hd-sketchiness', elementScope: ':root', min: 0, max: 90, curve: 'ease',   window: [0, 100] },
          { cssVar: '--hd-boil-speed',  elementScope: ':root', min: 0, max: 70, curve: 'linear', window: [0, 100] },
          { cssVar: '--hd-grain',       elementScope: ':root', min: 0, max: 65, curve: 'linear', window: [0, 100] },
          { cssVar: '--hd-line-weight', elementScope: ':root', min: 0, max: 55, curve: 'ease',   window: [0, 100] },
          { cssVar: '--hd-overshoot',   elementScope: ':root', min: 0, max: 75, curve: 'exp',    window: [0, 100] }
        ]
      }]
    }
  };

  // Attach to the global.
  StyleEngine.macro = api;

})();
