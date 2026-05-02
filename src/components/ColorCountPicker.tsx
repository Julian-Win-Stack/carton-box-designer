'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Design {
  id: number;
  original_filename: string;
}

interface Props {
  design: Design;
}

export default function ColorCountPicker({ design }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(count: number) {
    setLoading(count);
    setError(null);
    try {
      const res = await fetch(`/api/designs/${design.id}/detect-colors`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Detection failed. Try again.');
        setLoading(null);
      }
    } catch {
      setError('Network error. Try again.');
      setLoading(null);
    }
  }

  const isLoading = loading !== null;

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

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-semibold">How many distinct ink colors does this design have?</h2>
            <p className="mt-1 text-sm text-gray-400">Exclude the cardboard background.</p>
          </div>

          <div className="flex gap-3">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => pick(n)}
                disabled={isLoading}
                className={`
                  flex h-14 w-14 items-center justify-center rounded-lg border-2 text-lg font-semibold
                  transition-colors
                  ${loading === n
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600'}
                  disabled:cursor-not-allowed disabled:opacity-60
                `}
              >
                {loading === n ? '…' : n}
              </button>
            ))}
          </div>

          {isLoading && (
            <p className="text-sm text-gray-400">Detecting colors, this may take a few seconds…</p>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
