# PlantShade — Project Website

Static project page for **PlantShade: Predicting Plant Shadows for Lighting-Aware
Robotic Agricultural Operation** (IROS 2026). Adapted from the DeepShade × ShadeBench
demo template, restructured around the PlantShade pipeline.

## Structure

```
index.html          single-page site
styles.css          botanical dark/light theme (self-contained, no external fonts)
app.js              interactivity + real Table II data + NRH photosynthesis curve
prepare_assets.py   pulls & downscales real demo frames from dataset/plantAll
assets/             generated demo images (real dataset frames)
```

## Sections (pipeline order)

1. **Data collection** — Helios–UE5 pipeline, dataset specs, release link
2. **Preprocessing** — (source, target, prompt) triplets, split
3. **Interactive demo** — circular supplementary-light slider (100 positions)
4. **Model** — ControlNet + SD2.1 architecture, training command
5. **Inference** — before/after compare (RGB ↔ shadow map)
6. **Results** — Table II (PlantShade vs Stable Diffusion), tabbed by layout, ID/OOD
7. **Photosynthesis** — interactive NRH light-response curves per species
