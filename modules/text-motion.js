/* ============================================================================
   Style Engine — TEXT-MOTION MODULE (Reveal Library)
   JS-driven text reveals: typewriter, scramble, staggered-rise, wipe,
   cascade-drop, blur-in. Composable on any text element.

   Public API:
     StyleEngine.text.reveal(el, type)   — trigger a reveal
   Auto-init:
     <span class="tm-target" data-tm="scramble">Hello</span>
   Contracts:
     - Registers as StyleEngine.register('text-motion', tmSync)
     - Does NOT redefine window.StyleEngine (only ensures it exists)
     - Re-triggerable (reset + replay)
     - prefers-reduced-motion -> instant final text
     - Scramble uses STEPPED setInterval cycling (slot-machine feel)
     - Original text stored; text stays accessible via aria-label
   ========================================================================== */
(function () {
  'use strict';

  /* Ensure the shared registry object exists WITHOUT redefining its methods.
     hand-drawn.js normally creates register/setDial/sync — we only reference. */
  var SE = window.StyleEngine || (window.StyleEngine = {});

  var reduceMQ = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)');
  var REDUCE = reduceMQ && reduceMQ.matches;

  /* Listen for live changes to the reduced-motion preference */
  if (reduceMQ) {
    try {
      reduceMQ.addEventListener("change", function(e) { REDUCE = e.matches; SE.sync(); });
    } catch(e2) {
      if (reduceMQ.addListener) reduceMQ.addListener(function(e) { REDUCE = e.matches; SE.sync(); });
    }
  }

  /* ---- Scramble character pools ------------------------------------------ */
  var POOL_BASE    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var POOL_SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>/?|~';
  var POOL_UNICODE = '░▒▓█▄▀■□◆◇○●△▽⊕⊗¤§¶Ψ¥Ω†‡';

  /* ------------------------------------------------------------------------ */
  /* Dial reading                                                             */
  /* ------------------------------------------------------------------------ */
  function readDial(name, fallback) {
    var root = document.documentElement;
    var raw = getComputedStyle(root).getPropertyValue('--tm-' + name);
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  function currentDials() {
    var speed      = readDial('speed', 50);
    var stagger    = readDial('stagger', 45);
    var randomness = readDial('randomness', 0);
    var pool       = readDial('scramble-pool', 30);
    var overshoot  = readDial('overshoot', 40);
    // Mirror the CSS-derived math so JS timing matches CSS timing.
    var durationMs = 3000 - (speed * 28);      // speed 0->3000, 100->200
    var staggerMs  = stagger * 2;              // 0->0, 100->200
    return {
      speed: speed, stagger: stagger, randomness: randomness,
      pool: pool, overshoot: overshoot,
      durationMs: Math.max(120, durationMs),
      staggerMs: Math.max(0, staggerMs)
    };
  }

  var DIALS = currentDials(); // cache refreshed by tmSync()

  /* ------------------------------------------------------------------------ */
  /* Seeded PRNG (mulberry32) + stable string hash                            */
  /* ------------------------------------------------------------------------ */
  function hashString(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Reveal ORDER (ranks). Seed is derived from the text so it is stable
     across reloads; randomness dial controls how much the L→R order shuffles.
     Returns an array `rank` where rank[i] = the ordinal position (0..n-1) at
     which character i is revealed. */
  function computeRanks(text, n, randomness) {
    var order = [];
    for (var i = 0; i < n; i++) order[i] = i;

    var amount = Math.max(0, Math.min(1, randomness / 100));
    if (amount > 0 && n > 1) {
      var rand = mulberry32(hashString(text) ^ 0x9E3779B9);
      // Partial Fisher–Yates: each element swaps only with probability `amount`.
      for (var k = n - 1; k > 0; k--) {
        if (rand() < amount) {
          var j = Math.floor(rand() * (k + 1));
          var tmp = order[k]; order[k] = order[j]; order[j] = tmp;
        }
      }
    }
    // order[position] = charIndex  ->  invert to rank[charIndex] = position
    var rank = new Array(n);
    for (var p = 0; p < n; p++) rank[order[p]] = p;
    return rank;
  }

  /* ------------------------------------------------------------------------ */
  /* Scramble pool builder (grows with the scramble-pool dial)                */
  /* ------------------------------------------------------------------------ */
  function buildPool(poolDial) {
    var frac = Math.max(0, Math.min(1, poolDial / 100));
    var pool = POOL_BASE;
    var symCount = Math.floor(frac * POOL_SYMBOLS.length);
    if (symCount > 0) pool += POOL_SYMBOLS.slice(0, symCount);
    if (poolDial > 66) {
      var uniCount = Math.floor(((poolDial - 66) / 34) * POOL_UNICODE.length);
      pool += POOL_UNICODE.slice(0, uniCount);
    }
    return pool;
  }

  function randGlyph(pool, rng) {
    return pool.charAt(Math.floor(rng() * pool.length));
  }

  /* ------------------------------------------------------------------------ */
  /* Text splitting                                                           */
  /* ------------------------------------------------------------------------ */
  function getOriginal(el) {
    if (typeof el._tmOriginal !== 'string') {
      el._tmOriginal = el.textContent;
    }
    return el._tmOriginal;
  }

  function resetElement(el) {
    // Kill any running timers/intervals from a previous reveal.
    if (el._tm) {
      if (el._tm.interval) clearInterval(el._tm.interval);
      if (el._tm.timers) el._tm.timers.forEach(clearTimeout);
    }
    el._tm = { interval: null, timers: [], type: null, chars: [], inner: null };
  }

  // Splits original text into .tm-word > .tm-char spans inside an aria-hidden
  // wrapper. The original text is exposed to screen readers via aria-label.
  function splitText(el, original) {
    if (!el.classList.contains('tm-target')) el.classList.add('tm-target');
    el.textContent = '';
    el.setAttribute('aria-label', original);

    var inner = document.createElement('span');
    inner.className = 'tm-inner';
    inner.setAttribute('aria-hidden', 'true');

    var chars = [];
    // Keep whitespace tokens so wrapping between words still works.
    var tokens = original.split(/(\s+)/);
    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];
      if (token.length === 0) continue;
      if (/^\s+$/.test(token)) {
        inner.appendChild(document.createTextNode(token));
        continue;
      }
      var word = document.createElement('span');
      word.className = 'tm-word';
      for (var c = 0; c < token.length; c++) {
        var s = document.createElement('span');
        s.className = 'tm-char';
        s.textContent = token.charAt(c);
        word.appendChild(s);
        chars.push(s);
      }
      inner.appendChild(word);
    }
    el.appendChild(inner);
    return { inner: inner, chars: chars };
  }

  /* ------------------------------------------------------------------------ */
  /* Reveal-type implementations                                              */
  /* Each receives (el, chars, inner, d) where d = dial snapshot.             */
  /* ------------------------------------------------------------------------ */

  // Assign a keyframe animation per char, delayed by reveal rank.
  function keyframeReveal(el, chars, keyframe, d, easing) {
    var ranks = computeRanks(el._tmOriginal, chars.length, d.randomness);
    for (var i = 0; i < chars.length; i++) {
      var delay = ranks[i] * d.staggerMs;
      chars[i].style.animation =
        keyframe + ' ' + Math.round(d.durationMs) + 'ms ' +
        easing + ' ' + Math.round(delay) + 'ms both';
    }
  }

  function revealStaggeredRise(el, chars, inner, d) {
    keyframeReveal(el, chars, 'tm-rise', d,
      d.overshoot > 0 ? 'cubic-bezier(.22,1.4,.36,1)' : 'ease-out');
  }

  function revealCascadeDrop(el, chars, inner, d) {
    keyframeReveal(el, chars, 'tm-drop', d,
      d.overshoot > 0 ? 'cubic-bezier(.22,1.4,.36,1)' : 'ease-out');
  }

  function revealBlurIn(el, chars, inner, d) {
    keyframeReveal(el, chars, 'tm-blur-in', d, 'ease-out');
  }

  // Wipe reveals the whole line via clip-path; direction from data-tm-dir.
  function revealWipe(el, chars, inner, d) {
    var dir = (el.getAttribute('data-tm-dir') || 'lr').toLowerCase();
    if (dir !== 'lr' && dir !== 'rl' && dir !== 'tb') dir = 'lr';
    /* Wipe uses clip-path which requires position:relative + overflow:hidden */
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    inner.style.animation =
      'tm-wipe-' + dir + ' ' + Math.round(d.durationMs) + 'ms ease both';
  }

  // Typewriter: chars appear one by one L→R, blinking cursor trails the end.
  function revealTypewriter(el, chars, inner, d) {
    var n = chars.length;
    for (var i = 0; i < n; i++) chars[i].style.opacity = '0';

    var cursor = document.createElement('span');
    cursor.className = 'tm-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.style.height = '1em';
    inner.appendChild(cursor);

    // Per-char delay scales with speed; stagger nudges it wider.
    var perChar = Math.max(18, Math.round(d.durationMs / Math.max(n, 8)) + d.staggerMs * 0.3);
    var idx = 0;
    el._tm.interval = setInterval(function () {
      if (idx >= n) {
        clearInterval(el._tm.interval);
        el._tm.interval = null;
        /* Let the cursor blink briefly after completion, then remove it */
        var cursorTimer = setTimeout(function () {
          if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
        }, 2000);
        el._tm.timers.push(cursorTimer);
        return;
      }
      chars[idx].style.opacity = '1';
      idx++;
    }, perChar);
  }

  // Scramble: STEPPED slot-machine cycling via setInterval (never smooth).
  function revealScramble(el, chars, inner, d) {
    var n = chars.length;
    var finals = [];
    var i;
    for (i = 0; i < n; i++) {
      finals[i] = chars[i].textContent;
      chars[i].style.opacity = '1';
    }

    var ranks = computeRanks(el._tmOriginal, n, d.randomness);
    var rng = mulberry32(hashString(el._tmOriginal) ^ 0x1B873593);

    // Discrete tick; faster speed dial -> faster ticking.
    var tickMs = Math.max(24, Math.round(d.durationMs / 26));
    var baseSteps = 5;
    var stepsPerRank = d.staggerMs > 0 ? Math.max(1, Math.round(d.staggerMs / tickMs)) : 1;

    var settleTick = [];
    for (i = 0; i < n; i++) {
      settleTick[i] = baseSteps + ranks[i] * stepsPerRank + Math.floor(rng() * 4);
    }

    var tick = 0;
    el._tm.interval = setInterval(function () {
      var d2 = currentDials();               // live: reflects mid-flight dial changes
      var pool = buildPool(d2.pool);
      var remaining = 0;
      for (var j = 0; j < n; j++) {
        if (finals[j] === ' ') { chars[j].textContent = ' '; continue; }
        if (tick >= settleTick[j]) {
          if (chars[j].textContent !== finals[j]) chars[j].textContent = finals[j];
        } else {
          chars[j].textContent = randGlyph(pool, rng); // discrete swap, no tween
          remaining++;
        }
      }
      tick++;
      if (remaining === 0) {
        clearInterval(el._tm.interval);
        el._tm.interval = null;
      }
    }, tickMs);
  }

  var TYPES = {
    'typewriter': revealTypewriter,
    'scramble': revealScramble,
    'staggered-rise': revealStaggeredRise,
    'wipe': revealWipe,
    'cascade-drop': revealCascadeDrop,
    'blur-in': revealBlurIn
  };

  /* ------------------------------------------------------------------------ */
  /* Public reveal()                                                          */
  /* ------------------------------------------------------------------------ */
  function reveal(el, type) {
    if (!el) return;
    type = (type || el.getAttribute('data-tm') || 'staggered-rise').toLowerCase();
    var impl = TYPES[type];
    if (!impl) {
      // Unknown type: fail safe by showing the plain text.
      var orig0 = getOriginal(el);
      el.textContent = orig0;
      el.setAttribute('aria-label', orig0);
      return;
    }

    var original = getOriginal(el);
    resetElement(el);              // reset: clears timers + prior state (re-trigger)

    // Reduced motion: instant final text, no animation of any kind.
    if (REDUCE) {
      el.textContent = original;
      el.setAttribute('aria-label', original);
      return;
    }

    var d = currentDials();
    var split = splitText(el, original);
    el._tm.type = type;
    el._tm.chars = split.chars;
    el._tm.inner = split.inner;

    impl(el, split.chars, split.inner, d);
    return el;
  }

  /* ------------------------------------------------------------------------ */
  /* Sync — refresh cached dials so interval-driven reveals update mid-flight */
  /* ------------------------------------------------------------------------ */
  function tmSync() {
    DIALS = currentDials();
    // scramble/typewriter read currentDials() live each tick, so a dial change
    // via StyleEngine.setDial() takes effect on their next discrete step.
  }

  /* ------------------------------------------------------------------------ */
  /* Auto-init on DOMContentLoaded                                            */
  /* ------------------------------------------------------------------------ */
  function autoInit() {
    var nodes = document.querySelectorAll('[data-tm]');
    for (var i = 0; i < nodes.length; i++) {
      reveal(nodes[i], nodes[i].getAttribute('data-tm'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  /* ------------------------------------------------------------------------ */
  /* Expose API + register with the shared registry                          */
  /* ------------------------------------------------------------------------ */
  SE.text = SE.text || {};
  SE.text.reveal = reveal;

  if (typeof SE.register === 'function') {
    SE.register('text-motion', tmSync);
  } else {
    // Registry not present yet (module loaded standalone): run sync once.
    tmSync();
  }
})();
