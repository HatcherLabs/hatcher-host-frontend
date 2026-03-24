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
  framework: 'openclaw' | 'hermes';
  ownerId?: string;
  ownerUsername?: string;
  ownerAddress?: string;
  owner?: { username?: string; walletAddress?: string | null };
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
  /** Register a new account */
  register: (email: string, username: string, password: string) =>
    req<{ token: string; expiresIn: string; user: { id: string; email: string; username: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),

  /** Login with email + password */
  login: (email: string, password: string) =>
    req<{ token: string; expiresIn: string; user: { id: string; email: string; username: string; walletAddress: string | null; isAdmin: boolean } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /** Get a sign challenge for wallet linking */
  challenge: (walletAddress: string) =>
    req<{ message: string; nonce: string }>('/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),

  /** Link a wallet to the current account */
  linkWallet: (walletAddress: string, signature: string) =>
    req<{ walletAddress: string }>('/auth/link-wallet', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature }),
    }),

  /** Get current user profile */
  getProfile: () => req<{id: string; email: string; username: string; walletAddress: string | null; apiKey: string; hatchCredits: number; isAdmin: boolean; tier: string; createdAt: string}>('/auth/me'),

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

  /** Create a new agent */
  createAgent: (data: {
    name: string;
    description?: string;
    framework: 'openclaw' | 'hermes';
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
      tier: string;
      tierConfig: any;
      addons: Array<{ key: string; name: string; expiresAt: string | null }>;
      agentLimit: number;
      agentCount: number;
      subscriptionExpiresAt?: string | null;
      // Legacy compat fields
      activeFeatures?: Array<{ featureKey: string; type: string; expiresAt: string | null }>;
      hatchCredits?: number;
    }>('/features/account'),

  /** Get feature catalog (tiers + addons) */
  getFeatureCatalog: () => req<{ tiers: any; addons: any }>('/features'),

  /** Subscribe to a tier */
  subscribe: (tier: string, txSignature: string) =>
    req<{ tier: string }>('/features/subscribe', {
      method: 'POST',
      body: JSON.stringify({ tier, txSignature }),
    }),

  /** Purchase an add-on (optionally per-agent) */
  purchaseAddon: (addonKey: string, txSignature: string, agentId?: string) =>
    req<{ addonKey: string }>('/features/addon', {
      method: 'POST',
      body: JSON.stringify({ addonKey, txSignature, ...(agentId ? { agentId } : {}) }),
    }),

  /** Cancel current subscription (revert to free at end of period) */
  cancelSubscription: () =>
    req<{ tier: string }>('/features/cancel', { method: 'POST' }),

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

  /** Get token price from Jupiter */
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
      totalRevenueUsd: number;
      totalMessages: number;
      newUsersLast7d: number;
    }>('/admin/stats'),

  /** Admin: list all users with agent/payment counts */
  adminGetUsers: (skip = 0, take = 50) =>
    req<{
      users: Array<{
        id: string;
        walletAddress: string;
        agentCount: number;
        paymentCount: number;
        hatchCredits: number;
        createdAt: string;
      }>;
      total: number;
      skip: number;
      take: number;
    }>(`/admin/users?skip=${skip}&take=${take}`),

  /** Admin: list all support tickets */
  adminGetTickets: () =>
    req<{
      tickets: Array<{
        id: string;
        subject: string;
        category: string;
        priority: string;
        status: string;
        userWallet: string;
        agentName: string | null;
        messages: Array<{ role: string; content: string; timestamp: string }>;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('/admin/tickets'),

  /** Admin: reply to a ticket */
  adminReplyTicket: (ticketId: string, message: string) =>
    req<{ id: string }>(`/admin/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  /** Admin: update ticket status */
  adminUpdateTicketStatus: (ticketId: string, status: string) =>
    req<{ id: string; status: string }>(`/admin/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

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

  /** List files in agent's running container */
  listContainerFiles: (agentId: string, path?: string) =>
    req<{ files: Array<{ name: string; path: string; type: 'file' | 'directory'; size: number }>; currentPath: string; status: string; message?: string }>(
      `/agents/${agentId}/container-files${path ? `?path=${encodeURIComponent(path)}` : ''}`
    ),

  /** Read a file from agent's running container */
  readContainerFile: (agentId: string, path: string) =>
    req<{ path: string; content: string }>(`/agents/${agentId}/container-files/read?path=${encodeURIComponent(path)}`),

  /** Write a file to agent's running container */
  writeContainerFile: (agentId: string, path: string, content: string) =>
    req<{ path: string; written: boolean }>(`/agents/${agentId}/container-files/write`, {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    }),

  /** Delete a file from agent's running container */
  deleteContainerFile: (agentId: string, path: string) =>
    req<{ path: string; deleted: boolean }>(`/agents/${agentId}/container-files/delete?path=${encodeURIComponent(path)}`, {
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

  /** Get API usage stats for the current user */
  getApiUsage: () =>
    req<{ requestsToday: number; limit: number; remaining: number; resetAt: string }>('/usage'),

  /** Start channel pairing (WhatsApp QR, Signal, etc.) */
  pairChannel: (agentId: string, channel: string) =>
    req<{ status: string; qrCode?: string; message: string; raw?: string }>(`/agents/${agentId}/pair-channel`, {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }),

  /** Load chat history */
  getChatHistory: (agentId: string) =>
    req<{ messages: Array<{ role: string; content: string; ts: number }> }>(`/agents/${agentId}/chat/history`),

  /** Save chat messages to history */
  saveChatHistory: (agentId: string, messages: Array<{ role: string; content: string }>) =>
    req<{ saved: number }>(`/agents/${agentId}/chat/history`, {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),

  /** Clear chat history */
  clearChatHistory: (agentId: string) =>
    req<{ cleared: boolean }>(`/agents/${agentId}/chat/history`, { method: 'DELETE' }),

  /** Get channel connection status */
  getChannelStatus: (agentId: string) =>
    req<{ channels: Record<string, { connected: boolean }> }>(`/agents/${agentId}/channel-status`),

  /** Disconnect a paired channel */
  disconnectChannel: (agentId: string, channel: string) =>
    req<{ disconnected: boolean }>(`/agents/${agentId}/disconnect-channel`, {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }),
};
