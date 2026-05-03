import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const HEX_RE = /^#[0-9a-f]{6}$/i;

// Treat 5xx responses, fetch network errors, and AbortErrors as retryable.
// 4xx and JSON parse errors are NOT retryable — those are our fault.
function isRetryable(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { status?: number; code?: number | string; name?: string; message?: string };
  if (typeof e.status === 'number' && e.status >= 500 && e.status < 600) return true;
  if (typeof e.code === 'number' && e.code >= 500 && e.code < 600) return true;
  if (e.name === 'AbortError' || e.name === 'TimeoutError') return true;
  if (typeof e.message === 'string' && /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i.test(e.message)) return true;
  return false;
}

// Pull every useful field off an error for diagnostic logging. The Google SDK
// attaches `status`, `code`, `message`, sometimes `response.body` with a
// structured `{ error: { code, message, status } }` payload. We log all of it
// so intermittent failures can be pattern-matched after the fact.
function describeError(err: unknown): Record<string, unknown> {
  if (typeof err !== 'object' || err === null) return { value: String(err) };
  const e = err as Record<string, unknown> & { response?: { body?: unknown; status?: number } };
  return {
    name: e.name,
    message: e.message,
    status: e.status ?? e.response?.status,
    code: e.code,
    responseBody: e.response?.body,
    stack: typeof e.stack === 'string' ? e.stack.split('\n').slice(0, 5).join('\n') : undefined,
  };
}

interface PaletteColor {
  hex: string;
  name: string;
}

export async function detectPalette(
  imageBuffer: Buffer,
  mimeType: string,
  colorCount: number,
  hint?: string
): Promise<PaletteColor[]> {
  let prompt =
    `Identify exactly ${colorCount} distinct ink color${colorCount === 1 ? '' : 's'} used in this carton box design. ` +
    'Exclude the cardboard/paper background color. ' +
    `Return exactly ${colorCount} ${colorCount === 1 ? 'entry' : 'entries'}. Each entry has a 6-digit lowercase hex ` +
    '(e.g. #1a3478) and a short descriptive name (e.g. navy blue).';

  if (hint) {
    prompt += ` ${hint}`;
  }

  // Log request shape on every call — useful for correlating "fails on big
  // images" or "fails with hint" patterns after the fact.
  const imageBytes = imageBuffer.byteLength;
  const base64Bytes = Math.ceil((imageBytes * 4) / 3);
  console.log('[detectPalette] request', {
    imageBytes,
    base64Bytes,
    mimeType,
    colorCount,
    hasHint: Boolean(hint),
  });

  const generate = async (attempt: number) => {
    const t0 = Date.now();
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
          prompt,
        ],
        config: {
          responseMimeType: 'application/json',
          // Disable Gemini 2.5 Flash's default "thinking" — pure overhead for a
          // structured-extraction task and adds 10–25s of latency.
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                hex: { type: Type.STRING },
                name: { type: Type.STRING },
              },
              propertyOrdering: ['hex', 'name'],
            },
          },
        },
      });
      console.log(`[detectPalette] attempt ${attempt} ok in ${Date.now() - t0}ms`);
      return result;
    } catch (err) {
      console.error(`[detectPalette] attempt ${attempt} failed in ${Date.now() - t0}ms`, describeError(err));
      throw err;
    }
  };

  // Single retry on transient failures (5xx, network blips). Gemini's API
  // occasionally returns 5xx after a 30s+ stall; retrying usually succeeds
  // immediately. Don't retry 4xx — those mean our request is malformed.
  let response;
  try {
    response = await generate(1);
  } catch (err) {
    if (isRetryable(err)) {
      console.warn('[detectPalette] retrying after transient error');
      response = await generate(2);
    } else {
      throw err;
    }
  }

  const raw = JSON.parse(response.text ?? '[]') as unknown[];
  return raw
    .filter(
      (item): item is PaletteColor =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).hex === 'string' &&
        typeof (item as Record<string, unknown>).name === 'string' &&
        HEX_RE.test((item as PaletteColor).hex)
    )
    .map((item) => ({ hex: item.hex.toLowerCase(), name: item.name }));
}
