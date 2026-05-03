'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Region {
  id: number;
  color_hex: string;
  color_name: string;
  threshold: number;
  mask_path: string;
}

interface Design {
  id: number;
  original_filename: string;
  color_count: number;
}

interface Props {
  design: Design;
  regions: Region[];
}

function maskSrc(regionId: number, version: number) {
  return `/api/regions/${regionId}/mask?v=${version}`;
}

export default function PaletteEditor({ design, regions: initialRegions }: Props) {
  const router = useRouter();
  const [regions, setRegions] = useState(initialRegions);
  const [maskVersions, setMaskVersions] = useState<Record<number, number>>(() =>
    Object.fromEntries(initialRegions.map((r) => [r.id, 0]))
  );
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState('');
  const [redetectCount, setRedetectCount] = useState(design.color_count);
  const [showRedetect, setShowRedetect] = useState(false);
  const thresholdTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setRegions(initialRegions);
    setMaskVersions(Object.fromEntries(initialRegions.map((r) => [r.id, 0])));
  }, [initialRegions]);

  const refresh = useCallback(() => router.refresh(), [router]);

  async function runDetect(count: number, hintText?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/designs/${design.id}/detect-colors`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ count, ...(hintText ? { hint: hintText } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        alert(data.error ?? 'Detection failed');
        return;
      }
      refresh();
    } finally {
      setLoading(false);
      setHint('');
      setShowRedetect(false);
    }
  }

  async function handleDelete(regionId: number) {
    await fetch(`/api/regions/${regionId}`, { method: 'DELETE' });
    setRegions((prev) => prev.filter((r) => r.id !== regionId));
  }

  function handleThresholdChange(regionId: number, value: number) {
    setRegions((prev) =>
      prev.map((r) => (r.id === regionId ? { ...r, threshold: value } : r))
    );
    clearTimeout(thresholdTimers.current[regionId]);
    thresholdTimers.current[regionId] = setTimeout(async () => {
      await fetch(`/api/regions/${regionId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ threshold: value }),
      });
      setMaskVersions((prev) => ({ ...prev, [regionId]: (prev[regionId] ?? 0) + 1 }));
    }, 300);
  }

  async function handleNameChange(regionId: number, colorName: string) {
    await fetch(`/api/regions/${regionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ colorName }),
    });
    setRegions((prev) =>
      prev.map((r) => (r.id === regionId ? { ...r, color_name: colorName } : r))
    );
  }

  async function handleConfirm() {
    await fetch(`/api/designs/${design.id}/confirm`, { method: 'POST' });
    refresh();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <h1 className="text-lg font-medium">{design.original_filename}</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Original photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/designs/${design.id}/image`}
          alt={design.original_filename}
          className="w-full max-w-lg rounded lg:w-1/2"
        />

        {/* Palette */}
        <div className="flex flex-1 flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Detected palette
          </h2>

          {regions.length === 0 && (
            <p className="text-sm text-gray-400">No colors detected yet.</p>
          )}

          {regions.map((r) => (
            <div key={r.id} className="flex gap-3 rounded border border-gray-200 p-3">
              {/* Swatch */}
              <div
                className="mt-1 h-8 w-8 flex-shrink-0 rounded"
                style={{ backgroundColor: r.color_hex }}
              />

              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                    defaultValue={r.color_name}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== r.color_name) {
                        handleNameChange(r.id, e.target.value.trim());
                      }
                    }}
                  />
                  <span className="font-mono text-xs text-gray-400">{r.color_hex}</span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Threshold</label>
                  <input
                    type="range"
                    min={1}
                    max={120}
                    value={r.threshold}
                    onChange={(e) => handleThresholdChange(r.id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-xs text-gray-400">{r.threshold}</span>
                </div>

                {/* Mask preview */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={maskSrc(r.id, maskVersions[r.id] ?? 0)}
                  alt={`${r.color_name} mask`}
                  className="max-h-32 w-full rounded object-contain"
                />
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
            {/* Re-detect */}
            {showRedetect ? (
                <div className="flex flex-col gap-3 rounded border border-gray-200 p-3">
                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-500">Number of colors</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRedetectCount(n)}
                          className={`flex h-9 w-9 items-center justify-center rounded border text-sm font-semibold transition-colors
                            ${redetectCount === n
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    rows={2}
                    placeholder='Optional hint, e.g. "ignore the QR code area"'
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => runDetect(redetectCount, hint || undefined)}
                      disabled={loading}
                      className="rounded bg-gray-900 px-3 py-1 text-sm text-white disabled:opacity-40"
                    >
                      {loading ? 'Detecting…' : 'Re-detect'}
                    </button>
                    <button
                      onClick={() => setShowRedetect(false)}
                      className="rounded px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRedetect(true)}
                  className="self-start rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Re-detect
                </button>
              )}

              {/* Confirm */}
              <button
                onClick={handleConfirm}
                disabled={regions.length === 0 || loading}
                className="self-start rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Confirm palette
              </button>
            </div>
        </div>
      </div>
    </main>
  );
}
