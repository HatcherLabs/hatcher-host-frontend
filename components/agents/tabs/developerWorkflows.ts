export interface AgentCommLogLike {
  status: string;
  latencyMs: number;
}

export interface AgentCommSummary {
  total: number;
  successes: number;
  failures: number;
  averageLatencyMs: number;
}

export interface AgentMeshLike {
  id: string;
  commEnabled: boolean;
  canCall: boolean;
  status: string;
}

export interface AgentMeshSummary {
  total: number;
  callable: number;
  needsEnable: number;
  active: number;
}

export interface EnvWrite {
  key: string;
  value: string;
}

export interface DevWorkflowNode {
  id: string;
  type: "workflowNode";
  position: { x: number; y: number };
  data: {
    label: string;
    subtype: string;
    category: "trigger" | "action" | "condition" | "response";
    [key: string]: unknown;
  };
}

export interface DevWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: DevWorkflowNode[];
  edges: Array<{ id: string; source: string; target: string }>;
}

export interface AgentTaskTemplate {
  id: string;
  label: string;
  role: string;
  prompt: string;
  mode: "sync" | "async";
}

export interface GithubConnectionMethod {
  id: "api-token" | "github-connect";
  label: string;
  title: string;
  body: string;
  status: "live" | "requires-platform-config";
}

export interface GithubConnectionTestLike {
  tokenConfigured: boolean;
  tokenValid: boolean;
  githubLogin?: string | null;
  scopes?: string;
  repoConfigured: boolean;
  repoReachable: boolean;
  message?: string;
}

export interface GithubConnectionUi {
  tokenLabel: string;
  connectButtonLabel: string;
  repoLabel: string;
  repoAccessLabel: string;
}

export interface GithubRepoOptionLike {
  fullName: string;
  private: boolean;
  defaultBranch: string | null;
  permissions: Record<string, boolean> | null;
  selected: boolean;
  allowed: boolean;
  pushedAt: string | null;
}

export type DevCapabilityStatus = "live" | "ready" | "next";

export interface DevCapabilityCard {
  id: string;
  title: string;
  label: string;
  body: string;
  status: DevCapabilityStatus;
  tags: string[];
  actionTab: "terminal" | "workflows" | "plugins" | "dev";
}

export function summarizeAgentCommLogs(
  logs: AgentCommLogLike[],
): AgentCommSummary {
  const total = logs.length;
  const successes = logs.filter((log) => log.status === "success").length;
  const failures = logs.filter((log) =>
    ["error", "permission_denied", "loop_blocked"].includes(log.status),
  ).length;
  const latencyTotal = logs.reduce(
    (sum, log) => sum + Math.max(0, log.latencyMs || 0),
    0,
  );

  return {
    total,
    successes,
    failures,
    averageLatencyMs: total > 0 ? Math.round(latencyTotal / total) : 0,
  };
}

export function summarizeAgentMesh(agents: AgentMeshLike[]): AgentMeshSummary {
  return {
    total: agents.length,
    callable: agents.filter((agent) => agent.canCall).length,
    needsEnable: agents.filter((agent) => !agent.commEnabled).length,
    active: agents.filter((agent) => agent.status === "active").length,
  };
}

export function buildGithubEnvWrites(
  token: string,
  defaultRepo: string,
  allowedRepos?: string[],
): EnvWrite[] {
  const cleanToken = token.trim();
  const cleanRepo = normalizeGithubRepoInput(defaultRepo) ?? defaultRepo.trim();
  const cleanAllowedRepos = allowedRepos
    ? [
        ...new Set(
          allowedRepos
            .map((repo) => normalizeGithubRepoInput(repo))
            .filter((repo): repo is string => Boolean(repo)),
        ),
      ]
    : [];
  const writes: EnvWrite[] = [];

  if (cleanToken) {
    writes.push({ key: "GH_TOKEN", value: cleanToken });
    writes.push({ key: "GITHUB_TOKEN", value: cleanToken });
  }
  if (cleanRepo) {
    writes.push({ key: "GITHUB_DEFAULT_REPO", value: cleanRepo });
  }
  if (allowedRepos) {
    const allowedWithDefault = cleanRepo
      ? [...new Set([cleanRepo, ...cleanAllowedRepos])]
      : cleanAllowedRepos;
    if (allowedWithDefault.length > 0) {
      writes.push({
        key: "GITHUB_ALLOWED_REPOS",
        value: allowedWithDefault.join(","),
      });
    }
  }

  return writes;
}

export function normalizeGithubRepoInput(input: string): string | null {
  const clean = input
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "");
  if (!clean) return null;
  const [owner, repo, extra] = clean.split("/");
  if (!owner || !repo || extra) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo))
    return null;
  return `${owner}/${repo}`;
}

export function getGithubRepoInputError(input: string): string | null {
  const clean = input.trim();
  if (!clean) return null;
  return normalizeGithubRepoInput(clean)
    ? null
    : "Use owner/repo or a github.com/owner/repo URL.";
}

export function getGithubConnectionUi(
  hasToken: boolean,
  hasDefaultRepo: boolean,
  testResult?: GithubConnectionTestLike | null,
): GithubConnectionUi {
  const tokenConnected =
    testResult?.tokenConfigured && testResult.tokenValid ? true : hasToken;
  const repoConfigured = testResult?.repoConfigured ?? hasDefaultRepo;

  let repoAccessLabel = repoConfigured ? "Ready to test" : "Optional";
  if (testResult?.repoConfigured) {
    repoAccessLabel = testResult.repoReachable ? "Verified" : "Blocked";
  }

  return {
    tokenLabel: tokenConnected ? "Connected" : "Not connected",
    connectButtonLabel: tokenConnected ? "Reconnect account" : "Connect account",
    repoLabel: hasDefaultRepo ? "Configured" : "Optional",
    repoAccessLabel,
  };
}

