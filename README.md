# Style Engine

A **rack-style visual-effects system for the web.** Think of an Ableton effect rack, but for
how a web page *looks*: each effect is a module you drop in, every effect has a **strength dial**,
and a **macro** can drive many dials from one knob.

**Module 1 — Hand-Drawn** is the first module. It makes a UI look like a human drew it: wobbly
ink containers, roughened and "boiling" edges, scattered rotation, paper grain, self-drawing
lines, sketchy Rough.js shapes, and hand-drawn underline/circle annotations.

```text
open demo/index.html  →  drag the sliders  →  watch every effect respond live
```

---

## The one idea that makes this a product: dials

Every effect's **strength is a number from 0 to 100**, stored in a CSS variable. Nothing about
an effect is hard-coded — not the wobble amount, not the grain opacity, not the boil speed. You
change the *dial*, and the effect follows.

Module 1's seven dials (all `--hd-*`, "h-d" = hand-drawn):

| Dial | 0 | 100 |
|------|---|-----|
| `--hd-wobble` | crisp rectangle | very wobbly blob container |
| `--hd-grain` | clean paper | heavy film grain |
| `--hd-rotation` | perfect grid | ±5° scattered tiles |
| `--hd-boil-speed` | frozen | fast "boiling" edges |
| `--hd-sketchiness` | clean lines | very rough / scribbly |
| `--hd-line-weight` | thin, uniform | thick, varied strokes |
| `--hd-overshoot` | closed corners | open, overshooting corners |

Set one in CSS:

```css
:root { --hd-wobble: 80; --hd-grain: 8; }
```

…or at runtime, which is how the sliders (and later the macro) do it:

```js
StyleEngine.setDial('--hd-wobble', 80);   // the effect updates immediately
```

### Why "no hard-coded values" is the whole point

Most effects can read their dial directly through CSS `calc()`. For example the paper-grain
overlay is literally `opacity: calc(var(--hd-grain) / 100)`. A few effects live on **SVG filter
attributes that CSS can't touch** (the roughen displacement `scale`, the boil `<animate>` speed).
For those, a tiny JavaScript **binder** (`modules/hand-drawn.js`) reads the dial and writes the
attribute. Either way, **the dial is the single source of truth.** If any effect had a hard-coded
magnitude, a macro couldn't move it — and the macro is the product.

### The macro (already demonstrated)

A macro is **one 0–100 knob mapped onto many dials**, exactly like an effect-rack macro. The demo
ships a working one: the **"Hand-Made-ness"** slider. Drag it and all **seven** dials move together
(each on its own curve). That is the seed of the future dedicated macro layer — it already works
because every effect obeys a dial.

```js
// a macro is just: one input -> many setDial() calls, each with its own curve
function setMacro(m) {
  StyleEngine.setDial('--hd-wobble',      m);
  StyleEngine.setDial('--hd-rotation',    m * 0.9);
  StyleEngine.setDial('--hd-sketchiness', m);
  StyleEngine.setDial('--hd-boil-speed',  m * 0.8);
  StyleEngine.setDial('--hd-grain',       m * 0.28);
  StyleEngine.setDial('--hd-line-weight', m);
  StyleEngine.setDial('--hd-overshoot',   m);
}
```

---

## What's in here

```text
style-engine/
├── skills/hand-drawn/SKILL.md   # the portable rulebook Claude follows in ANY project
├── modules/
│   ├── hand-drawn.css           # the dial contract + every effect (the reusable module)
│   ├── hand-drawn.js            # the binder: dials -> SVG attrs; StyleEngine.setDial (macro seam)
│   └── hand-drawn.svg.html      # the SVG filter defs (roughen / boil / grain)
├── demo/
│   ├── index.html               # single-file, offline live demo + slider/macro panel (GENERATED)
│   └── vendor/                  # Rough.js + rough-notation (inlined into the demo)
├── scripts/
│   ├── build_demo.py            # assembles demo/index.html from modules/ (so it can't drift)
│   └── prep_drawing.py          # ink photo -> transparent PNG (+ optional traced SVG)
├── assets/
│   ├── manifest.json            # log of prepped assets (filename, type, description, date, source)
│   └── samples/                 # a sample source drawing
└── README.md
```

---

## Using Module 1 in your own project

1. Copy `modules/hand-drawn.css`, `modules/hand-drawn.js`, `modules/hand-drawn.svg.html`.
2. In `<head>`: `<link rel="stylesheet" href="hand-drawn.css">`
3. First thing inside `<body>`, paste the contents of `hand-drawn.svg.html`, then add the grain overlay:
   ```html
   <svg class="hd-grain-overlay" aria-hidden="true"><rect width="100%" height="100%" filter="url(#hd-grain)"/></svg>
   ```
4. Before `</body>`: `<script src="hand-drawn.js"></script>`
5. Put `class="hd-page hd-body"` on `<body>`, then apply effect classes: `hd-box` (wobbly container),
   `hd-scatter` (rotate children), `hd-roughen`, `hd-boil`, `hd-draw-path`, `hd-riso`.
