import 'server-only';
import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { UPLOADS_DIR } from '@/lib/db';

interface RegionRow {
  vectorized_svg_path: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 404 });

  const row = db
    .prepare('SELECT vectorized_svg_path FROM regions WHERE id = ?')
    .get(id) as RegionRow | undefined;

  if (!row?.vectorized_svg_path) return new Response(null, { status: 404 });

  const fullPath = path.join(UPLOADS_DIR, row.vectorized_svg_path);
  let content: string;
  try {
    content = await fs.readFile(fullPath, 'utf8');
  } catch {
    return new Response(null, { status: 404 });
  }

  return new Response(content, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'private, max-age=3600',
    },
  });
}
