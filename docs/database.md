# Database

What belongs here: schema decisions, tables, relationships, and how schema
changes are managed. Update when tables are added/altered, columns change
meaning, or the migration approach changes.

## Engine
SQLite via `better-sqlite3`. WAL mode is enabled at startup in
`src/lib/db.ts`. The DB file lives at `${DATA_DIR}/app.db`.

## Schema management — current approach (v1)
Single file `db/schema.sql` is read and `db.exec()`'d on every server boot.
All statements use `CREATE TABLE IF NOT EXISTS` so re-running is safe. Good
enough for append-only schema changes (new tables, new columns via separate
`ALTER` guarded by checks).

## Schema management — planned approach (when we hit real pain)
Sequentially-numbered raw SQL files in `db/migrations/` (e.g.
`0001_init.sql`, `0002_add_designs.sql`). A small `applied_migrations` table
tracks which have run. Adopt when we first need to drop/rename a column or
backfill data. **Do not adopt prematurely** — schema.sql + IF NOT EXISTS is
fine until it isn't.

## Conventions
- `snake_case` table and column names
- `INTEGER PRIMARY KEY` for ids (SQLite alias for ROWID, fastest lookup)
- `created_at TEXT DEFAULT (datetime('now'))` for timestamps
- Foreign keys: `PRAGMA foreign_keys = ON` is now enabled in `src/lib/db.ts` (added when `regions` introduced the first FK)

## Tables

### `designs`
Tracks each uploaded design scan.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY` | auto ROWID |
| `original_filename` | `TEXT NOT NULL` | name provided by the browser on upload |
| `storage_path` | `TEXT NOT NULL` | filename only (e.g. `<uuid>.png`); full path = `${UPLOADS_DIR}/<storage_path>` |
| `color_count` | `INTEGER` | number of ink colors the designer specified (1–4); `NULL` until the user picks on first visit |
| `palette_confirmed_at` | `TEXT` | set when designer confirms palette in Step 2; `NULL` until confirmed |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |

### `regions`
One row per ink-color layer detected from a design scan. Created in Step 2
(color detection); `vectorized_svg_path` populated in Step 3. No `crop_x/y/w/h`
or `type` columns — those are not part of the color-based approach.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY` | auto ROWID |
| `design_id` | `INTEGER NOT NULL` | FK → `designs.id` |
| `source_path` | `TEXT NOT NULL` | filename of the source scan (mirrors `designs.storage_path`) |
| `color_hex` | `TEXT NOT NULL` | e.g. `#1a3a8f` |
| `color_name` | `TEXT NOT NULL` | descriptive name from Gemini, e.g. `navy blue` |
| `mask_path` | `TEXT NOT NULL` | filename of the binary mask PNG in `${UPLOADS_DIR}` |
| `threshold` | `INTEGER NOT NULL DEFAULT 100` | RGB-Euclidean distance threshold (1–441) for mask generation; tunable per color |
| `vectorized_svg_path` | `TEXT` | filename of the per-layer SVG in `${UPLOADS_DIR}`; `NULL` until Step 3 runs; written by `POST /api/designs/[id]/vectorize` and `POST /api/regions/[id]/vectorize` |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |
