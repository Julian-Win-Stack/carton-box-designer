import 'server-only';
import sharp from 'sharp';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export async function generateMask(
  imagePath: string,
  colorHex: string,
  threshold: number
): Promise<Buffer> {
  const [tr, tg, tb] = hexToRgb(colorHex);

  const { data, info } = await sharp(imagePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2);
    mask[i] = dist <= threshold ? 255 : 0;
  }

  return sharp(Buffer.from(mask), { raw: { width, height, channels: 1 } })
    .blur(1)
    .threshold(128)
    .png()
    .toBuffer();
}