export function getGithubDefaultRepoSelectLabel(repo: GithubRepoOptionLike): string {
  const access = repo.permissions?.push ? "write" : "read";
  return `${repo.selected ? "✓ " : ""}${repo.fullName} · ${
    repo.private ? "private" : "public"
  } · ${access}`;
}

export function getGithubConnectionMethods(): GithubConnectionMethod[] {
  return [
    {
      id: "api-token",
      label: "API token",
      title: "Fine-grained or classic token",
      body: "Live now. Tokens are saved encrypted, mounted as GH_TOKEN/GITHUB_TOKEN, and verified server-side.",
      status: "live",
    },
    {
      id: "github-connect",
      label: "GitHub Connect",
      title: "Per-user OAuth",
      body: "Owners connect their own GitHub account through Hatcher's GitHub OAuth app. Requires the platform OAuth client to be configured.",
      status: "requires-platform-config",
    },
  ];
}

export function getAgentTaskTemplates(): AgentTaskTemplate[] {
  return [
    {
      id: "review-branch",
      label: "Review branch",
      role: "Reviewer",
      mode: "sync",
      prompt:
        "Act as a reviewer. Inspect the current repo or branch context, identify correctness risks, missing tests, and the smallest safe fix. Return findings first, then recommended next actions.",
    },
    {
      id: "triage-issue",
      label: "Triage issue",
      role: "Triage",
      mode: "sync",
      prompt:
        "Triage this issue. Reproduce the likely failure path, identify owner files, estimate severity, and propose a compact implementation plan with verification steps.",
    },
    {
      id: "research-options",
      label: "Research options",
      role: "Researcher",
      mode: "async",
      prompt:
        "Research implementation options for this task. Compare 2-3 approaches, list tradeoffs, call out unknowns, and recommend one path with concrete first steps.",
    },
    {
      id: "test-plan",
      label: "Test plan",
      role: "QA",
      mode: "sync",
      prompt:
        "Create a focused test plan for this change. Include unit, integration, and UI checks where relevant, and flag the riskiest regression paths.",
    },
  ];
}

export function getDevCapabilityCards(): DevCapabilityCard[] {
  return [
    {
      id: "github-source-control",
      title: "GitHub developer loop",
      label: "Source control",
      body: "Use repo skills, pull-request review flows, deployment checks, and mounted credentials from the terminal workspace.",
      status: "live",
      tags: ["repos", "reviews", "deploys"],
      actionTab: "dev",
    },
    {
      id: "terminal-native-fork",
      title: "Native terminal sessions",
      label: "CLI control",
      body: "Hermes/OpenClaw terminal sessions stay inside the framework runtime, including native /fork instead of blank shell cloning.",
      status: "live",
      tags: ["fork", "sessions", "history"],
      actionTab: "terminal",
    },
    {
      id: "agent-to-agent",
      title: "Agent-to-agent work",
      label: "Trusted calls",
      body: "Enable this agent as a callable specialist, choose trusted caller agents, and inspect latency or failure history.",
      status: "live",
      tags: ["A2A", "tasks", "logs"],
      actionTab: "dev",
    },
  ];
}

export function getDevWorkflowTemplates(): DevWorkflowTemplate[] {
  return [
    {
      id: "github-pr-review",
      name: "PR review intake",
      description:
        "Catch review requests in chat and route them into a structured reply the agent can expand with GitHub tools.",
      nodes: [
        {
          id: "trigger-pr-review",
          type: "workflowNode",
          position: { x: 120, y: 80 },
          data: {
            label: "Review request",
            subtype: "keyword_match",
            category: "trigger",
            keywords: "review pr, review pull request, check github",
          },
        },
        {
          id: "reply-pr-review",
          type: "workflowNode",
          position: { x: 120, y: 260 },
          data: {
            label: "Confirm review loop",
            subtype: "send_reply",
            category: "action",
            message:
              "I can review this. Send the GitHub PR URL or repo/branch, and I will inspect changes, risks, tests, and suggested fixes.",
          },
        },
      ],
      edges: [
        {
          id: "edge-pr-review",
          source: "trigger-pr-review",
          target: "reply-pr-review",
        },
      ],
    },
    {
      id: "daily-dev-standup",
      name: "Daily dev standup",
      description:
        "Schedule a daily prompt that asks the agent to summarize open work, blocked tasks, and next actions.",
      nodes: [
        {
          id: "trigger-dev-standup",
          type: "workflowNode",
          position: { x: 120, y: 80 },
          data: {
            label: "Daily schedule",
            subtype: "schedule",
            category: "trigger",
            cron: "0 9 * * *",
          },
        },
        {
          id: "reply-dev-standup",
          type: "workflowNode",
          position: { x: 120, y: 260 },
          data: {
            label: "Standup summary",
            subtype: "send_reply",
            category: "action",
            message:
              "Daily dev standup: summarize shipped changes, current blockers, risky files, failing checks, and the next concrete task.",
          },
        },
      ],
      edges: [
        {
          id: "edge-dev-standup",
          source: "trigger-dev-standup",
          target: "reply-dev-standup",
        },
      ],
    },
  ];
}
