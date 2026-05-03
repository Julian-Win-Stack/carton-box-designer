import 'server-only';
import { vectorize } from '@neplex/vectorizer';
import type { Config } from '@neplex/vectorizer';
import sharp from 'sharp';
import { optimize } from 'svgo';

// ColorMode.Binary=1, Hierarchical.Stacked=0, PathSimplifyMode.Spline=2
// Numeric literals used to avoid const enum + isolatedModules incompatibility.
const VECTORIZER_CONFIG: Config = {
  colorMode: 1,
  hierarchical: 0,
  // filterSpeckle = N drops patches smaller than N×N pixels. At our high
  // scan DPI, halftone dots are ~5–15 px; 10 (= <100 px area) drops them
  // while preserving real letter strokes (typically 30+ px wide).
  filterSpeckle: 10,
  colorPrecision: 6,
  layerDifference: 16,
  mode: 2,
  cornerThreshold: 60,
  lengthThreshold: 5,
  maxIterations: 2,
  spliceThreshold: 45,
  pathPrecision: 5,
};

export async function vectorizeRegion(
  maskPath: string,
  colorHex: string,
  colorName: string,
): Promise<string> {
  const { width, height } = await sharp(maskPath).metadata();
  // Invert the mask: generateMask() outputs white=ink, but vtracer treats
  // dark pixels as the foreground to trace. Without negation, vtracer traces
  // the background and we get the ink as cutouts in a full-image rectangle.
  const maskBuffer = await sharp(maskPath).negate().png().toBuffer();

  const rawSvg = await vectorize(maskBuffer, VECTORIZER_CONFIG);

  // Extract <path> elements directly. In monochrome (Binary) mode the
  // vectorizer only emits <path>, so this is sufficient and robust against
  // wrapper-format changes (it has occasionally produced doubly-wrapped
  // <svg><svg>…</svg></svg> output that broke naive slicing).
  const paths = rawSvg.match(/<path\b[^>]*\/?>/g);
  if (!paths || paths.length === 0) {
    throw new Error(`vectorizer returned no <path> elements for ${maskPath}`);
  }

  // Replace all fill attributes with the target color
  const recolored = paths
    .join('')
    .replace(/fill="[^"]*"/g, `fill="${colorHex}"`);

  const slug = colorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const wrapped = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` viewBox="0 0 ${width} ${height}"`,
    ` width="${width}" height="${height}">`,
    `<g id="${slug}">`,
    recolored,
    `</g></svg>`,
  ].join('');

  const { data } = optimize(wrapped, {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            collapseGroups: false,
            cleanupIds: false,
            removeViewBox: false,
          },
        },
      },
    ],
  });

  return data;
}
