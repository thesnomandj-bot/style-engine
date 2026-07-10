#!/usr/bin/env python3
"""
prep_drawing.py — turn a photo/scan of a BLACK-INK drawing into a clean,
transparent asset for the Hand-Drawn module.

  python scripts/prep_drawing.py mydrawing.jpg "curved arrow pointing right"

What it does:
  1. Grayscale + (default) flatten uneven lighting, so the paper goes to pure
     white and the ink to solid dark even in a phone photo with a shadow.
  2. Convert LUMINANCE -> ALPHA. Paper becomes TRULY transparent (alpha 0),
     not merely hidden by a blend mode. Ink keeps soft anti-aliased edges.
  3. Write a transparent PNG to assets/.
  4. If `potrace` is installed, also write a traced SVG with fill="currentColor"
     so CSS can recolor the mark (e.g. style="color: var(--hd-accent)").
     If potrace is missing, that step is skipped cleanly (PNG still produced).
  5. Append an entry (filename, type, description, date, source) to
     assets/manifest.json.

Only dependency: Pillow (PIL). potrace is optional (brew install potrace).
"""
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

try:
    from PIL import Image, ImageOps, ImageChops, ImageFilter
except ImportError:
    sys.exit("ERROR: Pillow is required.  Install it with:  python -m pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "assets"


def rel(p: Path) -> str:
    """Display a path relative to the repo when possible, else absolute.
    (Path.relative_to raises for paths outside ROOT, e.g. a custom --out-dir.)"""
    try:
        return str(p.relative_to(ROOT))
    except ValueError:
        return str(p)


def slugify(text: str) -> str:
    keep = "".join(c if c.isalnum() or c in "-_ " else "" for c in text).strip()
    return "-".join(keep.lower().split()) or "drawing"


def hex_to_rgb(h: str):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def flatten_alpha_over_white(img: Image.Image) -> Image.Image:
    """If the input already has transparency, composite it over white first, so an
    existing alpha channel is honored instead of silently read as solid ink."""
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        bg.alpha_composite(rgba)
        return bg.convert("RGB")
    return img


def build_ink_alpha(img: Image.Image, invert: bool, flatten: bool, gamma: float) -> Image.Image:
    """Return a single-channel 'L' image that is the ink ALPHA:
       255 where ink is solid, 0 where paper is (transparent)."""
    gray = ImageOps.grayscale(flatten_alpha_over_white(img))
    if invert:                      # white ink on dark paper
        gray = ImageOps.invert(gray)

    if flatten:
        # Estimate the paper/background by heavily blurring, then subtract the
        # drawing from it. Paper (gray ~= background) -> ~0; ink (gray << bg) ->
        # bright. This cancels uneven lighting / shadows. Pure PIL, no numpy.
        w, h = gray.size
        radius = max(8, min(w, h) // 8)
        background = gray.filter(ImageFilter.GaussianBlur(radius))
        ink = ImageChops.subtract(background, gray)   # paper->black, ink->bright
    else:
        ink = ImageOps.invert(gray)                   # ink bright on paper black

    # Normalize levels: stretch so paper is fully 0 and ink cores are fully 255
    # (this is the "paper -> pure white, ink -> solid dark" step, in the alpha
    # domain). Scalar cutoff clips 1% off each end THEN maps min->0, max->255.
    ink = ImageOps.autocontrast(ink, cutoff=1)

    if gamma and gamma > 0 and gamma != 1.0:
        # gamma > 1 = punchier/darker ink, gamma < 1 = lighter. (1/gamma exponent
        # so a bigger number reads as "more ink", which is what a user expects.)
        lut = [min(255, int(round(255 * (v / 255) ** (1.0 / gamma)))) for v in range(256)]
        ink = ink.point(lut)
    return ink


def make_png(alpha: Image.Image, ink_rgb, out_path: Path):
    """Solid-ink RGB carried by the ink alpha -> clean transparent PNG."""
    rgba = Image.new("RGBA", alpha.size, ink_rgb + (0,))
    solid = Image.new("RGBA", alpha.size, ink_rgb + (255,))
    rgba = Image.composite(solid, rgba, alpha)   # alpha selects ink color vs transparent
    rgba.putalpha(alpha)
    rgba.save(out_path)
    return rgba


def try_potrace(alpha: Image.Image, threshold: int, out_svg: Path) -> bool:
    """Trace to SVG with fill='currentColor' if potrace exists. Returns success."""
    exe = shutil.which("potrace")
    if not exe:
        print("  · potrace not found — SVG tracing skipped.")
        print("    (optional) enable it with:  brew install potrace   # then re-run")
        return False
    # potrace reads a bitmap and treats BLACK pixels as the foreground to trace.
    # Our alpha is 255 where the INK is, so the ink must become BLACK (mode-'1' 0)
    # and the paper WHITE (255). Getting this polarity wrong traces the paper.
    bw = alpha.point(lambda v: 0 if v > threshold else 255).convert("1")
    with tempfile.NamedTemporaryFile(suffix=".pbm", delete=False) as tf:
        tmp = Path(tf.name)
    try:
        bw.save(tmp)
        subprocess.run([exe, str(tmp), "-s", "-o", str(out_svg)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        # Recolor: potrace fills solid black; swap to currentColor so CSS `color` recolors it.
        svg = out_svg.read_text(encoding="utf-8")
        svg = svg.replace('fill="#000000"', 'fill="currentColor"')
        svg = svg.replace("fill:#000000", "fill:currentColor")
        if "currentColor" not in svg:  # ensure at least the group inherits currentColor
            svg = svg.replace("<g ", '<g fill="currentColor" ', 1)
        out_svg.write_text(svg, encoding="utf-8")
        print(f"  · traced SVG  -> {rel(out_svg)}  (fill=currentColor)")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  · potrace failed: {e.stderr.decode(errors='ignore').strip()}")
        return False
    finally:
        tmp.unlink(missing_ok=True)


def load_manifest(manifest_path: Path) -> dict:
    if manifest_path.exists():
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            if isinstance(data, list):          # tolerate a bare array
                data = {"assets": data}
            # coerce a syntactically-valid-but-wrong-typed "assets" back to a list
            if not isinstance(data.get("assets"), list):
                data["assets"] = []
            return data
        except json.JSONDecodeError:
            print("  · manifest.json was unreadable — starting a fresh one.")
    return {"module": "hand-drawn", "assets": []}


def append_manifest(manifest_path: Path, entries: list):
    data = load_manifest(manifest_path)
    data["assets"].extend(entries)
    data["updated"] = date.today().isoformat()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"  · manifest    -> {rel(manifest_path)}  ({len(data['assets'])} assets total)")


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Prep a black-ink drawing into a transparent PNG (+optional traced SVG).")
    ap.add_argument("input", help="path to the drawing photo/scan (jpg/png/…)")
    ap.add_argument("description", nargs="?", default="",
                    help='what it is, e.g. "curved arrow pointing right"')
    ap.add_argument("--name", help="output basename (default: slug of description or input name)")
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT), help="output directory (default: assets/)")
    ap.add_argument("--ink", default="#1a1a17", help="ink color for the PNG (default #1a1a17)")
    ap.add_argument("--invert", action="store_true", help="input is WHITE ink on DARK paper")
    ap.add_argument("--no-flatten", dest="flatten", action="store_false",
                    help="disable lighting-flatten (use for solid-fill art, not line art)")
    ap.add_argument("--gamma", type=float, default=1.0, help="alpha gamma; >1 = punchier ink")
    ap.add_argument("--threshold", type=int, default=128, help="ink threshold for potrace (0-255)")
    args = ap.parse_args(argv)

    src = Path(args.input).expanduser()
    if not src.exists():
        sys.exit(f"ERROR: input not found: {src}")

    out_dir = Path(args.out_dir).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)
    base = args.name or (slugify(args.description) if args.description else slugify(src.stem))
    png_path = out_dir / f"{base}.png"
    svg_path = out_dir / f"{base}.svg"

    print(f"prep_drawing: {src.name} -> {base}")
    try:
        img = Image.open(src)
    except Exception as e:
        sys.exit(f"ERROR: could not open image: {e}")

    alpha = build_ink_alpha(img, invert=args.invert, flatten=args.flatten, gamma=args.gamma)
    make_png(alpha, hex_to_rgb(args.ink), png_path)
    # honest stat: how much of the image became transparent
    hist = alpha.histogram()
    transparent = hist[0] / float(alpha.size[0] * alpha.size[1]) * 100
    print(f"  · PNG         -> {rel(png_path)}  ({transparent:.0f}% paper made transparent)")

    today = date.today().isoformat()
    entries = [{
        "filename": png_path.name, "type": "png",
        "description": args.description or base, "date": today, "source": src.name,
    }]
    if try_potrace(alpha, args.threshold, svg_path):
        entries.append({
            "filename": svg_path.name, "type": "svg",
            "description": args.description or base, "date": today, "source": src.name,
        })
    # manifest lives WITH the outputs (follows --out-dir) so entries resolve beside it
    append_manifest(out_dir / "manifest.json", entries)
    print("done.")


if __name__ == "__main__":
    main()
