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
  slug?: string | null;
  description: string | null;
  avatarUrl: string | null;
  status: string;
  framework: 'openclaw' | 'hermes' | 'elizaos' | 'milady';
  isPublic?: boolean;
  messageCount?: number;
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
  register: (email: string, username: string, password: string, referralCode?: string) =>
    req<{ token: string; expiresIn: string; user: { id: string; email: string; username: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, ...(referralCode ? { referralCode } : {}) }),
    }),

  /** Login with email + password */
  login: (email: string, password: string) =>
    req<{ token: string; expiresIn: string; user: { id: string; email: string; username: string; walletAddress: string | null; isAdmin: boolean } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /** Request password reset email */
  forgotPassword: (email: string) =>
    req<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** Reset password with token */
  resetPassword: (token: string, password: string) =>
    req<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
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

  /** Update profile (username, email, or password) */
  updateProfile: (data: { username?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    req<{ id: string; email: string; username: string }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Delete current user account (requires password confirmation) */
  deleteAccount: (password: string) => req<{deleted: boolean}>('/auth/me', { method: 'DELETE', body: JSON.stringify({ password }) }),

  /** Regenerate API key (legacy single-key) */
  regenerateApiKey: () =>
    req<{ apiKey: string }>('/auth/api-key/regenerate', { method: 'POST' }),

  /** List all named API keys */
  listApiKeys: () =>
    req<Array<{
      id: string; label: string; prefix: string;
      lastUsedAt: string | null; revokedAt: string | null; createdAt: string;
      requestsToday: number; requestsThisWeek: number;
    }>>('/auth/api-keys'),

  /** Create a new named API key (full key returned once) */
  createApiKey: (label: string) =>
    req<{ id: string; label: string; key: string; prefix: string; createdAt: string }>(
      '/auth/api-keys', { method: 'POST', body: JSON.stringify({ label }) }
    ),

  /** Revoke a named API key */
  revokeApiKey: (id: string) =>
    req<{ revoked: boolean }>(`/auth/api-keys/${id}`, { method: 'DELETE' }),

  /** Rename a named API key */
  renameApiKey: (id: string, label: string) =>
    req<{ id: string; label: string }>(`/auth/api-keys/${id}`, {
      method: 'PATCH', body: JSON.stringify({ label }),
    }),

  /** Get recent notifications/activity */
  getNotifications: () => req<{ items: Array<{id: string; type: string; message: string; timestamp: string}>; readAt: string | null }>('/auth/notifications'),

  /** Mark all notifications as read (persists server-side) */
  markNotificationsRead: () => req<{ readAt: string }>('/auth/notifications/read', { method: 'PATCH' }),

  /** Get referral code + share link */
  getReferralCode: () =>
    req<{ referralCode: string; shareLink: string; username: string }>('/referrals/my-code'),

  /** Get referral stats */
  getReferralStats: () =>
    req<{
      totalReferred: number;
      totalEarned: number;
      rewardPerReferral: number;
      referrals: Array<{ username: string; date: string; rewardClaimed: boolean }>;
    }>('/referrals/stats'),

  /** Claim pending referral rewards */
  claimReferralRewards: () =>
    req<{ claimed: number; totalCredited: number; message: string }>('/referrals/claim', { method: 'POST' }),

  /** Validate a referral code (public) */
  validateReferralCode: (code: string) =>
    req<{ valid: boolean; referrerUsername?: string }>(`/referrals/validate/${code}`),

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

  /** Get usage analytics for an agent */
  getAgentUsage: (id: string) =>
    req<{
      messages: {
        today: number;
        limit: number;
        isByok: boolean;
        chart: Array<{ date: string; count: number }>;
      };
      uptime: {
        seconds: number;
        since: string | null;
        percent: number;
        daysActive: number;
        status: string;
      };
      resources: {
        cpuPercent: number;
        memoryUsageMb: number;
        memoryLimitMb: number;
        cpuLimit: number;
      };
      storage: { usedMb: number; limitMb: number };
    }>(`/agents/${id}/usage`),

  /** Get public stats for an agent (no auth required) */
  getAgentPublicStats: (id: string) =>
    req<{
      name: string;
      description: string | null;
      framework: string;
      template: string | null;
      ownerUsername: string | null;
      messagesProcessed: number;
      daysActive: number;
      uptimePercent: number;
      status: string;
      featureCount: number;
      createdAt: string;
      lastActiveAt: string;
    }>(`/agents/${id}/public-stats`),

  /** Create a new agent */
  createAgent: (data: {
    name: string;
    description?: string;
    framework: 'openclaw' | 'hermes' | 'elizaos' | 'milady';
    template?: string;
    config: {
      model?: string;
      provider?: string;
      skills?: string[];
      systemPrompt?: string;
      personality?: string;
      bio?: string;
      topics?: string[];
      adjectives?: string[];
      byok?: {
        provider: string;
        apiKey?: string;
        model?: string;
        baseUrl?: string;
      };
      platforms?: string[];
      platformSecrets?: Record<string, Record<string, string>>;
      sessionScope?: string;
      webSearch?: { provider: string } | undefined;
      tts?: { provider: string } | undefined;
      enableMemory?: boolean;
      approvalMode?: string;
      dbBackend?: string;
      enableImageGen?: boolean;
      enableVoice?: boolean;
      miladyPersonality?: string;
      localFirst?: boolean;
      [key: string]: unknown;
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
    isPublic?: boolean;
    commitMessage?: string;
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

  /** Test chat — real LLM call to preview agent personality before deploying */
  testChat: (message: string, systemPrompt: string, model?: string, provider?: string) =>
    req<{ text: string }>('/agents/test-chat', {
      method: 'POST',
      body: JSON.stringify({ message, systemPrompt, ...(model ? { model } : {}), ...(provider ? { provider } : {}) }),
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

  /** Create Stripe checkout session for tier subscription */
  stripeCheckoutSubscription: (tier: string, returnUrl: string) =>
    req<{ sessionId: string; url: string }>('/stripe/checkout/subscription', {
      method: 'POST',
      body: JSON.stringify({ tier, returnUrl }),
    }),

  /** Create Stripe checkout session for addon */
  stripeCheckoutAddon: (addonKey: string, returnUrl: string, agentId?: string) =>
    req<{ sessionId: string; url: string }>('/stripe/checkout/addon', {
      method: 'POST',
      body: JSON.stringify({ addonKey, returnUrl, ...(agentId ? { agentId } : {}) }),
    }),

  /** Cancel Stripe subscription (cancels at end of billing period) */
  stripeCancelSubscription: () =>
    req<{ message: string }>('/stripe/cancel-subscription', { method: 'POST' }),

  /** Open Stripe customer portal for billing management */
  stripePortal: (returnUrl: string) =>
    req<{ url: string }>('/stripe/portal', {
      method: 'POST',
      body: JSON.stringify({ returnUrl }),
    }),

  /** Refresh JWT token */
  refreshToken: () =>
    req<{ token: string }>('/auth/refresh', { method: 'POST' }),

  /** Get agent memory (MEMORY.md + daily logs) */
  getAgentMemory: (id: string) =>
    req<{
      memoryMd: string;
      dailyLogs: Array<{ date: string; content: string }>;
      status?: string;
      message?: string;
    }>(`/agents/${id}/memory`),

  /** Get agent monitoring data (health, resources, response times, errors) */
  getAgentMonitoring: (id: string) =>
    req<{
      health: 'healthy' | 'unhealthy' | 'stopped';
      uptime: { seconds: number; since: string | null };
      restarts: number;
      resources: { cpuPercent: number; memoryUsageMb: number; memoryLimitMb: number };
      responseTimes: { avg: number; p95: number; last: number };
      errors: { last24h: number; lastError: string | null };
      history: Array<{ ts: number; cpu: number; mem: number }>;
    }>(`/agents/${id}/monitoring`),

  /** Get agent stats (messages processed, uptime, last active) */
  getAgentStats: (id: string) =>
    req<{
      messagesProcessed: number;
      uptimeSecs: number;
      lastActiveAt: string | null;
      containerId: string | null;
      status: string;
    }>(`/agents/${id}/stats`),

  /** Get agent analytics (message activity + token usage) */
  getAgentAnalytics: (id: string, range: '7d' | '30d' | '90d' = '7d') =>
    req<{
      range: string;
      rangeDays: number;
      messagesPerDay: Array<{ date: string; count: number; inputTokens: number; outputTokens: number; usdCost: number }>;
      totalMessages: number;
      avgPerDay: number;
      peakDay: string | null;
      framework: string;
      tokens: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        totalCost: number;
        hasByok: boolean;
      };
    }>(`/agents/${id}/analytics?range=${range}`),

  /** Get account-level analytics across all agents */
  getAccountAnalytics: () =>
    req<{
      totalAgents: number;
      activeAgents: number;
      totalMessages: number;
      statusBreakdown: Record<string, number>;
      frameworkBreakdown: Record<string, number>;
      agentMessageBreakdown: Array<{ id: string; name: string; framework: string; count: number }>;
      dailyVolume: Array<{ date: string; count: number }>;
      tokenSummary: { inputTokens: number; outputTokens: number; totalTokens: number; usdCost: number };
    }>('/analytics/overview'),

  /** Get agent activity feed (lifecycle events timeline) */
  getAgentActivity: (id: string) =>
    req<{
      events: Array<{
        id: string;
        type: 'started' | 'stopped' | 'restarted' | 'config_updated' | 'error' | 'message_burst' | 'version_deployed' | 'created';
        message: string;
        timestamp: string;
        meta?: Record<string, unknown>;
      }>;
    }>(`/agents/${id}/activity`),

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

  /** Get public platform stats (no auth required) */
  getPublicStats: () =>
    req<{ totalAgents: number; activeAgents: number; totalUsers: number; totalMessages: number }>('/admin/public-stats'),

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
        email: string;
        username: string;
        walletAddress: string | null;
        tier: string;
        isAdmin: boolean;
        agentCount: number;
        paymentCount: number;
        hatchCredits: number;
        createdAt: string;
      }>;
      pagination: { total: number; limit: number; offset: number; hasMore: boolean };
    }>(`/admin/users?limit=${take}&offset=${skip}`),

  /** Admin: ban a user (sets tier to 'banned') */
  adminBanUser: (userId: string) =>
    req<{ banned: boolean; userId: string }>(`/admin/users/${userId}/ban`, { method: 'POST' }),

  /** Admin: unban a user */
  adminUnbanUser: (userId: string) =>
    req<{ unbanned: boolean; userId: string }>(`/admin/users/${userId}/unban`, { method: 'POST' }),

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

  /** Admin: get system health */
  adminGetHealth: () =>
    req<{
      api: { status: string; uptime: number; memory: { used: number; total: number } };
      database: { status: string; connectionCount: number };
      redis: { status: string; usedMemory: string; connectedClients: number };
      docker: { status: string; containersRunning: number; containersTotal: number };
      services: Array<{ name: string; status: string; uptime: string; restarts: number }>;
      disk: { used: string; total: string; percent: number };
      backup: { lastBackup: string | null; lastSize: string | null };
    }>('/admin/health'),

  /** Admin: trigger backup now */
  adminRunBackup: () =>
    req<{ message: string }>('/admin/backup', { method: 'POST' }),

  /** Admin: list backup files */
  adminGetBackups: () =>
    req<{ backups: Array<{ filename: string; size: string; date: string }> }>('/admin/backups'),

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

  /** Get webhook URL and token for an agent */
  getWebhookUrl: (agentId: string) =>
    req<{ url: string; token: string }>(`/agents/${agentId}/webhook-url`),

  // ─── Config Snapshots ──────────────────────────────────────

  /** List config snapshots for an agent */
  getConfigSnapshots: (agentId: string) =>
    req<{ snapshots: Array<{ id: string; timestamp: number; preview: string }> }>(`/agents/${agentId}/config-snapshots`),

  /** Restore a config snapshot */
  restoreConfigSnapshot: (agentId: string, snapshotId: string) =>
    req<{ restored: boolean; snapshotId: string }>(`/agents/${agentId}/config-snapshots/${encodeURIComponent(snapshotId)}/restore`, {
      method: 'POST',
    }),

  // ─── Agent Environment Variables ──────────────────────────

  /** List env var keys for an agent (values are always masked) */
  getEnvVars: (agentId: string) =>
    req<{ envVars: Array<{ key: string; hasValue: boolean }> }>(`/agents/${agentId}/env-vars`),

  /** Upsert a single env var */
  setEnvVar: (agentId: string, key: string, value: string) =>
    req<{ key: string; hasValue: boolean }>(`/agents/${agentId}/env-vars/${encodeURIComponent(key)}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    }),

  /** Delete a single env var */
  deleteEnvVar: (agentId: string, key: string) =>
    req<{ deleted: boolean; key: string }>(`/agents/${agentId}/env-vars/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    }),

  // ─── Scheduled Tasks (Cron Jobs) ──────────────────────────
  /** List all scheduled tasks for an agent */
  getAgentSchedules: (agentId: string) =>
    req<unknown>(`/agents/${agentId}/schedules`),

  /** Create a new scheduled task */
  createAgentSchedule: (agentId: string, data: { name: string; schedule: string; prompt: string }) =>
    req<unknown>(`/agents/${agentId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Delete a scheduled task */
  deleteAgentSchedule: (agentId: string, jobId: string) =>
    req<{ deleted: boolean }>(`/agents/${agentId}/schedules/${jobId}`, {
      method: 'DELETE',
    }),

  /** Pause a scheduled task */
  pauseAgentSchedule: (agentId: string, jobId: string) =>
    req<unknown>(`/agents/${agentId}/schedules/${jobId}/pause`, {
      method: 'POST',
    }),

  /** Resume a paused scheduled task */
  resumeAgentSchedule: (agentId: string, jobId: string) =>
    req<unknown>(`/agents/${agentId}/schedules/${jobId}/resume`, {
      method: 'POST',
    }),

  /** Get execution logs for a scheduled task */
  getAgentScheduleLogs: (agentId: string, jobId: string) =>
    req<{ logs: Array<{ timestamp: string; success: boolean; response?: string; error?: string }> }>(`/agents/${agentId}/schedules/${jobId}/logs`),

  // ─── Knowledge Base ──────────────────────────────────────────

  /** List knowledge files for an agent */
  getAgentKnowledge: (agentId: string) =>
    req<{ files: Array<{ name: string; size: number; createdAt: string }>; totalFiles: number }>(`/agents/${agentId}/knowledge`),

  /** Upload a knowledge file (text content) */
  uploadAgentKnowledge: (agentId: string, data: { filename: string; content: string }) =>
    req<{ written: boolean; filename: string; size: number }>(`/agents/${agentId}/knowledge`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Read a knowledge file */
  readAgentKnowledge: (agentId: string, filename: string) =>
    req<{ filename: string; content: string }>(`/agents/${agentId}/knowledge/${encodeURIComponent(filename)}`),

  /** Delete a knowledge file */
  deleteAgentKnowledge: (agentId: string, filename: string) =>
    req<{ deleted: boolean; filename: string }>(`/agents/${agentId}/knowledge/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    }),

  // ─── Marketplace ──────────────────────────────────────────

  /** List marketplace templates */
  getMarketplaceTemplates: (params?: {
    search?: string;
    category?: string;
    framework?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.category) sp.set('category', params.category);
    if (params?.framework) sp.set('framework', params.framework);
    if (params?.sort) sp.set('sort', params.sort);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return req<{
      templates: Array<{
        id: string;
        name: string;
        description: string;
        framework: string;
        category: string;
        author: string;
        authorId: string;
        usageCount: number;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/marketplace/templates${qs ? `?${qs}` : ''}`);
  },

  /** Get a single marketplace template */
  getMarketplaceTemplate: (id: string) =>
    req<{
      id: string;
      name: string;
      description: string;
      framework: string;
      category: string;
      author: string;
      authorId: string;
      config: Record<string, unknown>;
      usageCount: number;
      createdAt: string;
    }>(`/marketplace/templates/${id}`),

  /** Publish an agent as a marketplace template */
  publishToMarketplace: (agentId: string, category?: string) =>
    req<{
      id: string;
      name: string;
      description: string;
      framework: string;
      category: string;
      author: string;
      usageCount: number;
      createdAt: string;
    }>('/marketplace/templates', {
      method: 'POST',
      body: JSON.stringify({ agentId, ...(category ? { category } : {}) }),
    }),

  /** Clone a marketplace template to create a new agent */
  cloneFromMarketplace: (templateId: string) =>
    req<{ agentId: string; name: string }>(`/marketplace/templates/${templateId}/clone`, {
      method: 'POST',
    }),

  /** Clone an existing agent (own or public) — creates a "(Copy)" with all config preserved */
  cloneAgent: (agentId: string) =>
    req<Agent>(`/agents/${agentId}/clone`, { method: 'POST' }),

  /** Export agent config as sanitized JSON (no secrets) */
  exportAgent: (agentId: string) =>
    req<{ exportVersion: number; exportedAt: string; name: string; description?: string; framework: string; template: string; config: Record<string, unknown> }>(`/agents/${agentId}/export`),

  /** Delete a marketplace template (owner only) */
  deleteMarketplaceTemplate: (id: string) =>
    req<{ deleted: boolean; id: string }>(`/marketplace/templates/${id}`, {
      method: 'DELETE',
    }),

  // ─── Skills Browser ─────────────────────────────────────────
  // ─── Teams (Collaboration) ──────────────────────────────────

  /** List user's teams */
  getMyTeams: () => req<Array<{ id: string; name: string; ownerId: string; myRole: string; agentCount: number; members: Array<{ id: string; role: string; user: { id: string; username: string } }>; createdAt: string }>>('/teams'),

  /** Get a single team with members */
  getTeam: (id: string) => req<{ id: string; name: string; ownerId: string; myRole: string; agentCount: number; members: Array<{ id: string; teamId: string; userId: string; role: string; user: { id: string; username: string; walletAddress: string | null; createdAt: string } }>; createdAt: string; updatedAt: string }>(`/teams/${id}`),

  /** Create a new team */
  createTeam: (name: string) =>
    req<{ id: string; name: string; ownerId: string; members: Array<{ id: string; role: string; user: { id: string; username: string } }>; createdAt: string }>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  /** Update team name */
  updateTeam: (id: string, name: string) =>
    req<{ id: string; name: string }>(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  /** Delete a team */
  deleteTeam: (id: string) =>
    req<{ deleted: boolean }>(`/teams/${id}`, { method: 'DELETE' }),

  /** Invite a member to a team */
  inviteTeamMember: (teamId: string, email: string, role: string) =>
    req<{ id: string; teamId: string; userId: string; role: string; user: { id: string; username: string } }>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  /** Update a team member's role */
  updateTeamMemberRole: (teamId: string, memberId: string, role: string) =>
    req<{ id: string; role: string; user: { id: string; username: string } }>(`/teams/${teamId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  /** Remove a team member */
  removeTeamMember: (teamId: string, memberId: string) =>
    req<{ removed: boolean }>(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' }),

  /** Share an agent with a team */
  shareAgentWithTeam: (teamId: string, agentId: string) =>
    req<{ shared: boolean; agentId: string; teamId: string }>(`/teams/${teamId}/agents/${agentId}`, { method: 'POST' }),

  /** Unshare an agent from a team */
  unshareAgentFromTeam: (teamId: string, agentId: string) =>
    req<{ unshared: boolean; agentId: string; teamId: string }>(`/teams/${teamId}/agents/${agentId}`, { method: 'DELETE' }),

  /** List team's shared agents */
  getTeamAgents: (teamId: string) =>
    req<Array<{ id: string; name: string; status: string; framework: string; ownerUsername: string; createdAt: string }>>(`/teams/${teamId}/agents`),

  /** List available skills for an agent (reads from container) */
  getAgentSkills: (agentId: string) =>
    req<{
      skills: Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        tags: string[];
        enabled: boolean;
      }>;
      message?: string;
    }>(`/agents/${agentId}/skills`),

  /** Enable or disable a skill on an agent */
  toggleAgentSkill: (agentId: string, skillId: string, enabled: boolean) =>
    req<{
      skillId: string;
      enabled: boolean;
      skills: string[];
      note: string;
    }>(`/agents/${agentId}/skills/${skillId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  /** Install a skill/plugin into the agent container */
  installAgentSkill: (agentId: string, packageName: string, source: 'npm' | 'clawhub' | 'url') =>
    req<{
      packageName: string;
      source: string;
      installed: boolean;
      restarted: boolean;
      output: string;
      note: string;
    }>(`/agents/${agentId}/skills/install`, {
      method: 'POST',
      body: JSON.stringify({ packageName, source }),
    }),

  /** Uninstall a skill/plugin from the agent container */
  uninstallAgentSkill: (agentId: string, packageName: string) =>
    req<{
      packageName: string;
      uninstalled: boolean;
      output: string;
      note: string;
    }>(`/agents/${agentId}/skills/uninstall`, {
      method: 'POST',
      body: JSON.stringify({ packageName }),
    }),

  // ─── Custom Domains ──────────────────────────────────────
  /** Add a custom domain to an agent */
  addCustomDomain: (agentId: string, domain: string) =>
    req<{
      id: string;
      agentId: string;
      domain: string;
      verified: boolean;
      sslStatus: string;
      cnameTarget: string;
      createdAt: string;
      updatedAt: string;
    }>('/domains', {
      method: 'POST',
      body: JSON.stringify({ agentId, domain }),
    }),

  /** List all custom domains for the current user */
  getMyDomains: () =>
    req<Array<{
      id: string;
      agentId: string;
      domain: string;
      verified: boolean;
      sslStatus: string;
      cnameTarget: string;
      createdAt: string;
      updatedAt: string;
    }>>('/domains'),

  /** Get a single domain's details */
  getDomain: (id: string) =>
    req<{
      id: string;
      agentId: string;
      domain: string;
      verified: boolean;
      sslStatus: string;
      cnameTarget: string;
      createdAt: string;
      updatedAt: string;
    }>(`/domains/${id}`),

  /** Delete a custom domain */
  deleteDomain: (id: string) =>
    req<{ deleted: boolean; id: string }>(`/domains/${id}`, { method: 'DELETE' }),

  /** Verify a custom domain's DNS CNAME */
  verifyDomain: (id: string) =>
    req<{
      verified: boolean;
      domain?: unknown;
      message?: string;
      expected?: string;
      found?: string[];
    }>(`/domains/${id}/verify`, { method: 'POST' }),

  // ─── Public Chat ──────────────────────────────────────────
  /** Get public agent info by slug (no auth) */
  getPublicAgent: (slug: string) =>
    req<{
      id: string;
      name: string;
      description: string | null;
      avatarUrl: string | null;
      framework: string;
      slug: string;
      status: string;
      isPublic: boolean;
      messageCount: number;
    }>(`/chat/${slug}`),

  /** Send a message to a public agent (no auth) */
  sendPublicMessage: (slug: string, message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    req<{ content: string }>(`/chat/${slug}/message`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  // ─── Workflows (Visual Builder) ────────────────────────────
  /** List all workflows for an agent */
  getAgentWorkflows: (agentId: string) =>
    req<Array<{
      id: string;
      agentId: string;
      name: string;
      enabled: boolean;
      nodes: unknown[];
      edges: unknown[];
      createdAt: string;
      updatedAt: string;
    }>>(`/agents/${agentId}/workflows`),

  /** Create a new workflow */
  createAgentWorkflow: (agentId: string, data: { name: string; nodes?: unknown[]; edges?: unknown[] }) =>
    req<{
      id: string;
      agentId: string;
      name: string;
      enabled: boolean;
      nodes: unknown[];
      edges: unknown[];
      createdAt: string;
      updatedAt: string;
    }>(`/agents/${agentId}/workflows`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get a single workflow */
  getAgentWorkflow: (agentId: string, workflowId: string) =>
    req<{
      id: string;
      agentId: string;
      name: string;
      enabled: boolean;
      nodes: unknown[];
      edges: unknown[];
      createdAt: string;
      updatedAt: string;
    }>(`/agents/${agentId}/workflows/${workflowId}`),

  /** Update a workflow */
  updateAgentWorkflow: (agentId: string, workflowId: string, data: {
    name?: string;
    nodes?: unknown[];
    edges?: unknown[];
    enabled?: boolean;
  }) =>
    req<{
      id: string;
      agentId: string;
      name: string;
      enabled: boolean;
      nodes: unknown[];
      edges: unknown[];
      createdAt: string;
      updatedAt: string;
    }>(`/agents/${agentId}/workflows/${workflowId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Delete a workflow */
  deleteAgentWorkflow: (agentId: string, workflowId: string) =>
    req<{ deleted: boolean; id: string }>(`/agents/${agentId}/workflows/${workflowId}`, {
      method: 'DELETE',
    }),

  /** Toggle workflow enabled/disabled */
  toggleAgentWorkflow: (agentId: string, workflowId: string) =>
    req<{ id: string; enabled: boolean }>(`/agents/${agentId}/workflows/${workflowId}/toggle`, {
      method: 'POST',
    }),

  // ─── Agent Versioning ──────────────────────────────────────

  /** List versions for an agent (paginated) */
  getAgentVersions: (agentId: string, limit = 20, offset = 0) =>
    req<{
      versions: Array<{
        id: string;
        agentId: string;
        version: number;
        configSnapshot: string;
        commitMessage: string | null;
        createdBy: string | null;
        createdAt: string;
      }>;
      total: number;
      limit: number;
      offset: number;
    }>(`/agents/${agentId}/versions?limit=${limit}&offset=${offset}`),

  /** Get a specific version */
  getAgentVersion: (agentId: string, version: number) =>
    req<{
      id: string;
      agentId: string;
      version: number;
      configSnapshot: string;
      commitMessage: string | null;
      createdBy: string | null;
      createdAt: string;
    }>(`/agents/${agentId}/versions/${version}`),

  /** Restore agent to a specific version */
  restoreAgentVersion: (agentId: string, version: number) =>
    req<{
      id: string;
      agentId: string;
      version: number;
      configSnapshot: string;
      commitMessage: string | null;
      createdBy: string | null;
      createdAt: string;
    }>(`/agents/${agentId}/versions/${version}/restore`, {
      method: 'POST',
    }),

  /** Get two versions for diffing */
  diffAgentVersions: (agentId: string, v1: number, v2: number) =>
    req<{
      v1: {
        id: string;
        version: number;
        configSnapshot: string;
        commitMessage: string | null;
        createdAt: string;
      };
      v2: {
        id: string;
        version: number;
        configSnapshot: string;
        commitMessage: string | null;
        createdAt: string;
      };
    }>(`/agents/${agentId}/versions/diff?v1=${v1}&v2=${v2}`),

  // ─── Credits ──────────────────────────────────────────────────

  /** Get credit balance */
  getCreditBalance: () =>
    req<{ balance: number; currency: string }>('/credits/balance'),

  /** Get credit transaction history */
  getCreditHistory: (limit = 20) =>
    req<{
      transactions: Array<{
        id: string;
        amount: number;
        balance: number;
        type: string;
        description: string | null;
        createdAt: string;
      }>;
    }>(`/credits/history?limit=${limit}`),

  /** Subscribe to a tier using credits */
  subscribeWithCredits: (tier: string) =>
    req<{ tier: string; expiresAt: string; paidWith: string; amountDeducted: number; remainingBalance: number }>('/features/subscribe-with-credits', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    }),

  /** Purchase an addon using credits */
  purchaseAddonWithCredits: (addonKey: string, agentId?: string) =>
    req<{ addonKey: string; paidWith: string; amountDeducted: number; remainingBalance: number }>('/features/addon-with-credits', {
      method: 'POST',
      body: JSON.stringify({ addonKey, ...(agentId ? { agentId } : {}) }),
    }),

  /** Submit thumbs up/down feedback for a message */
  submitFeedback: (agentId: string, messageId: string, rating: 'up' | 'down') =>
    req<{ success: true }>(`/agents/${agentId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ messageId, rating }),
    }),

  /** Get feedback summary for an agent (owner only) */
  getAgentFeedbackSummary: (agentId: string) =>
    req<{ upCount: number; downCount: number; total: number; score: number | null }>(`/agents/${agentId}/feedback/summary`),
};
