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

export type SolanaPaymentToken = "sol" | "hatch" | "usdc" | "kausa" | "ansem";

export type SolanaPaymentTarget =
  | { kind: "tier"; key: string; billingPeriod?: "monthly" | "annual" }
  | { kind: "addon"; key: string; billingPeriod?: "monthly" | "annual"; agentId?: string };

export type SolanaPaymentIntentRequest = SolanaPaymentTarget & {
  paymentToken: SolanaPaymentToken;
  payerWallet: string;
};

export interface SolanaPaymentQuote {
  intentId?: string;
  memo: string;
  expiresAt: string;
  payerWallet: string;
  recipientWallet: string;
  tokenMint: string | null;
  amountUsd: number;
  expectedAmount: number;
  minAcceptable: number;
  paymentToken: SolanaPaymentToken;
}

export interface SolanaPaymentIntent extends SolanaPaymentQuote {
  intentId: string;
  featureKey: string;
  target: SolanaPaymentTarget;
}

export interface DispatchSkinPaymentIntent extends SolanaPaymentQuote {
  intentId: string;
  featureKey: string;
  target: { kind: "dispatch_skin"; key: string };
}

export type SolanaRecurringAsset = "usdc";

export type SolanaRecurringTarget =
  | { kind: "tier"; key: string; billingPeriod?: "monthly" }
  | { kind: "addon"; key: string; billingPeriod?: "monthly"; agentId?: string };

export interface SolanaRecurringAssetConfig {
  asset: SolanaRecurringAsset;
  symbol: string;
  tokenMint: string;
  tokenProgram: string;
  decimals: number;
  stableUsd: boolean;
  requiresWrappedBalance: boolean;
}

export interface SolanaRecurringQuote {
  target: SolanaRecurringTarget;
  featureKey: string;
  description: string;
  amountUsd: number;
  asset: SolanaRecurringAssetConfig;
  amountPerPeriodBaseUnits: string;
  amountPerPeriodHuman: number;
  periodSeconds: number;
  allowancePeriods: number;
  startAt: string;
  expiresAt: string;
  delegateeWallet: string;
  subscriptionsProgramId: string;
  notes: string[];
}

export type SolanaRecurringQuoteRequest = SolanaRecurringTarget & {
  asset: SolanaRecurringAsset;
  allowancePeriods?: number;
};

export interface SolanaRecurringCancelRequest {
  revocationTxSignature: string;
}

export type SolanaRecurringSetupRecordInput = SolanaRecurringQuoteRequest & {
  ownerWallet: string;
  tokenAccount: string;
  subscriptionAuthority: string;
  delegationPda: string;
  nonce: string;
  authorityTxSignature?: string;
  delegationTxSignature: string;
  amountPerPeriodBaseUnits: string;
  amountPerPeriodHuman: number;
  startAt: string;
  expiresAt: string;
  walletProofSignature: string;
  metadata?: Record<string, unknown>;
};

