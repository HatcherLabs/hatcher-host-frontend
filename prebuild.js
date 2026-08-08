// prebuild.js — copies the vendored skill files from skill-source/ into
// public/skill/ so they are served as static assets.
//
// The files used to be fetched from HatcherLabs/hatcher-skill pinned to a
// commit SHA, but that repository no longer exists, which made every fresh
// build (CI, deploy) fail. The last verified copies now live in skill-source/
// inside this repository; edit them there.
//
// Runs as the "prebuild" npm script before `next build`.

const fs = require('node:fs');
const path = require('node:path');

const FILES = ['skill.md', 'auth.md', 'agents.md', 'pricing.md', 'integrations.md'];
const SRC_DIR = path.join(__dirname, 'skill-source');
const OUT_DIR = path.join(__dirname, 'public', 'skill');

function checkPublicEnv() {
  // Cheap guard against pasting a private key into NEXT_PUBLIC_* —
  // those vars are baked into the client bundle and become public.
  // See scripts/check-public-env.mjs for the actual patterns.
  const { spawnSync } = require('node:child_process');
  const r = spawnSync('node', [path.join(__dirname, 'scripts', 'check-public-env.mjs')], {
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function main() {
  checkPublicEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('[prebuild] skill files ready:');
  for (const file of FILES) {
    const srcPath = path.join(SRC_DIR, file);
    if (!fs.existsSync(srcPath)) {
      console.error(`[prebuild] FATAL: ${srcPath} is missing — skill-source/ must contain ${FILES.join(', ')}.`);
      process.exit(1);
    }
    const content = fs.readFileSync(srcPath);
    fs.writeFileSync(path.join(OUT_DIR, file), content);
    console.log(`  copied   ${file} (${content.length} B)`);
  }
}

main();
