// ============================================================
// API Client — wraps all calls to the Hatcher backend
// ============================================================

import { API_URL } from '@/lib/config';

const API_BASE = API_URL;
const TOKEN_KEY = 'hatcher_jwt';

// ─── Token helpers ───────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Types ───────────────────────────────────────────────────
export interface Payment {
  id: string;
  agentId: string | null;
  featureKey: string;
  usdAmount: number;
  hatchAmount: number;
  txSignature: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  agent?: { name: string };
}

export interface AgentFeature {
  id: string;
  featureKey: string;
  type: 'one_time' | 'subscription';
  expiresAt: string | null;
  userId: string;
  txSignature: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  status: string;
  framework: 'openclaw';
  ownerId?: string;
  ownerAddress?: string;
  owner?: { walletAddress: string };
  config?: Record<string, unknown>;
  features?: Array<{ featureKey: string }>;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'general' | 'billing' | 'technical' | 'feature_request' | 'bug_report';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  ticketId: string;
  role: 'user' | 'support';
  content: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  agentId: string | null;
  agent?: { name: string } | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

// ─── Token refresh (internal — never retries on 401 to avoid loops) ─
async function attemptRefresh(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { success: boolean; data?: { token: string } };
    if (json.success && json.data?.token) {
      setToken(json.data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Request wrapper ─────────────────────────────────────────
async function req<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  // Only set Content-Type: application/json when there's actually a body to send.
  // Fastify rejects POST requests with JSON content-type but no body.
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const json = await res.json();
    if (!res.ok && res.status === 401) {
      if (!_isRetry) {
        // Try to refresh the token once, then retry the original request
        const refreshed = await attemptRefresh();
        if (refreshed) {
          return req<T>(path, options, true);
        }
      }
      // Refresh failed or already retried — clear session
      clearToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hatcher:auth-expired'));
      }
    }
    return json;
  } catch {
    return { success: false, error: 'Network error — is the API running?' };
  }
}

// ─── API methods ─────────────────────────────────────────────
export const api = {
  /** Get a sign challenge for a wallet address */
  challenge: (walletAddress: string) =>
    req<{ message: string; nonce: string }>('/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),

  /** Verify wallet signature → JWT */
  verify: (walletAddress: string, signature: string) =>
    req<{ token: string; user: { id: string; walletAddress: string } }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature }),
    }),

  /** Get current user profile (includes API key) */
  getProfile: () => req<{id: string; walletAddress: string; apiKey: string; hatchCredits: number; createdAt: string}>('/auth/me'),

  /** Delete current user account */
  deleteAccount: () => req<{deleted: boolean}>('/auth/me', { method: 'DELETE' }),

  /** Regenerate API key */
  regenerateApiKey: () =>
    req<{ apiKey: string }>('/auth/api-key/regenerate', { method: 'POST' }),

  /** Get recent notifications/activity */
  getNotifications: () => req<Array<{id: string; type: string; message: string; timestamp: string}>>('/auth/notifications'),

  /** List the current user's agents */
  getMyAgents: () => req<Agent[]>('/agents'),

  /** Alias for getMyAgents */
  listAgents: () => req<Agent[]>('/agents'),

  /** Browse all public agents */
  getExploreAgents: () => req<{ agents: Agent[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>('/agents/explore'),

  /** Alias for getExploreAgents */
  exploreAgents: () => req<{ agents: Agent[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>('/agents/explore'),

  /** Get a single agent */
  getAgent: (id: string) => req<Agent>(`/agents/${id}`),

  /** Create a new OpenClaw agent */
  createAgent: (data: {
    name: string;
    description?: string;
    framework: 'openclaw';
    template?: string;
    config: {
      model?: string;
      provider?: string;
      skills?: string[];
      systemPrompt?: string;
      byok?: {
        provider: string;
        apiKey?: string;
        model?: string;
        baseUrl?: string;
      };
    };
  }) =>
    req<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update an agent */
  updateAgent: (id: string, data: {
    name?: string;
    description?: string;
    config?: { personality?: string; systemPrompt?: string; [key: string]: unknown };
  }) =>
    req<Agent>(`/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Delete an agent */
  deleteAgent: (id: string) =>
    req<{ deleted: boolean }>(`/agents/${id}`, { method: 'DELETE' }),

  /** Start an agent container */
  startAgent: (id: string) =>
    req<{ status: string; containerId?: string }>(`/agents/${id}/start`, { method: 'POST' }),

  /** Stop an agent container */
  stopAgent: (id: string) =>
    req<{ status: string }>(`/agents/${id}/stop`, { method: 'POST' }),

  /** Restart an agent container (server-side stop + start) */
  restartAgent: (id: string) =>
    req<{ status: string; containerId?: string }>(`/agents/${id}/restart`, { method: 'POST' }),

  /** Unlock a feature after on-chain payment. Pass agentId as empty string or omit for account-level features. */
  unlockFeature: (agentId: string | undefined, featureKey: string, opts: {
    paymentToken: 'hatch' | 'sol';
    amount: number;
    txSignature: string;
  }) =>
    req<{ id: string; featureKey: string; type: string; expiresAt: string | null }>('/features/unlock', {
      method: 'POST',
      body: JSON.stringify({
        ...(agentId ? { agentId } : {}),
        featureKey,
        txSignature: opts.txSignature,
        paymentToken: opts.paymentToken,
        ...(opts.paymentToken === 'sol'
          ? { solAmount: opts.amount }
          : { hatchAmount: opts.amount }),
      }),
    }),

  /** Chat with an agent (non-streaming) */
  chat: (agentId: string, message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    req<{ content: string; model: string }>(`/agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  /** Get payment history for the current user */
  getPayments: (skip = 0, take = 50) =>
    req<{ payments: Payment[]; total: number; skip: number; take: number }>(`/payments?skip=${skip}&take=${take}`),

  /** Get active features for an agent */
  getAgentFeatures: (agentId: string) => req<AgentFeature[]>(`/agents/${agentId}/features`),

  /** Get active account-level features for the current user */
  getAccountFeatures: () =>
    req<{
      activeFeatures: Array<{ featureKey: string; type: string; expiresAt: string | null }>;
      availableFeatures: Array<{ key: string; name: string; description: string; usdPrice: number; type: string; framework: string; category: string }>;
      hatchCredits: number;
    }>('/features/account'),

  /** Refresh JWT token */
  refreshToken: () =>
    req<{ token: string }>('/auth/refresh', { method: 'POST' }),

  /** Get agent stats (messages processed, uptime, last active) */
  getAgentStats: (id: string) =>
    req<{
      messagesProcessed: number;
      uptimeSecs: number;
      lastActiveAt: string | null;
      containerId: string | null;
      status: string;
    }>(`/agents/${id}/stats`),

  /** Get agent activity logs */
  getAgentLogs: (id: string) =>
    req<{
      logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>;
      note: string;
    }>(`/agents/${id}/logs`),

  /** Get watched wallets for an agent */
  getWalletWatch: (id: string) =>
    req<{ watchedWallets: string[] }>(`/agents/${id}/wallet-watch`),

  /** Set watched wallets for an agent (max 3) */
  setWalletWatch: (id: string, wallets: string[]) =>
    req<{ watchedWallets: string[] }>(`/agents/${id}/wallet-watch`, {
      method: 'POST',
      body: JSON.stringify({ wallets }),
    }),

  /** Unlock all features in a bundle after a single payment */
  unlockBundle: (data: {
    agentId: string;
    bundleKey: string;
    paymentToken: 'hatch' | 'sol';
    amount: number;
    txSignature: string;
  }) =>
    req<{ bundleKey: string; featuresUnlocked: string[]; paymentId: string }>('/features/bundle', {
      method: 'POST',
      body: JSON.stringify({
        agentId: data.agentId,
        bundleKey: data.bundleKey,
        txSignature: data.txSignature,
        paymentToken: data.paymentToken,
        ...(data.paymentToken === 'sol'
          ? { solAmount: data.amount }
          : { hatchAmount: data.amount }),
      }),
    }),

  /** Get $HATCH token price from Jupiter */
  getPrice: (token: 'hatch' | 'sol') =>
    req<{ price: number; currency: string; source: string; error?: string }>(`/prices/${token}`),

  /** Admin: force-kill an agent container */
  adminKillAgent: (id: string) =>
    req<{ killed: boolean; agentId: string }>(`/admin/agents/${id}/kill`, { method: 'POST' }),

  /** Admin: pause an agent container */
  adminPauseAgent: (id: string) =>
    req<{ paused: boolean; agentId: string }>(`/admin/agents/${id}/pause`, { method: 'POST' }),

  /** Admin: list all agents across all users */
  adminGetAgents: () =>
    req<Array<Agent & { ownerWallet: string }>>('/admin/agents'),

  /** Admin: get platform-wide stats */
  /** Get public platform stats (no auth required) */
  getPublicStats: () =>
    req<{ totalAgents: number; activeAgents: number }>('/admin/public-stats'),

  adminGetStats: () =>
    req<{
      totalUsers: number;
      totalAgents: number;
      activeAgents: number;
      totalFeaturesUnlocked: number;
      totalPayments: number;
    }>('/admin/stats'),

  /** Run a research task for an agent */
  research: (agentId: string, query: string) =>
    req<{ query: string; result: string; model: string; completedAt: string }>(`/agents/${agentId}/research`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  /** Scan a Solana token mint address with AI analysis */
  scanToken: (agentId: string, mintAddress: string) =>
    req<{
      mintAddress: string;
      name: string;
      symbol: string;
      price: number | null;
      marketCap: number | null;
      holders: number | null;
      aiSummary: string;
      model: string;
      scannedAt: string;
      note: string;
    }>(`/agents/${agentId}/scan-token`, {
      method: 'POST',
      body: JSON.stringify({ mintAddress }),
    }),

  /** List files in an agent's file manager (requires file_manager feature) */
  getFiles: (agentId: string) =>
    req<Array<{
      id: string;
      agentId: string;
      name: string;
      mimeType: string;
      sizeBytes: number;
      content: string | null;
      createdAt: string;
      updatedAt: string;
    }>>(`/agents/${agentId}/files`),

  /** Upload (store) a file for an agent (requires file_manager feature) */
  uploadFile: (agentId: string, data: {
    name: string;
    mimeType?: string;
    sizeBytes?: number;
    content?: string;
  }) =>
    req<{
      id: string;
      agentId: string;
      name: string;
      mimeType: string;
      sizeBytes: number;
      content: string | null;
      createdAt: string;
      updatedAt: string;
    }>(`/agents/${agentId}/files`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Delete a file from an agent's file manager */
  deleteFile: (agentId: string, fileId: string) =>
    req<{ deleted: boolean; fileId: string }>(`/agents/${agentId}/files/${fileId}`, {
      method: 'DELETE',
    }),

  /** Streaming chat — falls back to non-streaming if stream unavailable */
  chatStream: async (
    agentId: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    onToken: (token: string) => void,
    onDone: (model: string) => void,
    onError: (err: string) => void
  ) => {
    const token = getToken();

    // Try streaming first, fall back to non-streaming on network error
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/agents/${agentId}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, history }),
      });
    } catch {
      // Streaming endpoint failed — fall back to regular chat
      try {
        const fallback = await fetch(`${API_BASE}/agents/${agentId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message, history }),
        });
        if (!fallback.ok) { onError(`HTTP ${fallback.status}`); return; }
        const data = await fallback.json() as { data?: { content: string; model: string } };
        if (data.data?.content) {
          onToken(data.data.content);
          onDone(data.data.model ?? 'groq');
        } else {
          onError('Empty response');
        }
      } catch (fallbackErr) {
        onError(fallbackErr instanceof Error ? fallbackErr.message : 'Network error');
      }
      return;
    }

    if (!res.ok || !res.body) {
      onError(`HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let detectedModel = 'unknown';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') { onDone(detectedModel); return; }
        try {
          const json = JSON.parse(data) as { token?: string; error?: string; model?: string };
          if (json.error) { onError(json.error); return; }
          if (json.model) detectedModel = json.model;
          if (json.token) onToken(json.token);
        } catch { /* skip */ }
      }
    }
    // Stream ended without [DONE] marker
    onDone(detectedModel);
  },

  // ─── Support Tickets ────────────────────────────────────────
  /** List all tickets for the current user */
  getTickets: () => req<Ticket[]>('/support/tickets'),

  /** Get a single ticket by ID (includes messages) */
  getTicket: (id: string) => req<Ticket>(`/support/tickets/${id}`),

  /** Create a new support ticket */
  createTicket: (data: {
    subject: string;
    category: TicketCategory;
    priority: TicketPriority;
    agentId?: string;
    message: string;
  }) =>
    req<Ticket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Reply to a ticket */
  replyToTicket: (id: string, message: string) =>
    req<TicketMessage>(`/support/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  /** Close a ticket */
  closeTicket: (id: string) =>
    req<Ticket>(`/support/tickets/${id}/close`, {
      method: 'PATCH',
    }),

  /** Renew a subscription feature */
  renewFeature: (featureId: string, opts: {
    paymentToken: 'hatch' | 'sol';
    amount: number;
    txSignature: string;
  }) =>
    req<{
      featureId: string;
      paymentId: string;
      featureKey: string;
      previousExpiresAt: string | null;
      newExpiresAt: string;
    }>('/features/renew', {
      method: 'POST',
      body: JSON.stringify({
        featureId,
        txSignature: opts.txSignature,
        paymentToken: opts.paymentToken,
        ...(opts.paymentToken === 'sol'
          ? { solAmount: opts.amount }
          : { hatchAmount: opts.amount }),
      }),
    }),

  /** Get active subscriptions for the user */
  getSubscriptions: () =>
    req<{
      subscriptions: Array<{
        id: string;
        featureKey: string;
        agent: { id: string; name: string; framework: string } | null;
        expiresAt: string;
        pricing: { key: string; name: string; usdPrice: number; type: string } | null;
      }>;
    }>('/features/subscriptions'),

  /** Get the public feed for an agent */
  getFeed: (agentId: string) =>
    req<Array<{
      id: string;
      type: string;
      content: string;
      platform: string;
      createdAt: string;
    }>>(`/agents/${agentId}/feed`),
};
