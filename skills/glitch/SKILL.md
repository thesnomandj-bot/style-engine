---
name: glitch
description: >
  Digital-breakage effects module for the Style Engine. Applies chromatic
  aberration, positional jitter, signal dropout, block/row displacement,
  scanlines, and static noise to any DOM element via a class plus --gl-* CSS
  custom properties. Stepped (never eased) animation, seeded randomness,
  reduced-motion safe. Registers with the shared StyleEngine registry.
version: 1.0.0
namespace: --gl-*
registry_id: glitch
files:
  - modules/glitch.css
  - modules/glitch.js
  - modules/glitch.svg.html
public_api:
  - StyleEngine.glitch.burst(el, ms)
---

# Glitch — Digital Breakage

Make anything on the page look like a corrupted video signal: color-fringed,
shaking, dropping out, and torn into displaced rows, under a haze of scanlines
and static. Every effect is a **dial from 0 to 100**. Dial at 0 means the effect
is completely invisible. Dial at 100 means the loudest still-legible version of
that effect. Nothing is on until you turn it on.

The module plugs into the shared `StyleEngine` registry (created by the
hand-drawn module). It **does not** create or redefine that registry — it only
calls `StyleEngine.register('glitch', glitchSync)`.

---

## The dials (plain English)

| Dial | CSS variable | What it does | At 0 | At 100 |
|------|--------------|--------------|------|--------|
| **RGB Split** | `--gl-rgb-split` | Splits the red and cyan channels apart, like a mistracked TV | No color fringe at all | Channels ~8px apart, strong ghost |
| **Jitter** | `--gl-jitter` | Shakes the element to a new random spot every step | Rock steady | ~6px of nervous shake |
| **Dropout** | `--gl-dropout` | Randomly blinks the element out on some steps | Always visible | Gone ~40% of steps |
| **Block Shift** | `--gl-block-shift` | Slides a random horizontal slice sideways (torn video row) | No tearing | Slices jump ~20px sideways |
| **Scanlines** | `--gl-scanlines` | Lays horizontal CRT raster lines over the element | Invisible | Dense, strong dark lines |
| **Static** | `--gl-static` | Overlays fractal noise / snow | Invisible | Heavy grain |
| **Rate** | `--gl-rate` | How many glitch steps happen per second (the clock) | **Frozen** on the current frame | ~15 steps/second |

**Rate is special.** It is the heartbeat for jitter, dropout, and block shift.
At `--gl-rate: 0` the animation **freezes on whatever glitch frame it was last
on** — it does *not* snap back to clean. Turn rate up and it comes alive again.
RGB split, scanlines, and static are static textures and do not need the clock.

---

## Quick start

1. **Copy the three module files** into your project:
   - `modules/glitch.css`
   - `modules/glitch.js`
   - `modules/glitch.svg.html`

2. **Load them** (order: hand-drawn.js first so the registry exists, then this):
   ```html
   <link rel="stylesheet" href="modules/glitch.css">
   <!-- paste modules/glitch.svg.html here, once, near the top of <body> -->
   <script src="modules/hand-drawn.js"></script>
   <script src="modules/glitch.js"></script>
   ```

3. **Tag an element.** Use `gl-target` for the full treatment, or mix individual
   classes:
   ```html
   <h1 class="gl-target">SIGNAL LOST</h1>

   <!-- or compose only what you want -->
   <h1 class="gl-rgb-split gl-jitter gl-scanlines">SIGNAL LOST</h1>
   ```

4. **Drive the dials** from JS — this re-runs every module's sync function:
   ```js
   StyleEngine.setDial('gl-rgb-split', 60);
   StyleEngine.setDial('gl-jitter', 40);
   StyleEngine.setDial('gl-dropout', 20);
   StyleEngine.setDial('gl-rate', 12);   // start the clock
   ```

5. **Fire a one-off burst** (max everything for a moment, then restore):
   ```js
   StyleEngine.glitch.burst(document.querySelector('h1'), 500); // 500 ms
   ```

### Seeded randomness
Each element gets its own stable random stream. Give it a seed with
`data-gl-seed="…"` (a number or any string) to pin its exact motion; otherwise
its DOM index is used. **Same seed = identical glitch across reloads.**

### True row displacement (optional)
`gl-block-shift` on `.gl-target` slips the whole element horizontally. For a
genuine *torn text row* (a duplicated, clipped, shifted band), use `.gl-block`
and mirror the text into `data-gl-text`:
```html
<span class="gl-block" data-gl-text="CORRUPTED">CORRUPTED</span>
```

