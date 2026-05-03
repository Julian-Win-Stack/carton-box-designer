import { notFound } from 'next/navigation';
import db from '@/lib/db';
import PaletteEditor from '@/components/PaletteEditor';
import ColorCountPicker from '@/components/ColorCountPicker';
import VectorizationView from '@/components/VectorizationView';

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
  vectorized_svg_path: string | null;
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
    .prepare('SELECT id, color_hex, color_name, threshold, mask_path, vectorized_svg_path FROM regions WHERE design_id = ? ORDER BY id')
    .all(id) as Region[];

  if (design.palette_confirmed_at) {
    return (
      <VectorizationView
        design={{ id: design.id, original_filename: design.original_filename }}
        regions={regions.map((r) => ({
          id: r.id,
          color_hex: r.color_hex,
          color_name: r.color_name,
          vectorized_svg_path: r.vectorized_svg_path,
        }))}
      />
    );
  }

  return (
    <PaletteEditor
      design={{
        id: design.id,
        original_filename: design.original_filename,
        color_count: design.color_count,
      }}
      regions={regions}
    />
  );
}
