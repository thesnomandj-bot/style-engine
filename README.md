# Style Engine

A **rack-style visual-effects system for the web.** Think of an Ableton Live effect rack, but
for how a web page *looks*: each effect is a module you drop in, every effect has a **strength
dial** (a number from 0 to 100), and a **macro** can drive many dials from one knob.

You do not write CSS values by hand. You turn a dial up or down, and the effect follows. Want
wobblier containers? Turn up the Wobble dial. Want film grain? Turn up the Grain dial. Want
everything to degrade at once like a worn VHS tape? Turn up the DECAY macro and watch dials
across multiple modules move together. The system does the math; you just decide "how much."

The whole point is that **nothing is hard-coded**. Every effect magnitude reads from a dial
variable. Because every module speaks the same 0-100 language, one macro can reach across any
combination of modules and move their dials in concert. That is what makes this a product, not
just a collection of CSS tricks.

```text
open demo/index.html  ->  drag the sliders  ->  watch every effect respond live
```

---

## Modules

The Style Engine ships four modules. Each one is a self-contained drop-in that registers with
the shared `StyleEngine` global. You can use one module alone, or all four together.

### 1. Hand-Drawn (`--hd-*`)

Makes a UI look like a human drew it: wobbly ink containers, roughened and "boiling" edges,
scattered rotation on grid items, paper grain, self-drawing SVG lines, sketchy Rough.js shapes,
and hand-drawn underline/circle annotations via rough-notation.

**Seven dials:** Wobble, Grain, Rotation, Boil Speed, Sketchiness, Line Weight, Overshoot.

### 2. Glitch (`--gl-*`)

Digital breakage. RGB chromatic splits, positional jitter, signal dropouts (elements blink out),
horizontal block/slice displacement, scanline overlays, and static noise. All animation is
*stepped* (discrete jumps, no smooth easing) to feel like real digital corruption.

**Seven dials:** RGB Split, Jitter, Dropout, Block Shift, Scanlines, Static, Rate.
**Special API:** `StyleEngine.glitch.burst(element, milliseconds)` maxes every glitch effect on
one element for a short burst, then restores it.

### 3. Text-Motion (`--tm-*`)

Composable text reveal animations. Six reveal types: typewriter, scramble (slot-machine
character cycling), staggered-rise, cascade-drop, blur-in, and wipe. Each text element gets its
reveal type via a `data-tm` attribute. Scramble uses discrete stepped intervals (never smooth
interpolation) for an authentic mechanical feel.

**Five dials:** Speed, Stagger, Randomness, Scramble Pool, Overshoot.
**Special API:** `StyleEngine.text.reveal(element, type)` triggers or replays a reveal.

### 4. Media-Decay (`--md-*`)

Analog wear and degradation. Film grain (fine fractal noise overlay), dust specks and hairline
scratches, tape-like warble (horizontal wave distortion), soft chroma ghosting (blurred duplicate,
not a hard RGB split), sun-faded warm tint, edge vignette darkening, and projector-style
brightness flutter. Warble and flutter use discrete stepping, like the glitch module.

**Seven dials:** Grain, Dust, Warble, Ghosting, Tint, Vignette, Flutter.
**Named presets:** `StyleEngine.mediaDecay.applyPreset('VINYL')` (also VHS, CASSETTE, CLEAN).

---

## The Dial Convention

Every effect in every module follows the same rule: **strength is a number from 0 to 100**,
stored in a namespaced CSS custom property.

| Module      | Namespace | Example              |
| ----------- | --------- | -------------------- |
| Hand-Drawn  | `--hd-*`  | `--hd-wobble: 80`    |
| Glitch      | `--gl-*`  | `--gl-rgb-split: 50` |
| Text-Motion | `--tm-*`  | `--tm-speed: 70`     |
| Media-Decay | `--md-*`  | `--md-grain: 40`     |

Set a dial in CSS:

```css
:root { --hd-wobble: 80; --gl-scanlines: 30; }
```

Or at runtime (which is how sliders and macros do it):

```js
StyleEngine.setDial('--hd-wobble', 80);   // the effect updates immediately
```

Most effects read their dial directly through CSS `calc()`. A few effects live on SVG filter
attributes that CSS cannot touch (displacement scale, animation duration, turbulence frequency).
For those, a JavaScript "binder" reads the dial and writes the attribute. Either way, **the dial
is the single source of truth.** If any effect had a hard-coded magnitude, a macro could not
move it.

---

## The Macro System

A macro is **one 0-100 knob mapped onto many dials**, exactly like an Ableton Live effect-rack
macro. You define which dials it drives, what range each dial should move through, what curve
to apply (linear, ease, exponential), and what "window" of the macro's range activates each
mapping.

```js
// Create a macro
var id = StyleEngine.macro.create({
  name: 'DECAY',
  mappings: [
    { cssVar: '--md-grain',    min: 0, max: 85, curve: 'ease',  window: [0, 40] },
    { cssVar: '--md-warble',   min: 0, max: 65, curve: 'ease',  window: [30, 70] },
    { cssVar: '--gl-dropout',  min: 0, max: 60, curve: 'exp',   window: [70, 100] }
  ]
});

// Turn the knob
StyleEngine.macro.setValue(id, 50);   // grain is maxed, warble is climbing, dropout is not yet active
```

The macro engine ships five **starter presets** (DECAY, VINYL, VHS, CASSETTE, HAND-MADE) that
demonstrate cross-module mapping. Load one with:

```js
StyleEngine.macro.load(StyleEngine.macro.starterPresets.DECAY);
StyleEngine.macro.setValue('decay-master', 75);
```

---

## Preset Format (styleEnginePreset v1)

