// prebuild.js — fetches skill files from HatcherLabs/hatcher-skill and writes
// them to public/skill/ so they can be served as static assets.
//
// Runs as "prebuild" npm script before `next build`. Fails fast if GitHub is
// unreachable AND no local copy exists. If GitHub is unreachable but we have a
// previous copy, we log a warning and continue with the stale copy.

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const BASE = 'https://raw.githubusercontent.com/HatcherLabs/hatcher-skill/main';
const FILES = ['skill.md', 'auth.md', 'agents.md', 'pricing.md', 'integrations.md'];
const OUT_DIR = path.join(__dirname, 'public', 'skill');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15_000 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`${url} returned ${res.statusCode}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

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

async function main() {
  checkPublicEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const file of FILES) {
    const outPath = path.join(OUT_DIR, file);
    try {
      const content = await fetch(`${BASE}/${file}`);
      fs.writeFileSync(outPath, content);
      results.push({ file, status: 'fetched', bytes: content.length });
    } catch (err) {
      if (fs.existsSync(outPath)) {
        results.push({ file, status: 'stale', error: err.message });
      } else {
        console.error(`[prebuild] FATAL: ${file} could not be fetched and no local copy exists.`);
        console.error(`[prebuild] Error: ${err.message}`);
        process.exit(1);
      }
    }
  }
  console.log('[prebuild] skill files ready:');
  for (const r of results) console.log(`  ${r.status.padEnd(8)} ${r.file}${r.bytes ? ` (${r.bytes} B)` : ''}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
