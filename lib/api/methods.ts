// ============================================================
// API Methods — all backend API calls
// ============================================================

import { API_URL } from "@/lib/config";
import { getToken, req } from "./core";
import type {
  Agent,
  AgentCommCallBody,
  AgentCommCallResponse,
  AgentCommDiscoverResponse,
  AgentGithubConnectStartResponse,
  AgentGithubReposResponse,
  AgentGithubTestResponse,
  AgentCommLogsResponse,
  AgentCommPermissionsResponse,
  AgentPassport,
  AgentPassportNetworkId,
  AgentWalletPrivateKeyResponse,
  AgentWalletsResponse,
  Payment,
  AgentFeature,
  ChatMessage,
  ChatSessionSummary,
  Ticket,
  TicketMessage,
  TicketCategory,
  TicketPriority,
  AdminPayment,
  FunnelResponse,
  ChurnRadarResponse,
  ReferralLeaderboardResponse,
  SignupHeatmapResponse,
  ErrorRateResponse,
  WsCountResponse,
  LlmStatsResponse,
  AdminConduitOverviewResponse,
  AdminEgressEventsResponse,
  AgentEgressEventsResponse,
  AdminIdleOverviewResponse,
  GetAgentMailboxResponse,
  GetAgentMailMessagesResponse,
  SendAgentMailBody,
  SendAgentMailResponse,
  UpdateAgentMailSettingsBody,
  UpdateAgentMailSettingsResponse,
  AgentMailDirection,
  KausalayerCallBody,
  KausalayerCallResponse,
  KausalayerConfigBody,
  KausalayerConfigStatus,
  KausalayerHealthResponse,
  KausalayerResourcesResponse,
  KausalayerToolsResponse,
  XonaCallBody,
  XonaCallResponse,
  XonaConfigStatus,
  XonaDiscoverResponse,
  ConduitConfigBody,
  ConduitConfigStatus,
  ConduitManifestResponse,
  ConduitProviderActionResponse,
  ConduitProviderPatchBody,
  ConduitProvidersResponse,
  ConduitProtocolInfoResponse,
  ConduitRegisterProviderBody,
  ConduitRegisterProviderResponse,
} from "./types";
import type { TierConfig, AdminOverviewExtras } from "@hatcher/shared";

const API_BASE = API_URL;

/**
 * Return shape for the managed-mode live-config PATCH endpoints
 * (/hermes-config, /openclaw-config).
 *
 * The backend applies patches sequentially and returns:
 *   - 200 with `{applied, validation}` if every patch landed
 *   - 422 with `{success:false, error, code, applied, failedAt, remaining}`
 *     if any patch failed mid-batch. The failure branch still carries
 *     `applied` so the UI can show which fields were persisted and which
 *     one (`failedAt`) needs attention.
 *
 * `req<T>` in core.ts passes the whole JSON body through unchanged, so
 * the extra fields are present at runtime but hidden from the generic
 * type. This type explicitly surfaces them so callers can narrow on
 * `!success` and still read `applied` + `failedAt` + `remaining`.
 */
export type ConfigPatchResult =
  | {
      success: true;
      data: {
        applied: string[];
        validation: { valid: boolean; error?: string };
      };
    }
  | {
      success: false;
      error: string;
      code?: string;
      applied?: string[];
      failedAt?: string;
      remaining?: string[];
    };

export type AuthProfileData = {
  id: string;
  email: string;
  username: string;
  walletAddress: string | null;
  apiKey: string | null;
  hatchCredits: number;
  aiCreditsBalance: number;
  isAdmin: boolean;
  tier: string;
  avatarUrl: string | null;
  agentCount: number;
  activeAgentCount?: number;
  activeAgents?: number;
  featureCount: number;
  createdAt: string;
};

export type ChatAttachmentPayload = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
};

export type KnowledgeUploadPayload =
  | string
  | {
      content?: string;
      dataBase64?: string;
      mimeType?: string;
      sizeBytes?: number;
    };

