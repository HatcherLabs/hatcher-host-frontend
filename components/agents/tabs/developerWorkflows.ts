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

export interface OrchestrationRoadmapItem {
  phase: "Now" | "Next" | "Later";
  title: string;
  body: string;
  items: string[];
}

export function summarizeAgentCommLogs(
  logs: AgentCommLogLike[],
): AgentCommSummary {
  const total = logs.length;
  const successes = logs.filter((log) => log.status === "success").length;
  const failures = logs.filter((log) => log.status !== "success").length;
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

export function getDevCapabilityCards(): DevCapabilityCard[] {
  return [
    {
      id: "github-source-control",
      title: "GitHub developer loop",
      label: "Source control",
      body: "Use repo skills, pull-request review flows, deployment checks, and mounted credentials from the terminal workspace.",
      status: "live",
      tags: ["repos", "reviews", "deploys"],
      actionTab: "plugins",
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
      status: "ready",
      tags: ["A2A", "permissions", "logs"],
      actionTab: "dev",
    },
    {
      id: "gitlawb-agent-git",
      title: "GitLawb path",
      label: "Agent-native Git",
      body: "A future integration can map Hatcher agent identity to signed Git pushes, DID-style ownership, UCAN scopes, and skill publishing.",
      status: "next",
      tags: ["DID", "signed pushes", "marketplace"],
      actionTab: "plugins",
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

export function getOrchestrationRoadmap(): OrchestrationRoadmapItem[] {
  return [
    {
      phase: "Now",
      title: "Make single-agent dev work visible",
      body: "Keep terminal, workflows, model state, credentials, and A2A permissions discoverable from one agent surface.",
      items: ["Native /fork", "Workflow templates", "Trusted caller list"],
    },
    {
      phase: "Next",
      title: "Add multi-agent project rooms",
      body: "Create a workspace where one owner can assign a supervisor, builder, reviewer, and researcher to the same dev task.",
      items: ["Task board", "Role budgets", "Shared artifacts"],
    },
    {
      phase: "Later",
      title: "Publish agent-native developer work",
      body: "Connect GitLawb-style signed repo operations and marketplace artifacts once their API surface is stable enough.",
      items: ["Agent DID", "Signed pushes", "Skill packages"],
    },
  ];
}
