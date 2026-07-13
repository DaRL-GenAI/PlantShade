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

## Run locally

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

(On a remote server, forward the port: `ssh -L 8000:localhost:8000 user@host`.)

## Regenerate demo assets

```bash
python3 prepare_assets.py     # reads dataset/plantAll, writes assets/
```

## To finish / customize

- **External links** — set `LINKS.paper / .code / .hf` at the top of `app.js`
  (currently placeholders that alert when clicked). The data-collection release
  link is already live.
- **Figures** — all paper figures are integrated from `../figs` into
  `assets/figs/` (teaser, Fig. 2 pipeline, Fig. 3 Helios/UE5, growth stages,
  Fig. 4 architecture, Fig. 5 OOD, Fig. 6 qualitative, Fig. 7 photosynthesis).
  Re-export and overwrite the files in `assets/figs/` to update them.
- **BibTeX / venue** — edit in `index.html` (currently IROS 2026).
