// ============================================================
// API Types — shared type definitions for the API client
//
// Types here represent the *serialized API response* shape
// (string dates, optional joined relations, subset of fields).
// Domain/DB types live in @hatcher/shared.
// ============================================================

import type {
  AgentFramework,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  WsChatMessage,
} from "@hatcher/shared";

// Re-export shared types that are used identically in the frontend
export type { TicketStatus, TicketCategory, TicketPriority };

/** Re-export WsChatMessage as ChatMessage for frontend use */
export type ChatMessage = WsChatMessage;

export interface ChatSessionSummary {
  id: string;
  title: string;
  preview: string | null;
  messageCount: number;
  startedAt: number;
  updatedAt: number;
  current: boolean;
}

/**
 * Payment as returned by the API (serialized dates, optional agent join).
 * Differs from shared Payment which has userId and Date fields.
 */
export interface Payment {
  id: string;
  agentId: string | null;
  featureKey: string;
  usdAmount: number;
  hatchAmount: number;
  txSignature: string;
  status: "pending" | "confirmed" | "failed" | "refunded";
  createdAt: string;
  agent?: { name: string };
}

/**
 * AgentFeature as returned by the API (serialized dates, simpler type field).
 * Differs from shared AgentFeature which uses FeatureKey/FeatureType enums and Date fields.
 */
export interface AgentFeature {
  id: string;
  featureKey: string;
  type: "one_time" | "subscription";
  expiresAt: string | null;
  userId: string;
  txSignature: string;
  createdAt: string;
}

export type StakingPoolKey = "7d" | "30d" | "90d";

export interface StakingPoolConfig {
  key: StakingPoolKey;
  label: string;
  durationDays: number;
  rewardShareBps: number;
  maxStakeHatcher: number;
  monthlyRewardBudgetHatcher: number;
  weeklyRewardBudgetHatcher: number;
  aiCreditsPerDayPerMillion: number;
  poolAddress: string | null;
  configured: boolean;
  estimatedAprAtCap: number;
  currentApr: number;
  activeStakeCount: number;
  totalStakedHatcher: number;
  streamflowUrl: string | null;
}

export interface StakingConfigResponse {
  reserveHatcher: number;
  monthlyEmissionHatcher: number;
  weeklyEmissionHatcher: number;
  aiCreditsPerWalletMonthlyCap: number;
  aiCreditsGlobalMonthlyCap: number;
  aiCreditExpiryDays: number;
  rewardModel: "continuous_funding";
  rewardToken: "HATCHER";
  aiCreditReward: true;
  rewardFundingSources: Array<"creator fees" | "buybacks" | "dev wallet">;
  totalStakedHatcher: number;
  pools: StakingPoolConfig[];
}

export interface StakingStakeEntry {
  stakeEntryAddress: string;
  depositNonce: number;
  poolKey: StakingPoolKey;
  poolAddress: string;
  walletAddress: string;
  stakedHatcher: number;
  createdAt: string;
  unlockAt: string;
  durationDays: number;
  claimableAiCredits: number;
  claimedAiCredits: number;
}

export interface UserStakingSummary {
  userId: string;
  walletAddress: string | null;
  configured: boolean;
  claimableAiCredits: number;
  activeStakes: StakingStakeEntry[];
}

export interface StakingClaimResponse {
  creditsGranted: number;
  balance: number;
  cappedByWallet: boolean;
  cappedByGlobal: boolean;
}

/**
 * Agent as returned by the API (serialized dates, optional joined relations).
 * Differs from shared Agent which is the full DB model with Date fields and AgentConfig.
 */
export interface Agent {
  id: string;
  name: string;
  slug?: string | null;
  description: string | null;
  avatarUrl: string | null;
  status: string;
  framework: AgentFramework;
  messageCount?: number;
  ownerId?: string;
  ownerUsername?: string;
  ownerAddress?: string;
  owner?: { username?: string; walletAddress?: string | null };
  config?: Record<string, unknown>;
  features?: Array<{ featureKey: string }>;
  isPublic?: boolean;
  commEnabled?: boolean;
  inactiveSince?: string | null;
  archivedAt?: string | null;
  archiveDeleteAfter?: string | null;
  // SKALE Phase 1+ — public wallet address for the agent (always non-null
  // for agents created after the schema migration). erc8004 fields appear
  // once Phase 2 registration ships. The encrypted private key is server-
  // only and never reaches this type.
  skaleWalletAddress?: string | null;
  skaleAgentId?: string | null;
  skaleRegisteredAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AgentCommPermission {
  id: string;
  allowedAgent: {
    id: string;
    name: string;
    framework: AgentFramework | string;
  };
  createdAt: string;
}

export interface AgentCommPermissionsResponse {
  commEnabled: boolean;
  permissions: AgentCommPermission[];
}

export interface AgentCommLog {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  message: string;
  response: string | null;
  status: string;
  latencyMs: number;
  chainId: string;
  chainDepth: number;
  createdAt: string;
}

export interface AgentCommLogsResponse {
  logs: AgentCommLog[];
}

export interface AgentCommCandidate {
  id: string;
  name: string;
  framework: AgentFramework | string;
  status: string;
  description: string | null;
  commEnabled: boolean;
  relation: "same-owner" | "same-team" | "permission";
  canCall: boolean;
  canCallReason?: "ready" | "target_disabled" | string;
}

export interface AgentCommDiscoverResponse {
  source: { id: string; commEnabled: boolean };
  agents: AgentCommCandidate[];
}

export interface AgentCommCallBody {
  targetAgentId: string;
  message: string;
  mode: "sync" | "async";
}

export interface AgentCommCallResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  latencyMs?: number;
  commLogId?: string;
  targetAgentId?: string;
}

