#!/usr/bin/env node
/**
 * Pre-build guard for NEXT_PUBLIC_* env vars.
 *
 * Everything prefixed NEXT_PUBLIC_ is baked into the client bundle at
 * build time and becomes publicly readable. This script fails the
 * build if any such var looks like it contains a private key or
 * credential — a very cheap way to catch a repeat of the Helius RPC
 * incident (2026-04-23) where `NEXT_PUBLIC_SOLANA_RPC` contained
 * `?api-key=<uuid>`.
 *
 * Usage: invoked from `prebuild` in package.json.
 *
 * Note: Next.js doesn't auto-load `.env*` files into `process.env`
 * until `next build` runs (AFTER `prebuild`). We explicitly parse
 * the same precedence chain (.env.production.local > .env.local >
 * .env.production > .env) so this guard actually sees what the
 * production bundle is about to be built with.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Next.js env precedence — highest priority first. The first file to
// define a key wins. See https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
const ENV_FILES = [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env',
];

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function collectEnv() {
  const merged = { ...process.env };
  const cwd = process.cwd();
  // Next's rule: first-defined wins. Iterate highest-precedence first
  // and only set keys that aren't already present.
  for (const f of ENV_FILES) {
    const parsed = parseDotEnv(path.join(cwd, f));
    for (const [k, v] of Object.entries(parsed)) {
      if (!(k in merged)) merged[k] = v;
    }
  }
  return merged;
}

const BAD_PATTERNS = [
  { pattern: /[?&]api[_-]?key=/i, label: 'query-string api-key' },
  { pattern: /[?&]key=[a-z0-9-]{16,}/i, label: 'query-string key=<long>' },
  { pattern: /[?&]token=/i, label: 'query-string token' },
  { pattern: /[?&]secret=/i, label: 'query-string secret' },
  { pattern: /\bbearer\s+[A-Za-z0-9._-]{16,}/i, label: 'bearer token literal' },
  { pattern: /sk_live_[a-z0-9]+/i, label: 'stripe live secret key' },
  { pattern: /sk_test_[a-z0-9]+/i, label: 'stripe test secret key' },
  // Path-style tokens — e.g. https://mainnet.helius-rpc.com/<uuid> or
  // https://xxx.solana-mainnet.quiknode.pro/<64-hex>/ — where the key
  // is embedded in the path, not the query. Matches anything that
  // looks like a private-RPC provider hostname with a long path
  // segment of hex-ish characters.
  {
    pattern: /\/\/(?:[a-z0-9-]+\.)*(?:helius-rpc\.com|quiknode\.pro|alchemyapi\.io|alchemy\.com|ankr\.com|triton\.one|getblock\.io)\/[a-z0-9-]{16,}/i,
    label: 'private RPC URL with embedded key',
  },
];

const merged = collectEnv();
const offenders = [];
for (const [name, value] of Object.entries(merged)) {
  if (!name.startsWith('NEXT_PUBLIC_')) continue;
  if (typeof value !== 'string' || value.length === 0) continue;
  for (const { pattern, label } of BAD_PATTERNS) {
    if (pattern.test(value)) {
      offenders.push({ name, label });
      break;
    }
  }
}

if (offenders.length > 0) {
  console.error('');
  console.error('NEXT_PUBLIC_ env var looks like it contains a secret:');
  for (const o of offenders) {
    console.error(`    ${o.name}  ->  ${o.label}`);
  }
  console.error('');
  console.error('  NEXT_PUBLIC_* is baked into the client bundle and is public.');
  console.error('  Move this value server-side and proxy through the backend.');
  console.error('');
  process.exit(1);
}

console.log('[check-public-env] OK — no NEXT_PUBLIC_* vars look like secrets.');