---

## The 6 digital-breakage signals

Analog to the hand-drawn module's six human-hand signals, these are the tells
that read as "the signal is broken," not "someone styled this":

1. **Chromatic aberration** — red and cyan pull apart at the edges (`--gl-rgb-split`).
2. **Positional jitter** — the image can't hold still, snapping frame to frame (`--gl-jitter`).
3. **Signal dropout** — content stutters out of existence for a step, then returns (`--gl-dropout`).
4. **Block / row displacement** — horizontal slices tear and slide sideways (`--gl-block-shift`).
5. **Scanlines** — the CRT raster grid bleeds through (`--gl-scanlines`).
6. **Static / snow** — fractal noise fizzes over everything (`--gl-static`).

The seventh dial, **Rate**, is the clock that makes 1–4 breathe; it is not a
"look" of its own.

---

## Failure modes checklist

- [ ] **Nothing moves.** `--gl-rate` is 0 (frozen by design) — raise it. Or the
      OS is in reduced-motion mode (see Accessibility).
- [ ] **Effect shows a little even at 0.** It shouldn't — every dial fades to
      fully invisible at 0. If it doesn't, a stray inline `--gl-*` override is on
      the element (e.g. a leftover from `burst`).
- [ ] **RGB split looks smeared, not split.** That's normal at high offset; lower
      `--gl-rgb-split`. Max sane is ~8px.
- [ ] **Static overlay is a flat gray box.** The SVG defs
      (`modules/glitch.svg.html`) weren't inlined, so `url(#gl-static)` resolves
      to nothing. Paste the SVG once into the page.
- [ ] **`gl-block` shows no torn row.** `data-gl-text` is missing or doesn't
      match the visible text.
- [ ] **Motion is smooth / eased.** It must be stepped. This module never uses
      CSS transitions on glitch properties — check you didn't add a global
      `transition: all` that leaks onto `.gl-target`.
- [ ] **Two elements glitch identically / never repeat.** Set distinct
      `data-gl-seed` values, or rely on their DOM order.
- [ ] **`burst` never restores.** Confirm `ms` is a positive number and the page
      isn't being torn down before the timeout fires.

---

## Accessibility (reduced motion)

When the viewer has **`prefers-reduced-motion: reduce`** set:

- `glitch.js` **stops all intervals** — no jitter, dropout, or block movement.
- The CSS `@media (prefers-reduced-motion: reduce)` block forces transforms off
  and opacity back to 1.
- **Static and scanline overlays remain** as a still texture, so the visual
  identity survives without any motion — a static final state, not a blank one.
- The module also listens for live changes to the motion preference and
  re-syncs, so toggling the OS setting takes effect without a reload.

No flashing, no strobing when reduced motion is requested.

---

## Contracts (for integrators)

- All CSS variables are `--gl-*` (dials) / `--_gl-*` (private, derived). No
  collision with `--hd-*`, `--tm-*`, `--md-*`, `--mx-*`.
- JS registers exactly as `StyleEngine.register('glitch', glitchSync)`.
- The module never touches `window.StyleEngine` beyond adding `SE.glitch`, and
  never redefines the registry.
- SVG filter id is `#gl-static`.
- All animation is stepped (`setInterval` writing discrete state); no easing.
- At `--gl-rate: 0`, effects freeze in place (still visible, not hidden).
- Every dial at 0 = that effect fully off/invisible.
- Every dial at 100 = the documented maximum sane intensity above.

---

## Completion checklist

- [ ] All 7 dials present in `:root` as `--gl-*`, each 0–100.
- [ ] Every magnitude derives from a dial — no hard-coded px/deg in effect code.
- [ ] `modules/glitch.svg.html` inlined once; `#gl-static` resolves.
- [ ] `StyleEngine.register('glitch', glitchSync)` called; registry not
      redefined.
- [ ] Animation confirmed stepped (frame-to-frame jumps, no easing).
- [ ] `--gl-rate: 0` freezes the current glitch frame (does not reset to clean).
- [ ] `--gl-rate: 100` runs ~15 steps/second.
- [ ] Reduced-motion stops all intervals and leaves a static texture.
- [ ] `StyleEngine.glitch.burst(el, ms)` runs and restores prior state.
- [ ] Two elements with different `data-gl-seed` glitch differently; the same
      seed reproduces the same motion across reloads.
