#!/usr/bin/env python3
"""Pull a small set of demo images from the PlantShade dataset and downscale
them into assets/ for the project website. Everything here reads real frames
from the unzipped dataset; nothing is fabricated.

Layout produced:
  assets/species/{tomato,soybean,strawberry,sugarbeet}.jpg   gallery thumbs (RGB)
  assets/demo/light_01.png ... light_12.png                  circular-light slider (shadow)
  assets/modality/{rgb.jpg,mask.png,edge.png,shadow.png,depth.png}
  assets/compare/{source.jpg,shadow.png}
"""
import os
from PIL import Image, ImageFilter, ImageOps

DATA = "/scratch/xiaoouli/project/plantShade/dataset/plantAll/PlantShade"
UNZIP = os.path.join(DATA, "PlantShadeUnzip")
SHADOW = os.path.join(DATA, "shadow", "target")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")

# one representative single-plant sample per species (falls back gracefully)
SPECIES_SAMPLES = {
    "tomato":     "tomato_seed2_14_7_77",
    "soybean":    "soybean_seed10_28_1_83",
    "strawberry": "strawberry_seed10_28_1_83",
    "sugarbeet":  "1x3sugarbeet_seed10_7_7_70",
}


def sample_root(sample):
    """The nested dir that actually holds the day folders."""
    inner = os.path.join(UNZIP, sample, sample)
    return inner if os.path.isdir(inner) else os.path.join(UNZIP, sample)


def day_folders(root):
    days = []
    for d in os.listdir(root):
        p = os.path.join(root, d)
        if os.path.isdir(p) and d.isdigit():
            days.append(d)
    return sorted(days, key=int)


def save(img, path, maxw, fmt=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if img.width > maxw:
        h = int(img.height * maxw / img.width)
        img = img.resize((maxw, h), Image.LANCZOS)
    img.save(path, fmt, quality=82)
    print("  wrote", os.path.relpath(path, OUT), img.size)


def rgb_path(root, day, k):
    return os.path.join(root, day, f"rgb_{k}.jpg")


def seg_path(root, day, k):
    return os.path.join(root, day, f"seg_{k}.png")


def depth_path(root, day, k):
    return os.path.join(root, day, f"depth_{k}.png")


def shadow_path(sample, day, k):
    return os.path.join(SHADOW, sample, day, f"seg_{k}.png")


def build():
    # --- species gallery thumbs (RGB appearance) ---
    print("species thumbs:")
    for sp, sample in SPECIES_SAMPLES.items():
        root = sample_root(sample)
        days = day_folders(root)
        if not days:
            print("  SKIP", sp, "(no day folders)"); continue
        day = days[len(days) // 2]
        p = rgb_path(root, day, "50")
        if not os.path.exists(p):  # fall back to any rgb in the folder
            cands = [f for f in os.listdir(os.path.join(root, day)) if f.startswith("rgb_")]
            if not cands:
                print("  SKIP", sp); continue
            p = os.path.join(root, day, sorted(cands)[len(cands)//2])
        save(Image.open(p).convert("RGB"), os.path.join(OUT, "species", f"{sp}.jpg"), 480)

    # --- circular-light slider: 12 shadow frames across the trajectory ---
    print("light slider (tomato):")
    sample = SPECIES_SAMPLES["tomato"]
    root = sample_root(sample)
    days = day_folders(root)
    day = days[len(days) // 2] if days else "56"
    ks = [max(1, round(i * 100 / 12)) for i in range(1, 13)]  # spread 1..100
    for idx, k in enumerate(ks, 1):
        sp = shadow_path(sample, day, str(k))
        if not os.path.exists(sp):
            print("  miss shadow k=", k); continue
        save(Image.open(sp).convert("RGB"),
             os.path.join(OUT, "demo", f"light_{idx:02d}.png"), 560, "PNG")

    # --- modality grid (same tomato frame, mid trajectory) ---
    print("modalities:")
    k = "50"
    rgb = rgb_path(root, day, k)
    seg = seg_path(root, day, k)
    dep = depth_path(root, day, k)
    shd = shadow_path(sample, day, k)
    if os.path.exists(rgb):
        im = Image.open(rgb).convert("RGB")
        save(im, os.path.join(OUT, "modality", "rgb.jpg"), 640)
        # Canny not available (no cv2) -> approximate structural edges with PIL
        edge = im.convert("L").filter(ImageFilter.FIND_EDGES)
        edge = ImageOps.autocontrast(edge)
        save(edge.convert("RGB"), os.path.join(OUT, "modality", "edge.png"), 640, "PNG")
        # reuse for compare source
        save(im, os.path.join(OUT, "compare", "source.jpg"), 640)
    for src, name in [(seg, "mask.png"), (dep, "depth.png"), (shd, "shadow.png")]:
        if os.path.exists(src):
            save(Image.open(src).convert("RGB"),
                 os.path.join(OUT, "modality", name), 640, "PNG")
    if os.path.exists(shd):
        save(Image.open(shd).convert("RGB"),
             os.path.join(OUT, "compare", "shadow.png"), 640, "PNG")

    print("done ->", OUT)


if __name__ == "__main__":
    build()
