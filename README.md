# generative_sullivan_app

Generative vector ornament studies inspired by Sullivan's ornamental plates.

## Usage

- `npm run build` compiles the engine (`dist/`) and bundles the renderer assets (`public/`).
- `npm start` rebuilds everything and launches the Electron app with two windows:
  - **Controls** – all sliders for Plate 1 + leaf morph.
  - **Preview** – live SVG renders of the scaffold and leaf study.
- `npm run start:cli` keeps the original CLI demo that writes `plate1_example.svg`.
- `npm run demo:plate2:leaf` generates the Plate 2 leaf study SVG sample.

Both renderer windows call the same helpers (`generatePlate1Scene`, `renderSceneToSvg`,
`morphLeaf`, `createLeafGeometry`) that power the demos, so the live preview mirrors the
production geometry exactly.
