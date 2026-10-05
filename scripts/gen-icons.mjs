/**
 * PocketVeto — PWA icon generator (SVG → PNG via sharp).
 * Run: node scripts/gen-icons.mjs  (from the project root)
 * Outputs: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
 *
 * The mark: the veto cut — a V drawn in one gesture, the returning stroke
 * severed before it lands. The detached tip (cliff red — the charge,
 * caught) still completes the letter. Ink tile, signal arms.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const OUT = 'public/icons';

/* oklch tokens resolved to sRGB via canvas in-browser (see worklog) */
const INK = '#030907';
const SIGNAL = '#1fde9e';
const CLIFF = '#ff6367';

function iconSvg(size, fraction) {
  const k = (size * fraction) / 32; // mark scale
  const off = (size - 32 * k) / 2; // center the 32-unit mark box
  const r = Math.round(size * 0.234); // tile radius ≈ rx 7.5/32
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${r}" fill="${INK}"/>
  <g stroke-linecap="butt" fill="none" transform="translate(${off} ${off}) scale(${k}) translate(0.5 0)">
    <path d="M8 7 L16 25" stroke="${SIGNAL}" stroke-width="3"/>
    <path d="M24 7 L20.48 14.92" stroke="${SIGNAL}" stroke-width="3"/>
    <path d="M18.24 19.96 L16 25" stroke="${CLIFF}" stroke-width="3"/>
  </g>
</svg>`;
}

await mkdir(OUT, { recursive: true });
for (const [name, size, fraction] of [
  ['icon-192.png', 192, 0.68],
  ['icon-512.png', 512, 0.68],
  ['icon-maskable-512.png', 512, 0.56], // keep inside the maskable safe zone
]) {
  const svg = Buffer.from(iconSvg(size, fraction));
  await writeFile(`${OUT}/${name}`, await sharp(svg).png().toBuffer());
  console.log(`wrote ${OUT}/${name}`);
}