export interface CovenantConnector {
  id: string;
  userId: string;
  agentId: string | null;
  name: string;
  tokenPrefix: string | null;
  pairingCode: string | null;
  status: "pending" | "online" | "offline" | "revoked" | string;
  metadata: unknown;
  lastSeenAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CovenantTask {
  id: string;
  dispatchId: string;
  userId: string;
  agentId: string;
  connectorId: string;
  status: string;
  intentText: string;
  context: unknown;
  grants: unknown;
  result: unknown;
  proof: unknown;
  trace: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  intentId: string | null;
  replyTo: string | null;
  deadlineMs: number;
  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCovenantConnectorResponse {
  connector: CovenantConnector;
  token: string;
  pairingCode: string;
}

export interface CovenantDispatchBody {
  connectorId?: string;
  text: string;
  context?: Record<string, unknown>;
  grants?: Array<{ scope: string; constraints?: Record<string, unknown> }>;
  deadlineMs?: number;
  replyTo?: string;
}

export interface CovenantDispatchResponse {
  task: CovenantTask;
  sent: boolean;
}

export interface AgentGithubTestResponse {
  tokenConfigured: boolean;
  tokenValid: boolean;
  githubLogin?: string | null;
  scopes?: string;
  repoConfigured: boolean;
  repoReachable: boolean;
  repo?: {
    fullName: string;
    private: boolean;
    defaultBranch: string | null;
    permissions: Record<string, boolean> | null;
  } | null;
  message: string;
}

export interface AgentGithubDisconnectResponse {
  disconnected: boolean;
  deletedKeys: string[];
  message: string;
}

export interface AgentGithubRepoListItem {
  fullName: string;
  private: boolean;
  defaultBranch: string | null;
  permissions: Record<string, boolean> | null;
  selected: boolean;
  allowed: boolean;
  pushedAt: string | null;
}

export interface AgentGithubReposResponse {
  tokenConfigured: boolean;
  defaultRepo: string | null;
  allowedReposConfigured: boolean;
  allowedRepos: string[];
  repos: AgentGithubRepoListItem[];
}

export interface AgentGithubConnectStartResponse {
  configured: boolean;
  authUrl: string | null;
  redirectUri?: string;
  message: string;
}

export interface AgentMailboxInfo {
  id: string;
  address: string;
  status: string;
}

export interface AgentMailSettings {
  autoSendEnabled: boolean;
}

export interface AgentMailRuntime {
  address: string;
  sendUrl: string;
  messagesUrl: string;
  mailboxUrl: string;
}

export type AgentMailDirection = "inbound" | "outbound";

export interface AgentMailMessage {
  id: string;
  agentId?: string;
  mailboxId?: string;
  direction?: AgentMailDirection | string;
  provider?: string;
  status?: string;
  providerMessageId?: string | null;
  fromAddress?: string;
  toAddresses?: string[] | unknown;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  headers?: Record<string, unknown> | unknown;
  errorMessage?: string | null;
  receivedAt?: string | null;
  sentAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetAgentMailboxResponse {
  mailbox: AgentMailboxInfo;
  settings: AgentMailSettings;
  runtime: AgentMailRuntime;
  instructions: string;
}

export interface GetAgentMailMessagesResponse {
  messages: AgentMailMessage[];
}

export interface SendAgentMailBody {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface SendAgentMailResponse {
  messageId: string;
  providerMessageId: string | null;
  status: string;
  mode: "mock" | "resend";
  from: string;
  to: string[];
}

export interface UpdateAgentMailSettingsBody {
  autoSendEnabled: boolean;
}

export interface UpdateAgentMailSettingsResponse {
  settings: AgentMailSettings;
}

export interface KausalayerConfigStatus {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  keySource?: "platform" | "agent" | "none";
}

export interface KausalayerConfigBody {
  enabled?: boolean;
  apiKey?: string;
}

export interface KausalayerTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface KausalayerToolsResponse {
  tools: KausalayerTool[];
}

export interface KausalayerHealthResponse {
  status?: string;
  service?: string;
  version?: string;
  [key: string]: unknown;
}

export interface KausalayerCallBody {
  tool: string;
  arguments: Record<string, unknown>;
}

export type KausalayerCallResponse = unknown;

export type XonaToolId =
  | "creative_director"
  | "generate_flux2_pro_image"
  | "pumpfun_movers"
  | "token_signal"
  | "token_starter_kit";

export interface XonaToolSummary {
  id: XonaToolId;
  label: string;
  description: string;
  method: "GET" | "POST";
  path: string;
  estimatedCostUsd: number;
  estimatedAiCredits: number;
  exampleBody?: Record<string, unknown>;
}

export interface XonaConfigStatus {
  enabled: boolean;
  configured: boolean;
  keySource: "xona" | "conduit" | "none";
  baseUrl: string;
  networks: string[];
  allowedHosts: string[];
  maxPerTxUsdc: number;
  maxPerDayUsdc: number;
  tools: XonaToolSummary[];
}

export interface XonaDiscoverBody {
  query?: string;
  limit?: number;
  networks?: string[];
}

export interface XonaCallBody {
  tool: XonaToolId;
  body?: Record<string, unknown>;
}

export interface XonaCallResponse {
  tool: XonaToolId;
  resourceUrl: string;
  status: number;
  network: string;
  amountPaid: string;
  amountPaidUsdc: number;
  txSig: string | null;
  aiCreditsCharged: number;
  data: unknown;
}

export type XonaDiscoverResponse = unknown[];

export type OrbisPayerSource = "orbis" | "base_hub" | "skale_hub" | "none";

export interface OrbisAgentSettings {
  enabled: boolean;
  dailyBudgetUsd: number;
  maxPerCallUsd: number;
  allowedApiSlugs: string[];
}

export interface OrbisConfigStatus {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  network: string;
  payerAddress: string | null;
  payerSource: OrbisPayerSource;
  allowedCategories: string[];
  allowedApiSlugs: string[];
  allowedHosts: string[];
  maxPerCallUsdc: number;
  maxPerDayUsdc: number;
  maxResponseBytes: number;
  settings: OrbisAgentSettings;
}

export interface OrbisConfigBody {
  enabled?: boolean;
  dailyBudgetUsd?: number;
  maxPerCallUsd?: number;
  allowedApiSlugs?: string[];
}

export interface OrbisSearchParams {
  q?: string;
  category?: string;
  chain?: "base" | "eip155:8453" | "solana";
  minPriceUsd?: number;
  maxPriceUsd?: number;
  limit?: number;
}

export interface OrbisApiSummary {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  tags?: unknown;
  baseUrl?: string | null;
  lowestPriceUsdc?: number | null;
  callCount?: number | null;
  uptimeScore?: number | null;
  healthStatus?: string | null;
  isActive?: boolean | null;
  [key: string]: unknown;
}

export interface OrbisApiDetail {
  api?: OrbisApiSummary;
  tiers?: Array<Record<string, unknown>>;
  endpoints?: Array<{
    method?: string | null;
    path?: string | null;
    overridePrice?: number | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export type OrbisCategoriesResponse = unknown;
export type OrbisSearchResponse = OrbisApiSummary[] | { apis?: OrbisApiSummary[]; data?: OrbisApiSummary[]; [key: string]: unknown };

export interface OrbisCallBody {
  apiSlug?: string;
  apiId?: string;
  endpointUrl?: string;
  path?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  workflowId?: string;
  maxCostUsd?: number;
}

export interface OrbisCallResponse {
  apiSlug: string | null;
  endpointUrl: string;
  status: number;
  network: string;
  amountPaid: string;
  amountPaidUsdc: number;
  txSig: string | null;
  payer: string | null;
  aiCreditsCharged: number;
  data: unknown;
}

export interface Mpp32AgentSettings {
  enabled: boolean;
  dailyBudgetUsd: number;
  maxPerCallUsd: number;
  authorityScope: string[];
}

export interface Mpp32ConfigStatus {
  enabled: boolean;
  baseUrl: string;
  settlement: "x402";
  agtpIdentityMode: "x402_only" | "hmac_sha256";
  network: string;
  maxPerCallUsdc: number;
  maxResponseBytes: number;
  partnerHeaders: {
    source: "X-Partner-Source";
    callerId: "X-Partner-Caller-Id";
  };
  settings: Mpp32AgentSettings;
}

export interface Mpp32ConfigBody {
  enabled?: boolean;
  dailyBudgetUsd?: number;
  maxPerCallUsd?: number;
  authorityScope?: string[];
}

export type MirariRuntime = "hermes" | "openclaw";
export type MirariSignalKind = "drift" | "contradiction" | "skill_misfire" | "focus_hit" | "judge_score";
export type MirariDreamMode = "stress_test" | "replay" | "consolidate";
export type MirariDreamTrigger = "manual" | "idle" | "scheduled";
export type MirariDreamFindingKind = "weakness" | "insight" | "contradiction" | "proposal";
export type MirariDreamFindingSeverity = "low" | "medium" | "high";

export interface MirariConfigStatus {
  enabled: boolean;
  configured: boolean;
  ingestUrl: string;
  ingestHost: string;
  workspaceId: string;
  grantConfigured: boolean;
  grantTtlSeconds: number;
  runtimeSupport: MirariRuntime[];
  scopes: string[];
  runtime: MirariRuntime;
}

export interface MirariTestSignalBody {
  kind?: MirariSignalKind;
  severity?: number;
  summary?: string;
  payload?: Record<string, unknown>;
  conversationId?: string;
}

export interface MirariSignalResult {
  ok: boolean;
  ingested: number;
  deduped: number;
}

export interface MirariDreamIngestedResponse {
  ok: true;
  session_id: string;
  findings_ingested: number;
  [key: string]: unknown;
}

export interface MirariDreamDedupedResponse {
  ok: true;
  deduped: true;
  session_id: string;
  [key: string]: unknown;
}

export interface MirariDreamPartialResponse {
  ok: true;
  session_id: string;
  findings_ingested: 0;
  error: "findings_insert_failed";
  [key: string]: unknown;
}

export interface MirariDreamFallbackResponse {
  delivery: "signal_fallback";
  reason: string;
  signal: MirariSignalResult;
  [key: string]: unknown;
}

export type MirariDreamResultBody =
  | MirariDreamIngestedResponse
  | MirariDreamDedupedResponse
  | MirariDreamPartialResponse
  | MirariDreamFallbackResponse;

export interface MirariDreamFindingBody {
  kind: MirariDreamFindingKind;
  severity?: MirariDreamFindingSeverity;
  title: string;
  detail?: string;
  target_ref?: Record<string, unknown>;
}

export interface MirariDreamBody {
  externalSessionId?: string;
  mode?: MirariDreamMode;
  trigger?: MirariDreamTrigger;
  status?: "complete" | "failed";
  summary?: string;
  error?: string;
  findings?: MirariDreamFindingBody[];
}

export interface MirariDreamResult {
  ok: true;
  status: number;
  body: MirariDreamResultBody;
}

export interface MirariGrantResponse {
  token: string;
  expiresAt: string;
  workspaceId: string;
  orgId: string;
  agentId: string;
  scopes: string[];
}

export type ConduitPayoutMode = "ai_credits" | "usdc_wallet";

export interface ConduitConfigBody {
  payoutMode: ConduitPayoutMode;
}

export interface ConduitConfigStatus {
  enabled: boolean;
  providerEnabled: boolean;
  baseUrl: string;
  payoutMode: ConduitPayoutMode;
  recipientWallet: string;
  agentWallet: string | null;
  defaultPriceUsdc: number;
  providerShareBps: number;
}

export interface ConduitProviderRegistration {
  id: string;
  providerId: string;
  agentId: string;
  walletAddress: string;
  endpointUrl: string;
  status: string;
  region: string | null;
  payoutMode: ConduitPayoutMode;
  pricePerCallUsdc: number;
  hmacSecretStored: boolean;
  hmacSecretStoredAt: string | null;
  hmacSecretRotatedAt: string | null;
  metadata: unknown;
  rawResponse: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ConduitProvidersResponse {
  providers: ConduitProviderRegistration[];
}

export interface ConduitRegisterProviderBody {
  pricePerCall?: number;
  payoutMode?: ConduitPayoutMode;
}

export interface ConduitProviderPatchBody {
  name?: string;
  description?: string;
  endpointUrl?: string;
  region?: string;
  status?: "active" | "offline";
}

export interface ConduitRegisterProviderResponse {
  provider: ConduitProviderRegistration;
  upstream: unknown;
}

export interface ConduitProviderActionResponse {
  provider: ConduitProviderRegistration;
  upstream?: unknown;
}

export type ConduitProtocolInfoResponse = unknown;
export type ConduitManifestResponse = unknown;

export interface ClawVilleProtocolPointer {
  version?: number;
  contentHash?: string;
  url?: string;
  [key: string]: unknown;
}

export interface ClawVilleRegistrationStatus {
  agentId: string;
  mode: string | null;
  name: string | null;
  species: string | null;
  walletAddress: string | null;
  sessionId: string | null;
  sessionExpiresAt: string | null;
  protocol: ClawVilleProtocolPointer | null;
  registeredAt: string | null;
  updatedAt: string | null;
}

export interface ClawVilleConfigStatus {
  enabled: boolean;
  configured: boolean;
  apiBaseUrl: string;
  proxyBaseUrl: string;
  issuerPublicKey: string | null;
  issuerWellKnownUrl: string;
  registered: boolean;
  registration: ClawVilleRegistrationStatus;
}

export interface ClawVilleRegisterBody {
  mode?: "avatar" | "override";
  name?: string;
  species?: string;
  personality?: string;
  stats?: { hp?: number; attack?: number; defense?: number; speed?: number };
  homeX?: number;
  homeY?: number;
  targetNpcId?: string;
  rotateScopedToken?: boolean;
}

export type ClawVillePatchBody = Partial<ClawVilleRegisterBody>;

export interface ClawVilleRegisterResponse {
  registration: unknown;
  local: ClawVilleConfigStatus;
}

export interface ClawVilleLaunchResponse {
  grantId: string;
  agentId: string;
  launchToken: string;
  launchUrl: string;
  expiresAt: string;
}

export type ClawVilleStatsResponse = unknown;

export interface EarnFiPaidJobEstimate {
  slots: number;
  rewardPerUser: string;
  estimatedUsd: number;
  settlementMode: string;
}

export interface EarnFiJobRecord {
  kind: "social" | "manual" | "interrupt" | string;
  jobId: string;
  statusUrl?: string | null;
  idempotencyKey?: string | null;
  estimatedUsd?: number | null;
  settlementMode?: string | null;
  aiCreditsCharged?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EarnFiConfigStatus {
  enabled: boolean;
  configured: boolean;
  apiBaseUrl: string;
  partnerSource: string;
  tokenStored: boolean;
  registered: boolean;
  registration: {
    earnFiAgentId: string | null;
    walletAddress: string | null;
    registeredAt: string | null;
    updatedAt: string | null;
  };
  paidJobs: {
    social: EarnFiPaidJobEstimate;
    manual: EarnFiPaidJobEstimate;
    interrupt: EarnFiPaidJobEstimate;
    pollingSeconds: number;
    maxEstimatedUsd?: number;
  };
  jobs: EarnFiJobRecord[];
}

export interface EarnFiRegisterResponse {
  registered: boolean;
  tokenStored: boolean;
  earnFiAgentId: string | null;
  walletAddress: string | null;
}

export interface EarnFiSocialJobBody {
  contentUrl: string;
  workflowId?: string;
  correlationId?: string;
}

export interface EarnFiInterruptJobBody {
  workflowId?: string;
  correlationId?: string;
}

export interface EarnFiManualJobBody {
  title: string;
  instructions: string;
  slots: number;
  rewardPerUser: string;
  verificationMethod: "manual" | "auto";
  workflowId?: string;
  correlationId?: string;
}

export interface EarnFiCreateJobResponse {
  job: EarnFiJobRecord;
  accounting?: {
    settlementMode: string;
    creditsCharged: number;
    estimatedUsd: number;
  };
  upstream?: unknown;
}

export type EarnFiPollResponse = unknown;

export interface OobeCapability {
  id: string;
  description: string | null;
  protocol_id?: string | null;
  protocolId?: string | null;
  version: string | null;
}

export interface OobeSapRegistration {
  registered: boolean;
  walletAddress: string;
  agentPda: string;
  txSignature: string | null;
  indexTxSignatures?: string[];
  registeredAt: string;
  indexedAt?: string | null;
  name: string;
  description: string;
  capabilities: OobeCapability[];
  protocols: string[];
  agentUri: string | null;
  x402Endpoint: string | null;
  pricePerCallUsdc: number;
}

export interface OobeConfigStatus {
  enabled: boolean;
  rpcConfigured: boolean;
  rpcUrl: string;
  cluster: "mainnet-beta" | "devnet" | "localnet";
  sapEnabled: boolean;
  sapRegistrationEnabled: boolean;
  sapProgramId: string;
  agentWallet: string | null;
  registration: OobeSapRegistration | null;
  defaultPriceUsdc: number;
  x402Enabled: boolean;
  x402ProviderEndpoint: string | null;
  x402DefaultPriceLamports: number;
}

export interface OobeRpcBody {
  method:
    | "getHealth"
    | "getSlot"
    | "getBalance"
    | "getAccountInfo"
    | "getTokenAccountBalance"
    | "getLatestBlockhash"
    | "getSignaturesForAddress"
    | "getTransaction"
    | "getParsedTransaction";
  params?: unknown[];
}

export interface OobeRegisterSapBody {
  name?: string;
  description?: string;
  capabilities?: Array<{
    id: string;
    description?: string | null;
    protocolId?: string | null;
    version?: string | null;
  }>;
  protocols?: string[];
  pricePerCallUsdc?: number;
  x402Endpoint?: string | null;
  force?: boolean;
}

export interface OobeRegisterSapResponse {
  registration: OobeSapRegistration;
  upstream: {
    txSignature: string | null;
    skipped?: boolean;
    indexTxSignatures?: string[];
    updateTxSignature?: string | null;
  };
}

export type OobeDiscoveryResponse = unknown;
export type OobeNetworkStatusResponse = unknown;

export interface OobeX402CallBody {
  endpointUrl: string;
  agentWallet: string;
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  calls?: number;
  maxCalls?: number;
  pricePerCallLamports?: number;
  depositLamports?: number;
  timeoutMs?: number;
}

export interface OobeX402BalanceBody {
  agentWallet: string;
  depositorWallet?: string;
}

export type OobeX402CallResponse = unknown;
export type OobeX402BalanceResponse = unknown;

export interface KausalayerResourceResult {
  tool: string;
  data: unknown | null;
  error: string | null;
}

export interface KausalayerResourcesResponse {
  config: KausalayerConfigStatus;
  privateResourcesAvailable: boolean;
  pockets: KausalayerResourceResult;
  savedWallets: KausalayerResourceResult;
  contacts: KausalayerResourceResult;
}

export type AgentPassportNetworkId = "skale" | "base" | "solana";
export type AgentPassportChainType = "evm" | "solana";
export type AgentPassportSignerMode =
  | "receive-only"
  | "runtime-signing"
  | "planned";
export type AgentPassportTradingStatus = "enabled" | "disabled";
export type AgentPassportStatus =
  | "registered"
  | "wallet-ready"
  | "planned"
  | "unavailable"
  | "server-unconfigured";

export interface AgentPassportNetwork {
  id: AgentPassportNetworkId;
  label: string;
  chainType: AgentPassportChainType;
  status: AgentPassportStatus;
  caip2: string;
  chainId?: number;
  walletAddress: string | null;
  agentId: string | null;
  registry: string | null;
  registryStatus: AgentPassportStatus;
  registeredAt: string | null;
  explorerUrl: string | null;
  contracts?: Record<string, string | null>;
  sharedWalletWith?: AgentPassportNetworkId;
  notes?: string[];
}

export interface AgentPassportPaymentRail {
  id: string;
  protocol: string;
  network: AgentPassportNetworkId;
  status: AgentPassportStatus;
  caip2: string;
  asset: string | null;
  receivingAddress: string | null;
  facilitatorUrl: string | null;
}

export interface AgentPassport {
  schemaVersion: 1;
  generatedAt: string;
  agent: {
    id: string;
    slug: string | null;
    name: string;
    description: string | null;
    framework: string;
    status: string;
    profileUrl: string;
    roomUrl: string;
    createdAt: string;
    updatedAt: string;
  };
  avatar: {
    kind: "hatcher-room-v2";
    stationId: "agentAvatar";
    imageUrl: string | null;
    roomUrl: string;
  };
  identity: {
    handle: string;
    primaryNetwork: AgentPassportNetworkId;
    networks: AgentPassportNetwork[];
  };
  wallets: Array<{
    id: string;
    chainType: AgentPassportChainType;
    status: AgentPassportStatus;
    address: string | null;
    networks: AgentPassportNetworkId[];
    signerMode: AgentPassportSignerMode;
  }>;
  runtime: {
    signerMode: AgentPassportSignerMode;
    trading: {
      status: AgentPassportTradingStatus;
      networks: AgentPassportNetworkId[];
      quoteProviders: Array<{
        id: "jupiter";
        network: "solana";
        status: AgentPassportTradingStatus;
        baseUrl: string;
      }>;
      notes: string[];
    };
  };
  payments: AgentPassportPaymentRail[];
  mcp: {
    status: AgentPassportStatus;
    manifestUrl: string;
    notes: string[];
  };
  links: {
    profile: string;
    room: string;
    passport: string;
    skaleMetadata: string;
    solanaMetadata: string;
  };
}

export interface AgentWalletTokenBalance {
  symbol: string;
  assetAddress: string | null;
  raw: string;
  formatted: string;
  decimals: number;
}

export interface AgentWalletNativeBalance {
  symbol: string;
  raw: string;
  formatted: string;
  decimals: number;
}

export interface AgentWalletNetworkBalance {
  id: AgentPassportNetworkId;
  label: string;
  chainType: AgentPassportChainType;
  status: AgentPassportStatus | string;
  caip2: string;
  chainId: string | null;
  address: string | null;
  explorerUrl: string | null;
  sharedWalletWith?: AgentPassportNetworkId;
  walletEnvVar: string;
  privateKeyEnvVar: string;
  canSign: boolean;
  nativeBalance: AgentWalletNativeBalance | null;
  tokenBalances: AgentWalletTokenBalance[];
  balanceError: string | null;
  identity: {
    agentId: string | null;
    registry: string | null;
    registrationTxHash: string | null;
    registeredAt: string | null;
    reputation?: {
      attestationCount: number;
      lastTxHash: string | null;
      lastTxAt: string | null;
      contract: string | null;
    };
  } | null;
}

export interface AgentWalletsResponse {
  networks: AgentWalletNetworkBalance[];
  runtime: {
    signerMode: AgentPassportSignerMode;
    transactionNetworks: AgentPassportNetworkId[];
    notes: string[];
  };
}

export interface AgentWalletPrivateKeyResponse {
  network: AgentPassportNetworkId;
  chainType: AgentPassportChainType;
  address: string;
  privateKey: string;
  format: "evm-hex" | "solana-base58-secret-key";
  sharedWalletWith?: AgentPassportNetworkId;
}

/**
 * Payment row as returned by the admin /payments endpoint.
 * Richer than the user-facing Payment shape — includes user + agent joins,
 * paymentToken, tokenAmount, and failureReason.
 */
export interface AdminPayment {
  id: string;
  userId: string;
  userEmail: string | null;
  userUsername: string | null;
  agentId: string | null;
  agentName: string | null;
  agentFramework: string | null;
  featureKey: string;
  usdAmount: number;
  hatchAmount: number;
  paymentToken: string | null;
  tokenAmount: number | null;
  txSignature: string;
  status: "pending" | "confirmed" | "failed" | "refunded";
  failureReason: string | null;
  createdAt: string;
}

/**
 * TicketMessage as returned by the API.
 * Differs from shared TicketMessage which has no id/ticketId and uses 'system' role.
 */
export interface TicketMessage {
  id?: string;
  ticketId?: string;
  role: "user" | "support" | "admin";
  content: string;
  /** API emits `timestamp`; older code paths may use `createdAt`. */
  timestamp?: string;
  createdAt?: string;
}

/**
 * Ticket as returned by the API (serialized dates, optional agent join).
 * Differs from shared SupportTicket which uses Date fields.
 */
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

// ── Analytics response types ─────────────────────────────────

export interface FunnelResponse {
  stages: Array<{ key: string; label: string; count: number; percent: number }>;
  windowDays: number;
  generatedAt: string;
}

export interface ChurnRadarResponse {
  atRisk: Array<{
    userId: string;
    email: string;
    tier: string;
    lastAgentActivity: string | null;
    createdAt: string;
  }>;
  thresholdDays: number;
  generatedAt: string;
}

export interface ReferralLeaderboardResponse {
  leaderboard: Array<{
    userId: string;
    email: string;
    username: string | null;
    referralCode: string | null;
    referralCount: number;
  }>;
  generatedAt: string;
}

export interface SignupHeatmapResponse {
  cells: Array<{ dow: number; hour: number; count: number }>;
  max: number;
  generatedAt: string;
}

export interface ErrorRateResponse {
  current24h: number;
  previous24h: number;
  deltaPct: number;
  generatedAt: string;
}

export interface WsCountResponse {
  chat: number;
  logs: number;
  terminal: number;
  total: number;
  generatedAt: string;
}

export interface LlmStatsResponse {
  perDay: Array<{ date: string; messages: number }>;
  topUsers: Array<{
    userId: string;
    email: string;
    username: string | null;
    tier: string;
    messagesLast7d: number;
  }>;
  rateLimitHitsToday: number;
  rateLimitHitsYesterday: number;
  generatedAt: string;
}

export interface AdminEgressEventsResponse {
  events: Array<{
    id: string;
    timestamp: string;
    agentId: string;
    host: string;
    port: number;
    allowed: boolean;
    reason?: string;
    tier?: string;
    address?: string;
    family?: 4 | 6;
    rateLimit?: { limit: number; remaining: number; resetMs?: number };
  }>;
  summary: {
    allowed: number;
    blocked: number;
    hosts: Array<{
      host: string;
      allowed: number;
      blocked: number;
      lastSeenAt: string;
    }>;
  };
  limit: number;
  agentId: string | null;
  generatedAt: string;
}

export type AgentEgressEventsResponse = Omit<
  AdminEgressEventsResponse,
  "agentId"
> & {
  agentId: string;
};

export interface AdminIdleOverviewResponse {
  generatedAt: string;
  config: {
    computeEnabled: boolean;
    providerEnabled: boolean;
    consumerBillingMode: "partner_free" | "ai_credits";
    providerCallbackConfigured: boolean;
    payoutWalletConfigured: boolean;
    providerDefaultPriceUsd: number;
    partnerApiConfigured?: boolean;
    partnerBaseUrl?: string | null;
  };
  partnerApi: {
    agentsStatus: number | null;
    usageStatus: number | null;
    earningsStatus: number | null;
    errors: string[];
  };
  consumer: {
    totalRequests: number;
    totalSpentUsd: number;
    byType: Array<{ type: string; requests: number; spentUsd: number | null }>;
    windows: Record<string, unknown> | null;
    pricing: Record<string, unknown> | null;
  };
  producer: {
    totalEarnedUsd: number;
    totalPaidUsd: number;
    totalPendingUsd: number;
    totalJobs: number;
    payoutSchedule: string | null;
    wallets: unknown[];
  };
  directNode?: {
    configured: boolean;
    wallet: string | null;
    status: number | null;
    errors: string[];
    container: {
      name: string;
      running: boolean;
      status: string;
      restartCount: number;
      startedAt: string | null;
      cpuLimitCores: number | null;
      memoryLimitMb: number | null;
      cpuPercent: number | null;
      memoryUsageMb: number | null;
    } | null;
    session: {
      processedJobs: number | null;
      lastJob: { type: string; earnedUsd: number; line: string } | null;
      logLines: string[];
    };
    earnings: {
      completedJobs: number;
      failedJobs: number;
      totalEarnedUsd: number;
      totalPaidUsd: number;
      pendingUsd: number;
      byType: Array<{ type: string; jobs: number }>;
    };
  };
  providers: {
    requiredCapabilities: string[];
    coverage: {
      activeRuntimeAgents: number;
      activeRunningAgents: number;
      activeRunningIdleEnvReady: number;
      idleEligibleNow: number;
      registeredHatcherProviders: number;
      registeredWithCurrentCapabilities: number;
    };
    missingRegistration: Array<{
      id: string;
      name: string;
      slug: string | null;
      framework: string;
      reason: string;
    }>;
    staleRegistrations: Array<{
      agentId: string;
      registryId: string | null;
      name: string | null;
      status: string | null;
      totalRequests: number;
    }>;
    duplicateRegistrations: Array<{ agentId: string; count: number }>;
    registrations: Array<{
      registryId: string | null;
      agentId: string | null;
      name: string | null;
      status: string | null;
      capabilities: string[];
      matchingCurrentCapabilities: boolean;
      pricePerRequest: number | null;
      totalRequests: number;
      totalEarnedUsd: number;
      stale: boolean;
    }>;
  };
}

export interface AdminConduitProviderRow {
  providerId: string;
  agentId: string;
  agentName: string;
  agentSlug: string | null;
  ownerId: string;
  ownerEmail: string | null;
  walletAddress: string;
  endpointUrl: string;
  status: string;
  region: string | null;
  payoutMode: ConduitPayoutMode;
  pricePerCallUsdc: number;
  hmacSecretStored: boolean;
  hmacSecretStoredAt: string | null;
  hmacSecretRotatedAt: string | null;
  adoptedLegacyProvider: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConduitSettlementRow {
  referenceId: string;
  jobId: string | null;
  agentId: string;
  agentName: string;
  ownerId: string;
  ownerEmail: string | null;
  payoutMode: ConduitPayoutMode;
  amountUsdc: number;
  providerShareUsdc: number;
  aiCreditsGranted: number;
  status: string;
  txHash: string | null;
  createdAt: string;
}

export interface AdminConduitExemptionWallet {
  walletAddress: string;
  activeProviders: number;
  providerIds: string[];
  agentNames: string[];
  payoutModes: ConduitPayoutMode[];
}

export interface AdminConduitOverviewResponse {
  generatedAt: string;
  config: {
    enabled: boolean;
    providerEnabled: boolean;
    baseUrl: string;
    treasurySignerConfigured: boolean;
    sharedHmacConfigured: boolean;
    payoutWalletConfigured: boolean;
    defaultPriceUsdc: number;
    providerShareBps: number;
  };
  errors: string[];
  protocol: {
    status: number | null;
    error: string | null;
    programs: Array<{ name: string; id: string }>;
    body: unknown;
  };
  tokenGate: {
    exemptionWallets: AdminConduitExemptionWallet[];
    note: string;
  };
  providers: {
    coverage: {
      total: number;
      active: number;
      archived: number;
      missingSecret: number;
      legacyAdopted: number;
      aiCreditsPayout: number;
      usdcPayout: number;
    };
    byStatus: Array<{ status: string; count: number }>;
    byPayoutMode: Array<{ status: ConduitPayoutMode; count: number }>;
    missingSecret: AdminConduitProviderRow[];
    legacyAdopted: AdminConduitProviderRow[];
    recent: AdminConduitProviderRow[];
  };
  settlements: {
    totalCount: number;
    totalAmountUsdc: number;
    totalProviderShareUsdc: number;
    aiCreditsGranted: number;
    last24hCount: number;
    last24hAmountUsdc: number;
    byPayoutMode: Array<{ status: ConduitPayoutMode; count: number }>;
    recent: AdminConduitSettlementRow[];
  };
}

export interface AdminOobeOverviewResponse {
  generatedAt: string;
  config: {
    enabled: boolean;
    rpcConfigured: boolean;
    rpcUrl: string;
    cluster: "mainnet-beta" | "devnet" | "localnet";
    sapEnabled: boolean;
    sapRegistrationEnabled: boolean;
    sapProgramId: string;
    defaultPriceUsdc: number;
    maxDiscoveryResults: number;
    x402Enabled: boolean;
    x402DefaultPriceLamports: number;
  };
  totals: {
    sampledAgents: number;
    registeredSapAgents: number;
    solanaWalletsInSample: number;
    unregisteredWithSolanaWallet: number;
  };
  registrations: Array<{
    agentId: string;
    agentName: string;
    framework: string;
    status: string;
    owner: { username: string | null; email: string | null };
    walletAddress: string | null;
    registration: OobeSapRegistration | null;
    updatedAt: string;
  }>;
  networkStatus: unknown;
}
