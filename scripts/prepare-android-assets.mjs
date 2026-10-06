#!/usr/bin/env node
/**
 * prepare-android-assets — the one true bundler for the APK's web payload.
 *
 * Why this exists (the blank-screen bug, layer 2):
 *   Android's aapt2 silently DROPS any asset directory whose name starts
 *   with "_" (default ignore pattern `<dir>_*`). Next.js's static export
 *   puts the entire JS/CSS payload in `out/_next/` — so every PocketVeto
 *   APK so far shipped an index.html with <script> tags pointing at
 *   chunks that were never packaged. The page loaded nothing. White screen.
 *   (Layer 1 — the v1.4.1 URL 404 — is fixed in MainActivity: load
 *   /index.html, and bundle at the assets root.)
 *
 * The move: copy out/ into assets/, rename _next → pvpkg, then rewrite
 * every reference (`_next/` → `pvpkg/`) across the HTML, JS, CSS, RSC
 * payloads and the service worker. Runs identically in CI and locally —
 * CI calls this script, so what was tested is what ships.
 *
 * Usage: node scripts/prepare-android-assets.mjs [outDir] [assetsDir]
 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const OUT = process.argv[2] ?? 'out';
const ASSETS = process.argv[3] ?? 'android/app/src/main/assets';
const PKG_DIR = 'pvpkg';

if (!existsSync(join(OUT, 'index.html'))) {
  console.error(`no ${OUT}/index.html — run the static export first (bun run build:static)`);
  process.exit(1);
}

// 1. Fresh copy of the export at the assets ROOT (references are absolute).
rmSync(ASSETS, { recursive: true, force: true });
execSync(`mkdir -p ${ASSETS} && rsync -a ${OUT}/ ${ASSETS}/`, { stdio: 'inherit' });

// 2. The rename that keeps the payload out of aapt2's crosshairs.
if (existsSync(join(ASSETS, '_next'))) {
  execSync(`mv ${ASSETS}/_next ${ASSETS}/${PKG_DIR}`, { stdio: 'inherit' });
}

// 2b. The not-found RSC payload directory — same aapt2 problem, and
//     unreachable in the bundled shell (the WebView never route-navigates;
//     _not-found.html, a file, is kept for the static 404 document anyway).
rmSync(join(ASSETS, '_not-found'), { recursive: true, force: true });

// 3. Rewrite every `_next/` reference. The slash keeps __next.* payload
//    files (no slash) and __next_f runtime globals untouched.
const TEXT_EXT = /\.(html|js|css|txt|webmanifest|json)$/;
let files = 0;
let refs = 0;
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (!TEXT_EXT.test(f)) continue;
    let body;
    try {
      body = execSync(`cat ${JSON.stringify(p)}`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    } catch {
      continue;
    }
    if (!body.includes('_next/')) continue;
    const n = (body.match(/_next\//g) ?? []).length;
    execSync(`sed -i 's|_next/|${PKG_DIR}/|g' ${JSON.stringify(p)}`, { stdio: 'inherit' });
    files += 1;
    refs += n;
  }
};
walk(ASSETS);

// 4. Report + hard-fail on any survivor.
const stale = execSync(
  `grep -rl '_next/' ${ASSETS} 2>/dev/null || true`,
  { encoding: 'utf8' }
).trim();
if (stale) {
  console.error(`STALE _next/ REFERENCES SURVIVED:\n${stale}`);
  process.exit(1);
}

// 4b. aapt2 audit: an underscore-prefixed DIRECTORY here would be
//     silently dropped from the APK — fail loudly instead.
const underscoreDirs = [];
const audit = (dir) => {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (existsSync(p) && statSync(p).isDirectory()) {
      if (f.startsWith('_')) underscoreDirs.push(p);
      audit(p);
    }
  }
};
audit(ASSETS);
if (underscoreDirs.length) {
  console.error(`AAPT2 WOULD SILENTLY DROP THESE DIRECTORIES:\n${underscoreDirs.join('\n')}`);
  process.exit(1);
}

const count = execSync(`find ${ASSETS} -type f | wc -l`, { encoding: 'utf8' }).trim();
const js = execSync(`find ${ASSETS} -name '*.js' | wc -l`, { encoding: 'utf8' }).trim();
console.log(`✔ assets ready: ${count} files, ${js} JS files`);
console.log(`✔ ${PKG_DIR}/ replaces _next/ — ${refs} references rewritten in ${files} files`);
console.log(`✔ no directory in assets starts with "_" (aapt2 keeps everything)`);
