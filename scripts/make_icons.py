#!/usr/bin/env python3
"""Generate favicons + apple-touch-icon + maskable + OG thumbnail from the logo."""
from PIL import Image, ImageOps, ImageFilter
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public"
SRC = OUT / "logo.png"

def fit_square(im: Image.Image) -> Image.Image:
    """Center-crop to the largest square."""
    w, h = im.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    return im.crop((left, top, left + s, top + s)).convert("RGBA")

def with_red_bg(im: Image.Image, size: int) -> Image.Image:
    """Place the logo on a deep crimson radial background so it reads well at small sizes."""
    # Base: deep maroon-black to match brand
    bg = Image.new("RGBA", (size, size), (10, 5, 6, 255))
    # Add a soft crimson radial glow in the center
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx, cy = size // 2, size // 2
    max_r = size // 2
    for r in range(max_r, 0, -2):
        # Gradient from #7A1417 (outer) to #C62828 (center)
        t = 1 - (r / max_r)
        cr = int(122 + (198 - 122) * t)
        cg = int(20 + (40 - 20) * t)
        cb = int(23 + (40 - 23) * t)
        alpha = int(180 * t)
        # Draw a filled circle
        for offset in (-1, 0, 1):
            pass
        # Use ImageDraw for efficiency
        from PIL import ImageDraw
        d = ImageDraw.Draw(glow)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(cr, cg, cb, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(2, size // 60)))
    bg.alpha_composite(glow)

    # Resize the logo to fit (with padding)
    pad = int(size * 0.10)
    inner = size - 2 * pad
    logo = im.copy()
    logo.thumbnail((inner, inner), Image.LANCZOS)
    # Center composite
    lx = (size - logo.width) // 2
    ly = (size - logo.height) // 2
    bg.alpha_composite(logo, (lx, ly))
    return bg

def main():
    src = Image.open(SRC).convert("RGBA")
    # Square the source (center-crop)
    sq = fit_square(src)

    sizes_plain = [16, 32, 180, 192, 512]
    for s in sizes_plain:
        out = with_red_bg(sq, s)
        out.save(OUT / f"icon-{s}.png")

    # Maskable: extra padding (safe zone)
    maskable = sq.copy()
    # For maskable, put more padding around the logo
    size = 512
    bg = Image.new("RGBA", (size, size), (10, 5, 6, 255))
    # Subtle radial glow
    from PIL import ImageDraw
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    cx, cy = size // 2, size // 2
    max_r = size // 2
    for r in range(max_r, 0, -4):
        t = 1 - (r / max_r)
        cr = int(122 + (198 - 122) * t)
        cg = int(20 + (40 - 20) * t)
        cb = int(23 + (40 - 23) * t)
        alpha = int(150 * t)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(cr, cg, cb, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=12))
    bg.alpha_composite(glow)
    pad = int(size * 0.20)  # 20% padding for safe zone
    inner = size - 2 * pad
    logo = sq.copy()
    logo.thumbnail((inner, inner), Image.LANCZOS)
    lx = (size - logo.width) // 2
    ly = (size - logo.height) // 2
    bg.alpha_composite(logo, (lx, ly))
    bg.save(OUT / "icon-maskable-512.png")

    # Apple touch icon — same as 180 but with no transparency (iOS dislikes it)
    apple = with_red_bg(sq, 180).convert("RGB")
    apple.save(OUT / "apple-touch-icon.png")

    # Browser favicon, generated from the same mark as the install icons.
    fit_square(src).save(OUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])

    # OG thumbnail — 1200x630
    og = Image.new("RGBA", (1200, 630), (10, 5, 6, 255))
    # Side glow
    glow2 = Image.new("RGBA", (1200, 630), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(glow2)
    for r in range(700, 0, -10):
        t = 1 - (r / 700)
        cr = int(122 + (198 - 122) * t)
        cg = int(20 + (40 - 20) * t)
        cb = int(23 + (40 - 23) * t)
        alpha = int(180 * t)
        d2.ellipse([600 - r, 315 - r, 600 + r, 315 + r], fill=(cr, cg, cb, alpha))
    glow2 = glow2.filter(ImageFilter.GaussianBlur(radius=40))
    og.alpha_composite(glow2)
    # Place the logo larger on the left
    logo_big = sq.copy()
    logo_big.thumbnail((520, 520), Image.LANCZOS)
    og.alpha_composite(logo_big, (140, (630 - logo_big.height) // 2))
    og = og.convert("RGB")
    og.save(OUT / "og-image.png", quality=88)

    print("Generated favicons, apple-touch-icon, maskable, OG thumbnail.")

if __name__ == "__main__":
    main()
