// prebuild.js — pre-build safety checks. Runs as the "prebuild" npm script
// before `next build`.
//
// (This file used to also copy skill files into public/skill/; that serving
// surface was retired together with the deprecated hatcher-skill docs.)

const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Cheap guard against pasting a private key into NEXT_PUBLIC_* —
// those vars are baked into the client bundle and become public.
// See scripts/check-public-env.mjs for the actual patterns.
const r = spawnSync('node', [path.join(__dirname, 'scripts', 'check-public-env.mjs')], {
  stdio: 'inherit',
});
if (r.status !== 0) {
  process.exit(r.status ?? 1);
}