export interface SolanaRecurringAuthorization {
  id: string;
  userId: string;
  agentId: string | null;
  targetKind: "tier" | "addon";
  targetKey: string;
  billingPeriod: "monthly";
  featureKey: string;
  asset: SolanaRecurringAsset;
  tokenMint: string;
  tokenProgram: string;
  amountUsd: string | number;
  amountPerPeriod: string | number;
  amountPerPeriodBaseUnits: string;
  periodSeconds: number;
  allowancePeriods: number;
  ownerWallet: string;
  tokenAccount: string;
  delegateeWallet: string;
  subscriptionAuthority: string;
  delegationPda: string;
  nonce: string;
  authorityTxSignature: string | null;
  delegationTxSignature: string;
  status: string;
  startAt: string;
  expiresAt: string;
  nextChargeAt: string | null;
  lastChargedAt: string | null;
  lastAttemptAt?: string | null;
  lastFailureAt?: string | null;
  lastError?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

export type LiftFramework = "openclaw" | "hermes";
export type LiftCandidateKind = "profile" | "memory" | "skill";

export interface LiftSecretFinding {
  path: string;
  line: number;
  kind: string;
  key: string;
  fingerprint: string;
}

export interface LiftReviewCandidate {
  id: string;
  sourcePath: string;
  kind: LiftCandidateKind;
  targetPath: string;
  sizeBytes: number;
  eligible: boolean;
  blockedReason?:
    | "secrets_detected"
    | "sensitive_path"
    | "unsupported_content"
    | "target_collision";
}

export interface LiftReview {
  framework: LiftFramework;
  profile: {
    name?: string;
    description?: string;
    systemPromptPreview?: string;
    sources: Partial<Record<"name" | "description" | "systemPrompt", string>>;
  };
  environmentKeys: {
    detected: string[];
    allowed: string[];
    blocked: string[];
    valuesImported: false;
  };
  candidates: LiftReviewCandidate[];
  ignoredPaths: string[];
  requiresExplicitApproval: true;
}

export interface LiftArchiveSummary {
  compressedBytes: number;
  expandedBytes: number;
  entryCount: number;
  fileCount: number;
  retainedTextBytes: number;
}

export interface LiftImport {
  id: string;
  sourceFramework: LiftFramework;
  sourceFilename: string;
  status: string;
  review: LiftReview;
  secretFindings: LiftSecretFinding[];
  archiveSummary: LiftArchiveSummary;
  expiresAt: string;
  committedAt: string | null;
  appliedAt: string | null;
  createdAgentId: string | null;
  createdAt: string;
}

export interface CommitLiftImportBody {
  approvedCandidateIds: string[];
  name?: string;
  description?: string | null;
}

export type MissionTaskStatus =
  | "ready"
  | "pending_approval"
  | "pending_review"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "rejected";

export type MissionRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type MissionApprovalStatus = "pending" | "approved" | "rejected";

export interface MissionTaskRunEvent {
  id?: string;
  type?: string;
  message?: string | null;
  progress?: number | null;
  createdAt?: string;
  [key: string]: unknown;
}

export interface MissionTaskRun {
  id: string;
  attempt: number;
  status: MissionRunStatus;
  output: unknown;
  error: string | null;
  costAiCredits: number | null;
  claimedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  cancelRequestedAt: string | null;
  createdAt: string;
  events?: MissionTaskRunEvent[];
}

export interface MissionTaskApproval {
  id: string;
  status: MissionApprovalStatus;
  note: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decidedById: string | null;
}

export interface MissionTaskArtifact {
  id: string;
  runId: string;
  kind: string;
  name: string;
  mediaType: string | null;
  url: string | null;
  path: string | null;
  content: unknown;
  createdAt: string;
}

export interface OutcomePackSkillStatus {
  name: string;
  status: string;
  installed: boolean;
}

export interface OutcomePackSkillReadiness {
  required: boolean;
  ready: boolean;
  skills: OutcomePackSkillStatus[];
}

export interface OutcomePackReviewPolicy {
  mode: "manual_required";
}

export interface MissionTask {
  id: string;
  agentId: string;
  agent?: Pick<Agent, "id" | "name" | "framework" | "status">;
  title: string;
  description: string | null;
  prompt: string;
  status: MissionTaskStatus;
  source: string;
  sourceId: string | null;
  sourceVersion: string | null;
  acceptanceChecks: unknown[];
  scheduleTemplates: unknown[];
  reviewPolicy: OutcomePackReviewPolicy | null;
  outcomePackSkillReadiness: OutcomePackSkillReadiness | null;
  requiresApproval: boolean;
  budget: {
    aiCredits: number | null;
    maxRuntimeSeconds: number | null;
  };
  cost: {
    status: "not_measured" | "measured";
    aiCredits: number | null;
  };
  createdAt: string;
  updatedAt: string;
  latestRun: MissionTaskRun | null;
  approvals: MissionTaskApproval[];
  artifacts: MissionTaskArtifact[];
}

export interface MissionTaskSummary {
  total: number;
  active: number;
  awaitingApproval: number;
  completed: number;
  failed: number;
  cancelled: number;
  needsAttention?: number;
  byStatus?: Partial<Record<MissionTaskStatus, number>>;
  agents?: Array<{
    agentId: string;
    name: string;
    active: number;
    needsAttention: number;
  }>;
}

export interface MissionTasksResponse {
  tasks: MissionTask[];
  nextCursor: string | null;
  summary?: MissionTaskSummary;
}

export interface CreateMissionTaskBody {
  title: string;
  prompt: string;
  description?: string;
  requiresApproval?: boolean;
  budgetAiCredits?: number;
  maxRuntimeSeconds?: number;
  source?: string;
}

export type CityOperationalAgentStatus =
  | "running"
  | "sleeping"
  | "paused"
  | "crashed";

export interface CityOperationsSummary {
  agents: {
    total: number;
    running: number;
    sleeping: number;
    paused: number;
    crashed: number;
    needsAttention: number;
    items: Array<{
      id: string;
      name: string;
      framework: string;
      status: CityOperationalAgentStatus;
      reason: string | null;
    }>;
  };
  tasks: {
    total: number;
    active: number;
    awaitingApproval: number;
    failed: number;
    completed: number;
    pendingApprovals: number;
  };
  incidents: {
    unreadCount: number;
    items: Array<{
      id: string;
      title: string;
      body: string;
      createdAt: string;
    }>;
  };
  delegations: Array<{
    id: string;
    source: { id: string; name: string; owned: boolean };
    target: { id: string; name: string; owned: boolean };
    status: string;
    latencyMs: number;
    createdAt: string;
  }>;
  partnerEarnings: {
    windowDays: number;
    verifiedGrossSettlements: number;
    byAsset: Array<{ asset: string; amount: number }>;
    partial: boolean;
  };
  generatedAt: string;
}

export interface PublicOutcomePackInputField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  maxLength?: number;
  maxItems?: number;
  options?: string[];
}

