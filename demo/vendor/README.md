# Vendored libraries (inlined into demo/index.html at build time)

- `rough.min.js` — Rough.js v4.6.6 (MIT) — https://github.com/rough-stuff/rough — global `rough`
- `rough-notation.iife.js` — rough-notation v0.2.1 (MIT) — https://github.com/rough-stuff/rough-notation — global `RoughNotation`

These are inlined into `demo/index.html` by `scripts/build_demo.py` so the demo is a true
offline single file. To update: replace the file and re-run `python scripts/build_demo.py`.
