const { Buffer } = require('node:buffer');
const { serialize } = require('node:v8');

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

function estimateFallbackBytes(value, seen = new Set()) {
  if (value == null) return 4;
  if (typeof value === 'string') return Buffer.byteLength(value);
  if (typeof value === 'number' || typeof value === 'bigint') return 8;
  if (typeof value === 'boolean') return 4;
  if (typeof value === 'function' || typeof value === 'symbol') return 0;
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return value.byteLength;
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (value instanceof Date) return 8;
  if (typeof value !== 'object' || seen.has(value)) return 0;

  seen.add(value);
  let bytes = 0;
  if (value instanceof Map) {
    for (const [key, entry] of value) {
      bytes += estimateFallbackBytes(key, seen) + estimateFallbackBytes(entry, seen);
    }
  } else if (value instanceof Set) {
    for (const entry of value) bytes += estimateFallbackBytes(entry, seen);
  } else {
    for (const [key, entry] of Object.entries(value)) {
      bytes += Buffer.byteLength(key) + estimateFallbackBytes(entry, seen);
    }
  }
  return bytes;
}

function estimateBytes(value) {
  try {
    return serialize(value).byteLength;
  } catch {
    return estimateFallbackBytes(value);
  }
}

function createStore(maxBytes = DEFAULT_MAX_BYTES) {
  return { entries: new Map(), totalBytes: 0, maxBytes };
}

let store = createStore();

function deleteEntry(store, key) {
  const existing = store.entries.get(key);
  if (!existing) return;
  store.totalBytes -= existing.size;
  store.entries.delete(key);
}

function clearStore() {
  store.entries.clear();
  store.totalBytes = 0;
}

function collectTags(data, ctx) {
  const tags = new Set([
    ...(Array.isArray(ctx.tags) ? ctx.tags : []),
    ...(Array.isArray(ctx.softTags) ? ctx.softTags : []),
  ]);
  const headers = data?.headers;
  let responseTags;
  if (headers && typeof headers.get === 'function') {
    responseTags = headers.get('x-next-cache-tags');
  } else if (headers && typeof headers === 'object') {
    const key = Object.keys(headers).find((name) => name.toLowerCase() === 'x-next-cache-tags');
    responseTags = key ? headers[key] : undefined;
  }
  if (typeof responseTags === 'string') {
    for (const tag of responseTags.split(',')) {
      if (tag.trim()) tags.add(tag.trim());
    }
  }
  return [...tags].filter((tag) => typeof tag === 'string');
}

module.exports = class HatcherMemoryCacheHandler {
  constructor(options = {}) {
    if (Array.isArray(options.revalidatedTags) && options.revalidatedTags.length > 0) {
      clearStore();
    }
  }

  async get(key) {
    const entry = store.entries.get(key);
    if (!entry) return null;

    store.entries.delete(key);
    store.entries.set(key, entry);
    return entry.cacheValue;
  }

  async set(key, data, ctx = {}) {
    const tags = collectTags(data, ctx);
    const cacheValue = { value: data, lastModified: Date.now(), tags };
    const size = Buffer.byteLength(key) + estimateBytes(cacheValue);

    deleteEntry(store, key);
    if (size > store.maxBytes) return;

    while (store.totalBytes + size > store.maxBytes && store.entries.size > 0) {
      deleteEntry(store, store.entries.keys().next().value);
    }

    store.entries.set(key, { cacheValue, size });
    store.totalBytes += size;
  }

  async revalidateTag(tags) {
    const targets = new Set([tags].flat().filter((tag) => typeof tag === 'string'));
    if (targets.size === 0) return;
    clearStore();
  }

  resetRequestCache() {}

  static resetForTests(maxBytes = DEFAULT_MAX_BYTES) {
    store = createStore(maxBytes);
  }

  static statsForTests() {
    return {
      entries: store.entries.size,
      totalBytes: store.totalBytes,
      maxBytes: store.maxBytes,
      keys: [...store.entries.keys()],
    };
  }
};
