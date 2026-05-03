# API

What belongs here: every route under `src/app/api/`, the HTTP method, the
request shape, the response shape, and any auth requirements. Update when a
route is added, removed, or its contract changes. One route = one short
section.

## Routes

### `POST /api/uploads`
Upload a scan (cardboard laid flat on a flatbed scanner). Saves to `${UPLOADS_DIR}/<uuid>.<ext>`, inserts a `designs` row, and redirects `303` to `/designs/<id>`.

**Request:** `multipart/form-data` with field `photo` (PNG, JPEG, or WebP; max 20 MB). The field is named `photo` for legacy reasons — the project pivoted to scanner input after this endpoint shipped. Rename to `scan` when convenient (requires updating the route handler and upload form).

**Responses:**
- `303` + `Location: /designs/<id>` — success
- `400 { error }` — missing file or unsupported type
- `413 { error }` — file exceeds 20 MB

### `GET /api/designs/[id]/image`
Serve the raw scan bytes for a design by id. Used by `<img>` tags on `/designs/[id]`.

**Responses:**
- `200` with `content-type` matching the uploaded format — success
- `404` — design id not found, or file missing on disk

### `POST /api/designs/[id]/detect-colors`
Run Gemini palette extraction + sharp mask generation for a design. Stores `count` on the design row and replaces any existing regions.

**Request:** JSON body `{ count: number, hint?: string }`. `count` is required (1–4). `hint` is optional extra context forwarded to Gemini (e.g. `"ignore the QR code area"`).

**Responses:**
- `204` — success; caller should re-fetch regions
- `400 { error }` — invalid id
- `404 { error }` — design not found
- `422 { error }` — Gemini returned no usable colors

### `POST /api/designs/[id]/confirm`
Lock the palette for a design, enabling Step 3 (vectorization). Idempotent.

**Responses:**
- `204` — confirmed (or already confirmed)
- `422 { error }` — no regions to confirm

### `GET /api/regions/[id]/mask`
Serve the binary mask PNG for a region. Used by `<img>` tags in the palette editor. Append `?v=<n>` as a cache-buster after threshold changes.

**Responses:**
- `200` with `content-type: image/png` — success
- `404` — region not found or mask file missing

### `PATCH /api/regions/[id]`
Update a region's threshold (regenerates mask) and/or color name.

**Request:** JSON body `{ threshold?: number, colorName?: string }`. At least one field required.

**Responses:**
- `204` — updated
- `400 { error }` — invalid id or nothing to update
- `404 { error }` — region not found

### `DELETE /api/regions/[id]`
Delete a region and its mask file from disk.

**Responses:**
- `204` — deleted
- `404 { error }` — region not found

### `POST /api/designs/[id]/vectorize`
Vectorize all confirmed color regions for a design. Runs `@neplex/vectorizer` in binary mode on each region's mask, writes per-region SVG files to disk, and updates `regions.vectorized_svg_path`.

**Responses:**
- `200 { regions: [{ id, vectorized_svg_path }] }` — success
- `404 { error }` — design not found
- `422 { error }` — palette not confirmed

### `GET /api/designs/[id]/combined-svg`
Assemble and return a single layered SVG from all vectorized region layers, in region id order. Each color is a `<g id="<slug>">` group. Regenerated on every request (no cache).

**Responses:**
- `200` with `content-type: image/svg+xml` — success
- `404` — design not found, or no vectorized regions yet

### `POST /api/regions/[id]/vectorize`
Re-vectorize a single region (manual retry). Replaces the existing `vectorized_svg_path` file.

**Responses:**
- `200 { id, vectorized_svg_path }` — success
- `404 { error }` — region not found

### `GET /api/regions/[id]/svg`
Serve the per-region SVG file. Used by `<img>` tags in the vectorization view.

**Responses:**
- `200` with `content-type: image/svg+xml` — success
- `404` — region not found, or SVG not yet generated

## Conventions
- App Router route handlers in `src/app/api/<name>/route.ts`
- Request/response bodies are JSON unless explicitly noted (uploads are
  `multipart/form-data`)
- Errors return `{ error: string }` with appropriate HTTP status
