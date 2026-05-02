# Build Plan

Numbered steps for v1. Each step has a clear demo target and a budget estimate.
**Current step: Step 3.** Steps 4–8 are placeholders pending future planning
sessions.

Read the full step body before implementing. Steps 1–3 have implementation
notes; the rest are titles only.

---

## Step 1 — Scan upload + storage ✅

Designer uploads a scan (cardboard laid flat on a flatbed scanner); app saves
it to disk and creates a `designs` row. After this step a designer can load
`/upload`, pick a scan file, submit, and land on `/designs/<id>` showing the
uploaded scan.

Full implementation detail: [`.claude/plans/i-m-building-an-internal-wise-sun.md`](.claude/plans/i-m-building-an-internal-wise-sun.md)

---

## Step 2 — Color-based region detection ✅

**Goal:** given an uploaded scan, detect the distinct ink colors and produce
one binary mask per color. The designer confirms the palette before proceeding.

**Backend flow:**
1. API route sends the scan to Gemini 2.5 Flash via `@google/generative-ai`
   with a prompt: "List the distinct ink colors used in this carton box design
   as hex codes. Exclude the cardboard background. Return JSON with `hex` and
   `name` (descriptive) per color."
2. Gemini returns a small palette (typically 3–6 colors).
3. `sharp` processes the scan per color:
   - Optional contrast boost and denoise for cleaner masks.
   - For each palette color, produce a binary mask: pixels within a tunable
     color-distance threshold = white, all others = black.
   - Apply small morphological cleanup (slight blur + re-threshold) to smooth
     anti-aliasing artifacts.
4. Save each mask as a PNG to `${UPLOADS_DIR}/<mask-uuid>.png`.
5. Insert one row per color into the `regions` table:
   `id, design_id, source_path, color_hex, color_name, mask_path`.

**Frontend:**
- Show the original scan alongside the detected palette as color swatches,
  each with a preview of its mask layer.
- User can:
  - Confirm the palette as-is.
  - Remove a color that shouldn't be a layer.
  - Adjust the threshold per color if a layer looks too patchy or too greedy.
  - Re-run detection with a hint to Gemini (e.g., "there should be 4 colors,
    not 3").
- "Confirm" finalizes layers and proceeds to Step 3 (vectorization).

**Implementation notes:**
- Detection logic in `src/lib/color-detection.ts` so the model is swappable
  without touching route handlers.
- Env var: `GEMINI_API_KEY`. SDK: `@google/genai` (the active SDK; the
  previously listed `@google/generative-ai` is deprecated).

**Demo:** Upload a real factory scan. Within a few seconds, the detected color
palette appears with mask previews. Confirm. Each color becomes a `regions` row.

**Budget:** 1–2 days. Half is tuning the Gemini prompt and threshold defaults
against real factory scans.

---

## Step 3 — Per-color vectorization

*This step folds in what earlier drafts called "Step 4: vtracer integration."
There is no longer a separate full-scan vtracer step.*

**Goal:** convert each binary mask from Step 2 into a clean SVG layer, then
combine all layers into one layered SVG for the design.

**Flow (per color region):**
1. "Vectorize layer" triggers (auto-runs on confirm, or manually per layer).
2. API route calls `@neplex/vectorizer` in `ColorMode.Binary` (monochrome) on
   the binary mask. Monochrome input is unambiguous — quality is significantly
   higher than multi-color tracing on the original scan.
3. Set every `<path>` element's `fill` to the region's `color_hex`.
4. Wrap all paths in `<g id="<color-name>">` (e.g. `<g id="navy-blue">`).
5. Run SVGO to minify and remove redundant attributes.
6. Write the SVG to disk; store the filename in `regions.vectorized_svg_path`.

**Combining layers:**
- After all regions for a design are vectorized, concatenate their `<g>` blocks
  into one layered SVG (one named group per color).
- Render the combined SVG next to the original scan for visual comparison.

**Halftone warning:**
- If a mask has a high density of tiny disconnected blobs (heuristic: count of
  small isolated regions exceeds a threshold), warn the user that this layer may
  be halftoned. v1 does not handle halftone cleanly; defer to v2.

**Budget:** 1–2 days for tuning vtracer parameters per layer (`filterSpeckle`,
`cornerThreshold`, etc.) against real factory scans.

---

## Step 4 — Canvas + drag-and-drop

*Placeholder — full design session pending.*

Drop the combined layered SVG onto a Konva-based canvas. Designer drags,
resizes, and arranges shapes on a die-cut layout.

---

## Step 5 — Color editing

*Placeholder — full design session pending.*

Because Step 3 wraps each ink color's paths in a named `<g>`, changing a color
is just updating the `fill` attribute on one group — no "select all paths with
this color" pass needed.

---

## Step 6 — SVG/PDF export

*Placeholder — full design session pending.*

Export the final canvas as a print-ready SVG and PDF.

---

## Step 7 — Multi-panel die-cut layout

*Placeholder — full design session pending.*

Support multiple box panels in a single die-cut canvas layout.

---

## Step 8 — Customer brand color palettes

*Placeholder — full design session pending.*

Store and reuse a customer's known brand colors across multiple designs.
