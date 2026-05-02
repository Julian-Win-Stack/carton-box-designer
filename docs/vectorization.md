# Vectorization

What belongs here: how raster images become SVG paths — the preprocessing
pipeline, the vectorizer config we ship, and the fallback options if the
primary library breaks. Update when the pipeline changes or a parameter is
tuned based on real samples.

## Pipeline (planned)
1. Gemini extracts the ink palette from the uploaded scan (Step 2 produces
   this — one LLM call, JSON output of hex + descriptive name per color).
2. **sharp** — for each palette color, create a binary mask: pixels within a
   tunable color-distance threshold = white, else black. Apply small
   morphological cleanup (blur + re-threshold) to smooth anti-aliasing.
3. **@neplex/vectorizer** — trace each binary mask in `ColorMode.Binary`
   (monochrome mode). Monochrome input is unambiguous, so output quality is
   significantly higher than multi-color tracing on the original scan.
4. Per-layer paths get `fill` set to the original color hex, wrapped in
   `<g id="<color-name>">`.
5. All groups concatenate into one combined layered SVG for the design.
6. **SVGO** — minify and clean the combined SVG.

## Vectorizer config (starting point)
Binary mode on per-color masks. `colorPrecision` and `layerDifference` are
omitted — they don't apply in binary mode. Remaining params are starting
defaults; tune per-layer against real factory scans in Step 3.

```ts
{
  colorMode: ColorMode.Binary,
  filterSpeckle: 4,
  spliceThreshold: 45,
  cornerThreshold: 60,
  hierarchical: Hierarchical.Stacked,
  mode: PathSimplifyMode.Spline,
  lengthThreshold: 5,
  maxIterations: 2,
  pathPrecision: 5,
}
```

## Verified
- macOS arm64 (local dev), 800×600 input with text-like shapes → 30 ms,
  ~52 KB SVG. Native binary installed cleanly.
- Binary-mode timing on real factory scans to be re-measured in Step 3.

## Fallbacks
- **vtracer CLI** (Rust binary) — same engine; shell out to it from a child
  process. Use if the Node binding stops working on Railway's Linux runtime.
- **imagetracerjs** — pure JS, ~5× slower per the @neplex/vectorizer
  benchmark. Last-resort fallback if no native option works.
