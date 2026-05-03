import 'server-only';
import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { UPLOADS_DIR } from '@/lib/db';
import sharp from 'sharp';

interface DesignRow {
  storage_path: string;
}

interface RegionRow {
  id: number;
  vectorized_svg_path: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 404 });

  const design = db
    .prepare('SELECT storage_path FROM designs WHERE id = ?')
    .get(id) as DesignRow | undefined;

  if (!design) return new Response(null, { status: 404 });

  const regions = db
    .prepare('SELECT id, vectorized_svg_path FROM regions WHERE design_id = ? AND vectorized_svg_path IS NOT NULL ORDER BY id')
    .all(id) as RegionRow[];

  if (regions.length === 0) return new Response(null, { status: 404 });

  const { width, height } = await sharp(path.join(UPLOADS_DIR, design.storage_path)).metadata();

  const groups: string[] = [];
  for (const region of regions) {
    const svgContent = await fs.readFile(path.join(UPLOADS_DIR, region.vectorized_svg_path), 'utf8');
    // Extract inner content (the <g id="...">...</g> block) between root <svg> tags
    const svgOpenStart = svgContent.indexOf('<svg');
    const svgOpenEnd = svgContent.indexOf('>', svgOpenStart);
    const inner = svgContent.slice(svgOpenEnd + 1, svgContent.lastIndexOf('</svg>'));
    groups.push(inner);
  }

  const combined = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` viewBox="0 0 ${width} ${height}"`,
    ` width="${width}" height="${height}">`,
    groups.join(''),
    `</svg>`,
  ].join('');

  return new Response(combined, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'no-store',
    },
  });
}
