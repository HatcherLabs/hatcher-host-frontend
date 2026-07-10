#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const CacheHandler = require('../cache-handler.cjs');

async function main() {
  CacheHandler.resetForTests(600);
  const writer = new CacheHandler();
  const reader = new CacheHandler();
  const value = (label) => ({ kind: 'FETCH', data: label.repeat(180), revalidate: 60 });

  await writer.set('first', value('a'), { tags: ['first'] });
  assert.equal((await reader.get('first')).value.data.length, 180);
  await writer.set('second', value('b'), { tags: ['second'] });
  await reader.get('first');
  await writer.set('third', value('c'), { tags: ['third'] });
  assert.equal(await reader.get('second'), null);
  assert.ok(await reader.get('first'));
  assert.ok(await reader.get('third'));
  assert.ok(CacheHandler.statsForTests().totalBytes <= 600);

  await writer.revalidateTag(['first', 'third']);
  assert.equal(await reader.get('first'), null);
  assert.equal(await reader.get('third'), null);

  CacheHandler.resetForTests(64);
  await writer.set('oversized', { payload: 'x'.repeat(1024) }, { tags: [] });
  assert.equal(await reader.get('oversized'), null);

  console.log('bounded shared Next.js cache handler tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
