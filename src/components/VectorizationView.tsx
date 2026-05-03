'use client';

import { useEffect, useRef, useState } from 'react';

interface Region {
  id: number;
  color_hex: string;
  color_name: string;
  vectorized_svg_path: string | null;
}

interface Design {
  id: number;
  original_filename: string;
}

interface Props {
  design: Design;
  regions: Region[];
}

interface VectorizeAllResult {
  regions: { id: number; vectorized_svg_path: string }[];
}

interface VectorizeOneResult {
  id: number;
  vectorized_svg_path: string;
}

export default function VectorizationView({ design, regions: initialRegions }: Props) {
  const [regions, setRegions] = useState(initialRegions);
  const [vectorizing, setVectorizing] = useState(false);
  const [svgVersion, setSvgVersion] = useState(0);
  const hasAutoTriggered = useRef(false);

  useEffect(() => {
    if (hasAutoTriggered.current) return;
    if (!regions.some((r) => r.vectorized_svg_path === null)) return;

    hasAutoTriggered.current = true;
    setVectorizing(true);
    fetch(`/api/designs/${design.id}/vectorize`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) return;
        return res.json() as Promise<VectorizeAllResult>;
      })
      .then((data) => {
        if (!data) return;
        setRegions((prev) =>
          prev.map((r) => {
            const updated = data.regions.find((u) => u.id === r.id);
            return updated ? { ...r, vectorized_svg_path: updated.vectorized_svg_path } : r;
          })
        );
        setSvgVersion((v) => v + 1);
      })
      .finally(() => setVectorizing(false));
  }, [design.id, regions]);

  async function reVectorizeOne(regionId: number) {
    setVectorizing(true);
    try {
      const res = await fetch(`/api/regions/${regionId}/vectorize`, { method: 'POST' });
      if (!res.ok) return;
      const data = (await res.json()) as VectorizeOneResult;
      setRegions((prev) =>
        prev.map((r) =>
          r.id === data.id ? { ...r, vectorized_svg_path: data.vectorized_svg_path } : r
        )
      );
      setSvgVersion((v) => v + 1);
    } finally {
      setVectorizing(false);
    }
  }

  const anyVectorized = regions.some((r) => r.vectorized_svg_path !== null);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <h1 className="text-lg font-medium">{design.original_filename}</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left: original + combined SVG */}
        <div className="flex w-full flex-col gap-4 lg:w-1/2 lg:max-w-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/designs/${design.id}/image`}
            alt={design.original_filename}
            className="w-full rounded"
          />
          {anyVectorized && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={svgVersion}
              src={`/api/designs/${design.id}/combined-svg?v=${svgVersion}`}
              alt="Vectorized output"
              className="w-full rounded border border-gray-200"
            />
          )}
          {!anyVectorized && vectorizing && (
            <div className="flex h-32 w-full items-center justify-center rounded border border-dashed border-gray-300">
              <span className="text-sm text-gray-400">Vectorizing…</span>
            </div>
          )}
        </div>

        {/* Right: per-region cards */}
        <div className="flex flex-1 flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Vectorized layers
          </h2>

          {regions.map((r) => (
            <div key={r.id} className="flex gap-3 rounded border border-gray-200 p-3">
              <div
                className="mt-1 h-8 w-8 flex-shrink-0 rounded"
                style={{ backgroundColor: r.color_hex }}
              />
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{r.color_name}</span>
                  <span className="font-mono text-xs text-gray-400">{r.color_hex}</span>
                  <button
                    onClick={() => reVectorizeOne(r.id)}
                    disabled={vectorizing}
                    className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-40"
                  >
                    Re-vectorize
                  </button>
                </div>
                {r.vectorized_svg_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/regions/${r.id}/svg?v=${svgVersion}`}
                    alt={`${r.color_name} vector layer`}
                    className="max-h-32 w-full rounded object-contain"
                  />
                ) : (
                  <div className="flex h-16 items-center justify-center rounded border border-dashed border-gray-200">
                    <span className="text-xs text-gray-400">
                      {vectorizing ? 'Vectorizing…' : '—'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
