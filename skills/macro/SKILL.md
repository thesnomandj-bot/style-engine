---
name: macro
description: Build and drive Style Engine macros — one 0-100 knob that routes to many module dials at once, Ableton effect-rack style. Use when creating cross-module looks, designing preset knobs, window mappings, or curves for the Style Engine.
---

# Style Engine — Macro Engine

## The Ableton analogy (plain English)

In Ableton Live you can drop effects into a **rack** and put a **macro knob**
on the front of it. That one knob is wired to several controls inside — turning
it up might open a filter, add reverb, and raise the drive all at the same time,
each by a different amount. One gesture, many changes.

A Style Engine **macro** is exactly that, for CSS effects. A macro is one
`0–100` knob. You wire it to any number of module dials (`--md-grain`,
`--gl-dropout`, `--hd-wobble`, …). Turning the knob moves all of them together,
each with its own range and its own behavior. The macro never renders anything
itself — it just **routes** its value out to the modules by calling
`StyleEngine.setDial()`.

## Window mapping (the key idea)

Every wire from the knob to a dial is a **mapping**, and every mapping has a
**window**: `[start, end]`. The window is the slice of the knob's `0–100` range
where that particular dial is allowed to move.

- Knob **below** `start` → the dial sits at its `min`. (Not engaged yet.)
- Knob **above** `end` → the dial sits at its `max`. (Fully engaged.)
- Knob **between** `start` and `end` → the dial interpolates from `min` to `max`.

**Concrete example — the DECAY macro.** One knob makes an image rot in stages:

| Dial | Window | What it means |
|------|--------|---------------|
| `--md-grain` | `[0, 40]` | Grain appears immediately and is maxed by 40. |
| `--md-tint` | `[20, 60]` | Color shift starts a bit later. |
| `--md-warble` | `[30, 70]` | Wobble joins in the middle. |
| `--md-ghosting` | `[50, 90]` | Ghosting only past halfway. |
| `--gl-dropout` | `[70, 100]` | Signal dropouts only in the last stretch. |

So at knob = 25 you have grain and a hint of tint. At 75 the image is grainy,
tinted, warbling, ghosting, and starting to drop out. **One knob, five dials,
across two modules, each entering at its own point.** That staggering is what
windows buy you.

## Curves (and when to use each)

The `curve` controls how a mapping moves *within* its window (`t` goes `0→1`):

| Curve | Math | Feel | Use when |
|-------|------|------|----------|
| `linear` | `min + (max-min)·t` | Even, predictable | Default; you want the dial to track the knob 1:1. |
| `ease` | cubic ease-in-out | Slow start, slow end, fast middle | Organic effects (grain, warble) where a hard edge looks mechanical. |
| `exp` | `min + (max-min)·t²` | Almost nothing, then a fast ramp | Effects that should stay subtle then slam in late (dropouts, ghosting). |

## Preset format

A preset is versioned JSON. `serialize()` produces it; `load()` consumes it.

```json
{
  "styleEnginePreset": 1,
  "name": "DECAY",
  "description": "Flagship cross-module macro",
  "dials": {
    "--md-grain": 0,
    "--gl-dropout": 0
  },
  "macros": [
    {
      "id": "decay-master",
      "name": "DECAY",
      "value": 0,
      "mappings": [
        { "cssVar": "--md-grain", "elementScope": ":root",
          "min": 0, "max": 85, "curve": "ease", "window": [0, 40] }
      ]
    }
  ]
}
```

- `dials` — a full snapshot of every dial's current value (restored verbatim).
- `macros` — each macro's `id`, `name`, `value`, and `mappings`.
- `load()` validates `styleEnginePreset === 1`, sets the dials, rebuilds the
  macros, then applies each macro's `value`. Round-trips exactly.

## How to design a good macro

1. **Pick dials that tell one story.** DECAY groups media-rot dials; HAND-MADE
   groups every `--hd-*` dial. A macro should feel like a single idea.
2. **Stagger windows for progressive complexity.** Put the "always-on" flavor
   dials at `[0, x]` and the "extreme" dials at `[70, 100]`. The knob then reads
   as an intensity dial that keeps revealing more as it climbs.
3. **Match curve to intent.** `ease` for organic textures, `exp` for effects
   that should ambush late, `linear` when you want the user to feel direct control.
4. **Set honest `min`/`max`.** `max` is the loudest that dial should ever get
   under this macro — it does not have to be 100.
5. **Keep it cross-module when it helps.** The invention is that one knob spans
   modules; DECAY reaching from `--md-*` into `--gl-dropout` is the whole point.

## Quick-start

```html
<!-- macro.js loads LAST, after style-engine.js and the modules -->
<script src="modules/style-engine.js"></script>
<script src="modules/media-decay.js"></script>
<script src="modules/glitch.js"></script>
<script src="modules/macro.js"></script>
```

```js
// 1. Create a macro
const id = StyleEngine.macro.create({ name: 'GRIT', value: 0 });

// 2. Add mappings (wires from the knob to dials)
StyleEngine.macro.addMapping(id, {
  cssVar: '--md-grain', min: 0, max: 80, curve: 'ease', window: [0, 100]
});
StyleEngine.macro.addMapping(id, {
  cssVar: '--gl-dropout', min: 0, max: 55, curve: 'exp', window: [70, 100]
});

// 3. Turn the knob
StyleEngine.macro.setValue(id, 85);

// Or just load a built-in:
StyleEngine.macro.load(StyleEngine.macro.starterPresets.DECAY);
StyleEngine.macro.setValue('decay-master', 60);
```

## Completion checklist

- [ ] `macro.js` loaded **after** core + all modules.
- [ ] Every mapping has `cssVar`, `min`, `max`, `curve`, and a `window`.
- [ ] Windows staggered if you want progressive reveal.
- [ ] Curve chosen per dial intent (linear / ease / exp).
- [ ] Cross-module macros verified with all target modules loaded.
- [ ] `serialize()` → `load()` round-trip reproduces the look exactly.
- [ ] Macro drives dials through `StyleEngine.setDial` (no direct DOM writes
      except intentional non-`:root` `elementScope` overrides).
