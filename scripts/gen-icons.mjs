/**
 * PocketVeto — PWA icon generator (SVG → PNG via sharp).
 * Run: node scripts/gen-icons.mjs
 * Outputs: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
 */

import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const OUT = 'public/icons';

function iconSvg(size, pad) {
  const c = size / 2;
  const r1 = size * (0.36 - pad);
  const r2 = size * (0.26 - pad);
  const r3 = size * (0.16 - pad);
  const blipR = Math.max(size * 0.028, 4);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#09090b"/>
  <circle cx="${c}" cy="${c}" r="${r1}" fill="none" stroke="#10b981" stroke-opacity="0.35" stroke-width="${Math.max(size * 0.012, 2)}" stroke-dasharray="4 6"/>
  <circle cx="${c}" cy="${c}" r="${r2}" fill="none" stroke="#10b981" stroke-opacity="0.5" stroke-width="${Math.max(size * 0.012, 2)}" stroke-dasharray="4 6"/>
  <circle cx="${c}" cy="${c}" r="${r3}" fill="none" stroke="#f43f5e" stroke-opacity="0.6" stroke-width="${Math.max(size * 0.012, 2)}"/>
  <line x1="${c}" y1="${c}" x2="${c + r1 * 0.72}" y2="${c - r1 * 0.72}" stroke="#34d399" stroke-width="${Math.max(size * 0.02, 3)}" stroke-linecap="round"/>
  <circle cx="${c + r3 * 0.55}" cy="${c - r3 * 0.75}" r="${blipR}" fill="#f43f5e"/>
  <circle cx="${c - r2 * 0.8}" cy="${c + r2 * 0.45}" r="${blipR}" fill="#fbbf24"/>
</svg>`;
}

await mkdir(OUT, { recursive: true });
for (const [name, size, pad] of [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 0.08],
]) {
  const svg = Buffer.from(iconSvg(size, pad));
  await writeFile(`${OUT}/${name}`, await sharp(svg).png().toBuffer());
  console.log(`wrote ${OUT}/${name}`);
}
