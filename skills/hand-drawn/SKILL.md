---
name: hand-drawn
description: "Style Engine Module 1 — the Hand-Drawn look. Makes a web UI read as if a human drew it: wobbly ink containers, roughened/boiling edges, scattered rotation, paper grain, self-drawing lines, Rough.js shapes, rough-notation annotations. Every effect strength is a 0-100 CSS dial (--hd-*) so a macro can drive many at once. Trigger when asked to make a page/site/component look hand-drawn, sketchy, ink-on-paper, doodled, zine/risograph, marker-and-notebook, Excalidraw-like, or 'less corporate / more human'. Also trigger to add wobble, grain, boil, or hand-drawn underlines/circles to an existing UI."
---

# Hand-Drawn — Style Engine Module 1

STOP. This is a **style rulebook**, not a component library. Follow the rules; the look
comes from *breaking machine perfection consistently*, not from any single trick.

The whole module is governed by ONE architectural law:

> **The Dial Contract.** Every effect's STRENGTH is a CSS custom property scaled **0–100**,
> namespaced `--hd-*`. There are NO hard-coded effect magnitudes. A magnitude is either
> derived from a dial via `calc()` (CSS-drivable props) or written by the JS binder from a
> dial (SVG filter attributes CSS can't reach). This is what lets a future **macro** move
> `wobble + grain + rotation + boil + sketchiness` from a single knob, exactly like an
> Ableton effect-rack macro. Hard-code one value and you break the product.

The seven dials:

| Dial | Controls | Off (0) | Full (100) |
|------|----------|---------|-----------|
| `--hd-wobble` | container edge wobble (border-radius) | crisp rectangle | very wobbly blob |
| `--hd-grain` | paper grain overlay opacity | clean paper | heavy film grain |
| `--hd-rotation` | scatter rotation of nth-child elements | grid-perfect | ±5° jitter |
| `--hd-boil-speed` | boil animation speed | frozen | fast shimmer |
| `--hd-sketchiness` | roughen displacement + Rough.js roughness | clean lines | very rough |
| `--hd-line-weight` | stroke-weight variation | thin uniform | thick varied |
| `--hd-overshoot` | corner gap / overshoot | closed corners | open, overshot |

---

## QUICK START (any project)

1. Copy `modules/hand-drawn.css`, `modules/hand-drawn.js`, `modules/hand-drawn.svg.html` into the project.
2. In `<head>`: `<link rel="stylesheet" href="hand-drawn.css">`
3. First thing in `<body>`: paste the contents of `hand-drawn.svg.html` (the filter defs) and
   add the grain overlay: `<svg class="hd-grain-overlay"><rect width="100%" height="100%" filter="url(#hd-grain)"/></svg>`
4. Before `</body>`: `<script src="hand-drawn.js"></script>`
5. Add `class="hd-page hd-body"` to `<body>`. Apply effect classes (below).
6. Drive dials at runtime: `StyleEngine.setDial('--hd-wobble', 80)` — this is the macro seam.

If you cannot copy the module files, reproduce the rules below by hand — but keep the dial
contract: no raw effect magnitudes, only `calc()` off `--hd-*`.

---

## THE SIX HUMAN-HAND SIGNALS (always hit all six)

A drawing reads as hand-made because of these six tells. Every hand-drawn page must show all six:

1. **Line-weight variation** — strokes are not one uniform width. Drive with `--hd-line-weight`.
2. **Wobble** — no straight line is truly straight; no corner is truly 90°. `--hd-wobble` + roughen.
3. **Corner gaps / overshoots** — lines start late or run past the corner. `--hd-overshoot`, Rough.js `bowing`.
4. **Fill escaping outlines** — color doesn't stay perfectly inside the line (riso layers, offset fills).
5. **No two elements identical** — every wobble/rotation/seed differs per element.
6. **Limited palette + visible texture** — 2–4 inks on cream paper (`#faf6ef` range) + grain.

If a design is missing any of these, it will read as "CSS trying to look hand-drawn," not hand-drawn.

---

## THE TECHNIQUES (exact rules)

### 1 · Wobbly containers
Classic organic border-radius (the value every technique deck cites):
```css
border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
```
**Vary the eight values per element — no two identical.** In this module the eight numbers are
per-element seed vars (`--hdr1..--hdr8`) interpolated toward crisp by `--hd-wobble`, so the same
box crisps at dial 0 and hits the classic values at dial 100. Use `.hd-box`; override the seeds
per element (nth-of-type variants ship in the CSS, or set inline `style="--hdr1:180;…"`).

### 2 · Scatter (rotation on a prime cadence)
Rotate children on **prime steppers** so the pattern never lands on a visible grid:
```css
.hd-scatter > *:nth-child(3n) { transform: rotate(var(--_hd-rot)); }
.hd-scatter > *:nth-child(5n) { transform: rotate(calc(var(--_hd-rot) * -1)) translate(0, var(--_hd-offset)); }
.hd-scatter > *:nth-child(7n) { transform: rotate(calc(var(--_hd-rot) * .6)) translate(var(--_hd-offset), calc(var(--_hd-offset)*-1)); }
```
Magnitude range **±2° to ±5°** (that is exactly what `--hd-rotation` 40–100 spans via `--_hd-rot = rotation*0.05deg`).
Add small top/left offsets so it's not pure rotation. Never rotate everything the same amount.

### 3 · Roughen filter (SVG)
Displace edges with turbulence so straight borders wobble:
```xml
<filter id="hd-roughen">
  <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" seed="7" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" data-hd-roughen scale="3.5"
                     xChannelSelector="R" yChannelSelector="G"/>
</filter>
```
- `type="turbulence"`, `baseFrequency ~0.02`, `numOctaves 2–3`.
- `feDisplacementMap scale` in **2–6** for the sweet spot. **`scale` is an SVG attribute CSS cannot set** —
  the JS binder writes it from `--hd-sketchiness` (0–100 → 0–7). Apply with `class="hd-roughen"`.

### 4 · Boil animation (mandatory: discrete stepping)
Animate `baseFrequency` across **3–4 values** so the noise field jumps between states like
successive hand-drawn frames:
```xml
<animate attributeName="baseFrequency" values="0.02;0.028;0.018;0.024"
         dur="0.9s" calcMode="discrete" repeatCount="indefinite"/>
```
- **`calcMode="discrete"` is NON-NEGOTIABLE.** Smooth easing turns "boil" into "melt" and kills the
  illusion. Duration ~0.9s at mid speed; the binder writes `dur` from `--hd-boil-speed`.
- Apply with `class="hd-boil"`. Under reduced-motion the binder freezes it.

### 5 · Grain
```xml
<feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch"/>
<feColorMatrix type="saturate" values="0"/>   <!-- desaturate to gray grain -->
```
- `fractalNoise`, `baseFrequency` **0.6–0.9**.
- Apply as a **fixed full-page overlay at 5–15% opacity**, `mix-blend-mode: multiply`, over a
  cream page base (`#faf6ef` range). Opacity reads `--hd-grain` directly (it's a CSS prop).

### 6 · Self-drawing lines
```js
const len = path.getTotalLength();
path.style.setProperty('--hd-path-len', len);   // then animate dashoffset len -> 0
```
```css
.hd-draw-path { stroke-dasharray: var(--hd-path-len); stroke-dashoffset: var(--hd-path-len); }
.hd-draw-path.hd-draw-run { animation: hd-draw var(--_hd-draw-dur) ease forwards; }
@keyframes hd-draw { to { stroke-dashoffset: 0; } }
```
Measure the real path length with `getTotalLength()` — never guess the dash length. Call
`StyleEngine.drawLines('.hd-draw-path')` to (re)run. Instant (no animation) under reduced-motion.

### 7 · Risograph poster (composed example)
- **2–3 flat ink colors** only (riso red / blue / yellow from the palette).
- Each color on its own layer with `mix-blend-mode: multiply` so overlaps make a third color.
- **1–3px misregistration** offsets between layers (`--_hd-misreg`, driven by `--hd-sketchiness`).
- Add **halftone** (repeating radial dot grid) or grain. Never perfectly aligned.

---

## LIBRARIES

### Rough.js — for SHAPES (not text)
`rough.canvas(canvasEl)` or `rough.svg(svgEl)` → `.rectangle/.line/.circle/.ellipse/.path`.
```js
const rc = rough.canvas(cv);
rc.rectangle(10, 10, 200, 120, { roughness: 1.8, bowing: 1.5, seed: 42 });
```
- **`roughness` 1–2.8** (below 1 is too clean, above 3 is scribble).
- **`bowing`** bends the strokes (the "drawn with a shaky hand" curve).
- **`seed` is REQUIRED and must be STABLE per element but DIFFERENT between elements.** Seed from a
  stable id/index (`seed: 1000 + index`). Same seed every render = shape doesn't twitch on reflow;
  different seed per element = "no two identical". Drive `roughness` from `--hd-sketchiness`.

### rough-notation — for ANNOTATIONS (sparingly)
`RoughNotation.annotate(el, { type, color, ... }).show()`; types: `underline, circle, box,
highlight, strike-through, bracket`.
- **Use 3–5 annotations per page MAX.** They are emphasis; over-use = noise, and the eye stops
  trusting them. Reserve for the single most important word/number in a section.
- Respect reduced-motion: set `animationDuration: 0` (or don't call `.show()`) when the user asks.

### Fonts
- **Headings & annotations ONLY**: `Caveat` or `Shantell Sans` (handwriting).
- **Body text ALWAYS a clean sans** (`Inter`). **Never** set body copy in a handwriting font —
  it destroys readability and screams "template". This is the most common failure; do not commit it.

---

## FAILURE MODES — check every one before delivering

- [ ] **Uniform stroke width** everywhere → add `--hd-line-weight` variation / Rough.js.
- [ ] **Cloned identical elements** (same wobble, same rotation, same seed) → vary per element.
- [ ] **Perfect grid alignment** → scatter with prime rotations + small offsets.
- [ ] **Handwriting used for body text** → revert body to Inter; handwriting for headings only.
- [ ] **Smooth eased boil / melt** → `calcMode="discrete"`, never a smooth ease.
- [ ] **Any hard-coded effect magnitude** (a raw px/deg/scale not from a `--hd-*` dial) → route it through a dial.
- [ ] **rough-notation overused** (>5/page) → cut to the 3–5 most important.
- [ ] **No visible texture** (missing grain) → add the grain overlay.

---

## ACCESSIBILITY (mandatory)

- Wrap ALL motion so it only runs when the user has NOT requested reduced motion. The module CSS
  does this with `@media (prefers-reduced-motion: reduce) { … animation:none }` and the binder
  freezes the SVG boil (SVG `<animate>` ignores the media query — you must stop it in JS).
- Handwriting fonts hurt legibility: keep them out of body copy and out of anything long.
- Keep ink-on-paper contrast high (`--hd-ink` on `--hd-paper` passes WCAG AA for body sizes).

---

## HYBRID: using a REAL hand-drawn asset from Brandon

The most convincing hand-drawn marks are real ones. When a page needs a hero doodle, a custom
arrow, a signature underline, or a mascot, **ask Brandon to draw it** rather than faking it.

**What to request (be specific):**
> "Draw **[exact thing, e.g. a curved arrow pointing right]** in **black ink** (fine-liner or
> marker) on **plain white paper**. Fill the frame. **Photograph or scan it flat, straight-on,
> in even daylight** (no angle, no hard shadow). One mark per sheet."

Black ink on white + flat even light is what makes the next step clean.

**Integrating the result** — run it through the prep script, then drop the output in:
```bash
python scripts/prep_drawing.py mydrawing.jpg "curved arrow pointing right"
```
It normalizes levels (paper → pure white, ink → solid dark), converts luminance to **alpha** (so
the paper becomes *truly transparent*, not blend-mode-hidden), writes a transparent PNG to
`assets/`, and — **if `potrace` is installed** — also a traced SVG with `fill="currentColor"` so
CSS can recolor the mark with the ink palette. Every run appends an entry to `assets/manifest.json`.

Use the PNG for painterly marks; use the SVG when you want the mark to inherit `color` (e.g.
`<svg style="color: var(--hd-accent)">`) or to boil/roughen it with the same filters as everything else.

---

## COMPLETION CHECKLIST (before you say it's done)

- [ ] All six human-hand signals present.
- [ ] Every effect magnitude comes from a `--hd-*` dial (grep the CSS for raw px/deg on effects — none).
- [ ] Dials visibly change their effect at runtime via `StyleEngine.setDial`.
- [ ] `prefers-reduced-motion: reduce` disables boil, self-draw, and scatter transitions.
- [ ] Body copy is Inter; handwriting only on headings/annotations; ≤5 rough-notations.
- [ ] No two elements are byte-identical (wobble seeds / rotations / Rough.js seeds differ).
