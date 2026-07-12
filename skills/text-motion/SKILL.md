---
name: text-motion
description: Composable text reveal animation library for the Style Engine — typewriter, scramble/decode, staggered-rise, wipe, cascade-drop, and blur-in effects driven by five 0–100 dials. Use when text should animate into view on any element.
version: 1.0.0
module: text-motion
namespace: --tm-*
registry_id: text-motion
---

# Text-Motion — Reveal Library

Make text *arrive* instead of just being there. Drop a class and a `data-tm`
attribute on any element and its text splits into characters/words that animate
in. Six reveal styles, all tuned by five dials scaled 0–100.

## What each reveal looks like

- **typewriter** — Characters appear one at a time, left to right, with a
  blinking cursor trailing the last letter. Reads like something being typed.
- **scramble** — Each slot cycles through random junk characters (a slot-machine
  spin) and then *snaps* onto the correct letter. Discrete stepping, never a
  smooth fade. Great "decoding / hacking" feel.
- **staggered-rise** — Letters (or words) slide up from below and fade in, each
  one starting a little after the last. With overshoot they spring past the line
  and settle back.
- **wipe** — The whole line is revealed under a moving clip edge. Direction is
  set with `data-tm-dir="lr"` (left→right, default), `"rl"` (right→left), or
  `"tb"` (top→bottom).
- **cascade-drop** — Letters fall in from above and bounce slightly as they land.
  The upside-down cousin of staggered-rise.
- **blur-in** — Letters start blurred and transparent, then sharpen into focus,
  staggered across the line.

## The dials (all 0–100)

| Dial | CSS var | At 0 | At 100 |
|------|---------|------|--------|
| Speed | `--tm-speed` | Very slow — a full reveal takes ~3s | Very fast — ~0.2s |
| Stagger | `--tm-stagger` | All letters move together at once | ~200ms gap between each letter |
| Randomness | `--tm-randomness` | Letters reveal strictly left→right | Reveal order fully shuffled |
| Scramble Pool | `--tm-scramble-pool` | Scramble uses only letters + digits | Adds symbols, then unicode block chaos |
| Overshoot | `--tm-overshoot` | Rise/drop land linearly, no bounce | Strong spring — letters overshoot and settle |

Change any dial live with `StyleEngine.setDial('tm-stagger', 80)`. Interval-based
reveals (scramble, typewriter) pick up dial changes on their next step; the
keyframe reveals apply the current dial values each time you call `reveal()`.

## Quick start

1. Copy `modules/text-motion.css` and `modules/text-motion.js` into your project.
2. Load the CSS in `<head>` and the JS after `hand-drawn.js` (which owns the
   shared `StyleEngine` registry). If loaded alone, the module self-syncs.
3. Mark up an element:

   ```html
   <h1 class="tm-target" data-tm="scramble">ACCESS GRANTED</h1>
   ```

   It reveals automatically on `DOMContentLoaded`.

4. Or trigger manually / re-trigger (resets and replays):

   ```javascript
   var el = document.querySelector('#headline');
   StyleEngine.text.reveal(el, 'staggered-rise');
   // ...later, replay the same element:
   StyleEngine.text.reveal(el, 'staggered-rise');
   ```

Optional wipe direction: `<span class="tm-target" data-tm="wipe" data-tm-dir="tb">…</span>`

## Which type for what

- **Headings / short punchy lines:** scramble, cascade-drop, staggered-rise,
  typewriter. These read best when there are few words and each letter matters.
- **Paragraphs / body copy:** staggered-rise, blur-in, or wipe with **low
  stagger** and **high speed**. Per-letter effects on long text with high
  stagger take too long and look fussy — prefer wipe (reveals the block at once)
  or word-unit rise.
- **"System / terminal" vibe:** typewriter or scramble with a high Scramble Pool.
- **Subtle, tasteful entrances:** blur-in or staggered-rise, overshoot ~20–40.

## Failure modes checklist

- [ ] **Nothing animates** → is `text-motion.js` loaded, and does the element
      have `class="tm-target"` (auto-added if you call `reveal()`)?
- [ ] **Reveal is instant with no motion** → the OS "reduce motion" setting is on
      (this is intended behavior), or Speed is at/near 100.
- [ ] **Reveal never finishes / letters keep spinning** → scramble with extreme
      stagger + slow speed produces long settle times; lower Stagger or raise Speed.
- [ ] **Layout jumps** → the container was `display:inline` in a flow that
      reflows; `.tm-target` is `inline-block` to stay stable.
- [ ] **Cursor doesn't blink** → typewriter only; ensure the CSS file is loaded
      (the blink keyframe lives there).
- [ ] **Scramble looks smooth instead of stepped** → it never should; if you see
      tweening, another stylesheet added a `transition` to `.tm-char` — remove it.
- [ ] **Order differs from expectation** → order is seeded from the text, so it's
      stable across reloads; raise/lower Randomness to change it.

## Accessibility

- The original text is stored and set as the container's `aria-label`; the split
  character spans live in an `aria-hidden` wrapper. Screen readers announce the
  full text once, not letter-by-letter.
- `@media (prefers-reduced-motion: reduce)` shows the final text instantly with
  no animation, cursor, or transforms.
- Text content is never destroyed — it's preserved for re-triggering and remains
  selectable/copyable after the reveal completes.

## Completion checklist

- [ ] `modules/text-motion.css` and `modules/text-motion.js` are included.
- [ ] All five `--tm-*` dials are set (or defaults are fine).
- [ ] Elements use `class="tm-target"` and `data-tm="<type>"`, or you call
      `StyleEngine.text.reveal(el, type)`.
- [ ] Reveal types used are among: typewriter, scramble, staggered-rise, wipe,
      cascade-drop, blur-in.
- [ ] Verified re-trigger works (second `reveal()` call resets + replays).
- [ ] Verified reduced-motion shows instant final text.
- [ ] Verified scramble steps discretely (slot-machine), not a smooth fade.
- [ ] Confirmed text is readable by a screen reader (aria-label present).
