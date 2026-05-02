import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const HEX_RE = /^#[0-9a-f]{6}$/i;

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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
      prompt,
    ],
    config: {
      responseMimeType: 'application/json',
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
