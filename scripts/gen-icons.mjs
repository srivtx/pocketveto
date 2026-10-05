/**
 * PocketVeto — PWA icon generator (SVG → PNG via sharp).
 * Run: node scripts/gen-icons.mjs  (from the project root)
 * Outputs: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
 *
 * The mark: the intercept — a radar ring with the veto slash through it,
 * and the charge (cliff-red blip) caught exactly where the slash meets
 * the ring. Colors are the app's oklch tokens resolved to sRGB.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const OUT = 'public/icons';

/* oklch tokens resolved to sRGB via canvas in-browser (see worklog) */
const INK = '#030907';
const SIGNAL = '#1fde9e';
const CLIFF = '#ff6367';

function iconSvg(size, scale) {
  const c = size / 2;
  const rOuter = size * 0.345 * scale;
  const rInner = size * 0.19 * scale;
  const d = rOuter / Math.SQRT2; // slash reach along the diagonal
  const swOuter = Math.max(size * 0.030, 2);
  const swInner = Math.max(size * 0.024, 1.5);
  const swSlash = Math.max(size * 0.047, 3);
  const blipR = size * 0.048 * scale;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${INK}"/>
  <circle cx="${c}" cy="${c}" r="${rOuter}" fill="none" stroke="${SIGNAL}" stroke-opacity="0.62" stroke-width="${swOuter}"/>
  <circle cx="${c}" cy="${c}" r="${rInner}" fill="none" stroke="${SIGNAL}" stroke-opacity="0.34" stroke-width="${swInner}"/>
  <line x1="${c - d}" y1="${c + d}" x2="${c + d}" y2="${c - d}" stroke="${SIGNAL}" stroke-width="${swSlash}" stroke-linecap="round"/>
  <circle cx="${c + d}" cy="${c - d}" r="${blipR}" fill="${CLIFF}"/>
</svg>`;
}

await mkdir(OUT, { recursive: true });
for (const [name, size, scale] of [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.78], // keep inside the maskable safe zone
]) {
  const svg = Buffer.from(iconSvg(size, scale));
  await writeFile(`${OUT}/${name}`, await sharp(svg).png().toBuffer());
  console.log(`wrote ${OUT}/${name}`);
}
