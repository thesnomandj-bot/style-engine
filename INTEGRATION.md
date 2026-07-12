# Style Engine — Integration Guide

## What the Style Engine is

The Style Engine is a collection of self-contained visual-effect **modules**
(hand-drawn, glitch, text-motion, media-decay) driven entirely by CSS custom
properties on a `0–100` scale. On top of the modules sits the **Macro Engine**:
a single knob can drive many dials across many modules at once — the Ableton
Live effect-rack macro concept, applied to CSS effects. You embed the CSS/JS
into any web app and control everything through one small JS API.

ARGUS is the first intended consumer, but nothing here is ARGUS-specific — the
engine is a drop-in library for any page.

---

## Files to include

Each module ships up to three parts. Include only the modules you need.

| Module        | CSS                       | JS                       | SVG defs (filters)          |
|---------------|---------------------------|--------------------------|-----------------------------|
| Hand-drawn    | `modules/hand-drawn.css`  | `modules/hand-drawn.js`  | `modules/hand-drawn.svg`    |
| Glitch        | `modules/glitch.css`      | `modules/glitch.js`      | `modules/glitch.svg`        |
| Text-motion   | `modules/text-motion.css` | `modules/text-motion.js` | *(none)*                    |
| Media-decay   | `modules/media-decay.css` | `modules/media-decay.js` | `modules/media-decay.svg`   |
| **Core**      | —                         | `modules/style-engine.js`| —                           |
| **Macro**     | —                         | `modules/macro.js`       | —                           |

`style-engine.js` provides the `StyleEngine` global (`setDial`, `register`,
`sync`). `macro.js` attaches `StyleEngine.macro` and must load **last**.

---

## Load order

Order matters. CSS and SVG defs must exist before the module JS runs, and
`macro.js` must run after both core and modules so it can find the global.

```html
<head>
  <!-- 1. CSS first, so custom properties resolve on first paint -->
  <link rel="stylesheet" href="modules/hand-drawn.css">
  <link rel="stylesheet" href="modules/glitch.css">
  <link rel="stylesheet" href="modules/text-motion.css">
  <link rel="stylesheet" href="modules/media-decay.css">
</head>
<body>
  <!-- 2. SVG filter defs in the body (inline, hidden) -->
  <!-- paste the contents of each module's .svg here, e.g. -->
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <!-- hand-drawn / glitch / media-decay <filter> defs -->
  </svg>

  <!-- ... your app markup ... -->

  <!-- 3. Core engine, then modules -->
  <script src="modules/style-engine.js"></script>
  <script src="modules/hand-drawn.js"></script>
  <script src="modules/glitch.js"></script>
  <script src="modules/text-motion.js"></script>
  <script src="modules/media-decay.js"></script>

  <!-- 4. Macro engine LAST -->
  <script src="modules/macro.js"></script>
</body>
```

> The macro engine works even if some modules are absent. Dials for
> unloaded modules are simply skipped — no errors.

---

## Applying a preset JSON at runtime

A preset is a versioned JSON object (`"styleEnginePreset": 1`) holding a
`dials` snapshot plus `macros` definitions. Load it with `StyleEngine.macro.load()`:

```js
// Option A — a built-in starter preset (object form)
StyleEngine.macro.load(StyleEngine.macro.starterPresets.DECAY);

// Option B — a preset fetched from your server
fetch('/presets/my-look.json')
  .then(r => r.json())
  .then(preset => StyleEngine.macro.load(preset));

// Option C — a JSON string (load() parses strings too)
StyleEngine.macro.load('{"styleEnginePreset":1,"dials":{},"macros":[]}');

// Then drive the loaded macro's knob:
StyleEngine.macro.setValue('decay-master', 65);   // 0–100
```

`load()` validates the version, sets every dial in `dials`, recreates every
macro, and applies each macro's stored value so the live look matches the
preset exactly.

To capture the current state back out (round-trips exactly):

```js
const preset = StyleEngine.macro.serialize();
localStorage.setItem('look', JSON.stringify(preset));
```

---

## Full JS API surface

### Core

| Call | Purpose |
|------|---------|
| `StyleEngine.setDial(name, value)` | Set a dial (`--hd-wobble`, …) to `0–100`; fires all module sync fns. |
| `StyleEngine.register(id, syncFn)` | A module registers its sync function (modules call this themselves). |
| `StyleEngine.sync()` | Force all registered sync functions to run. |

### Module helpers (present when the module is loaded)

| Call | Purpose |
|------|---------|
| `StyleEngine.glitch.burst(opts)` | Fire a one-shot glitch burst. |
| `StyleEngine.text.reveal(el, opts)` | Run a text-motion reveal on an element. |

