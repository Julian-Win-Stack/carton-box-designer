import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { UPLOADS_DIR } from '@/lib/db';
import { detectPalette } from '@/lib/color-detection';
import { generateMask } from '@/lib/masks';

interface DesignRow {
  storage_path: string;
}

interface RegionRow {
  id: number;
  mask_path: string;
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const design = db
    .prepare('SELECT storage_path FROM designs WHERE id = ?')
    .get(id) as DesignRow | undefined;

  if (!design) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let count: number;
  let hint: string | undefined;
  try {
    const body = await req.json() as { count?: unknown; hint?: unknown };
    if (
      typeof body.count !== 'number' ||
      !Number.isInteger(body.count) ||
      body.count < 1 ||
      body.count > 4
    ) {
      return NextResponse.json({ error: 'count must be 1, 2, 3, or 4' }, { status: 400 });
    }
    count = body.count;
    if (typeof body.hint === 'string' && body.hint.trim()) hint = body.hint.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const imagePath = path.join(UPLOADS_DIR, design.storage_path);
  const ext = path.extname(design.storage_path);
  const mimeType = MIME_MAP[ext] ?? 'image/jpeg';

  let imageBuffer: Buffer;
  try {
    imageBuffer = await fs.readFile(imagePath);
  } catch {
    return NextResponse.json({ error: 'Image file not found' }, { status: 404 });
  }

  let palette;
  try {
    palette = await detectPalette(imageBuffer, mimeType, count, hint);
  } catch {
    return NextResponse.json({ error: 'Color detection failed' }, { status: 502 });
  }

  if (palette.length === 0) {
    return NextResponse.json({ error: 'No colors detected' }, { status: 422 });
  }

  // Generate all mask buffers before touching the DB
  const masks = await Promise.all(
    palette.map((c) => generateMask(imagePath, c.hex, 100))
  );

  // Fetch old region mask paths before deleting
  const oldRegions = db
    .prepare('SELECT id, mask_path FROM regions WHERE design_id = ?')
    .all(id) as RegionRow[];

  // Write new mask files to disk
  const maskFilenames = await Promise.all(
    masks.map(async (buf) => {
      const filename = `${randomUUID()}.png`;
      await fs.writeFile(path.join(UPLOADS_DIR, filename), buf);
      return filename;
    })
  );

  // Atomic DB swap — update color_count, delete old regions, insert new ones
  db.transaction(() => {
    db.prepare('UPDATE designs SET color_count = ? WHERE id = ?').run(count, id);
    db.prepare('DELETE FROM regions WHERE design_id = ?').run(id);
    const insert = db.prepare(
      'INSERT INTO regions (design_id, source_path, color_hex, color_name, mask_path) VALUES (?, ?, ?, ?, ?)'
    );
    for (let i = 0; i < palette.length; i++) {
      insert.run(id, design.storage_path, palette[i].hex, palette[i].name, maskFilenames[i]);
    }
  })();

  // Clean up old mask files after DB commit (best-effort)
  for (const row of oldRegions) {
    fs.unlink(path.join(UPLOADS_DIR, row.mask_path)).catch(() => undefined);
  }

  return new Response(null, { status: 204 });
}
