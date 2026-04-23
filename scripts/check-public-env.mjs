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
 */
const BAD_PATTERNS = [
  /[?&]api[_-]?key=/i,
  /[?&]key=[a-z0-9-]{16,}/i,
  /[?&]token=/i,
  /[?&]secret=/i,
  /bearer\s+/i,
  // Common exposed-key shapes
  /sk_live_[a-z0-9]+/i,
  /sk_test_[a-z0-9]+/i,
];

const offenders = [];
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('NEXT_PUBLIC_')) continue;
  if (typeof value !== 'string' || value.length === 0) continue;
  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(value)) {
      offenders.push({ name, pattern: pattern.toString() });
      break;
    }
  }
}

if (offenders.length > 0) {
  console.error('');
  console.error('✖ NEXT_PUBLIC_ env var looks like it contains a secret:');
  for (const o of offenders) {
    console.error(`    ${o.name}  matches  ${o.pattern}`);
  }
  console.error('');
  console.error('  NEXT_PUBLIC_* is baked into the client bundle and is public.');
  console.error('  Move this value server-side and proxy through the backend.');
  console.error('');
  process.exit(1);
}

console.log('[check-public-env] OK — no NEXT_PUBLIC_* vars look like secrets.');