6. Rough.js shapes and rough-notation annotations are optional extras — see `skills/hand-drawn/SKILL.md`.

The full rulebook (exact filter values, the six "human-hand" signals, failure modes to avoid,
font rules) is in **`skills/hand-drawn/SKILL.md`**. Claude can load that skill and apply the style
to any project without this repo present.

---

## The asset pipeline (real hand-drawn marks)

The most convincing hand-drawn touches are *actually drawn*. Draw a mark in **black ink on white
paper**, photograph it flat in even light, then:

```bash
python scripts/prep_drawing.py mydrawing.jpg "curved arrow pointing right"
```

It flattens uneven lighting, turns the paper **truly transparent** (luminance → alpha, not a blend
trick), and writes `assets/curved-arrow-pointing-right.png`. If [`potrace`](http://potrace.sourceforge.net/)
is installed it also writes a traced `.svg` with `fill="currentColor"`, so CSS can recolor the mark:

```html
<img src="assets/curved-arrow-pointing-right.png" alt="curved arrow">
<!-- or, with the traced SVG, recolor via the ink palette: -->
<svg style="color: var(--hd-accent)"> … traced path … </svg>
```

Every run appends a record to `assets/manifest.json`. Requirements: **Pillow** (`pip install Pillow`).
potrace is optional — `brew install potrace` to enable SVG tracing; without it the PNG is still produced.

Useful flags: `--invert` (white ink on dark paper), `--no-flatten` (for solid-fill art, not line
art), `--gamma 1.5` (punchier ink), `--ink "#b83c28"` (recolor the PNG), `--name arrow`.

---

## How future modules bolt on (the part that matters for the roadmap)

Every module copies Module 1's shape and **reuses the exact same 0–100 dial convention** — only the
two-letter namespace changes:

| Module | Namespace | Example dials |
|--------|-----------|---------------|
| Hand-Drawn (this one) | `--hd-*` | `--hd-wobble`, `--hd-grain`, `--hd-boil-speed` |
| Glitch (planned) | `--gl-*` | `--gl-rgb-split`, `--gl-slice`, `--gl-jitter` |
| Text-Motion (planned) | `--tm-*` | `--tm-stagger`, `--tm-spring`, `--tm-blur` |
| Media-Decay (planned) | `--md-*` | `--md-vhs`, `--md-bleed`, `--md-dropout` |

Each new module is just: a `.css` file exposing its dials in `:root` and deriving real units with
`calc()`, a `.js` binder for any SVG/canvas attributes CSS can't reach, and (if it uses SVG
filters) a `.svg.html` defs file. Every binder attaches to the same global:

```js
window.StyleEngine.setDial(name, value);   // one shared API for every module
```

Because all modules speak the same language — **0–100 dials, one `setDial` API** — the future
**macro layer** doesn't need to know anything module-specific. A macro is a saved mapping from one
knob to any set of dials across *any* modules (e.g. a "Degrade" macro that pulls `--hd-boil-speed`,
`--gl-slice`, and `--md-vhs` at once). Nothing here needs rework to get there; that's the entire
reason for the dial contract.

---

## Accessibility

All motion is **opt-in**. Self-drawing lines and scatter transitions are gated by a
`prefers-reduced-motion: reduce` media query. The SVG boil starts **frozen** (`begin="indefinite"`)
and only animates once the JS binder starts it — which it does *only* when reduced motion is off — so
with reduced motion on, **or** with JS disabled, there is no boil at all (a safe default, not a
JS-dependent one). Slider controls are labelled for screen readers; the accent ink clears WCAG AA
(≥4.5:1) on the cream page. Body text is always a clean sans (Inter); handwriting fonts are used for
headings and annotations only, never body copy.

---

## Dev notes

- **Rebuild the demo** after editing any `modules/*` file: `python scripts/build_demo.py`. The demo
  is *generated* by inlining the module files, so the single-file demo can never drift from the
  reusable module.
- **Verified in a real browser** (Chromium via Playwright): every dial changes its effect
  (border-radius / displacement scale / animation duration / opacity / overshoot), the macro moves
  all seven dials from one input, `prefers-reduced-motion` freezes boil + self-draw, and the console
  is clean. The asset pipeline was verified on a generated test drawing (89% of an unevenly-lit page
  made transparent, ink cores at full alpha, potrace SVG traces the mark with `fill="currentColor"`,
  manifest appended).
- **Not yet device-tested on Safari/Firefox.** The boil animates an SVG filter (`feTurbulence`
  `baseFrequency`) on HTML elements; all engines render SVG filters on HTML, but WebKit can
  under-update SMIL-animated filter primitives, so verify the boil actually animates there before
  shipping. Everything else uses widely-supported CSS/SVG.

## Credits / licenses

Bundled in `demo/vendor/` and inlined into the demo: [Rough.js](https://github.com/rough-stuff/rough)
and [rough-notation](https://github.com/rough-stuff/rough-notation), both MIT-licensed.
