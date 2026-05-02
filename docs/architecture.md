# Architecture

What belongs here: high-level system design, data flow between components, and
the folder layout that makes the design legible. Update when the shape of the
system changes (new layer, new pipeline stage, new top-level folder), not for
internal refactors.

## v1 data flow

Input is a scan from a flatbed scanner (cardboard laid flat). Not a phone photo.

Step 1 (scan upload) is complete. Step 2 (color palette detection) and
Step 3 (per-color vectorization) are next; see `docs/build-plan.md`.

```
scan → LLM (palette) → sharp (masks) → vtracer per layer
     → combined layered SVG → canvas → export
```

## Folder structure

- `src/app/` — App Router routes & layouts
- `src/components/` — UI components
- `src/lib/` — server utilities (e.g. `db.ts`)
- `db/schema.sql` — raw SQL schema (re-run on every boot, see `docs/database.md`)
- `data/` — gitignored runtime data: `app.db`, `uploads/`. Mirrors Railway volume `/data`.
- `docs/` — topical reference docs, fetched on demand
- `public/` — static assets
