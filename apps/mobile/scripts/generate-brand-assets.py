#!/usr/bin/env python3
"""
Generates FitTrack's app icon, Android adaptive icon layers, splash images
and favicon from one drawing, so every asset is the same mark.

  python3 apps/mobile/scripts/generate-brand-assets.py

Needs Pillow (`pip3 install pillow`); it's a dev tool, not an app dependency.

The mark: a barbell drawn as a rising line, tilted up like a progress chart:
training and tracking in one shape. Colors are the DESIGN.md tokens
(Ember gradient #D63F0A -> #B83508 -> #9A2C06, white mark; dark splash on
Iron #0B0F17 with an Effort Orange #FF5A1F mark).
"""
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SS = 4  # supersampling: draw 4x larger, then downscale for smooth edges

EMBER = (0xD6, 0x3F, 0x0A)
EMBER_MID = (0xB8, 0x35, 0x08)
EMBER_DEEP = (0x9A, 0x2C, 0x06)
EFFORT = (0xFF, 0x5A, 0x1F)
IRON = (0x0B, 0x0F, 0x17)
WHITE = (255, 255, 255)
TILT_DEG = 20  # upward, like a rising trend


def gradient(size: int) -> Image.Image:
    """Diagonal Ember gradient (top-left -> bottom-right), the auth hero's colors."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    stops = [(0.0, EMBER), (0.5, EMBER_MID), (1.0, EMBER_DEEP)]
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
                if t <= t1:
                    k = (t - t0) / (t1 - t0)
                    px[x, y] = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
                    break
    return img


def mark(size: int, box: float, color) -> Image.Image:
    """The barbell mark on a transparent square; `box` = share of the canvas it spans."""
    S = size * SS
    m = S * box  # the mark's own coordinate unit
    c = S / 2
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def rect(cx: float, w: float, h: float):
        r = min(w, h) * 0.35
        d.rounded_rectangle([c + cx - w / 2, c - h / 2, c + cx + w / 2, c + h / 2], radius=r, fill=color)

    # Deliberately few, chunky parts: it has to read at 60px in Settings and
    # Spotlight, where thin bars and small collars blur into noise
    rect(0, 0.86 * m, 0.10 * m)  # the bar
    for side in (-1, 1):
        rect(side * 0.26 * m, 0.13 * m, 0.50 * m)  # inner (big) plates
        rect(side * 0.40 * m, 0.10 * m, 0.34 * m)  # outer (small) plates

    layer = layer.rotate(TILT_DEG, resample=Image.BICUBIC, center=(c, c))
    return layer.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, name: str):
    img.save(ASSETS / name, optimize=True)
    print(f"wrote assets/{name} {img.size}")


def main():
    # App icon (iOS masks the corners itself, so it's full-bleed square)
    icon = gradient(1024).convert("RGBA")
    icon.alpha_composite(mark(1024, 0.74, WHITE))
    save(icon.convert("RGB"), "icon.png")

    # Android adaptive icon: background + foreground layers. The launcher crops
    # to circles/squircles, so the mark stays inside the central ~60% safe zone.
    save(gradient(512), "android-icon-background.png")
    save(mark(512, 0.58, WHITE), "android-icon-foreground.png")
    # Android 13 themed icons: a single-color silhouette the system tints
    save(mark(432, 0.58, WHITE), "android-icon-monochrome.png")

    # Splash: the mark alone; app.json sets the background color around it
    save(mark(1024, 0.92, WHITE), "splash-icon.png")
    save(mark(1024, 0.92, EFFORT), "splash-icon-dark.png")

    save(icon.convert("RGB").resize((48, 48), Image.LANCZOS), "favicon.png")


if __name__ == "__main__":
    main()