export const api = {
  /** Register a new account */
  register: (
    email: string,
    username: string,
    password: string,
    referralCode?: string,
  ) =>
    req<{
      token: string;
      expiresIn: string;
      user: { id: string; email: string; username: string };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        username,
        password,
        ...(referralCode ? { referralCode } : {}),
      }),
    }),

  /** Live check if email / username are already taken. Either param is optional. */
  checkAvailability: (params: { email?: string; username?: string }) => {
    const qs = new URLSearchParams();
    if (params.email) qs.set("email", params.email);
    if (params.username) qs.set("username", params.username);
    return req<{
      email: { taken: boolean; valid: boolean } | null;
      username: { taken: boolean; valid: boolean } | null;
    }>(`/auth/check-availability?${qs.toString()}`);
  },

  /** Login with email + password */
  login: (email: string, password: string) =>
    req<{
      token: string;
      expiresIn: string;
      user: {
        id: string;
        email: string;
        username: string;
        walletAddress: string | null;
        isAdmin: boolean;
        tier?: string;
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /** Verify email with token — returns fresh accessToken with emailVerified=true */
  verifyEmail: (token: string) =>
    req<{ verified: boolean; accessToken?: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  /** Request password reset email */
  forgotPassword: (email: string) =>
    req<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  /** Reset password with token */
  resetPassword: (token: string, password: string) =>
    req<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  /** Get current user profile.
   *
   *  Backend response (apps/api/src/routes/auth.ts:494-520) includes
   *  avatarUrl + agentCount + activeAgents + featureCount on top of
   *  the base user fields. The local types here have to mirror that
   *  shape so the settings page can read them without `as any`.
   */
  getProfile: () => req<AuthProfileData>("/auth/me"),

  /** Browser-safe session bootstrap; anonymous users return success with authenticated=false. */
  getSession: () =>
    req<{ authenticated: boolean; user: AuthProfileData | null }>(
      "/auth/session",
    ),

  /** Update profile (username, email, password, or avatarUrl) */
  updateProfile: (data: {
    username?: string;
    email?: string;
    avatarUrl?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    req<{
      id: string;
      email: string;
      username: string;
      avatarUrl: string | null;
      tier: string;
      isAdmin: boolean;
    }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** Delete current user account (requires password confirmation) */
  deleteAccount: (password: string) =>
    req<{ deleted: boolean }>("/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),

  /** Unlink the Solana wallet currently attached to the account. */
  disconnectWallet: () =>
    req<{ walletAddress: null }>("/auth/wallet", { method: "DELETE" }),

  /** GDPR data export — downloads all user data as JSON */
  exportData: async (): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/auth/export-data`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },

  /** Logout — clear httpOnly cookie server-side */
  logout: () => req<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),

  /** List all named API keys */
  listApiKeys: () =>
    req<
      Array<{
        id: string;
        label: string;
        prefix: string;
        lastUsedAt: string | null;
        revokedAt: string | null;
        createdAt: string;
        requestsToday: number;
        requestsThisWeek: number;
      }>
    >("/auth/api-keys"),

  /** Create a new named API key (full key returned once) */
  createApiKey: (label: string) =>
    req<{
      id: string;
      label: string;
      key: string;
      prefix: string;
      createdAt: string;
    }>("/auth/api-keys", { method: "POST", body: JSON.stringify({ label }) }),

  /** Revoke a named API key */
  revokeApiKey: (id: string) =>
    req<{ revoked: boolean }>(`/auth/api-keys/${id}`, { method: "DELETE" }),

  /** Rename a named API key */
  renameApiKey: (id: string, label: string) =>
    req<{ id: string; label: string }>(`/auth/api-keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ label }),
    }),

  /** Get persistent in-app notifications */
  getNotifications: () =>
    req<{
      notifications: Array<{
        id: string;
        type: string;
        title: string;
        body: string;
        read: boolean;
        createdAt: string;
      }>;
      total: number;
      limit: number;
      offset: number;
    }>("/notifications?limit=20&offset=0"),

  /** Mark all notifications as read (persists server-side) */
  markNotificationsRead: () =>
    req<{ marked: number }>("/notifications/read-all", { method: "POST" }),

  /** Get referral code + share link */
  getReferralCode: () =>
    req<{ referralCode: string; shareLink: string; username: string }>(
      "/referrals/my-code",
    ),

  /** Get referral stats */
  getReferralStats: () =>
    req<{
      totalReferred: number;
      totalEarned: number;
      rewardPerReferral: number;
      referrals: Array<{
        username: string;
        date: string;
        rewardClaimed: boolean;
      }>;
    }>("/referrals/stats"),

  /** Claim pending referral rewards */
  claimReferralRewards: () =>
    req<{ claimed: number; totalCredited: number; message: string }>(
      "/referrals/claim",
      { method: "POST" },
    ),

  /** Validate a referral code (public) */
  validateReferralCode: (code: string) =>
    req<{ valid: boolean; referrerUsername?: string }>(
      `/referrals/validate/${code}`,
    ),

  /** Public platform stats (used by landing social-proof card) */
  getPlatformStats: () =>
    req<{
      totalAgents: number;
      activeAgents: number;
      totalUsers: number;
      totalMessages: number;
      frameworks: Record<string, number>;
    }>("/stats"),

  /** List the current user's agents */
  getMyAgents: () => req<Agent[]>("/agents"),

  /** Get a single agent */
  getAgent: (id: string) => req<Agent>(`/agents/${id}`),

  /** Get the agent's public/owner-safe on-chain passport. */
  getAgentPassport: (id: string) =>
    req<AgentPassport>(`/agents/${id}/passport`),

  /** Get owner-visible wallet addresses and best-effort balances for every managed chain. */
  getAgentWallets: (id: string) =>
    req<AgentWalletsResponse>(`/agents/${id}/wallets`),

  /** Export an owner-only managed wallet private key after account password confirmation. */
  exportAgentWalletPrivateKey: (
    id: string,
    network: AgentPassportNetworkId,
    password: string,
  ) =>
    req<AgentWalletPrivateKeyResponse>(
      `/agents/${id}/wallets/${network}/private-key`,
      {
        method: "POST",
        body: JSON.stringify({ password }),
      },
    ),

  /** Get the agent's platform-owned mailbox, runtime hints, and mail settings. */
  getAgentMailbox: (id: string) =>
    req<GetAgentMailboxResponse>(`/agents/${id}/mailbox`),

  /** Get recent agent mail messages. Direction omitted returns inbound + outbound. */
  getAgentMailMessages: (
    id: string,
    params: { limit?: number; direction?: AgentMailDirection } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.direction) qs.set("direction", params.direction);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return req<GetAgentMailMessagesResponse>(
      `/agents/${id}/mail/messages${suffix}`,
    );
  },

  /** Send a manual outbound email from the agent mailbox. */
  sendAgentMail: (id: string, body: SendAgentMailBody) =>
    req<SendAgentMailResponse>(`/agents/${id}/mail/send`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Update agent mail behavior. Does not restart the runtime by itself. */
  updateAgentMailSettings: (id: string, body: UpdateAgentMailSettingsBody) =>
    req<UpdateAgentMailSettingsResponse>(`/agents/${id}/mail/settings`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  /** Provision missing multichain account rows for existing agents. */
  provisionAgentChainAccounts: (id: string) =>
    req<{
      provisioned: boolean;
      provisionedCount: number;
      needsRestart: boolean;
    }>(`/agents/${id}/chain-accounts/provision`, { method: "POST" }),

  /** Get the agent's SKALE wallet info — address + native gas + USDC balance.
   *  Owner/team only. Returns Phase 2 ERC-8004 fields (null until registered). */
  getAgentSkaleWallet: (id: string) =>
    req<{
      address: string;
      chainId: number;
      rpcUrl: string;
      ethWei: string;
      ethFormatted: string;
      usdcRaw: string;
      usdcFormatted: string;
      usdcContract: string;
      erc8004AgentId: string | null;
      erc8004RegisteredAt: string | null;
      erc8004IdentityContract: string;
      hubAddress: string | null;
    }>(`/agents/${id}/skale-wallet`),

  /** Manually retry the ERC-8004 on-chain registration (Phase 2).
   *  Used by the Wallet tab when the background fire-and-forget at
   *  agent-create time failed (RPC down, master wallet unfunded). */
  registerAgentSkale: (id: string) =>
    req<{
      agentId: string;
      metadataUri: string;
      txHash: string;
      registeredAt: string;
    }>(`/agents/${id}/skale-register`, { method: "POST" }),

  /** Manually retry Base ERC-8004 registration. */
  registerAgentBase: (id: string) =>
    req<{
      agentId: string;
      metadataUri: string;
      txHash: string;
      registeredAt: string;
      identityContract: string;
      hubAddress: string | null;
    }>(`/agents/${id}/base-register`, { method: "POST" }),

  /** Manually retry Solana identity memo anchoring. */
  registerAgentSolana: (id: string) =>
    req<{
      agentId: string;
      metadataUri: string;
      txHash: string;
      registeredAt: string;
      registryProgram: string;
    }>(`/agents/${id}/solana-register`, { method: "POST" }),

  /** KausaLayer privacy-wallet tools proxied through Hatcher. */
  getAgentKausalayerConfig: (id: string) =>
    req<KausalayerConfigStatus>(`/agents/${id}/kausalayer/config`),

  updateAgentKausalayerConfig: (id: string, body: KausalayerConfigBody) =>
    req<KausalayerConfigStatus>(`/agents/${id}/kausalayer/config`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  clearAgentKausalayerConfig: (id: string) =>
    req<KausalayerConfigStatus>(`/agents/${id}/kausalayer/config`, {
      method: "DELETE",
    }),

  getAgentKausalayerHealth: (id: string) =>
    req<KausalayerHealthResponse>(`/agents/${id}/kausalayer/health`),

  getAgentKausalayerResources: (id: string) =>
    req<KausalayerResourcesResponse>(`/agents/${id}/kausalayer/resources`),

  getAgentKausalayerTools: (id: string) =>
    req<KausalayerToolsResponse>(`/agents/${id}/kausalayer/tools`),

  callAgentKausalayerTool: (id: string, body: KausalayerCallBody) =>
    req<KausalayerCallResponse>(`/agents/${id}/kausalayer/call`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Xona xPay partner resources proxied through Hatcher. */
  getAgentXonaConfig: (id: string) =>
    req<XonaConfigStatus>(`/agents/${id}/xona/config`),

  discoverAgentXonaResources: (id: string, query = "xona agent resources", limit = 8) => {
    const params = new URLSearchParams({ query, limit: String(limit) });
    return req<XonaDiscoverResponse>(`/agents/${id}/xona/discover?${params.toString()}`);
  },

  callAgentXonaTool: (id: string, body: XonaCallBody) =>
    req<XonaCallResponse>(`/agents/${id}/xona/call`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Conduit Protocol provider settlement controls. */
  getAgentConduitConfig: (id: string) =>
    req<ConduitConfigStatus>(`/agents/${id}/conduit/config`),

  updateAgentConduitConfig: (id: string, body: ConduitConfigBody) =>
    req<ConduitConfigStatus>(`/agents/${id}/conduit/config`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getAgentConduitProtocolInfo: (id: string) =>
    req<ConduitProtocolInfoResponse>(`/agents/${id}/conduit/protocol-info`),

  getAgentConduitManifest: (id: string) =>
    req<ConduitManifestResponse>(`/agents/${id}/conduit/manifest`),

  registerAgentConduitProvider: (
    id: string,
    body: ConduitRegisterProviderBody = {},
  ) =>
    req<ConduitRegisterProviderResponse>(
      `/agents/${id}/conduit/register-provider`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),

  getAgentConduitProviders: (id: string) =>
    req<ConduitProvidersResponse>(`/agents/${id}/conduit/providers`),

  patchAgentConduitProvider: (
    id: string,
    providerId: string,
    body: ConduitProviderPatchBody,
  ) =>
    req<ConduitProviderActionResponse>(
      `/agents/${id}/conduit/providers/${encodeURIComponent(providerId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    ),

  syncAgentConduitProviderSecret: (id: string, providerId: string) =>
    req<ConduitProviderActionResponse>(
      `/agents/${id}/conduit/providers/${encodeURIComponent(providerId)}/sync-secret`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ),

  rotateAgentConduitProviderSecret: (id: string, providerId: string) =>
    req<ConduitProviderActionResponse>(
      `/agents/${id}/conduit/providers/${encodeURIComponent(providerId)}/rotate-secret`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ),

  refreshAgentConduitProviderEndpoint: (id: string, providerId: string) =>
    req<ConduitProviderActionResponse>(
      `/agents/${id}/conduit/providers/${encodeURIComponent(providerId)}/refresh-endpoint`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ),

  archiveAgentConduitProvider: (id: string, providerId: string) =>
    req<ConduitProviderActionResponse>(
      `/agents/${id}/conduit/providers/${encodeURIComponent(providerId)}`,
      {
        method: "DELETE",
      },
    ),

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

  /** Recent CONNECT egress decisions visible to the agent owner/team */
  getAgentEgressEvents: (id: string, limit = 50) =>
    req<AgentEgressEventsResponse>(
      `/agents/${id}/egress-events?limit=${encodeURIComponent(String(limit))}`,
    ),

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

  /** Get public chat availability for a public agent (no auth required) */
  getAgentPublicChat: (id: string) =>
    req<{
      enabled: boolean;
      dailyAiCreditCap: number | null;
      dailyAiCreditsSpent: number | null;
      dailyAiCreditsRemaining: number | null;
      piqueSignalDailyLimit?: number;
      piqueSignalSignalsUsed?: number;
      piqueSignalSignalsRemaining?: number;
      piqueSignalResetAt?: string;
      piqueSignalCtaUrl?: string;
      agent: {
        id: string;
        name: string;
        description: string | null;
        avatarUrl: string | null;
        framework: string;
        status: string;
      } | null;
    }>(`/agents/${id}/public-chat`),

  /** Create a browser-scoped public chat session for a public agent */
  createAgentPublicChatSession: (id: string, username: string) =>
    req<{
      sessionId: string;
      username: string;
      agent: {
        id: string;
        name: string;
        description: string | null;
        avatarUrl: string | null;
        framework: string;
        status: string;
      };
    }>(`/agents/${id}/public-chat/session`, {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  /** Send a message to a public agent chat session */
  sendAgentPublicChatMessage: (
    id: string,
    data: {
      sessionId: string;
      username: string;
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    },
  ) =>
    req<{
      content: string;
      model: string;
      starting?: boolean;
      dailyAiCreditCap: number | null;
      dailyAiCreditsSpent: number | null;
      dailyAiCreditsRemaining: number | null;
      piqueSignalDailyLimit?: number;
      piqueSignalSignalsUsed?: number;
      piqueSignalSignalsRemaining?: number;
      piqueSignalResetAt?: string;
      piqueSignalCtaUrl?: string;
    }>(`/agents/${id}/public-chat`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Create a new agent */
  createAgent: (data: {
    name: string;
    description?: string;
    framework: "openclaw" | "hermes";
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
      localFirst?: boolean;
      [key: string]: unknown;
    };
  }) =>
    req<Agent>("/agents", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Update an agent */
  updateAgent: (
    id: string,
    data: {
      name?: string;
      description?: string;
      commitMessage?: string;
      isPublic?: boolean;
      config?: {
        personality?: string;
        systemPrompt?: string;
        [key: string]: unknown;
      };
    },
  ) =>
    req<Agent>(`/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** Clone an agent to a different framework (lite port). */
  portAgent: (id: string, targetFramework: "openclaw" | "hermes") =>
    req<Agent & { portedFrom?: { id: string; framework: string } }>(
      `/agents/${id}/port`,
      {
        method: "POST",
        body: JSON.stringify({ targetFramework }),
      },
    ),

  /** Delete an agent */
  deleteAgent: (id: string) =>
    req<{ deleted: boolean }>(`/agents/${id}`, { method: "DELETE" }),

  /** Start an agent container */
  startAgent: (id: string) =>
    req<{ status: string; containerId?: string }>(`/agents/${id}/start`, {
      method: "POST",
    }),

  /** Stop an agent container */
  stopAgent: (id: string) =>
    req<{ status: string }>(`/agents/${id}/stop`, { method: "POST" }),

  /** Restart an agent container (server-side stop + start) */
  restartAgent: (id: string) =>
    req<{ status: string; containerId?: string }>(`/agents/${id}/restart`, {
      method: "POST",
    }),

  /** Test chat — real LLM call to preview agent personality before deploying */
  testChat: (
    message: string,
    systemPrompt: string,
    model?: string,
    provider?: string,
  ) =>
    req<{ text: string }>("/agents/test-chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        systemPrompt,
        ...(model ? { model } : {}),
        ...(provider ? { provider } : {}),
      }),
    }),

  /** Get payment history for the current user */
  getPayments: (skip = 0, take = 50) =>
    req<{ payments: Payment[]; total: number; skip: number; take: number }>(
      `/payments?skip=${skip}&take=${take}`,
    ),

  /** Get active features for an agent */
  getAgentFeatures: (agentId: string) =>
    req<AgentFeature[]>(`/agents/${agentId}/features`),

  /** Get active account-level features for the current user */
  getAccountFeatures: () =>
    req<{
      tier: string;
      tierConfig: TierConfig;
      addons: Array<{ key: string; name: string; expiresAt: string | null }>;
      agentLimit: number;
      agentCount: number;
      subscriptionExpiresAt?: string | null;
      /** Legacy account-wide chat-message daily cap. Hosted AI usage is
       *  metered by AI Credits instead of message add-ons. */
      chatLimit: number;
      /** Legacy account-wide web-search daily cap. Hosted web search is
       *  metered by AI Credits instead of search add-ons. */
      searchLimit: number;
      // Legacy compat fields
      activeFeatures?: Array<{
        featureKey: string;
        type: string;
        expiresAt: string | null;
      }>;
      hatchCredits?: number;
      aiCredits?: { balance: number; monthlyGrant: number; tier: string };
    }>("/features/account"),

  /** Public tier catalog + Founding Member availability. Used by both
   *  the billing page (to render a "X of 10 spots" badge next to the
   *  tier) and the landing page banner. */
  getTiersCatalog: () =>
    req<{
      tiers: Record<string, TierConfig>;
      tierOrder: string[];
      addons: Array<{
        key: string;
        name: string;
        usdPrice: number;
        description?: string;
      }>;
      founding: { maxSlots: number; taken: number; remaining: number };
    }>("/features"),

  /** Subscribe to a tier. Upgrades may grant prorated AI Credits for the
   *  unused portion of the current billing period.
   *  `billingPeriod='annual'` → 12 months at 15% off (server enforces). */
  subscribe: (
    tier: string,
    txSignature: string,
    paymentToken: "sol" | "hatch" | "usdc" | "kausa" = "sol",
    billingPeriod: "monthly" | "annual" = "monthly",
  ) =>
    req<{
      tier: string;
      expiresAt: string | null;
      paymentId: string;
      proratedAiCredits: number;
      monthlyAiCreditsGranted?: number;
    }>("/features/subscribe", {
      method: "POST",
      body: JSON.stringify({ tier, txSignature, paymentToken, billingPeriod }),
    }),

  /** Purchase an add-on (optionally per-agent). Subscription-type addons
   *  honor `billingPeriod='annual'` (15% off, 12 months); one-time addons
   *  always charge the flat price regardless. */
  purchaseAddon: (
    addonKey: string,
    txSignature: string,
    agentId?: string,
    paymentToken: "sol" | "hatch" | "usdc" | "kausa" = "sol",
    billingPeriod: "monthly" | "annual" = "monthly",
  ) =>
    req<{ addonKey: string }>("/features/addon", {
      method: "POST",
      body: JSON.stringify({
        addonKey,
        txSignature,
        paymentToken,
        billingPeriod,
        ...(agentId ? { agentId } : {}),
      }),
    }),

  /** Audit-log a crypto payment button click before the wallet popup opens.
   *  This is intentionally fire-and-forget in the UI; payment must continue
   *  even if observability logging fails. */
  logCryptoPaymentIntent: (payload: {
    rail: "sol" | "hatch" | "usdc" | "kausa";
    flow: "tier" | "addon";
    targetKey: string;
    billingPeriod?: "monthly" | "annual" | "lifetime";
    amountUsd?: number;
    agentId?: string;
    source?: string;
    stage?: "clicked" | "wallet_confirmed";
    txSignature?: string;
  }) =>
    req<{ logged: true }>("/payments/intent-log", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /** Start a Stripe checkout session for a tier (Card payment).
   *  Returns the hosted-checkout URL to redirect to. All tiers are
   *  billed as one-time charges; the server expands expiry by
   *  30 days (monthly) or 365 days (annual) when the webhook fires.
   *  Lifetime tiers (founding_member) ignore billingPeriod. */
  stripeCheckoutTier: (
    tier: string,
    billingPeriod: "monthly" | "annual",
    returnUrl: string,
  ) =>
    req<{ sessionId: string; url: string }>("/stripe/checkout/subscription", {
      method: "POST",
      body: JSON.stringify({ tier, returnUrl, billingPeriod }),
    }),

  /** Start a Stripe checkout session for an add-on. One-time addons
   *  (File Manager) ignore billingPeriod. */
  stripeCheckoutAddon: (
    addonKey: string,
    agentId: string | undefined,
    billingPeriod: "monthly" | "annual",
    returnUrl: string,
  ) =>
    req<{ sessionId: string; url: string }>("/stripe/checkout/addon", {
      method: "POST",
      body: JSON.stringify({
        addonKey,
        returnUrl,
        billingPeriod,
        ...(agentId ? { agentId } : {}),
      }),
    }),

  /** Start a CryptoNow hosted checkout for SOL/USDC on Solana. */
  cryptnowCheckout: (payload: {
    kind: 'tier' | 'addon';
    key: string;
    billingPeriod?: 'monthly' | 'annual';
    agentId?: string;
    coin?: 'SOL' | 'USDC' | 'ALL';
    returnUrl?: string;
  }) =>
    req<{
      paymentId: string | number;
      sessionKey: string;
      url: string;
      amountUsd: number;
      merchantReceivesUsd?: number | null;
      feeUsd?: number | null;
      coin: 'SOL' | 'USDC' | 'ALL';
      orderId: string;
    }>('/payments/cryptnow/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Open Stripe customer portal for billing management */
  stripePortal: (returnUrl: string) =>
    req<{ url: string }>("/stripe/portal", {
      method: "POST",
      body: JSON.stringify({ returnUrl }),
    }),

  /** Get agent memory (MEMORY.md + daily logs) */
  getAgentMemory: (id: string) =>
    req<{
      memoryMd: string;
      dailyLogs: Array<{ date: string; content: string }>;
      status?: string;
      message?: string;
    }>(`/agents/${id}/memory`),

  /**
   * Hermes config — returns parsed `config.yaml` from whichever source
   * is currently authoritative, with secrets redacted (`***`). Only
   * available for managed-mode Hermes agents; legacy agents regenerate
   * config from DB on every start and don't expose it live.
   *
   *   source: 'live'     — container running, freshly read
   *   source: 'snapshot' — container stopped, DB snapshot from last run
   *   source: 'none'     — never ran under managed mode, nothing cached
   */
  getHermesConfig: (id: string) =>
    req<{
      source: "live" | "snapshot" | "none";
      config: Record<string, unknown> | null;
      snapshotAt?: string;
      liveReadError?: string;
    }>(`/agents/${id}/hermes-config`),

  /**
   * Apply one or more live-config patches to a managed hermes agent.
   * Each patch is `{path, value}` where `path` is dot-separated into
   * the config.yaml tree and `value` is the new value. Server enforces
   * a strict allowlist (see isHermesPatchAllowed in hermes-config-snapshot.ts).
   *
   * On partial failure the server returns 422 with `applied` + `failedAt` +
   * `remaining` so the UI can highlight the offending field without
   * losing context on what already succeeded.
   */
  patchHermesConfig: (
    id: string,
    patches: Array<{ path: string; value: unknown }>,
  ) =>
    req<{
      applied: string[];
      validation: { valid: boolean; error?: string };
    }>(`/agents/${id}/hermes-config`, {
      method: "PATCH",
      body: JSON.stringify({ patches }),
    }) as Promise<ConfigPatchResult>,

  /**
   * Known-good `model.default` values the UI dropdown should offer.
   * Gated on auth + framework but independent of container state, so
   * the UI can load it regardless of whether the agent is running.
   */
  getHermesAllowedModels: (id: string) =>
    req<{ models: string[] }>(`/agents/${id}/hermes-config/allowed-models`),

  /**
   * Recent WARN/ERROR/FATAL lines from the most recent OpenClaw
   * structured log file, parsed and normalized for the dashboard
   * errors card. Managed-mode only.
   */
  getOpenClawErrors: (id: string) =>
    req<{
      entries: Array<{
        ts: string;
        level: "WARN" | "ERROR" | "FATAL" | "UNKNOWN";
        message: string;
        source: string | null;
      }>;
      totalScanned: number;
      sourceFile: string | null;
    }>(`/agents/${id}/openclaw/errors`),

  /**
   * Recent WARN/ERROR/FATAL lines from the Hermes errors.log file,
   * parsed and normalized for the dashboard errors card. Managed-mode only.
   */
  getHermesErrors: (id: string) =>
    req<{
      entries: Array<{
        ts: string;
        level: "WARN" | "ERROR" | "FATAL" | "UNKNOWN";
        message: string;
        source: string | null;
      }>;
      totalScanned: number;
      sourceFile: string | null;
    }>(`/agents/${id}/hermes/errors`),

  /**
   * Hermes native cron jobs — reads `/home/hermes/.hermes/cron/jobs.json`
   * inside the running container and returns a parsed + sorted summary.
   *
   * Separate from Hatcher's own workflow scheduler: this is the native
   * cron system that runs inside the agent's gateway process.
   */
  getHermesCron: (id: string) =>
    req<{
      jobs: Array<{
        id: string;
        name: string | null;
        schedule_display: string | null;
        state: string | null;
        enabled: boolean;
        next_run_at: number | null;
        last_run_at: number | null;
        last_status: string | null;
        prompt: string | null;
        skills: string[];
        created_at: number | null;
      }>;
      total: number;
      enabled: number;
      schedulerActive: boolean;
    }>(`/agents/${id}/hermes-cron`),

  /**
   * Create a Hermes cron job. Proxies to the container's /api/jobs.
   */
  createHermesCron: (
    id: string,
    body: {
      name: string;
      schedule: string;
      prompt?: string;
      deliver?: string;
      skills?: string[];
      repeat?: number;
    },
  ) =>
    req<{ job: Record<string, unknown> | null }>(`/agents/${id}/hermes-cron`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Delete a Hermes cron job by id. */
  deleteHermesCron: (id: string, jobId: string) =>
    req<{ deleted: true }>(
      `/agents/${id}/hermes-cron/${encodeURIComponent(jobId)}`,
      { method: "DELETE" },
    ),

  /** Pause a Hermes cron job. */
  pauseHermesCron: (id: string, jobId: string) =>
    req<{ job: Record<string, unknown> | null }>(
      `/agents/${id}/hermes-cron/${encodeURIComponent(jobId)}/pause`,
      { method: "POST" },
    ),

  /** Resume a paused Hermes cron job. */
  resumeHermesCron: (id: string, jobId: string) =>
    req<{ job: Record<string, unknown> | null }>(
      `/agents/${id}/hermes-cron/${encodeURIComponent(jobId)}/resume`,
      { method: "POST" },
    ),

  /** Trigger a Hermes cron job to run immediately. */
  runHermesCron: (id: string, jobId: string) =>
    req<{ job: Record<string, unknown> | null }>(
      `/agents/${id}/hermes-cron/${encodeURIComponent(jobId)}/run`,
      { method: "POST" },
    ),

  /**
   * Hermes bundled skills catalog — walks the `skills/` directory in
   * the container and returns categories + individual skill metadata
   * parsed from SKILL.md frontmatter. Managed-mode only.
   */
  getHermesSkills: (id: string) =>
    req<{
      categories: Array<{
        id: string;
        description: string;
        skillCount: number;
      }>;
      skills: Array<{
        id: string;
        category: string;
        path: string;
        skillMdPath: string;
        metadata: {
          name?: string;
          description?: string;
          version?: string;
          author?: string;
          platforms?: string[];
          tags?: string[];
        };
      }>;
      totalSkills: number;
      totalCategories: number;
    }>(`/agents/${id}/hermes-skills`),

  /**
   * Hermes usage stats dashboard card.
   *
   * DB data (tokens, message counts) is always returned. Session and
   * tool-call data requires the container to be running — when it is
   * offline the response carries `containerOffline: true` and the
   * session/toolCall fields are zeroed.
   *
   * Managed Hermes only. 'view' access.
   */
  getHermesStats: (id: string) =>
    req<{
      sessions: { total: number };
      messages: { total: number; today: number };
      toolCalls: { total: number; byType: Record<string, number> };
      tokens: {
        input: number;
        output: number;
        total: number;
        today: { input: number; output: number };
      };
      lastActiveAt: string;
      containerOffline: boolean;
    }>(`/agents/${id}/hermes/stats`),

  /**
   * Managed OpenClaw live config (Etapa 2).
   *
   * Returns the current openclaw.json (live from the container, or the
   * last DB snapshot if stopped). Secrets are redacted to "***" —
   * the user should edit those directly via the appropriate flow.
   */
  /**
   * OpenClaw sessions browser. Lists all sessions from
   * `agents/main/sessions/sessions.json` in the running container,
   * with metadata + a short first-user-message preview. Managed-mode
   * agents only — pre-Etapa-4 volumes have a different layout.
   */
  getOpenClawSessions: (id: string) =>
    req<{
      sessions: Array<{
        sessionId: string;
        user: string;
        updatedAt: number;
        modelId: string | null;
        messageCount: number;
        firstUserMessage: string | null;
        sizeBytes: number;
      }>;
      totalBytes: number;
    }>(`/agents/${id}/openclaw/sessions`),

  getAgentOpenClawConfig: (id: string) =>
    req<{
      source: "live" | "snapshot" | "none";
      config: Record<string, unknown> | null;
      snapshotAt: string | null;
      managed: boolean;
      liveReadError?: string;
    }>(`/agents/${id}/openclaw-config`),

  /**
   * Apply one or more live-config patches to a managed openclaw agent.
   * Same contract as patchHermesConfig but hits the openclaw endpoint.
   * Paths are checked server-side against ALLOWED_PATCH_PREFIXES in
   * config-snapshot.ts (default-deny). On partial failure the server
   * returns 422 with `applied` + `failedAt` + `remaining`.
   */
  patchOpenClawConfig: (
    id: string,
    patches: Array<{ path: string; value: unknown }>,
  ) =>
    req<{
      applied: string[];
      validation: { valid: boolean; error?: string };
    }>(`/agents/${id}/openclaw-config`, {
      method: "PATCH",
      body: JSON.stringify({ patches }),
    }) as Promise<ConfigPatchResult>,

  /** Get agent monitoring data (health, resources, response times, errors) */
  getAgentMonitoring: (id: string) =>
    req<{
      health: "healthy" | "unhealthy" | "stopped";
      uptime: { seconds: number; since: string | null };
      restarts: number;
      resources: {
        cpuPercent: number;
        memoryUsageMb: number;
        memoryLimitMb: number;
      };
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

  /** Get agent analytics (interaction activity + token/provider usage) */
  getAgentAnalytics: (id: string, range: "7d" | "30d" | "90d" = "7d") =>
    req<{
      range: string;
      rangeDays: number;
      messagesPerDay: Array<{
        date: string;
        count: number;
        inputTokens: number;
        outputTokens: number;
        usdCost: number;
      }>;
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

  /** Get deep analytics for an agent (hourly patterns, response times, errors, topics) */
  getAgentDeepAnalytics: (id: string, range: "7d" | "30d" = "7d") =>
    req<{
      range: string;
      rangeDays: number;
      hourlyDistribution: Array<{ hour: number; count: number }>;
      responseTimes: {
        avgMs: number;
        p50Ms: number;
        p95Ms: number;
        totalPairs: number;
      };
      dailyResponseTimes: Record<string, number>;
      errorRate: {
        total: number;
        errors: number;
        successful: number;
        rate: number;
      };
      topTopics: Array<{ word: string; count: number }>;
    }>(`/agents/${id}/analytics/deep?range=${range}`),

  /** Get account-level analytics across all agents */
  getAccountAnalytics: () =>
    req<{
      totalAgents: number;
      activeAgents: number;
      totalMessages: number;
      statusBreakdown: Record<string, number>;
      frameworkBreakdown: Record<string, number>;
      agentMessageBreakdown: Array<{
        id: string;
        name: string;
        framework: string;
        count: number;
      }>;
      dailyVolume: Array<{ date: string; count: number }>;
      aiCredits: {
        balance: number;
        monthlyGrant: number;
        tier: string;
        usedLast30: number;
        actionsLast30: number;
        inputTokensLast30: number;
        outputTokensLast30: number;
        byKind: Array<{ kind: string; credits: number; actions: number }>;
      };
      tokenSummary: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        usdCost: number;
      };
    }>("/analytics/overview"),

  /** Get agent activity feed (lifecycle events timeline) */
  getAgentActivity: (id: string) =>
    req<{
      events: Array<{
        id: string;
        type:
          | "started"
          | "stopped"
          | "restarted"
          | "config_updated"
          | "error"
          | "message_burst"
          | "version_deployed"
          | "created";
        message: string;
        timestamp: string;
        meta?: Record<string, unknown>;
      }>;
    }>(`/agents/${id}/activity`),

  /** Get agent activity logs */
  getAgentLogs: (id: string) =>
    req<{
      logs: Array<{
        timestamp: string;
        level: "info" | "warn" | "error";
        message: string;
      }>;
      note: string;
    }>(`/agents/${id}/logs`),

  /** Get token price from Jupiter */
  getPrice: (token: "hatch" | "kausa" | "sol") =>
    req<{ price: number; currency: string; source: string; error?: string }>(
      `/prices/${token}`,
    ),

  /** Admin: force-kill an agent container */
  adminKillAgent: (id: string) =>
    req<{ killed: boolean; agentId: string }>(`/admin/agents/${id}/kill`, {
      method: "POST",
    }),

  /** Admin: pause an agent container */
  adminPauseAgent: (id: string) =>
    req<{ paused: boolean; agentId: string }>(`/admin/agents/${id}/pause`, {
      method: "POST",
    }),

  /** Admin: list all agents across all users */
  adminGetAgents: (limit = 25, offset = 0) =>
    req<{
      agents: Array<Agent & { ownerWallet: string; ownerUsername: string }>;
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/admin/agents?limit=${limit}&offset=${offset}`),

  /** Admin: read-only agent detail (secrets redacted) */
  adminGetAgent: (id: string) =>
    req<
      Agent & {
        ownerWallet: string;
        ownerUsername: string;
        configJson: Record<string, unknown> | null;
        containerId: string | null;
        features: Array<{
          featureKey: string;
          type: string;
          expiresAt: string | null;
        }>;
        createdAt: string;
        updatedAt: string;
      }
    >(`/admin/agents/${id}`),

  /** Admin: tail container logs for a given agent */
  adminGetAgentLogs: (id: string, tail = 200) =>
    req<{
      lines: string[];
      containerId: string | null;
      status: string;
      error?: string;
    }>(`/admin/agents/${id}/logs?tail=${tail}`),

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
    }>("/admin/stats"),

  /**
   * Admin: 30-day time-series metrics for dashboard charts.
   * Signups/agents per day, tier + framework breakdowns, recent signups.
   * Cached server-side for 60s.
   */
  /** Admin: live platform activity (online users, page views, unique visitors).
   *  Redis-backed, refreshed every 30s in the admin panel. */
  adminGetLiveStats: () =>
    req<{
      onlineUsers: number;
      pageViewsToday: number;
      uniqueVisitors: number;
      timestamp: string;
    }>("/admin/live-stats"),

  adminGetMetrics: () =>
    req<{
      signupsByDay: Array<{ day: string; count: number }>;
      agentsByDay: Array<{ day: string; count: number }>;
      tierDistribution: Record<string, number>;
      frameworkDistribution: Record<string, number>;
      recentSignups: Array<{
        id: string;
        email: string;
        username: string;
        tier: string;
        createdAt: string;
      }>;
    }>("/admin/metrics"),

  /** Admin: server resource stats */
  adminGetServerStats: () =>
    req<{
      cpu: {
        cores: number;
        model: string;
        usagePercent: number;
        loadAvg: { "1m": number; "5m": number; "15m": number };
      };
      memory: {
        totalBytes: number;
        usedBytes: number;
        freeBytes: number;
        usagePercent: number;
      };
      disk: {
        total: number;
        used: number;
        available: number;
        usePercent: number;
      };
      uptime: number;
      platform: string;
      hostname: string;
      containers: { running: number; total: number };
    }>("/admin/server-stats"),

  /** Admin: list all users with agent/payment counts */
  adminGetUsers: (skip = 0, take = 2000) =>
    req<{
      users: Array<{
        id: string;
        email: string;
        username: string;
        walletAddress: string | null;
        tier: string;
        isAdmin: boolean;
        emailVerified: boolean;
        agentCount: number;
        paymentCount: number;
        referralGivenCount?: number;
        aiCreditsBalance: number;
        createdAt: string;
        referredBy: {
          referralId: string;
          referrerId: string;
          referrerEmail: string;
          referrerUsername: string | null;
          referrerReferralCode: string | null;
          affiliateId: string | null;
          affiliateCode: string | null;
          affiliateActive: boolean | null;
          affiliateFrozen: boolean | null;
          rewardClaimed: boolean;
          isFlagged: boolean;
          flagReason: string | null;
          signupIp: string | null;
          createdAt: string;
        } | null;
      }>;
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/admin/users?limit=${take}&offset=${skip}`),

  /** Admin: ban a user (sets tier to 'banned') */
  adminBanUser: (userId: string) =>
    req<{ banned: boolean; userId: string }>(`/admin/users/${userId}/ban`, {
      method: "POST",
    }),

  /** Admin: unban a user */
  adminUnbanUser: (userId: string) =>
    req<{ unbanned: boolean; userId: string }>(`/admin/users/${userId}/unban`, {
      method: "POST",
    }),

  /** Admin: approve a flagged referral so it becomes claimable */
  adminApproveReferral: (referralId: string) =>
    req<{
      approved: boolean;
      unflagged: boolean;
      referral: { id: string; isFlagged: boolean; flagReason: string | null };
    }>(`/admin/referrals/${referralId}/approve`, { method: "POST" }),

  /** Admin: clear a referral fraud flag without changing reward state */
  adminUnflagReferral: (referralId: string) =>
    req<{
      approved: boolean;
      unflagged: boolean;
      referral: { id: string; isFlagged: boolean; flagReason: string | null };
    }>(`/admin/referrals/${referralId}/unflag`, { method: "POST" }),

  /** Admin: list all support tickets */
  adminGetTickets: () =>
    req<{
      tickets: Array<{
        id: string;
        subject: string;
        category: string;
        priority: string;
        status: string;
        userUsername: string;
        userEmail: string;
        userWallet: string | null;
        agentName: string | null;
        messages: Array<{ role: string; content: string; timestamp: string }>;
        createdAt: string;
        updatedAt: string;
      }>;
    }>("/admin/tickets?limit=100&offset=0"),

  /** Admin: payments list — optionally filtered by status and/or limited in count */
  adminGetPayments: (
    params: {
      status?: "all" | "confirmed" | "failed" | "pending" | "refunded";
      limit?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.status && params.status !== "all")
      qs.set("status", params.status);
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return req<{ payments: AdminPayment[] }>(`/admin/payments${query}`);
  },

  /** Admin: overview-extras (revenue breakdown, founding slots, top users, etc.) */
  adminGetOverviewExtras: () =>
    req<AdminOverviewExtras>("/admin/overview-extras"),

  /** Admin: reply to a ticket */
  adminReplyTicket: (ticketId: string, message: string) =>
    req<{ id: string }>(`/admin/tickets/${ticketId}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  /** Admin: update ticket status */
  adminUpdateTicketStatus: (ticketId: string, status: string) =>
    req<{ id: string; status: string }>(`/admin/tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /** Admin: get system health */
  adminGetHealth: () =>
    req<{
      api: {
        status: string;
        uptime: number;
        memory: { used: number; total: number };
      };
      database: { status: string; connectionCount: number };
      redis: { status: string; usedMemory: string; connectedClients: number };
      docker: {
        status: string;
        containersRunning: number;
        containersTotal: number;
      };
      services: Array<{
        name: string;
        status: string;
        uptime: string;
        restarts: number;
      }>;
      disk: { used: string; total: string; percent: number };
      ram: { total: string; used: string; available: string; percent: number };
      cpu: {
        cores: number;
        model: string;
        load1m: string;
        load5m: string;
        load15m: string;
        percent: number;
      };
    }>("/admin/health"),

  /**
   * Admin: 10 most recent Stripe disputes (C17).
   *
   * Backend always returns `{disputes, error?}` at 200. `error` is present
   * when the Stripe API is unavailable or STRIPE_SECRET_KEY is missing — the
   * UI should display a small warning but otherwise render an empty card.
   */
  adminGetStripeDisputes: () =>
    req<{
      disputes: Array<{
        id: string;
        amount: number;
        currency: string;
        reason: string;
        status: string;
        evidenceDueBy: string | null;
        chargeId: string | null;
        createdAt: string;
      }>;
      error?: string;
      generatedAt?: string;
    }>("/admin/stripe-disputes"),

  /**
   * Admin: recent entries from the Redis-backed admin audit log.
   * `?limit` = 1..500 (default 100). `?action` narrows to entries whose
   * action equals or starts with the given string.
   */
  adminGetAuditLog: (opts: { limit?: number; action?: string } = {}) => {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    if (opts.action) qs.set("action", opts.action);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return req<{
      entries: Array<{
        ts: string;
        adminId: string;
        adminEmail: string | null;
        action: string;
        details: Record<string, unknown>;
      }>;
      total: number;
      limit: number;
    }>(`/admin/audit-log${query}`);
  },

  /**
   * Admin: weekly retention cohorts (C14). Up to 8 rows, each with D1/D7/
   * D14/D30 counts. Cells are `null` when the window hasn't elapsed yet —
   * render "—" in the UI rather than "0 / N".
   */
  adminGetRetentionCohort: () =>
    req<{
      cohorts: Array<{
        cohortWeek: string;
        cohortSize: number;
        day1: number | null;
        day7: number | null;
        day14: number | null;
        day30: number | null;
      }>;
      generatedAt?: string;
    }>("/admin/retention-cohort"),

  /**
   * Admin: per-platform integration delivery health (C15). Empty array if
   * no deliveries in the last 24h.
   */
  adminGetIntegrationHealth: () =>
    req<{
      health: Array<{
        platform: string;
        successCount: number;
        failureCount: number;
        totalDeliveries: number;
        successRate: number;
      }>;
      generatedAt?: string;
    }>("/admin/integration-health"),

  /** Admin analytics: conversion funnel */
  adminGetFunnel: () => req<FunnelResponse>("/admin/analytics/funnel"),

  /** Admin analytics: churn radar (paying users idle ≥ threshold days) */
  adminGetChurnRadar: () =>
    req<ChurnRadarResponse>("/admin/analytics/churn-radar"),

  /** Admin analytics: referral leaderboard */
  adminGetReferrals: () =>
    req<ReferralLeaderboardResponse>("/admin/analytics/referrals"),

  /** Admin analytics: signup heatmap (day-of-week × hour) */
  adminGetSignupHeatmap: () =>
    req<SignupHeatmapResponse>("/admin/analytics/signup-heatmap"),

  /** Admin analytics: API error rate delta */
  adminGetErrorRate: () =>
    req<ErrorRateResponse>("/admin/analytics/error-rate"),

  /** Admin: live WebSocket connection counts */
  adminGetWsCount: () => req<WsCountResponse>("/admin/ws-count"),

  /** Admin: LLM proxy usage stats */
  adminGetLlmStats: () => req<LlmStatsResponse>("/admin/llm-stats"),

  /** Admin: recent agent CONNECT egress decisions from the LLM proxy */
  adminGetEgressEvents: (opts: { agentId?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (opts.agentId) qs.set("agentId", opts.agentId);
    if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return req<AdminEgressEventsResponse>(`/admin/egress-events${query}`);
  },

  /** Admin: IDLE consumer/provider integration overview */
  adminGetIdleOverview: () => req<AdminIdleOverviewResponse>("/admin/idle"),

  /** Admin: Conduit provider registration and settlement overview */
  adminGetConduitOverview: () =>
    req<AdminConduitOverviewResponse>("/admin/conduit"),

  /** List files in agent's running container */
  listContainerFiles: (agentId: string, path?: string) =>
    req<{
      files: Array<{
        name: string;
        path: string;
        type: "file" | "directory";
        size: number;
      }>;
      currentPath: string;
      status: string;
      message?: string;
    }>(
      `/agents/${agentId}/container-files${path ? `?path=${encodeURIComponent(path)}` : ""}`,
    ),

  /** Read a file from agent's running container */
  readContainerFile: (agentId: string, path: string) =>
    req<{ path: string; content: string }>(
      `/agents/${agentId}/container-files/read?path=${encodeURIComponent(path)}`,
    ),

  /** Write a file to agent's running container */
  writeContainerFile: (agentId: string, path: string, content: string) =>
    req<{ path: string; written: boolean }>(
      `/agents/${agentId}/container-files/write`,
      {
        method: "PUT",
        body: JSON.stringify({ path, content }),
      },
    ),

  /** Delete a file from agent's running container */
  deleteContainerFile: (agentId: string, path: string) =>
    req<{ path: string; deleted: boolean }>(
      `/agents/${agentId}/container-files/delete?path=${encodeURIComponent(path)}`,
      {
        method: "DELETE",
      },
    ),

  /** Generate speech audio for webchat read-aloud / voice mode. */
  synthesizeAgentSpeech: async (
    agentId: string,
    input: string,
    options?: { voice?: string; model?: string; responseFormat?: string },
  ): Promise<
    | {
        success: true;
        data: {
          blob: Blob;
          contentType: string;
          creditsCharged: number | null;
        };
      }
    | { success: false; error: string }
  > => {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}/media/speech`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          input,
          ...(options?.voice ? { voice: options.voice } : {}),
          ...(options?.model ? { model: options.model } : {}),
          response_format: options?.responseFormat ?? "mp3",
        }),
      });
      if (!res.ok) {
        let message = `Speech request failed with status ${res.status}`;
        try {
          const json = (await res.json()) as {
            error?: string;
            message?: string;
          };
          message = json.error ?? json.message ?? message;
        } catch {
          // Keep the status fallback for non-JSON failures.
        }
        return { success: false, error: message };
      }
      const blob = await res.blob();
      const credits = Number(
        res.headers.get("x-hatcher-ai-credits-charged") ?? "",
      );
      return {
        success: true,
        data: {
          blob,
          contentType:
            res.headers.get("content-type") ?? blob.type ?? "audio/mpeg",
          creditsCharged: Number.isFinite(credits) ? credits : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Speech request failed",
      };
    }
  },

  /** Streaming chat — falls back to non-streaming if stream unavailable */
  chatStream: async (
    agentId: string,
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    onToken: (token: string) => void,
    onDone: (model: string) => void,
    onError: (err: string) => void,
    onMessage?: (content: string) => void,
    sessionId?: string | null,
    attachments?: ChatAttachmentPayload[],
    signal?: AbortSignal,
  ) => {
    const token = getToken();

    // Try streaming first, fall back to non-streaming on network error
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/agents/${agentId}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        signal,
        body: JSON.stringify({
          message,
          history,
          ...(sessionId ? { sessionId } : {}),
          ...(attachments?.length ? { attachments } : {}),
          abortOnDisconnect: true,
        }),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      // Streaming endpoint failed — fall back to regular chat
      try {
        const fallback = await fetch(`${API_BASE}/agents/${agentId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          signal,
          body: JSON.stringify({
            message,
            history,
            ...(sessionId ? { sessionId } : {}),
            ...(attachments?.length ? { attachments } : {}),
          }),
        });
        if (!fallback.ok) {
          onError(`HTTP ${fallback.status}`);
          return;
        }
        const data = (await fallback.json()) as {
          data?: {
            content?: string;
            model?: string;
            messages?: Array<{ content?: string }>;
          };
        };
        const payload = data.data;
        const messages =
          payload?.messages
            ?.map((item) => item.content)
            .filter((item): item is string => Boolean(item?.trim())) ?? [];
        const firstContent = messages[0] ?? payload?.content;
        if (firstContent) {
          onToken(firstContent);
          onDone(payload?.model ?? "unknown");
          for (const extra of messages.slice(1)) onMessage?.(extra);
        } else {
          onError("Empty response");
        }
      } catch (fallbackErr) {
        if (fallbackErr instanceof Error && fallbackErr.name === "AbortError")
          throw fallbackErr;
        onError(
          fallbackErr instanceof Error ? fallbackErr.message : "Network error",
        );
      }
      return;
    }

    if (!res.ok || !res.body) {
      onError(`HTTP ${res.status}`);
      return;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const data = (await res.json()) as {
          data?: {
            content?: string;
            model?: string;
            messages?: Array<{ content?: string }>;
          };
        };
        const payload = data.data;
        const messages =
          payload?.messages
            ?.map((item) => item.content)
            .filter((item): item is string => Boolean(item?.trim())) ?? [];
        const firstContent = messages[0] ?? payload?.content;
        if (!firstContent) {
          onError("Empty response");
          return;
        }
        onToken(firstContent);
        onDone(payload?.model ?? "unknown");
        for (const extra of messages.slice(1)) onMessage?.(extra);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Invalid JSON response");
      }
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let detectedModel = "unknown";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone(detectedModel);
          return;
        }
        try {
          const json = JSON.parse(data) as {
            token?: string;
            error?: string;
            model?: string;
          };
          if (json.error) {
            onError(json.error);
            return;
          }
          if (json.model) detectedModel = json.model;
          if (json.token) onToken(json.token);
        } catch {
          /* skip */
        }
      }
    }
    // Stream ended without [DONE] marker
    onDone(detectedModel);
  },

  // ─── Support Tickets ────────────────────────────────────────
  /** List all tickets for the current user */
  getTickets: () => req<Ticket[]>("/support/tickets"),

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
    req<Ticket>("/support/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Reply to a ticket */
  replyToTicket: (id: string, message: string) =>
    req<TicketMessage>(`/support/tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  /** Close a ticket */
  closeTicket: (id: string) =>
    req<Ticket>(`/support/tickets/${id}/close`, {
      method: "PATCH",
    }),

  /** Start WhatsApp QR pairing — backend rejects other channels. */
  pairChannel: (agentId: string, channel: string) =>
    req<{ status: string; qrCode?: string; message: string; raw?: string }>(
      `/agents/${agentId}/pair-channel`,
      {
        method: "POST",
        body: JSON.stringify({ channel }),
      },
    ),

  /** Load chat sessions */
  getChatSessions: (agentId: string) =>
    req<{ sessions: ChatSessionSummary[] }>(`/agents/${agentId}/chat/sessions`),

  /** Start a new chat session */
  createChatSession: (agentId: string, title?: string) =>
    req<{ session: ChatSessionSummary }>(`/agents/${agentId}/chat/sessions`, {
      method: "POST",
      body: JSON.stringify(title ? { title } : {}),
    }),

  /** Delete a chat session */
  deleteChatSession: (agentId: string, sessionId: string) =>
    req<{ deleted: number }>(
      `/agents/${agentId}/chat/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
      },
    ),

  /** Load chat history */
  getChatHistory: (agentId: string, sessionId?: string) =>
    req<{
      messages: Array<{ role: string; content: string; ts: number }>;
      nextCursor?: string | null;
    }>(
      `/agents/${agentId}/chat/history${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`,
    ),

  /** Save chat messages to history */
  saveChatHistory: (
    agentId: string,
    messages: Array<{ role: string; content: string; ts?: number }>,
    sessionId?: string | null,
  ) =>
    req<{ saved: number }>(`/agents/${agentId}/chat/history`, {
      method: "POST",
      body: JSON.stringify({ messages, ...(sessionId ? { sessionId } : {}) }),
    }),

  /** Get channel connection status */
  getChannelStatus: (agentId: string) =>
    req<{ channels: Record<string, { connected: boolean }> }>(
      `/agents/${agentId}/channel-status`,
    ),

  /** Disconnect a paired channel */
  disconnectChannel: (agentId: string, channel: string) =>
    req<{ disconnected: boolean }>(`/agents/${agentId}/disconnect-channel`, {
      method: "POST",
      body: JSON.stringify({ channel }),
    }),

  /** Get webhook URL and token for an agent */
  getWebhookUrl: (agentId: string) =>
    req<{ url: string; token: string }>(`/agents/${agentId}/webhook-url`),

  /** Get outbound webhook configuration for an agent */
  getAgentWebhookConfig: (agentId: string) =>
    req<{
      webhookUrl: string | null;
      webhookSecret: string | null;
      events: string[];
      enabled: boolean;
    }>(`/agents/${agentId}/webhook-config`),

  /** Update outbound webhook configuration */
  updateAgentWebhookConfig: (
    agentId: string,
    data: { webhookUrl?: string; events?: string[]; enabled?: boolean },
  ) =>
    req<{
      webhookUrl: string | null;
      webhookSecret: string | null;
      events: string[];
      enabled: boolean;
      _note?: string;
    }>(`/agents/${agentId}/webhook-config`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** Clear outbound webhook configuration */
  clearAgentWebhookConfig: (agentId: string) =>
    req<{ cleared: boolean }>(`/agents/${agentId}/webhook-config`, {
      method: "DELETE",
    }),

  /** Queue a test outbound webhook delivery */
  testAgentWebhookConfig: (agentId: string) =>
    req<{ queued: boolean; url: string }>(
      `/agents/${agentId}/webhook-config/test`,
      { method: "POST" },
    ),

  /** List recent outbound webhook deliveries */
  getAgentWebhookDeliveries: (agentId: string) =>
    req<{
      deliveries: Array<{
        id: string;
        event: string;
        url: string;
        status: string;
        statusCode: number | null;
        attempts: number;
        errorMessage: string | null;
        deliveredAt: string | null;
        createdAt: string;
      }>;
    }>(`/agents/${agentId}/webhook/deliveries`),

  // ─── Config Snapshots ──────────────────────────────────────

  /** List config snapshots for an agent */
  getConfigSnapshots: (agentId: string) =>
    req<{
      snapshots: Array<{ id: string; timestamp: number; preview: string }>;
    }>(`/agents/${agentId}/config-snapshots`),

  /** Restore a config snapshot */
  restoreConfigSnapshot: (agentId: string, snapshotId: string) =>
    req<{ restored: boolean; snapshotId: string }>(
      `/agents/${agentId}/config-snapshots/${encodeURIComponent(snapshotId)}/restore`,
      {
        method: "POST",
      },
    ),

  // ─── Agent Environment Variables ──────────────────────────

  /** List env var keys for an agent (values are always masked) */
  getEnvVars: (agentId: string) =>
    req<{ envVars: Array<{ key: string; hasValue: boolean }> }>(
      `/agents/${agentId}/env-vars`,
    ),

  /** Upsert a single env var */
  setEnvVar: (agentId: string, key: string, value: string) =>
    req<{ key: string; hasValue: boolean }>(
      `/agents/${agentId}/env-vars/${encodeURIComponent(key)}`,
      {
        method: "POST",
        body: JSON.stringify({ value }),
      },
    ),

  /** Delete a single env var */
  deleteEnvVar: (agentId: string, key: string) =>
    req<{ deleted: boolean; key: string }>(
      `/agents/${agentId}/env-vars/${encodeURIComponent(key)}`,
      {
        method: "DELETE",
      },
    ),

  // ─── Scheduled Tasks (Cron Jobs) ──────────────────────────
  /** List all scheduled tasks for an agent */
  getAgentSchedules: (agentId: string) =>
    req<unknown>(`/agents/${agentId}/schedules`),

  /** Create a new scheduled task */
  createAgentSchedule: (
    agentId: string,
    data: { name: string; schedule: string; prompt: string },
  ) =>
    req<unknown>(`/agents/${agentId}/schedules`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Delete a scheduled task */
  deleteAgentSchedule: (agentId: string, jobId: string) =>
    req<{ deleted: boolean }>(`/agents/${agentId}/schedules/${jobId}`, {
      method: "DELETE",
    }),

  /** Pause a scheduled task */
  pauseAgentSchedule: (agentId: string, jobId: string) =>
    req<unknown>(`/agents/${agentId}/schedules/${jobId}/pause`, {
      method: "POST",
    }),

  /** Resume a paused scheduled task */
  resumeAgentSchedule: (agentId: string, jobId: string) =>
    req<unknown>(`/agents/${agentId}/schedules/${jobId}/resume`, {
      method: "POST",
    }),

  /** Get execution logs for a scheduled task */
  getAgentScheduleLogs: (agentId: string, jobId: string) =>
    req<{
      logs: Array<{
        timestamp: string;
        success: boolean;
        response?: string;
        error?: string;
      }>;
    }>(`/agents/${agentId}/schedules/${jobId}/logs`),

  /** Clone an existing agent (own or public) — creates a "(Copy)" with all config preserved */
  cloneAgent: (agentId: string) =>
    req<Agent>(`/agents/${agentId}/clone`, { method: "POST" }),

  /** Export agent config as sanitized JSON (no secrets) */
  exportAgent: (agentId: string) =>
    req<{
      exportVersion: number;
      exportedAt: string;
      name: string;
      description?: string;
      framework: string;
      template: string;
      config: Record<string, unknown>;
    }>(`/agents/${agentId}/export`),

  // ─── Skills Browser ─────────────────────────────────────────
  // ─── Teams (Collaboration) ──────────────────────────────────

  /** List user's teams */
  getMyTeams: () =>
    req<
      Array<{
        id: string;
        name: string;
        ownerId: string;
        myRole: string;
        agentCount: number;
        members: Array<{
          id: string;
          role: string;
          user: { id: string; username: string };
        }>;
        createdAt: string;
      }>
    >("/teams"),

  /** Get a single team with members */
  getTeam: (id: string) =>
    req<{
      id: string;
      name: string;
      ownerId: string;
      myRole: string;
      agentCount: number;
      members: Array<{
        id: string;
        teamId: string;
        userId: string;
        role: string;
        user: {
          id: string;
          username: string;
          walletAddress: string | null;
          createdAt: string;
        };
      }>;
      createdAt: string;
      updatedAt: string;
    }>(`/teams/${id}`),

  /** Create a new team */
  createTeam: (name: string) =>
    req<{
      id: string;
      name: string;
      ownerId: string;
      members: Array<{
        id: string;
        role: string;
        user: { id: string; username: string };
      }>;
      createdAt: string;
    }>("/teams", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  /** Delete a team */
  deleteTeam: (id: string) =>
    req<{ deleted: boolean }>(`/teams/${id}`, { method: "DELETE" }),

  /** Invite a member to a team */
  inviteTeamMember: (teamId: string, email: string, role: string) =>
    req<{
      id: string;
      teamId: string;
      userId: string;
      role: string;
      user: { id: string; username: string };
    }>(`/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  /** Update a team member's role */
  updateTeamMemberRole: (teamId: string, memberId: string, role: string) =>
    req<{ id: string; role: string; user: { id: string; username: string } }>(
      `/teams/${teamId}/members/${memberId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    ),

  /** Remove a team member */
  removeTeamMember: (teamId: string, memberId: string) =>
    req<{ removed: boolean }>(`/teams/${teamId}/members/${memberId}`, {
      method: "DELETE",
    }),

  /** Share an agent with a team */
  shareAgentWithTeam: (teamId: string, agentId: string) =>
    req<{ shared: boolean; agentId: string; teamId: string }>(
      `/teams/${teamId}/agents/${agentId}`,
      { method: "POST" },
    ),

  /** Unshare an agent from a team */
  unshareAgentFromTeam: (teamId: string, agentId: string) =>
    req<{ unshared: boolean; agentId: string; teamId: string }>(
      `/teams/${teamId}/agents/${agentId}`,
      { method: "DELETE" },
    ),

  /** List team's shared agents */
  getTeamAgents: (teamId: string) =>
    req<
      Array<{
        id: string;
        name: string;
        status: string;
        framework: string;
        ownerUsername: string;
        createdAt: string;
      }>
    >(`/teams/${teamId}/agents`),

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
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),

  /** Install a skill/plugin into the agent container */
  installAgentSkill: (
    agentId: string,
    packageName: string,
    source: "npm" | "clawhub" | "url",
  ) =>
    req<{
      packageName: string;
      source: string;
      installed: boolean;
      restarted: boolean;
      output: string;
      note: string;
    }>(`/agents/${agentId}/skills/install`, {
      method: "POST",
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
      method: "POST",
      body: JSON.stringify({ packageName }),
    }),

  // ─── Generic Plugins (all frameworks) ────────────────────

  /** Fetch installed + available plugins/skills with tier limits */
  getAgentPlugins: (agentId: string) =>
    req<{
      installed: Array<{
        name: string;
        type: "skill" | "plugin";
        source: string;
        description: string | null;
        status: "installed" | "pending" | "pending_restart" | "failed";
        error?: string;
        requiresRestart?: boolean;
      }>;
      available: {
        skills: Array<{
          name: string;
          description: string | null;
          source: string;
          requiresRestart?: boolean;
        }>;
        plugins: Array<{
          name: string;
          description: string | null;
          source: string;
          requiresRestart?: boolean;
        }>;
      };
      limits: {
        used: number;
        max: number | null;
      };
    }>(`/agents/${agentId}/plugins`),

  /** Install a plugin or skill */
  installAgentPlugin: (
    agentId: string,
    pluginName: string,
    type: "skill" | "plugin",
    source: string,
  ) =>
    req<{
      name: string;
      installed: boolean;
      requiresRestart: boolean;
      message?: string;
      note?: string;
    }>(`/agents/${agentId}/plugins/install`, {
      method: "POST",
      body: JSON.stringify({ pluginName, type, source }),
    }),

  /** Uninstall a plugin or skill */
  uninstallAgentPlugin: (agentId: string, pluginName: string) =>
    req<{
      name: string;
      uninstalled: boolean;
      message?: string;
      note?: string;
    }>(`/agents/${agentId}/plugins/${encodeURIComponent(pluginName)}`, {
      method: "DELETE",
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
    }>("/domains", {
      method: "POST",
      body: JSON.stringify({ agentId, domain }),
    }),

  /** List all custom domains for the current user */
  getMyDomains: () =>
    req<
      Array<{
        id: string;
        agentId: string;
        domain: string;
        verified: boolean;
        sslStatus: string;
        cnameTarget: string;
        createdAt: string;
        updatedAt: string;
      }>
    >("/domains"),

  /** Delete a custom domain */
  deleteDomain: (id: string) =>
    req<{ deleted: boolean; id: string }>(`/domains/${id}`, {
      method: "DELETE",
    }),

  /** Verify a custom domain's DNS CNAME */
  verifyDomain: (id: string) =>
    req<{
      verified: boolean;
      domain?: unknown;
      message?: string;
      expected?: string;
      found?: string[];
    }>(`/domains/${id}/verify`, { method: "POST" }),

  // ─── Workflows (Visual Builder) ────────────────────────────
  /** List all workflows for an agent */
  getAgentWorkflows: (agentId: string) =>
    req<
      Array<{
        id: string;
        agentId: string;
        name: string;
        enabled: boolean;
        nodes: unknown[];
        edges: unknown[];
        createdAt: string;
        updatedAt: string;
      }>
    >(`/agents/${agentId}/workflows`),

  /** Create a new workflow */
  createAgentWorkflow: (
    agentId: string,
    data: { name: string; nodes?: unknown[]; edges?: unknown[] },
  ) =>
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
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Update a workflow */
  updateAgentWorkflow: (
    agentId: string,
    workflowId: string,
    data: {
      name?: string;
      nodes?: unknown[];
      edges?: unknown[];
      enabled?: boolean;
    },
  ) =>
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
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** Delete a workflow */
  deleteAgentWorkflow: (agentId: string, workflowId: string) =>
    req<{ deleted: boolean; id: string }>(
      `/agents/${agentId}/workflows/${workflowId}`,
      {
        method: "DELETE",
      },
    ),

  /** Toggle workflow enabled/disabled */
  toggleAgentWorkflow: (agentId: string, workflowId: string) =>
    req<{ id: string; enabled: boolean }>(
      `/agents/${agentId}/workflows/${workflowId}/toggle`,
      {
        method: "POST",
      },
    ),

  /** Get recent workflow execution logs */
  getAgentWorkflowLogs: (agentId: string, workflowId: string) =>
    req<{
      logs: Array<{
        timestamp: string;
        trigger: string;
        workflowId: string;
        workflowName: string;
        nodesExecuted: string[];
        output: string | null;
        error: string | null;
        durationMs: number;
      }>;
    }>(`/agents/${agentId}/workflows/${workflowId}/logs`),

  // ─── Agent-to-Agent Communication ─────────────────────────
  getAgentCommPermissions: (agentId: string) =>
    req<AgentCommPermissionsResponse>(`/agents/${agentId}/comm/permissions`),

  updateAgentComm: (agentId: string, commEnabled: boolean) =>
    req<{ id: string; commEnabled: boolean }>(`/agents/${agentId}/comm`, {
      method: "PATCH",
      body: JSON.stringify({ commEnabled }),
    }),

  addAgentCommPermission: (agentId: string, allowedAgentId: string) =>
    req<{ id: string; allowedAgentId?: string; message?: string }>(
      `/agents/${agentId}/comm/permissions`,
      {
        method: "POST",
        body: JSON.stringify({ allowedAgentId }),
      },
    ),

  deleteAgentCommPermission: (agentId: string, permissionId: string) =>
    req<{ deleted: boolean }>(
      `/agents/${agentId}/comm/permissions/${permissionId}`,
      {
        method: "DELETE",
      },
    ),

  getAgentCommLogs: (agentId: string, limit = 50) =>
    req<AgentCommLogsResponse>(
      `/agents/${agentId}/comm/logs?limit=${encodeURIComponent(String(limit))}`,
    ),

  getAgentCommDiscover: (agentId: string) =>
    req<AgentCommDiscoverResponse>(`/agents/${agentId}/comm/discover`),

  enableOwnedAgentComm: (agentId: string) =>
    req<{ updated: number }>(`/agents/${agentId}/comm/enable-owned`, {
      method: "POST",
    }),

  callAgentComm: (agentId: string, body: AgentCommCallBody) =>
    req<AgentCommCallResponse>(`/agents/${agentId}/comm/call`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  testAgentGithubAccess: (agentId: string, repo?: string) =>
    req<AgentGithubTestResponse>(`/agents/${agentId}/dev/github/test`, {
      method: "POST",
      body: JSON.stringify(repo ? { repo } : {}),
    }),

  getAgentGithubRepos: (agentId: string) =>
    req<AgentGithubReposResponse>(`/agents/${agentId}/dev/github/repos`),

  startAgentGithubConnect: (agentId: string) =>
    req<AgentGithubConnectStartResponse>(
      `/agents/${agentId}/dev/github/connect/start`,
      { method: "POST" },
    ),

  // ─── Credits ──────────────────────────────────────────────────

  /** Get credit balance */
  getCreditBalance: () =>
    req<{ balance: number; currency: string }>("/credits/balance"),

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

  getAiCreditBalance: () =>
    req<{ balance: number; monthlyGrant: number; tier: string }>(
      "/ai-credits/balance",
    ),

  getAiCreditHistory: (limit = 20) =>
    req<{
      usage: Array<{
        id: string;
        agentId: string | null;
        agentName: string | null;
        agent?: { name: string } | null;
        kind: string;
        provider: string;
        model: string | null;
        credits: number;
        providerCostUsd: string | number;
        createdAt: string;
      }>;
    }>(`/ai-credits/history?limit=${limit}`),

  /** Submit thumbs up/down feedback for a message */
  submitFeedback: (agentId: string, messageId: string, rating: "up" | "down") =>
    req<{ success: true }>(`/agents/${agentId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ messageId, rating }),
    }),

  /** Public agent reputation — DB thumbs aggregate + ERC-8004 on-chain mirror. */
  getAgentReputation: (agentId: string) =>
    req<{
      upCount: number;
      downCount: number;
      total: number;
      scorePct: number | null;
      onChain: {
        agentId: string | null;
        registeredAt: string | null;
        attestationCount: number;
        activityMilestone: number;
        lastTxHash: string | null;
        lastTxAt: string | null;
        contract: string;
        identityContract: string;
        chainId: number;
      };
    }>(`/agents/${agentId}/reputation`),

  // Knowledge base documents
  getKnowledge: (agentId: string) =>
    req<{
      files: Array<{ name: string; size: number; createdAt: string }>;
      totalFiles: number;
    }>(`/agents/${agentId}/knowledge`),

  uploadKnowledge: (agentId: string, filename: string, payload: KnowledgeUploadPayload) => {
    const body =
      typeof payload === "string"
        ? { filename, content: payload }
        : { filename, ...payload };

    return req<{ written: boolean; filename: string; size: number }>(
      `/agents/${agentId}/knowledge`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  readKnowledge: (agentId: string, filename: string) =>
    req<{ filename: string; content: string }>(
      `/agents/${agentId}/knowledge/${encodeURIComponent(filename)}`,
    ),

  deleteKnowledge: (agentId: string, filename: string) =>
    req<{ deleted: boolean; filename: string }>(
      `/agents/${agentId}/knowledge/${encodeURIComponent(filename)}`,
      {
        method: "DELETE",
      },
    ),

  // ─── Affiliate (self-service dashboard) ──────────────────────
  // Shapes kept inline — we don't bump @hatcherlabs/shared for a
  // partner-only surface. Callers typically narrow with `if (success)`
  // before touching `data`; 403 on non-affiliate is surfaced as a
  // failed response + error === 'Not an active affiliate'.
  getAffiliateStatus: () =>
    req<{
      active: boolean;
      isFrozen: boolean;
      applicationStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
    }>("/affiliate/status"),

  getAffiliateMe: () =>
    req<{
      affiliate: {
        id: string;
        referralCode: string;
        payoutMode: "CASH_ONLY" | "CREDITS_ONLY" | "HYBRID";
        payoutAddress: string | null;
        isActive: boolean;
        isFrozen: boolean;
        frozenReason: string | null;
        totalReferrals: number;
        totalPaidRefs: number;
        lifetimeEarnedCashUsd: number;
        lifetimeEarnedCredits: number;
        createdAt: string;
      };
      shareLink: string;
    }>("/affiliate/me"),

  getAffiliateReferrals: (params: { limit?: number; cursor?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.cursor) qs.set("cursor", params.cursor);
    return req<{
      referrals: Array<{
        id: string;
        referredAt: string;
        maskedEmail: string;
        isPaid: boolean;
        rewardClaimed: boolean;
        tier: string | null;
        isFlagged: boolean;
        flagReason: string | null;
      }>;
      nextCursor: string | null;
    }>(`/affiliate/me/referrals${qs.toString() ? `?${qs}` : ""}`);
  },

  getAffiliateCommissions: (
    params: {
      limit?: number;
      cursor?: string;
      status?: "PENDING" | "PAYABLE" | "PAID" | "VOIDED";
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.status) qs.set("status", params.status);
    return req<{
      commissions: Array<{
        id: string;
        createdAt: string;
        sourceType: "SUBSCRIPTION" | "FOUNDING_MEMBER";
        sourceAmountUsd: number;
        cashAmountUsd: number;
        creditsAmount: number;
        status: "PENDING" | "PAYABLE" | "PAID" | "VOIDED";
        payableAt: string;
        paidOutAt: string | null;
        payoutId: string | null;
      }>;
      nextCursor: string | null;
    }>(`/affiliate/me/commissions${qs.toString() ? `?${qs}` : ""}`);
  },

  getAffiliatePayouts: (params: { limit?: number; cursor?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.cursor) qs.set("cursor", params.cursor);
    return req<{
      payouts: Array<{
        id: string;
        processedAt: string;
        cashAmountUsd: number;
        cashTxHash: string | null;
        cashCurrency: string | null;
        creditsAmount: number;
        creditsAppliedAt: string | null;
        adminNote: string;
        commissionCount: number;
      }>;
      nextCursor: string | null;
    }>(`/affiliate/me/payouts${qs.toString() ? `?${qs}` : ""}`);
  },

  getAffiliateStats: () =>
    req<{
      totalReferrals: number;
      paidReferrals: number;
      pending: { cashUsd: number; credits: number };
      payable: { cashUsd: number; credits: number };
      paid: { cashUsd: number; credits: number };
      voided: { count: number };
      lifetime: {
        cashUsdEarned: number;
        creditsEarned: number;
        cashUsdPaidOut: number;
        creditsPaidOut: number;
      };
    }>("/affiliate/me/stats"),

  // ─── Affiliate Application (public marketing + apply flow) ───
  // Used by `/affiliate/apply` to detect an existing application
  // (PENDING / APPROVED / REJECTED / none) and submit a new one.
  // The apply page renders different states based on the result.

  getMyAffiliateApplication: () =>
    req<{
      application: {
        id: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
        platforms: Array<{
          type: "x" | "youtube" | "telegram" | "discord" | "other";
          handle: string;
          audienceSize: number | null;
          url: string | null;
        }>;
        pitch: string;
        payoutMode: "CASH_ONLY" | "CREDITS_ONLY" | "HYBRID";
        payoutAddress: string | null;
        desiredSlug: string | null;
        createdAt: string;
        reviewedAt: string | null;
        reviewNotes: string | null;
      } | null;
    }>("/affiliate/application"),

  submitAffiliateApplication: (body: {
    platforms: Array<{
      type: "x" | "youtube" | "telegram" | "discord" | "other";
      handle: string;
      audienceSize?: number;
      url?: string;
    }>;
    pitch: string;
    payoutMode: "CASH_ONLY";
    payoutAddress?: string;
    desiredSlug?: string;
  }) =>
    req<{
      application: {
        id: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
        createdAt: string;
      };
    }>("/affiliate/apply", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ─── Admin Affiliate (Phase V) ───────────────────────────────
  // Types inline — this is an admin-only surface, not worth a shared
  // package bump. Every endpoint requires `isAdmin = true`; server
  // returns 403 "Admin access required" otherwise.

  adminListAffiliateApplications: (
    params: {
      status?: "PENDING" | "APPROVED" | "REJECTED" | "ALL";
      limit?: number;
      cursor?: string;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.cursor) qs.set("cursor", params.cursor);
    return req<{
      applications: Array<{
        id: string;
        userId: string;
        userEmail: string;
        username: string;
        platforms: Array<{
          type: "x" | "youtube" | "telegram" | "discord" | "other";
          handle: string;
          audienceSize: number | null;
          url: string | null;
        }>;
        payoutMode: "CASH_ONLY" | "CREDITS_ONLY" | "HYBRID";
        pitch: string;
        desiredSlug: string | null;
        status: "PENDING" | "APPROVED" | "REJECTED";
        createdAt: string;
      }>;
      nextCursor: string | null;
    }>(`/admin/affiliate/applications${qs.toString() ? `?${qs}` : ""}`);
  },

  adminGetAffiliateApplication: (id: string) =>
    req<{
      application: {
        id: string;
        userId: string;
        platforms: Array<{
          type: "x" | "youtube" | "telegram" | "discord" | "other";
          handle: string;
          audienceSize: number | null;
          url: string | null;
        }>;
        pitch: string;
        payoutMode: "CASH_ONLY" | "CREDITS_ONLY" | "HYBRID";
        payoutAddress: string | null;
        desiredSlug: string | null;
        status: "PENDING" | "APPROVED" | "REJECTED";
        reviewedBy: string | null;
        reviewedAt: string | null;
        reviewNotes: string | null;
        createdAt: string;
        user: {
          id: string;
          email: string;
          username: string;
          tier: string;
          createdAt: string;
          emailVerified: boolean;
          walletAddress: string | null;
        };
      };
      existingAffiliate: {
        id: string;
        referralCode: string;
        payoutMode: string;
        isActive: boolean;
        isFrozen: boolean;
        totalReferrals: number;
        createdAt: string;
      } | null;
      priorApplications: Array<{
        id: string;
        status: string;
        createdAt: string;
        reviewedAt: string | null;
        reviewNotes: string | null;
      }>;
    }>(`/admin/affiliate/applications/${id}`),

  adminApproveAffiliateApplication: (
    id: string,
    opts?: { notes?: string; overrideSlug?: string },
  ) => {
    const body: { notes?: string; overrideSlug?: string } = {};
    if (opts?.notes) body.notes = opts.notes;
    if (opts?.overrideSlug) body.overrideSlug = opts.overrideSlug;
    return req<{
      affiliate: {
        id: string;
        referralCode: string;
        payoutMode: string;
        createdAt: string;
      };
    }>(`/admin/affiliate/applications/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  adminRejectAffiliateApplication: (id: string, notes: string) =>
    req<{
      application: { id: string; status: string; reviewNotes: string | null };
    }>(`/admin/affiliate/applications/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  adminListAffiliates: (
    params: {
      status?: "active" | "frozen" | "all";
      limit?: number;
      cursor?: string;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.cursor) qs.set("cursor", params.cursor);
    return req<{
      affiliates: Array<{
        id: string;
        referralCode: string;
        userId: string;
        userEmail: string;
        userUsername: string;
        payoutMode: "CASH_ONLY" | "CREDITS_ONLY" | "HYBRID";
        isActive: boolean;
        isFrozen: boolean;
        frozenReason: string | null;
        totalReferrals: number;
        totalPaidRefs: number;
        lifetimeEarnedCashUsd: number;
        lifetimeEarnedCredits: number;
        payableCashUsd: number;
        payableCredits: number;
        createdAt: string;
      }>;
      nextCursor: string | null;
    }>(`/admin/affiliate/affiliates${qs.toString() ? `?${qs}` : ""}`);
  },

  adminGetAffiliate: (id: string) =>
    req<{
      affiliate: {
        id: string;
        referralCode: string;
        payoutMode: "CASH_ONLY" | "CREDITS_ONLY" | "HYBRID";
        payoutAddress: string | null;
        isActive: boolean;
        isFrozen: boolean;
        frozenReason: string | null;
        totalReferrals: number;
        totalPaidRefs: number;
        lifetimeEarnedCashUsd: number;
        lifetimeEarnedCredits: number;
        createdAt: string;
        user: {
          id: string;
          email: string;
          username: string;
          tier: string;
          createdAt: string;
          emailVerified: boolean;
          walletAddress: string | null;
        };
      };
      referrals: Array<{
        id: string;
        referredAt: string;
        referredEmail: string;
        referredTier: string | null;
        isFlagged: boolean;
        flagReason: string | null;
      }>;
      commissions: Array<{
        id: string;
        createdAt: string;
        sourceType: "SUBSCRIPTION" | "FOUNDING_MEMBER";
        sourceAmountUsd: number;
        cashAmountUsd: number;
        creditsAmount: number;
        status: "PENDING" | "PAYABLE" | "PAID" | "VOIDED";
        payableAt: string;
        paidOutAt: string | null;
        payoutId: string | null;
      }>;
      payouts: Array<{
        id: string;
        processedAt: string;
        processedBy: string;
        cashAmountUsd: number;
        cashTxHash: string | null;
        cashCurrency: string | null;
        creditsAmount: number;
        creditsAppliedAt: string | null;
        adminNote: string;
        commissionCount: number;
      }>;
      stats: {
        totalReferrals: number;
        paidReferrals: number;
        pending: { cashUsd: number; credits: number };
        payable: { cashUsd: number; credits: number };
        paid: { cashUsd: number; credits: number };
        voided: { count: number };
        lifetime: {
          cashUsdEarned: number;
          creditsEarned: number;
          cashUsdPaidOut: number;
          creditsPaidOut: number;
        };
      };
    }>(`/admin/affiliate/affiliates/${id}`),

  adminFreezeAffiliate: (id: string, reason: string) =>
    req<{
      affiliate: { id: string; isFrozen: boolean; frozenReason: string | null };
    }>(`/admin/affiliate/affiliates/${id}/freeze`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  adminUnfreezeAffiliate: (id: string) =>
    req<{
      affiliate: { id: string; isFrozen: boolean; frozenReason: string | null };
    }>(`/admin/affiliate/affiliates/${id}/unfreeze`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  adminListPendingPayouts: () =>
    req<{
      pending: Array<{
        affiliateId: string;
        referralCode: string;
        userEmail: string;
        payoutMode: "CASH_ONLY" | "CREDITS_ONLY" | "HYBRID";
        payoutAddress: string | null;
        isFrozen: boolean;
        payableCashUsd: number;
        payableCredits: number;
        commissionCount: number;
        oldestPayableAt: string | null;
      }>;
    }>("/admin/affiliate/payouts/pending"),

  adminProcessAffiliatePayout: (
    id: string,
    body: {
      commissionIds: string[];
      cashTxHash?: string;
      cashCurrency?: "SOL" | "USDC" | "HATCHER";
      creditsAppliedAt?: string;
      adminNote?: string;
    },
  ) =>
    req<{
      payout: {
        id: string;
        cashAmountUsd: number;
        creditsAmount: number;
        commissionCount: number;
        processedAt: string;
      };
    }>(`/admin/affiliate/affiliates/${id}/payout`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
