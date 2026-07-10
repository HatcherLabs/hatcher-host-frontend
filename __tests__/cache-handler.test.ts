import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const CacheHandler = require('../cache-handler.cjs');

describe('bounded Next.js incremental cache handler', () => {
  it('stores the Next.js cache value shape and invalidates matching tags', async () => {
    CacheHandler.resetForTests(4096);
    const cache = new CacheHandler();

    await cache.set('agents', { kind: 'FETCH', data: { id: 1 }, revalidate: 60 }, {
      tags: ['agents', 'public'],
    });
    expect((await cache.get('agents')).value.data).toEqual({ id: 1 });

    await cache.revalidateTag('agents');
    expect(await cache.get('agents')).toBeNull();
  });

  it('collects response cache tags and safely over-invalidates the bounded store', async () => {
    CacheHandler.resetForTests(4096);
    const cache = new CacheHandler();
    await cache.set('page', {
      kind: 'APP_ROUTE',
      headers: { 'x-next-cache-tags': 'page:/, shared' },
      body: Buffer.from('page'),
    }, { tags: [] });

    expect((await cache.get('page')).tags).toEqual(['page:/', 'shared']);
    await cache.revalidateTag('page:/');
    expect(await cache.get('page')).toBeNull();
  });

  it('cannot return stale data after soft-tag or prior-request invalidation', async () => {
    CacheHandler.resetForTests(4096);
    const cache = new CacheHandler();
    await cache.set('soft', { kind: 'FETCH', data: 'soft', revalidate: 60 }, { tags: [] });
    await cache.revalidateTag('soft:path');
    expect(await cache.get('soft', { softTags: ['soft:path'] })).toBeNull();

    await cache.set('prior', { kind: 'FETCH', data: 'prior', revalidate: 60 }, {
      tags: ['prior'],
    });
    const nextRequest = new CacheHandler({ revalidatedTags: ['prior'] });
    expect(await nextRequest.get('prior')).toBeNull();
  });

  it('shares cache entries across handler instances in the process', async () => {
    CacheHandler.resetForTests(4096);
    const writer = new CacheHandler();
    const reader = new CacheHandler();

    await writer.set('shared', { kind: 'FETCH', data: 'value', revalidate: 60 }, { tags: [] });

    expect((await reader.get('shared')).value.data).toBe('value');
  });

  it('uses least-recently-used eviction while respecting the byte cap', async () => {
    CacheHandler.resetForTests(600);
    const cache = new CacheHandler();
    const value = (label: string) => ({ kind: 'FETCH', data: label.repeat(180), revalidate: 60 });

    await cache.set('first', value('a'), { tags: [] });
    await cache.set('second', value('b'), { tags: [] });
    await cache.get('first');
    await cache.set('third', value('c'), { tags: [] });

    expect(await cache.get('first')).not.toBeNull();
    expect(await cache.get('second')).toBeNull();
    expect(await cache.get('third')).not.toBeNull();
    const stats = CacheHandler.statsForTests();
    expect(stats.totalBytes).toBeLessThanOrEqual(stats.maxBytes);
  });

  it('does not retain an entry larger than the entire cache', async () => {
    CacheHandler.resetForTests(128);
    const cache = new CacheHandler();

    await cache.set('oversized', { payload: 'x'.repeat(1024) }, { tags: ['large'] });

    expect(await cache.get('oversized')).toBeNull();
    expect(CacheHandler.statsForTests().entries).toBe(0);
  });
});
