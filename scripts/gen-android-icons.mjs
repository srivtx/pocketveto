/**
 * gen-android-icons.mjs — the veto-cut mark → Android adaptive-icon
 * foreground layers (all densities) into android/app/src/main/res/.
 *
 * Canvas: 108dp (safe zone = inner 66dp). The mark occupies the central
 * 56dp, clear of every mask shape. Signal green on transparent — the
 * adaptive background supplies the ink tile.
 */
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const RES = new URL('../android/app/src/main/res/', import.meta.url).pathname;
const DENSITIES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

const SIGNAL = '#1fde9e';

const MARK_SVG = (px) => {
  const s = px / 108; // scale factor for a 108-unit canvas
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 108 108">
  <g transform="translate(0.5 0)" fill="none" stroke="${SIGNAL}" stroke-width="10.5" stroke-linecap="square">
    <g transform="translate(26 26) scale(1.75)">
      <path d="M8 7 L16 25" />
      <path d="M24 7 L20.48 14.92" />
      <path d="M18.24 19.96 L16 25" />
    </g>
  </g>
</svg>`;
};

for (const [dir, px] of Object.entries(DENSITIES)) {
  const out = `${RES}${dir}`;
  mkdir(out, { recursive: true });
  await sharp(Buffer.from(MARK_SVG(px)))
    .png()
    .toFile(`${out}/ic_launcher_foreground.png`);
  console.log(`✓ ${dir}/ic_launcher_foreground.png (${px}×${px})`);
}

// Legacy ic_launcher (a plain tile for launchers that ignore adaptive) —
// mark centered on the ink tile.
const TILE = (px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 108 108">
  <rect width="108" height="108" fill="#0A0F0E"/>
  <g transform="translate(0.5 0)" fill="none" stroke="${SIGNAL}" stroke-width="10.5" stroke-linecap="square">
    <g transform="translate(26 26) scale(1.75)">
      <path d="M8 7 L16 25" />
      <path d="M24 7 L20.48 14.92" />
      <path d="M18.24 19.96 L16 25" />
    </g>
  </g>
</svg>`;

for (const [dir, px] of Object.entries(DENSITIES)) {
  await sharp(Buffer.from(TILE(px))).png().toFile(`${RES}${dir}/ic_launcher.png`);
  console.log(`✓ ${dir}/ic_launcher.png (${px}×${px})`);
}
console.log('done');