The macro engine can serialize the **entire state** of every dial across every module, plus
every macro definition, into a single JSON object. This is the `styleEnginePreset v1` format.

```js
var preset = StyleEngine.macro.serialize();   // capture current state
// ... later ...
StyleEngine.macro.load(preset);              // restore it exactly
```

The JSON structure:

```json
{
  "styleEnginePreset": 1,
  "name": "My Look",
  "description": "Warm vintage with light glitch",
  "dials": {
    "--hd-wobble": 55,
    "--gl-scanlines": 20,
    "--md-tint": 40
  },
  "macros": [
    {
      "id": "decay-master",
      "name": "DECAY",
      "value": 50,
      "mappings": [ ... ]
    }
  ]
}
```

Save it as a JSON file, share it, load it in another project. Any dials for modules that are
not loaded are silently skipped.

---

## Dashboard (the Demo)

The demo at `demo/index.html` is a single offline HTML file with a control panel on the right
side. It is **generated** by `scripts/build_demo.py`, which inlines every module's CSS, JS, and
SVG defs so the demo can never drift from the canonical module files.

The panel shows every dial for every module, grouped by namespace. It also includes:

- A **Hand-Made-ness macro** that drives all seven hand-drawn dials from one slider.
- A **reveal-type dropdown** for switching text-motion animation styles.
- **Preset buttons** (VINYL, VHS, CASSETTE, CLEAN) for the media-decay module.
- A **DECAY macro** that drives dials across media-decay and glitch from one knob.

Rebuild it after editing any `modules/*` file:

```bash
python scripts/build_demo.py
```

---

## Quick Start: Adding to a Project

For full integration instructions (with code examples for every module), see
**[INTEGRATION.md](INTEGRATION.md)**.

The short version:

1. Copy the `modules/` files you need into your project.
2. In `<head>`, link each module's CSS file.
3. Just after `<body>`, paste each module's `.svg.html` contents (if the module has one).
4. Before `</body>`, add each module's JS file. **Load `hand-drawn.js` first** (it creates
   the shared `StyleEngine` registry). Load `macro.js` last.
5. Apply effect classes to your elements (`hd-box`, `gl-target`, `tm-target`, `md-target`).
6. Set initial dial values in `:root` CSS, or call `StyleEngine.setDial()` at runtime.

---

## File Structure

```text
style-engine/
+-- modules/
|   +-- hand-drawn.css          # dials + effects for the hand-drawn module
|   +-- hand-drawn.js           # binder: dials -> SVG attrs; creates StyleEngine registry
|   +-- hand-drawn.svg.html     # SVG filter defs (roughen / boil / grain)
|   +-- glitch.css              # dials + effects for digital breakage
|   +-- glitch.js               # stepped glitch binder + burst API
|   +-- glitch.svg.html         # SVG filter defs (static noise)
|   +-- text-motion.css         # dials + keyframes for text reveals
|   +-- text-motion.js          # reveal engine (typewriter, scramble, etc.)
|   +-- media-decay.css         # dials + effects for analog wear
|   +-- media-decay.js          # warble/flutter stepping, dust placement, ghosting
|   +-- media-decay.svg.html    # SVG filter defs (film grain, dust threshold)
|   +-- macro.js                # macro routing layer (depends on StyleEngine global)
+-- demo/
|   +-- index.html              # single-file live demo (GENERATED by build_demo.py)
|   +-- vendor/                 # Rough.js + rough-notation (inlined into the demo)
+-- scripts/
|   +-- build_demo.py           # assembles demo/index.html from modules/
|   +-- prep_drawing.py         # ink photo -> transparent PNG (+ optional traced SVG)
+-- skills/                     # portable SKILL.md rulebooks for Claude
+-- assets/
|   +-- manifest.json           # log of prepped assets
|   +-- samples/                # sample source drawings
+-- INTEGRATION.md              # full integration guide with code examples
+-- README.md                   # this file
```

---

## How to Add a New Module

Every module copies the same shape. To add a fifth module (say, "particles" with namespace
`--pt-*`):

1. **Create `modules/particles.css`**: Define your dials as `--pt-*` custom properties in
   `:root`, all scaled 0-100. Derive real units in a `--_pt-*` block using `calc()`. Write
   effect classes that consume the derived values.

2. **Create `modules/particles.js`**: For any effect that needs SVG attributes or canvas work
   that CSS cannot reach, write a sync function. Register it:

   ```js
   StyleEngine.register('particles', particlesSync);
   ```

   The registry calls your sync function once immediately and again on every `setDial()` call.

3. **Create `modules/particles.svg.html`** (if needed): Any SVG filter defs your module uses.
   Prefix all IDs with `pt-`.

4. **Add it to `build_demo.py`**: Read the new files, add dials to the panel, add a demo
   section, include the CSS/JS/SVG in the output.

5. **Update `macro.js`**: Add your dial names to the `ALL_DIALS` array so `serialize()` captures
   them in presets.

Because all modules speak the same language (0-100 dials, one `setDial` API), the macro engine
does not need any changes to drive your new module's dials.

---

## Accessibility

All motion is opt-in. Animations are gated by `prefers-reduced-motion: reduce`. The SVG boil
starts frozen and only animates when reduced motion is off. Glitch stepping, warble, flutter,
and text reveals all respect the preference. Slider controls are labelled for screen readers.
The accent ink clears WCAG AA contrast on the cream page. Body text is always a clean sans-serif
(Inter); handwriting fonts are used for headings only.

---

## Credits

Bundled in `demo/vendor/` and inlined into the demo:
[Rough.js](https://github.com/rough-stuff/rough) and
[rough-notation](https://github.com/rough-stuff/rough-notation), both MIT-licensed.
