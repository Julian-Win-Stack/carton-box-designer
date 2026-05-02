import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

interface CountRow {
  count: number;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const design = db.prepare('SELECT id FROM designs WHERE id = ?').get(id);
  if (!design) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { count } = db
    .prepare('SELECT count(*) as count FROM regions WHERE design_id = ?')
    .get(id) as CountRow;

  if (count === 0) {
    return NextResponse.json({ error: 'No regions to confirm' }, { status: 422 });
  }

  db.prepare(
    "UPDATE designs SET palette_confirmed_at = datetime('now') WHERE id = ? AND palette_confirmed_at IS NULL"
  ).run(id);

  return new Response(null, { status: 204 });
}
