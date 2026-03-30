// ============================================================
// Web API client tests
// Tests: api.getAgent, api.createAgent, api.subscribe, etc.
// All fetch calls are mocked.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock localStorage (not available in node env) ───────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', { localStorage: localStorageMock });

// ─── Mock fetch globally ─────────────────────────────────────
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorageMock.clear();
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('window', { localStorage: localStorageMock });
});

// ─── Helper ──────────────────────────────────────────────────
function mockFetchOk(data: unknown) {
  fetchSpy.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  });
}

function mockFetchErr(error: string, status = 400) {
  fetchSpy.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ success: false, error }),
  });
}

// ─── Token helpers ────────────────────────────────────────────

describe('Token helpers', () => {
  it('getToken returns null when nothing stored', async () => {
    const { getToken } = await import('../lib/api.js');
    expect(getToken()).toBeNull();
  });

  it('setToken stores and getToken retrieves it', async () => {
    const { setToken, getToken } = await import('../lib/api.js');
    setToken('my-jwt');
    expect(getToken()).toBe('my-jwt');
  });

  it('clearToken removes the stored token', async () => {
    const { setToken, clearToken, getToken } = await import('../lib/api.js');
    setToken('some-token');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('isAuthenticated returns false when no token', async () => {
    const { isAuthenticated } = await import('../lib/api.js');
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when token present', async () => {
    const { setToken, isAuthenticated } = await import('../lib/api.js');
    setToken('abc.def.ghi');
    expect(isAuthenticated()).toBe(true);
  });
});

// ─── api.challenge ────────────────────────────────────────────

describe('api.challenge', () => {
  it('POSTs to /auth/challenge with walletAddress', async () => {
    mockFetchOk({ message: 'Sign this', nonce: 'abc123' });
    const { api } = await import('../lib/api.js');
    const result = await api.challenge('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/challenge');
    expect(opts.method).toBe('POST');
    expect(result.success).toBe(true);
  });
});

// ─── api.getAgent ─────────────────────────────────────────────

describe('api.getAgent', () => {
  it('calls GET /agents/:id', async () => {
    mockFetchOk({ id: '123', name: 'My Bot', status: 'active' });
    const { api } = await import('../lib/api.js');
    const result = await api.getAgent('123');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('/agents/123');
    expect(result.success).toBe(true);
  });

  it('returns error response when agent not found', async () => {
    mockFetchErr('Agent not found', 404);
    const { api } = await import('../lib/api.js');
    const result = await api.getAgent('nonexistent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Agent not found');
    }
  });
});

// ─── api.createAgent ──────────────────────────────────────────

describe('api.createAgent', () => {
  it('calls POST /agents with body', async () => {
    mockFetchOk({ id: 'new-id', name: 'New Agent', status: 'active' });
    const { api } = await import('../lib/api.js');
    await api.createAgent({ name: 'New Agent', framework: 'openclaw', config: { systemPrompt: 'Test agent' } });

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string) as { name: string; framework: string };
    expect(body.name).toBe('New Agent');
    expect(body.framework).toBe('openclaw');
  });

  it('includes Content-Type: application/json header', async () => {
    mockFetchOk({});
    const { api } = await import('../lib/api.js');
    await api.createAgent({ name: 'Bot', framework: 'openclaw', config: { systemPrompt: 'test' } });

    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });
});

// ─── api.updateAgent ─────────────────────────────────────────

describe('api.updateAgent', () => {
  it('calls PATCH /agents/:id with body', async () => {
    mockFetchOk({ id: '123', name: 'Updated Name', status: 'active' });
    const { api } = await import('../lib/api.js');
    await api.updateAgent('123', { name: 'Updated Name' });

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/123');
    expect(opts.method).toBe('PATCH');
  });
});

// ─── api.deleteAgent ─────────────────────────────────────────

describe('api.deleteAgent', () => {
  it('calls DELETE /agents/:id', async () => {
    mockFetchOk({ deleted: true });
    const { api } = await import('../lib/api.js');
    const result = await api.deleteAgent('123');

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/123');
    expect(opts.method).toBe('DELETE');
    expect(result.success).toBe(true);
  });
});

// ─── api.subscribe ──────────────────────────────────────────

describe('api.subscribe', () => {
  it('calls POST /features/subscribe with tier and txSignature', async () => {
    mockFetchOk({ tier: 'starter', expiresAt: '2026-04-28' });
    const { api } = await import('../lib/api.js');
    await api.subscribe('starter', 'real-tx-sig-abc123');

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/features/subscribe');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string) as { tier: string; txSignature: string };
    expect(body.tier).toBe('starter');
    expect(body.txSignature).toBe('real-tx-sig-abc123');
  });
});

// ─── api.chat ────────────────────────────────────────────────

describe('api.chat', () => {
  it('calls POST /agents/:id/chat with message', async () => {
    mockFetchOk({ content: 'Hello from agent!', model: 'llama-4-scout-17b' });
    const { api } = await import('../lib/api.js');
    await api.chat('agent-123', 'Hello');

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/agent-123/chat');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string) as { message: string };
    expect(body.message).toBe('Hello');
  });

  it('includes Authorization header when token is stored', async () => {
    mockFetchOk({ content: 'Hi', model: 'llama-4-scout-17b' });
    const { api, setToken } = await import('../lib/api.js');
    setToken('bearer-token-here');

    await api.chat('agent-123', 'Test');
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer bearer-token-here');
  });

  it('handles network errors gracefully', async () => {
    fetchSpy.mockRejectedValue(new Error('Network failure'));
    const { api } = await import('../lib/api.js');
    const result = await api.chat('agent-123', 'ping');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Network error');
    }
  });
});

// ─── api.listAgents / getMyAgents ────────────────────────────

describe('api.listAgents', () => {
  it('calls GET /agents', async () => {
    mockFetchOk([]);
    const { api } = await import('../lib/api.js');
    await api.listAgents();

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents');
    // No method means GET (default)
    expect(opts.method).toBeUndefined();
  });

  it('getMyAgents is an alias for listAgents', async () => {
    mockFetchOk([]);
    const { api } = await import('../lib/api.js');
    await api.getMyAgents();

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('/agents');
  });
});

// ─── 401 clears the token ─────────────────────────────────────

describe('401 response handling', () => {
  it('clears JWT when 401 is received', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: 'Unauthorized' }),
    });

    const { api, setToken, getToken } = await import('../lib/api.js');
    setToken('expired-jwt');
    await api.getAgent('any');

    expect(getToken()).toBeNull();
  });
});
