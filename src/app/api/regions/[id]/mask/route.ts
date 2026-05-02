import 'server-only';
import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { UPLOADS_DIR } from '@/lib/db';

interface RegionRow {
  mask_path: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 404 });

  const row = db
    .prepare('SELECT mask_path FROM regions WHERE id = ?')
    .get(id) as RegionRow | undefined;

  if (!row) return new Response(null, { status: 404 });

  const fullPath = path.join(UPLOADS_DIR, row.mask_path);
  let ab: ArrayBuffer;
  try {
    ab = new Uint8Array(await fs.readFile(fullPath)).buffer;
  } catch {
    return new Response(null, { status: 404 });
  }

  return new Response(ab, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'private, max-age=3600',
    },
  });
}