export interface PublicOutcomePackPrerequisite {
  id: string;
  label: string;
}

export interface PublicOutcomePack {
  id: string;
  version: string;
  title: string;
  summary: string;
  category: string;
  compatibleFrameworks: string[];
  requiredSkills: string[];
  prerequisites: PublicOutcomePackPrerequisite[];
  inputFields: PublicOutcomePackInputField[];
  deliverables: unknown[];
  budgetTargetAiCredits: number | null;
  maxRuntimeSeconds: number | null;
  acceptanceChecks: unknown[];
  schedules: unknown[];
  launchPolicy: unknown;
}

export interface PreparedOutcomePackTask {
  id: string;
  title: string;
  description: string | null;
  prompt: string;
}

export interface PreparedOutcomePackAgent {
  id: string;
  name: string;
  framework: string;
  status: string;
}

export interface PreparedOutcomePackWarning {
  code: string;
  label: string;
  params?: Record<string, string | number>;
}

export interface PreparedOutcomePack {
  pack: {
    id: string;
    version: string;
    title: string;
  };
  agent: PreparedOutcomePackAgent;
  compatible: boolean;
  missingPrerequisites: PublicOutcomePackPrerequisite[];
  warnings: PreparedOutcomePackWarning[];
  resolvedTasks: PreparedOutcomePackTask[];
  requiredSkills: string[];
  budgetTargetAiCredits: number | null;
  maxRuntimeSeconds: number | null;
  acceptanceChecks: unknown[];
  schedules: unknown[];
  launchPolicy: unknown;
}

export interface OutcomePackLaunchTask {
  id: string;
  agentId: string;
  title: string;
  description: string | null;
  prompt: string;
  status: string;
  source: string;
  sourceId: string;
  sourceVersion: string;
  budget: unknown;
  acceptanceChecks: unknown[];
  scheduleTemplates: unknown[];
  createdAt: string;
}

export interface PrepareOutcomePackBody {
  agentId: string;
  inputs: Record<string, string | number | string[]>;
}

export interface LaunchOutcomePackBody extends PrepareOutcomePackBody {
  idempotencyKey: string;
  activateSchedules: false;
}

export interface LaunchOutcomePackResponse {
  task: OutcomePackLaunchTask;
  requiredSkills: Array<{ name: string; status: string }>;
  schedulesActivated: false;
  start: { method: string; path: string };
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

export type McpConnectorTransport = "streamable_http" | "sse";
export type McpConnectorAuthType = "none" | "bearer";
export type McpConnectorApprovalMode = "auto" | "prompt" | "approve";

export interface McpConnectorTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: unknown;
}

export interface McpConnectorToolPolicy {
  enabledTools?: string[];
  disabledTools?: string[];
  approvalMode?: McpConnectorApprovalMode;
}