### Macro engine (`StyleEngine.macro.*`)

| Call | Returns | Purpose |
|------|---------|---------|
| `create(opts)` | id | Create a macro (`{ id?, name?, description?, value?, mappings? }`). |
| `delete(id)` | bool | Remove a macro and all its mappings. |
| `get(id)` | macro / null | Get the live macro definition. |
| `list()` | id[] | List all macro ids. |
| `addMapping(id, mapping)` | index | Add one mapping to a macro. |
| `removeMapping(id, index)` | bool | Remove a mapping by index. |
| `setValue(id, value)` | bool | Set the knob `0–100`; applies all mappings live. |
| `getValue(id)` | number / null | Read the current knob value. |
| `serialize()` | preset | Export all dials + all macros as versioned JSON. |
| `load(json)` | bool | Import a preset (object or string); sets all dials, rebuilds macros. |
| `starterPresets` | object | Built-in presets: `DECAY`, `VINYL`, `VHS`, `CASSETTE`, `HAND-MADE`. |

---

## Creating a custom macro programmatically

```js
const id = StyleEngine.macro.create({
  name: 'GRIT',
  description: 'Grain then dropouts',
  value: 0
});

// Grain rises across the whole knob range.
StyleEngine.macro.addMapping(id, {
  cssVar: '--md-grain',
  min: 0, max: 80,
  curve: 'ease',
  window: [0, 100]
});

// Dropouts only kick in past 70 — a "window".
StyleEngine.macro.addMapping(id, {
  cssVar: '--gl-dropout',
  min: 0, max: 55,
  curve: 'exp',
  window: [70, 100]
});

StyleEngine.macro.setValue(id, 85);   // turn the knob
```

**Mapping fields**

| Field | Meaning |
|-------|---------|
| `cssVar` | Target dial, e.g. `--md-grain`. |
| `elementScope` | Selector to write the var on. Default `':root'` (routes through `setDial`). |
| `min` / `max` | Output at the window's start / end. |
| `curve` | `'linear'`, `'ease'` (cubic in-out), or `'exp'` (t²). |
| `window` | `[start, end]` — the slice of the `0–100` knob where this mapping is active. Below `start` the dial sits at `min`; above `end` at `max`; between, it interpolates on the curve. |

---

## Scoping effects to a container (not the whole page)

By default dials live on `:root` and affect the whole document. To confine an
effect, write the CSS variables on a container element instead of `:root`.

**Direct (no macros):**

```css
/* your CSS: the module reads --md-grain from the nearest ancestor */
.decay-zone { --md-grain: 40; }
```

**Via a macro mapping** — set `elementScope` to your container's selector:

```js
StyleEngine.macro.addMapping(id, {
  cssVar: '--md-grain',
  elementScope: '#hero',   // var is set on #hero, not :root
  min: 0, max: 80,
  window: [0, 100]
});
```

> Note: `:root` mappings route through `StyleEngine.setDial` so every module's
> global sync fires. Non-`:root` mappings write the variable straight onto the
> target element — use them when you deliberately want a local override.

---

## CSS custom property convention

- **Every dial is `0–100`.** No pixels, no seconds — the module translates the
  0–100 value into its own real units internally.
- **Namespaces** identify the owning module:

  | Prefix | Module | Example dials |
  |--------|--------|---------------|
  | `--hd-` | Hand-drawn | `--hd-wobble`, `--hd-grain`, `--hd-rotation`, `--hd-boil-speed`, `--hd-sketchiness`, `--hd-line-weight`, `--hd-overshoot` |
  | `--gl-` | Glitch | `--gl-rgb-split`, `--gl-jitter`, `--gl-dropout`, `--gl-block-shift`, `--gl-scanlines`, `--gl-static`, `--gl-rate` |
  | `--tm-` | Text-motion | `--tm-speed`, `--tm-stagger`, `--tm-randomness`, `--tm-scramble-pool`, `--tm-overshoot` |
  | `--md-` | Media-decay | `--md-grain`, `--md-dust`, `--md-warble`, `--md-ghosting`, `--md-tint`, `--md-vignette`, `--md-flutter` |

- The macro engine **defines no dials of its own** — macros only drive other
  modules' dials. There is no `--mx-*` namespace.

---

## ARGUS note

ARGUS is the first app expected to embed the Style Engine. This guide is
written generically; embedding requires **no changes to ARGUS code beyond
including the files and calling the API above**. Nothing in the engine is
coupled to ARGUS.
