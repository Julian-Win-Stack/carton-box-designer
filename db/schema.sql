-- db/schema.sql
-- v1 schema lives here. Tables added as features land.
-- Convention: snake_case table & column names, INTEGER PRIMARY KEY for ids,
-- created_at TEXT DEFAULT (datetime('now')) for timestamps.

CREATE TABLE IF NOT EXISTS designs (
  id INTEGER PRIMARY KEY,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS regions (
  id INTEGER PRIMARY KEY,
  design_id INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  source_path TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  color_name TEXT NOT NULL,
  mask_path TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 50,
  vectorized_svg_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_regions_design_id ON regions(design_id);
