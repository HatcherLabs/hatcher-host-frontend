#!/usr/bin/env node
/**
 * Orchestrate Blender + HDRI pass-through for one raw asset.
 *
 * Usage:
 *   node scripts/process-3d-asset.mjs <path-to-raw-asset>
 *
 * Outputs to public/assets/3d/misc by default. Use --out <dir> for
 * runtime assets that belong in a specific scene folder.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string' } },
});

const rawPath = positionals[0];
if (!rawPath || !existsSync(rawPath)) {
  console.error('Usage: process-3d-asset.mjs <raw-file> [--out <dir>]');
  process.exit(1);
}

const absRaw = path.resolve(rawPath);
const assetName = path.basename(absRaw, path.extname(absRaw));

let outDir = values.out;
if (!outDir) {
  outDir = path.resolve('public/assets/3d/misc');
}
mkdirSync(outDir, { recursive: true });

// HDRIs are copied, not Blender-processed.
if (absRaw.endsWith('.hdr') || absRaw.endsWith('.exr')) {
  const dest = path.join(outDir, path.basename(absRaw));
  copyFileSync(absRaw, dest);
  console.log(`[process-3d-asset] copied HDRI → ${dest}`);
  process.exit(0);
}

// For mesh assets: run Blender twice (high, low).
const scriptPath = path.resolve('scripts/process-3d-asset.py');
for (const variant of ['high', 'low']) {
  console.log(`[process-3d-asset] processing ${assetName}.${variant}...`);
  const r = spawnSync(
    'blender',
    [
      '--background',
      '--python',
      scriptPath,
      '--',
      absRaw,
      outDir,
      variant,
      assetName,
    ],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) {
    console.error(`[process-3d-asset] Blender failed for ${variant} (exit ${r.status})`);
    process.exit(1);
  }
}
console.log(`[process-3d-asset] done → ${outDir}`);
