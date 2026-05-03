import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { UPLOADS_DIR } from '@/lib/db';
import { vectorizeRegion } from '@/lib/vectorize';

interface DesignRow {
  palette_confirmed_at: string | null;
}

interface RegionRow {
  id: number;
  color_hex: string;
  color_name: string;
  mask_path: string;
  vectorized_svg_path: string | null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const design = db
    .prepare('SELECT palette_confirmed_at FROM designs WHERE id = ?')
    .get(id) as DesignRow | undefined;

  if (!design) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!design.palette_confirmed_at) {
    return NextResponse.json({ error: 'Palette not confirmed' }, { status: 422 });
  }

  const regions = db
    .prepare('SELECT id, color_hex, color_name, mask_path, vectorized_svg_path FROM regions WHERE design_id = ? ORDER BY id')
    .all(id) as RegionRow[];

  const results: { id: number; vectorized_svg_path: string }[] = [];

  for (const region of regions) {
    const maskFullPath = path.join(UPLOADS_DIR, region.mask_path);
    const svgStr = await vectorizeRegion(maskFullPath, region.color_hex, region.color_name);

    const svgFilename = `${randomUUID()}.svg`;
    await fs.writeFile(path.join(UPLOADS_DIR, svgFilename), svgStr, 'utf8');

    db.prepare('UPDATE regions SET vectorized_svg_path = ? WHERE id = ?').run(svgFilename, region.id);

    if (region.vectorized_svg_path) {
      fs.unlink(path.join(UPLOADS_DIR, region.vectorized_svg_path)).catch(() => undefined);
    }

    results.push({ id: region.id, vectorized_svg_path: svgFilename });
  }

  return NextResponse.json({ regions: results });
}