export interface McpConnector {
  id: string;
  userId: string;
  agentId: string;
  name: string;
  serverUrl: string;
  transport: McpConnectorTransport | string;
  authType: McpConnectorAuthType | string;
  tokenPrefix: string | null;
  status: "pending" | "ready" | "error" | "revoked" | string;
  tools: McpConnectorTool[];
  toolPolicy: McpConnectorToolPolicy;
  metadata: unknown;
  lastCheckedAt: string | null;
  lastError: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMcpConnectorBody {
  name: string;
  serverUrl: string;
  transport?: McpConnectorTransport;
  auth?: { type: "none" } | { type: "bearer"; bearerToken: string };
  enabledTools?: string[];
  disabledTools?: string[];
  approvalMode?: McpConnectorApprovalMode;
}

export interface CreateMcpConnectorResponse {
  connector: McpConnector;
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
  keySource: "xona" | "none";
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

export interface VirtualsAgentSettings {
  enabled: boolean;
  allowRuntimeSearch: boolean;
  allowJobDrafts: boolean;
  dailyBudgetUsd: number;
  maxPerJobUsd: number;
  preferredModel: string;
  scoutQueries: string[];
}

export interface VirtualsConfigStatus {
  enabled: boolean;
  acpApiUrl: string;
  computeBaseUrl: string;
  computeConfigured: boolean;
  computeModel: string;
  hatcherLabsAgent: {
    id: string | null;
    walletAddress: string | null;
    solWalletAddress: string | null;
    builderCode: string | null;
    consoleAgentId: string | null;
  };
  defaultChainId: number;
  maxTopK: number;
  hatcherServices: VirtualsHatcherService[];
  settings: VirtualsAgentSettings;
}

export interface VirtualsHatcherService {
  id: string;
  title: string;
  summary: string;
  category: 'execution' | 'review' | 'launch' | 'data' | 'integration' | 'evaluation';
  providerName: 'HatcherLabs';
  providerWalletAddress: string | null;
  providerConsoleAgentId: string | null;
  offeringName: string;
  priceValue: number;
  priceType: 'fixed';
  slaMinutes: number;
  publishable: boolean;
  idealFor: string[];
  outcomes: string[];
  requirementTemplate: Record<string, unknown>;
  deliverableTemplate: Record<string, unknown>;
  publishPayload: {
    agentId: string | null;
    consoleAgentId: string | null;
    providerWalletAddress: string | null;
    offeringName: string;
    name: string;
    description: string;
    priceValue: number;
    priceType: 'fixed';
    slaMinutes: number;
    requirement: Record<string, unknown>;
    deliverable: Record<string, unknown>;
  };
}

export interface VirtualsConfigBody {
  enabled?: boolean;
  allowRuntimeSearch?: boolean;
  allowJobDrafts?: boolean;
  dailyBudgetUsd?: number;
  maxPerJobUsd?: number;
  preferredModel?: string;
  scoutQueries?: string[];
}

export interface VirtualsAcpSearchParams {
  q?: string;
  topK?: number;
  agentVersions?: string;
  includeHidden?: boolean;
}

export interface VirtualsOfferingSummary {
  id: string | null;
  name: string;
  description: string | null;
  priceValue: number | null;
  priceType: string | null;
  slaMinutes: number | null;
  requiredFunds: boolean;
  isHidden: boolean;
  requirement: unknown;
  deliverable: unknown;
}

export interface VirtualsAgentSummary {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  walletAddress: string | null;
  solWalletAddress: string | null;
  role: string | null;
  rating: number | null;
  successRate: number | null;
  builderCode: string | null;
  consoleAgentId: string | null;
  isHidden: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastActiveAt: string | null;
  offerings: VirtualsOfferingSummary[];
  resourcesCount: number;
  subscriptionsCount: number;
}

export interface VirtualsScoutResult extends VirtualsAgentSummary {
  queryMatches: string[];
  hatcherScore: number;
  reasons: string[];
}

export interface VirtualsScoutBody {
  queries?: string[];
  topK?: number;
  maxResults?: number;
}

export interface VirtualsJobDraftBody {
  providerWalletAddress: string;
  providerName?: string;
  offeringId?: string;
  offeringName: string;
  offering?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  maxBudgetUsd?: number;
  chainId?: number;
  evaluatorAddress?: string;
}

export interface VirtualsJobDraftResponse {
  provider: {
    name: string | null;
    walletAddress: string;
  };
  offering: {
    id: string | null;
    name: string;
    raw: Record<string, unknown> | null;
  };
  chainId: number;
  requirements: Record<string, unknown>;
  maxBudgetUsd: number | null;
  evaluatorAddress: string | null;
  guardrails: {
    requiresHumanApproval: true;
    fundEscrowAutomatically: false;
    maxBudgetUsd: number | null;
  };
  sdkPlan: {
    packageName: string;
    method: string;
    args: Record<string, unknown>;
  };
  cliPlan: {
    listen: string;
    createJob: string;
    fund: string;
    complete: string;
  };
}

export interface VirtualsComputeProbeBody {
  model?: string;
  message?: string;
  maxTokens?: number;
}

export interface VirtualsComputeProbeResponse {
  model: string;
  id: string | null;
  outputText: string;
  usage: unknown;
}

export interface VirtualsAcpCliCommand {
  file: string;
  args: string[];
  display: string;
}

export interface VirtualsAcpOperatorStatus {
  enabled: boolean;
  command: VirtualsAcpCliCommand;
  eventsFile: string;
  listenCommand: VirtualsAcpCliCommand;
  hatcherLabsAgent: {
    id: string | null;
    walletAddress: string | null;
    solWalletAddress?: string | null;
    builderCode?: string | null;
    consoleAgentId?: string | null;
  };
}

export interface VirtualsAcpPublishServicesBody {
  serviceIds?: string[];
  dryRun?: boolean;
}

export interface VirtualsAcpPublishServiceResult {
  serviceId: string;
  offeringName: string;
  dryRun: boolean;
  executed: boolean;
  command?: VirtualsAcpCliCommand;
  stdout?: string | null;
  stderr?: string | null;
  parsedOutput?: unknown;
}

export interface VirtualsAcpPublishServicesResponse {
  dryRun: boolean;
  results: VirtualsAcpPublishServiceResult[];
}

export interface VirtualsAcpDrainEventsBody {
  file?: string;
  limit?: number;
}

export interface VirtualsAcpCliExecutionResponse {
  command: VirtualsAcpCliCommand;
  stdout: string;
  stderr: string;
  parsedOutput: unknown;
}

export interface VirtualsAcpProviderResponseBody {
  jobId: string;
  amountUsd: number;
  deliverable: string | Record<string, unknown>;
  chainId?: number;
  dryRun?: boolean;
}

export interface VirtualsAcpProviderResponseResult {
  dryRun: boolean;
  results: Array<{
    action: 'set-budget' | 'submit';
    executed: boolean;
    command?: VirtualsAcpCliCommand;
    stdout?: string;
    stderr?: string;
    parsedOutput?: unknown;
  }>;
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
  payerConfigured: boolean;
  payerSource: "mpp32" | "xona" | "none";
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
}

export interface VantaraCapabilityRegistration {
  id: string;
  agentId: string;
  ownerId: string;
  capabilityId: string | null;
  name: string;
  description: string;
  pricePerCallUsdc: number;
  providerReceiveWallet: string;
  platformFeeWallet: string;
  split: {
    providerBps: number;
    platformBps: number;
    vantaraBps: number;
  };
  callbackUrl: string;
  status: "draft" | "pending_registration" | "pending_update" | "live" | "paused" | "deleted" | "suspended" | "failed" | string;
  mode: "escrow" | "pay_then_serve" | "free" | string;
  acceptanceStatus: "not_started" | "pending_acceptance" | "accepted" | "failed" | string;
  acceptanceRequestId: string | null;
  selfServeManaged?: boolean;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface VantaraConfigStatus {
  enabled: boolean;
  baseUrl: string;
  hermesAgentId: string;
  route: string;
  settlement: "mpp-solana-usdc";
  maxPerCallUsdc: number;
  allowlist: {
    mint: string;
    recipient: string;
    memo: string;
  };
  consumer: {
    enabled: boolean;
    hermesAgentId: string;
    route: string;
    agentWallet: string | null;
    maxPerCallUsdc: number;
  };
  provider: {
    enabled: boolean;
    defaultName: string;
    defaultDescription: string;
    callbackUrl: string;
    platformFeeWallet: string;
    split: {
      providerBps: number;
      platformBps: number;
      vantaraBps: number;
    };
    registration: VantaraCapabilityRegistration | null;
  };
  recentCalls: Array<{
    id: string;
    requestId: string | null;
    status: string;
    verificationStatus: string;
    latencyMs: number;
    settlementMetadata: Record<string, unknown>;
    requestMetadata: Record<string, unknown>;
    createdAt: string | null;
  }>;
}

export interface VantaraProviderSettingsBody {
  name: string;
  description: string;
  pricePerCallUsdc: number;
  providerReceiveWallet?: string;
}

export interface VantaraProviderPinBody {
  capabilityId: string;
  acceptanceStatus?: "pending_acceptance" | "accepted" | "failed";
}

export interface VantaraCapabilityStatusBody {
  status: "live" | "paused";
}

export interface VantaraCapabilityCallsResponse {
  capabilityId: string;
  selfServeManaged?: boolean;
  calls: Array<{
    requestId?: string | null;
    mode?: string;
    status?: string;
    amountUsdc?: number;
    payerWallet?: string | null;
    providerWallet?: string | null;
    paymentSig?: string | null;
    releaseSig?: string | null;
    platformSig?: string | null;
    refundSig?: string | null;
    callbackStatus?: number | string | null;
    createdAt?: string | null;
    [key: string]: unknown;
  }>;
}

export interface VantaraHermesInvokeBody {
  prompt: string;
  maxTokens?: number;
}

export interface VantaraHermesInvokeResponse {
  status: number;
  vantaraRequestId: string | null;
  amountPaidUsdc: number;
  txSignature: string;
  payer: string;
  paymentReceipt: string | null;
  data: {
    output: string;
    latencyMs: number;
    modelTier: string;
  };
}

export type MetaplexConfigStatusValue = "disabled" | "wallet-missing" | "metadata-ready" | "registered";

export interface MetaplexAgentService {
  name: "web" | "A2A" | "MCP" | "Hatcher API" | string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface MetaplexRegistrationDocument {
  type: string;
  name: string;
  description: string;
  image: string;
  services: MetaplexAgentService[];
  active: boolean;
  x402Support: boolean;
  registrations: Array<{
    agentId: string;
    agentRegistry: string;
  }>;
  supportedTrust: Array<"reputation" | "crypto-economic" | string>;
  payment?: {
    settlement: "x402" | string;
    network: string;
    token: string | null;
    payTo: string;
    resource: string;
  };
  hatcher: {
    agentId: string;
    slug: string;
    runtime: string;
    owner: string;
    createdAt: string;
    profile: string;
    registrationUri: string;
  };
}

export interface MetaplexConfigStatus {
  enabled: boolean;
  registrationEnabled: boolean;
  configured: boolean;
  status: MetaplexConfigStatusValue;
  missing: string[];
  capabilities: {
    metadata: boolean;
    registration: boolean;
    x402: boolean;
    executive: boolean;
    genesis: boolean;
  };
  metadataUri: string;
  coreAssetMetadataUri: string;
  metaplexStatus: string;
  solanaWalletAddress: string | null;
  metaplexAsset: string | null;
  registryAddress: string;
  registeredAt: string | null;
  agentToken: MetaplexExistingAgentToken | null;
  registrationDocument: MetaplexRegistrationDocument;
}

export interface MetaplexMintAgentPlan {
  kind: "metaplex.mint-agent.v1";
  sdkFunction: "mintAgent";
  ready: boolean;
  missing: string[];
  rpcUrl: string;
  network: string;
  request: {
    wallet: string | null;
    network: "solana-mainnet" | "solana-devnet" | "localnet";
    name: string;
    uri: string;
    agentMetadata: MetaplexRegistrationDocument;
  };
  packages: {
    agentRegistry: string;
    umi: string;
    umiBundleDefaults: string;
  };
  notes: string[];
}

export interface MetaplexExistingAgentToken {
  mintAddress: string;
  genesisAccount: string | null;
  launchId: string | null;
  launchUrl: string | null;
  launchedAt: string | null;
}

export interface MetaplexTokenLaunchInput {
  name: string;
  symbol: string;
  image: string | null;
  description?: string;
  externalLinks?: {
    website?: string;
    twitter?: string;
    telegram?: string;
  };
  firstBuyAmount?: number;
  launchType?: "bondingCurve" | "launchpool";
  launchpool?: {
    tokenAllocation: number;
    depositStartTime: string;
    raiseGoal: number;
    raydiumLiquidityBps: number;
    fundsRecipient?: string;
  };
  confirmPermanentToken?: boolean;
}

export interface MetaplexRegistrationPrepareInput {
  wallet: string;
}

export interface MetaplexRegistrationPrepareResponse {
  wallet: string;
  assetAddress: string;
  agentRegistrationUri: string;
  metadataUri: string;
  transactions: string[];
  blockhash: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
  signingMode?: "wallet-first-asset-cosign" | "hosted-mint-agent";
  cosignerToken?: string;
  status: "prepared";
}

export interface MetaplexRegistrationCompleteInput {
  wallet: string;
  assetAddress: string;
  signature?: string;
  signedTransaction?: string;
  cosignerToken?: string;
}

export interface MetaplexTokenLaunchPlan {
  kind: "metaplex.genesis-agent-token.v1";
  sdkFunction: "createAndRegisterLaunch";
  ready: boolean;
  status: "disabled" | "asset_missing" | "not_ready" | "ready" | "launched";
  missing: string[];
  oneTokenPerAgent: true;
  existingToken: {
    mintAddress: string;
    genesisAccount: string;
    launchId: string;
    launchUrl: string;
    launchedAt: string | null;
  } | null;
  request: {
    wallet: string | null;
    network: "solana-mainnet" | "solana-devnet";
    agent: {
      mint: string | null;
      setToken: true;
    };
    launchType: "bondingCurve" | "launchpool";
    token: {
      name: string;
      symbol: string;
      image: string | null;
      description?: string;
      externalLinks?: {
        website?: string;
        twitter?: string;
        telegram?: string;
      };
    };
    launch: {
      firstBuyAmount?: number;
      launchpool?: {
        tokenAllocation: number;
        depositStartTime: string;
        raiseGoal: number;
        raydiumLiquidityBps: number;
        fundsRecipient: string;
      };
    };
  };
  notes: string[];
}

export interface MetaplexTokenLaunchPrepareInput extends MetaplexTokenLaunchInput {
  wallet: string;
  launchWallet?: string;
}

export interface MetaplexTokenLaunchDelegationPrepareInput {
  wallet: string;
}

export interface MetaplexTokenLaunchDelegationPrepareResponse {
  wallet: string;
  agentAsset: string;
  status: "prepared" | "already_delegated";
  transactions: string[];
  blockhash: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
  registeredExecutive: boolean;
  alreadyDelegated: boolean;
}

export interface MetaplexTokenLaunchPrepareResponse {
  wallet: string;
  launchWallet?: string;
  status: "prepared";
  transactions: string[];
  blockhash: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
  mintAddress: string;
  genesisAccount: string;
}

export interface MetaplexTokenLaunchCompleteInput extends MetaplexTokenLaunchPrepareInput {
  signatures: string[];
  mintAddress: string;
  genesisAccount: string;
}

export interface MetaplexTokenLaunchTransactionSummary {
  kind?: string;
  version?: string | number;
  requiredSigners?: string[];
  signerSlots?: Array<{
    signer: string;
    signed?: boolean;
  }>;
  programs?: string[];
  writableAccounts?: string[];
  fullySigned?: boolean;
  requiresWalletSignature?: boolean;
  serializedBytes?: number;
  recentBlockhash?: string;
}

export interface MetaplexTokenLaunchClientEvent {
  phase: string;
  wallet?: string | null;
  launchWallet?: string | null;
  agentWallet?: string | null;
  mintAddress?: string | null;
  genesisAccount?: string | null;
  txIndex?: number;
  txCount?: number;
  signature?: string;
  transaction?: MetaplexTokenLaunchTransactionSummary;
  error?: {
    name?: string;
    message?: string;
    code?: string | number;
  };
}

export interface MetaplexTokenLaunchResponse {
  mintAddress: string;
  genesisAccount: string;
  launchId: string;
  launchUrl: string;
  tokenId: string;
  tokenMintAddress: string;
  txHashes: string[];
  launchedAt: string;
  status: "cached" | "launched";
}

export interface MetaplexTokenImageUploadResponse {
  id: string;
  url: string;
  size: number;
  contentType: "image/png" | "image/jpeg" | "image/webp";
}

export type MetaplexAvatarUploadResponse = MetaplexTokenImageUploadResponse;

export interface MetaplexRegistrationResponse {
  agentId: string;
  metadataUri: string;
  txHash: string;
  registeredAt: string;
  status: "cached" | "registered";
}

export type MirariRuntime = "hermes";
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

export type MedusaTier = 1 | 2 | 3;

export interface MedusaPassportSummary {
  valid: boolean;
  tier?: MedusaTier;
  tierLabel?: string;
  nullifier?: string;
  expiresAt?: string;
  errors: string[];
}

export interface MedusaPassportBadge {
  assetId: string;
  collection: string | null;
  frozen: boolean;
  solscanUrl: string;
}

export interface MedusaSavedConfig {
  campaignId?: string;
  claimWallet?: string;
  minTier?: MedusaTier;
  requireBadge?: boolean;
  badgeVerified?: boolean;
  registered?: boolean;
  registeredAt?: string;
  verifiedAt?: string;
  passport?: {
    tier?: MedusaTier;
    tierLabel?: string;
    nullifier?: string;
    expiresAt?: string;
  };
  badge?: MedusaPassportBadge | null;
}

export interface MedusaConfigStatus {
  campaignId: string;
  minTier: MedusaTier;
  requireBadge: boolean;
  badgeCollection: string;
  dasRpcConfigured: boolean;
  saved: MedusaSavedConfig | null;
}

export interface MedusaVerifyBody {
  passport: unknown;
  minTier?: MedusaTier;
}

export interface MedusaRegisterBody extends MedusaVerifyBody {
  claimWallet: string;
  campaignId?: string;
  requireBadge?: boolean;
}

export interface MedusaRegisterResponse {
  registered: boolean;
  campaignId: string;
  claimWallet: string;
  tier?: MedusaTier;
  tierLabel?: string;
  nullifier?: string;
  registeredAt?: string;
  badgeVerified: boolean;
  badge: MedusaPassportBadge | null;
  verification: MedusaPassportSummary;
}

export interface MedusaHandoffBody {
  state: string;
  passportUrl: string;
  status?: string;
}

export interface MedusaHandoffStateBody {
  claimWallet: string;
  campaignId?: string;
}

export interface MedusaHandoffStateResponse {
  state: string;
  expiresAt: string;
}

export interface MedusaHandoffResponse {
  completed: boolean;
  agentId: string;
  campaignId: string;
  claimWallet: string;
  verification: MedusaPassportSummary;
  badgeVerified: boolean;
  badge: MedusaPassportBadge | null;
}

export interface MedusaRotateResponse {
  rotated: boolean;
  previousClaimWallet: string;
  campaignId: string;
  claimWallet: string;
  tier?: MedusaTier;
  tierLabel?: string;
  nullifier?: string;
  registeredAt?: string;
  verification: MedusaPassportSummary;
}

export interface MedusaMintBadgeBody {
  passport: unknown;
  claimWallet?: string;
  campaignId?: string;
}

export interface MedusaMintBadgeResponse {
  minted: boolean;
  alreadyMinted: boolean;
  badge: MedusaPassportBadge;
}

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

export type AgentWalletActivityDirection = "in" | "out" | "self" | "unknown";

export interface AgentWalletActivityTransaction {
  id: string;
  network: AgentPassportNetworkId;
  chainType: AgentPassportChainType;
  signature: string;
  timestamp: string | null;
  type: string;
  direction: AgentWalletActivityDirection;
  amount: string | null;
  asset: string | null;
  from: string | null;
  to: string | null;
  description: string;
  explorerUrl: string | null;
}

export interface AgentWalletActivityNetwork {
  id: AgentPassportNetworkId;
  label: string;
  chainType: AgentPassportChainType;
  address: string | null;
  explorerUrl: string | null;
  transactions: AgentWalletActivityTransaction[];
  error: string | null;
}

export interface AgentWalletActivityResponse {
  generatedAt: string;
  networks: AgentWalletActivityNetwork[];
  notes: string[];
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
    }>;
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
