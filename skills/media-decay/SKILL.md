---
name: media-decay
description: Analog wear/degradation for the Style Engine — film grain, dust, tape warble, soft chroma ghosting, sun-faded tint, edge vignette, and projector flutter. Turn dials 0-100 to age content from pristine to worn. Use when a page should look like film, tape, vinyl, or an old projector — NOT digital glitch.
---

# Media-Decay (Analog Wear)

Ages content the way **physical media** ages — film stock, VHS tape, cassette,
vinyl sleeves, a flickering projector. You turn seven dials from `0` (pristine)
to `100` (badly worn) and the page picks up grain, dust, warble, ghosting,
tint, vignette, and flutter.

## Analog, not digital — the one thing to remember

This module is **analog wear**. Its cousin, the **glitch** module, is **digital
breakage**. They are completely separate and never share code.

| Media-Decay (this module)            | Glitch (a different module)         |
|--------------------------------------|-------------------------------------|
| Film grain, tape hiss, dust, warble  | Data corruption, block shift        |
| **Soft, blurred** chroma bleed       | **Hard, sharp** RGB pixel split     |
| Sun-faded warmth, vignette           | Scanlines, datamosh                 |
| Feels like it *wore out over years*  | Feels like it *broke this instant*  |

If you want scanlines or a hard RGB split, that's glitch — not here. Ghosting in
this module is deliberately soft and blurry, like a tape head bleeding chroma —
the opposite of glitch's crisp pixel offset.

## The seven dials

Every dial is `0-100`. Set them on `:root` as `--md-<name>`.

| Dial       | At 0                       | At 100                                  |
|------------|----------------------------|-----------------------------------------|
| `grain`    | Clean, no noise            | Heavy film grain over everything        |
| `dust`     | Spotless                   | Thick specks + hairline scratches       |
| `warble`   | Rock-steady                | Slow tape-like horizontal wave          |
| `ghosting` | Sharp, single image        | Strong soft chroma bleed / echo         |
| `tint`     | Neutral color              | Heavily sun-faded, warm/sepia           |
| `vignette` | Even brightness to edges   | Dark, worn corners                      |
| `flutter`  | Steady brightness          | Projector-style brightness flicker      |

## Quick start

1. Include the three files:
   ```html
   <link rel="stylesheet" href="modules/media-decay.css">
   <!-- paste modules/media-decay.svg.html once, near the top of <body> -->
   <script src="modules/media-decay.js"></script>
   ```
   (The Style Engine core, which defines `window.StyleEngine`, must load first.)

2. Mark the element you want to age:
   ```html
   <section class="md-target"> ... your content ... </section>
   ```

3. Turn dials — any of these work:
   ```javascript
   // one dial at a time (re-runs all syncers)
   StyleEngine.setDial('--md-grain', 40);

   // or a whole look at once
   StyleEngine.mediaDecay.applyPreset('VHS');
   ```

   Or set them straight in CSS for a fixed look:
   ```css
   :root { --md-grain: 25; --md-tint: 30; --md-vignette: 20; }
   ```

Want just one effect? Use the single-effect classes instead of `.md-target`:
`.md-grain`, `.md-dust`, `.md-warble`, `.md-ghosting`, `.md-tint`,
`.md-vignette`, `.md-flutter`.

## Presets

Call `StyleEngine.mediaDecay.applyPreset('NAME')`.

- **VINYL** — heavy dust and scratches, gentle grain, warm faded tint, almost no
  motion. Looks like a well-loved record sleeve or an old printed photo.
- **VHS** — strong soft ghosting, noticeable flutter and warble, cool-ish light
  grain, darker edges. Looks like a worn videotape playing back.
- **CASSETTE** — the most warble (that wow-and-flutter tape wobble), medium
  grain and tint, minimal ghosting. Looks like audio-era analog haze.
- **CLEAN** — every dial at 0. Pristine. Use this to reset.

## Failure modes checklist

- [ ] **Nothing shows up** → Did you paste `media-decay.svg.html` into the page?
      Grain and dust need the `#md-grain` / `#md-dust` SVG filters.
- [ ] **Grain/ghost hides your text** → Lower `--md-grain` / `--md-ghosting`;
      grain caps at ~0.55 opacity by design but stacking effects compounds.
- [ ] **No warble or flutter motion** → They only run when a dial is > 0 **and**
      reduced-motion is off. Check the OS "reduce motion" setting.
- [ ] **Ghosting looks like a hard RGB split** → That's wrong for this module;
      it should be soft and blurred. Confirm you're not also applying the glitch
      module to the same element.
- [ ] **Dust pattern identical every reload** → Intended. Placement is seeded so
      the wear is stable, not twinkling randomly.
- [ ] **Vignette/tint clip weird corners** → The target needs to be a positioned
      block; `.md-target` sets `position: relative` for you.

## Accessibility

- Under `prefers-reduced-motion: reduce`, **warble and flutter freeze**: the CSS
  pins them to neutral and the JS clears its steppers, so there is zero motion.
  Static wear (grain, dust, tint, vignette, ghosting) stays, since it doesn't
  move.
- The JS listens for live changes to the reduced-motion setting and re-syncs.
- Keep grain, ghosting, and vignette moderate on anything containing readable
  text — heavy analog wear reduces contrast.
- The JS ghost duplicate layer is `aria-hidden` and non-interactive, so screen
  readers and keyboard focus ignore it.

## Completion checklist

- [ ] All 7 dials set on `:root` as `--md-*` (0-100).
- [ ] `media-decay.svg.html` injected once; `#md-grain` and `#md-dust` present.
- [ ] Element(s) carry `.md-target` (or a single-effect `.md-*` class).
- [ ] `StyleEngine.mediaDecay.presets` and `.applyPreset()` both callable.
- [ ] At every dial = 0, the effect is completely invisible.
- [ ] Warble and flutter visibly step (discrete), not smooth-glide.
- [ ] Reduced-motion freezes warble + flutter, keeps static wear.
- [ ] Ghosting reads as soft/blurred analog bleed, not a hard pixel split.
- [ ] No glitch-module code referenced anywhere.
