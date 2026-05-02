import { notFound } from 'next/navigation';
import db from '@/lib/db';
import PaletteEditor from '@/components/PaletteEditor';
import ColorCountPicker from '@/components/ColorCountPicker';

interface Props {
  params: { id: string };
}

interface Design {
  id: number;
  original_filename: string;
  storage_path: string;
  palette_confirmed_at: string | null;
  color_count: number | null;
}

interface Region {
  id: number;
  color_hex: string;
  color_name: string;
  threshold: number;
  mask_path: string;
}

export default function DesignPage({ params }: Props) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const design = db
    .prepare('SELECT id, original_filename, storage_path, palette_confirmed_at, color_count FROM designs WHERE id = ?')
    .get(id) as Design | undefined;

  if (!design) notFound();

  if (design.color_count === null) {
    return (
      <ColorCountPicker
        design={{ id: design.id, original_filename: design.original_filename }}
      />
    );
  }

  const regions = db
    .prepare('SELECT id, color_hex, color_name, threshold, mask_path FROM regions WHERE design_id = ? ORDER BY id')
    .all(id) as Region[];

  return (
    <PaletteEditor
      design={{
        id: design.id,
        original_filename: design.original_filename,
        palette_confirmed_at: design.palette_confirmed_at,
        color_count: design.color_count,
      }}
      regions={regions}
    />
  );
}
