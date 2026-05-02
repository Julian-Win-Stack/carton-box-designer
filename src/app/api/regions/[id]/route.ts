import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { UPLOADS_DIR } from '@/lib/db';
import { generateMask } from '@/lib/masks';

interface RegionRow {
  id: number;
  design_id: number;
  source_path: string;
  mask_path: string;
  threshold: number;
  color_hex: string;
  color_name: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const row = db
    .prepare('SELECT id, design_id, source_path, mask_path, threshold, color_hex, color_name FROM regions WHERE id = ?')
    .get(id) as RegionRow | undefined;

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { threshold?: unknown; colorName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const newThreshold =
    typeof body.threshold === 'number' &&
    Number.isInteger(body.threshold) &&
    body.threshold >= 1 &&
    body.threshold <= 441
      ? body.threshold
      : undefined;

  const newName =
    typeof body.colorName === 'string' && body.colorName.trim()
      ? body.colorName.trim()
      : undefined;

  if (newThreshold === undefined && newName === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  if (newThreshold !== undefined && newThreshold !== row.threshold) {
    const imagePath = path.join(UPLOADS_DIR, row.source_path);
    const newMask = await generateMask(imagePath, row.color_hex, newThreshold);
    await fs.writeFile(path.join(UPLOADS_DIR, row.mask_path), newMask);
  }

  db.prepare(
    `UPDATE regions SET
      threshold = COALESCE(?, threshold),
      color_name = COALESCE(?, color_name)
    WHERE id = ?`
  ).run(newThreshold ?? null, newName ?? null, id);

  return new Response(null, { status: 204 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const row = db
    .prepare('SELECT mask_path FROM regions WHERE id = ?')
    .get(id) as Pick<RegionRow, 'mask_path'> | undefined;

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare('DELETE FROM regions WHERE id = ?').run(id);
  fs.unlink(path.join(UPLOADS_DIR, row.mask_path)).catch(() => undefined);

  return new Response(null, { status: 204 });
}
