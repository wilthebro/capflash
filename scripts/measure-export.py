"""
Measure the caption ink in a frame rendered by scripts/measure-export.ts.

Asserts properties rather than a recomputed box on purpose: recomputing the
expected geometry here would re-derive it with the same formula under test and
agree with it either way. What matters is whether the captions are *visible*
and where they sit in the frame.

Before the resolution fix, the stock 1080x1920 box applied to a 576x1024 video
drew everything below the frame, so this reports NO INK FOUND — which is the
failure the check exists to catch.

    python scripts/measure-export.py test-assets/measure/frame-576x1024.png
"""
import sys

from PIL import Image

BRIGHT = 200  # white glyphs on the flat mid-grey background the probe renders


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else "test-assets/measure/frame-1080x1920.png"
    img = Image.open(path).convert("L")
    w, h = img.size
    px = img.load()

    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            if px[x, y] > BRIGHT:
                xs.append(x)
                ys.append(y)

    print(f"frame {path}  {w}x{h}")
    if not xs:
        print("  measured: NO INK FOUND")
        print("  FAIL - no caption was drawn inside the frame at all.")
        return 1

    left, right = min(xs), max(xs)
    top, bottom = min(ys), max(ys)
    print(f"  ink bbox: x {left}..{right}   y {top}..{bottom}")
    print(f"  as frame%: left {left/w:.1%}  right {right/w:.1%}  top {top/h:.1%}  bottom {bottom/h:.1%}")

    failures = []
    if not (0 <= left and right < w and 0 <= top and bottom < h):
        failures.append("ink is clipped by the frame edge")
    # The design places captions in the lower part of a portrait frame; a box
    # that merely lands "somewhere visible" is not necessarily the fix.
    if top < h * 0.5:
        failures.append(f"ink starts at {top/h:.0%} of frame height, expected the lower half")

    if failures:
        for f in failures:
            print(f"  FAIL - {f}")
        return 1

    print("  PASS - captions are visible and sit in the lower frame")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
