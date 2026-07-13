#!/usr/bin/env python3
"""Extend the website assets:
  - assets/demo/<layout>/<species>_01..08.png   2x2 species x layout light sweep
  - assets/modality/depth.png                    properly-normalized depth (was blown-out white)
All frames are real dataset shadow maps at a mid-growth stage.
"""
import os, numpy as np
from PIL import Image

BASE = "/scratch/xiaoouli/project/plantShade/dataset/plantAll/PlantShade"
ID   = os.path.join(BASE, "shadow", "target")
OOD  = os.path.join(BASE, "shadow_OOD", "target")
UNZIP = os.path.join(BASE, "PlantShadeUnzip")
OUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
NFR  = 8   # frames per combo

# (species, layout) -> (root, sample dir name)
COMBOS = {
    "1x1": {
        "tomato":     (ID,  "tomato_seed2_14_7_77"),
        "soybean":    (ID,  "soybean_seed10_28_1_83"),
        "strawberry": (ID,  "strawberry_seed10_28_1_83"),
        "sugarbeet":  (OOD, "sugarbeet_seed10_28_1_83"),
    },
    "1x3": {
        "tomato":     (ID,  "1x3tomato_seed10_7_7_70"),
        "soybean":    (ID,  "1x3soybean_seed10_7_7_70"),
        "strawberry": (ID,  "1x3strawberry_seed10_7_7_70"),
        "sugarbeet":  (ID,  "1x3sugarbeet_seed10_7_7_70"),
    },
    "3x5": {
        "tomato":     (ID,  "3x5tomato_seed10_7_7_70"),
        "sugarbeet":  (ID,  "3x5sugarbeet_seed10_7_7_70"),
        "soybean":    (OOD, "3x5soybean_seed10_7_7_70"),
        "strawberry": (OOD, "3x5strawberry_seed10_7_7_70"),
    },
}


def stage_dirs(sample_root):
    """Return sorted list of dirs that directly hold seg_*.png frames."""
    stages = []
    for d in sorted(os.listdir(sample_root)):
        p = os.path.join(sample_root, d)
        if os.path.isdir(p) and os.path.exists(os.path.join(p, "seg_1.png")):
            stages.append(p)
    return stages


def save(img, path, maxw=360):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if img.width > maxw:
        img = img.resize((maxw, round(img.height * maxw / img.width)), Image.LANCZOS)
    img.save(path)


def build_demo():
    for layout, species in COMBOS.items():
        for sp, (root, sample) in species.items():
            sroot = os.path.join(root, sample)
            if not os.path.isdir(sroot):
                print("  MISSING sample", layout, sp, sroot); continue
            stages = stage_dirs(sroot)
            if not stages:
                print("  no stages", layout, sp); continue
            stage = stages[len(stages) // 2]           # mid growth
            ks = [max(1, round(i * 100 / NFR)) for i in range(1, NFR + 1)]
            n = 0
            for idx, k in enumerate(ks, 1):
                fp = os.path.join(stage, f"seg_{k}.png")
                if not os.path.exists(fp):
                    continue
                save(Image.open(fp).convert("RGB"),
                     os.path.join(OUT, "demo", layout, f"{sp}_{idx:02d}.png"))
                n += 1
            print(f"  {layout:4s} {sp:11s} <- {os.path.basename(sroot)} @ {os.path.basename(stage)}  ({n} frames)")


def fix_depth():
    """Normalize a raw int32 depth (mm) to a viridis-like RGB so it shows content."""
    root = os.path.join(UNZIP, "tomato_seed2_14_7_77", "tomato_seed2_14_7_77")
    # pick same frame family used by other modalities (day ~mid, position 50)
    days = sorted([d for d in os.listdir(root) if d.isdigit()], key=int)
    day = days[len(days) // 2] if days else "56"
    dp = os.path.join(root, day, "depth_50.png")
    if not os.path.exists(dp):
        print("  depth frame missing", dp); return
    d = np.array(Image.open(dp)).astype(np.float32)
    lo, hi = np.percentile(d, 2), np.percentile(d, 98)
    dn = np.clip((d - lo) / (hi - lo + 1e-6), 0, 1)
    dn = 1.0 - dn                                    # near = bright
    # simple green-teal ramp (matches site palette), no matplotlib needed
    r = (dn * 90).astype(np.uint8)
    g = (40 + dn * 200).astype(np.uint8)
    b = (30 + dn * 90).astype(np.uint8)
    rgb = np.stack([r, g, b], axis=-1)
    save(Image.fromarray(rgb, "RGB"), os.path.join(OUT, "modality", "depth.png"), 640)
    print("  depth.png normalized ->", os.path.basename(dp))


if __name__ == "__main__":
    print("demo grid:")
    build_demo()
    print("depth fix:")
    fix_depth()
    print("done ->", OUT)
