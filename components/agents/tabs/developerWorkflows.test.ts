import { describe, expect, it } from "vitest";
import {
  buildGithubEnvWrites,
  getGithubDefaultRepoSelectLabel,
  getGithubConnectionUi,
  getAgentTaskTemplates,
  getDevCapabilityCards,
  getDevWorkflowTemplates,
  getGithubConnectionMethods,
  getGithubRepoInputError,
  normalizeGithubRepoInput,
  summarizeAgentMesh,
  summarizeAgentCommLogs,
} from "./developerWorkflows";

describe("developer workflows helpers", () => {
  it("summarizes recent agent communication logs for the dev dashboard", () => {
    const summary = summarizeAgentCommLogs([
      { status: "success", latencyMs: 120 },
      { status: "error", latencyMs: 80 },
      { status: "success", latencyMs: 100 },
    ]);

    expect(summary).toEqual({
      total: 3,
      successes: 2,
      failures: 1,
      averageLatencyMs: 100,
    });
  });

  it("does not count accepted async tasks as failures", () => {
    const summary = summarizeAgentCommLogs([
      { status: "accepted", latencyMs: 0 },
      { status: "success", latencyMs: 200 },
    ]);

    expect(summary).toMatchObject({
      total: 2,
      successes: 1,
      failures: 0,
    });
  });

  it("handles empty logs without NaN values", () => {
    expect(summarizeAgentCommLogs([])).toEqual({
      total: 0,
      successes: 0,
      failures: 0,
      averageLatencyMs: 0,
    });
  });

  it("builds workflow templates with a trigger and at least one action node", () => {
    const templates = getDevWorkflowTemplates();

    expect(templates.length).toBeGreaterThanOrEqual(2);
    for (const template of templates) {
      expect(
        template.nodes.some((node) => node.data.category === "trigger"),
      ).toBe(true);
      expect(
        template.nodes.some(
          (node) =>
            node.data.category === "action" ||
            node.data.category === "response",
        ),
      ).toBe(true);
      expect(template.edges.length).toBeGreaterThan(0);
    }
  });

  it("describes developer capability cards with stable statuses", () => {
    const capabilities = getDevCapabilityCards();

    expect(capabilities.map((capability) => capability.status)).toEqual([
      "live",
      "live",
      "live",
    ]);
    expect(
      capabilities.every((capability) => capability.title.length > 0),
    ).toBe(true);
  });

  it("does not expose abandoned GitLawb integration cards", () => {
    const capabilities = getDevCapabilityCards();

    expect(capabilities.map((capability) => capability.id)).not.toContain(
      "gitlawb-agent-git",
    );
    expect(JSON.stringify(capabilities).toLowerCase()).not.toContain("gitlawb");
  });

  it("summarizes callable same-owner agents for the orchestration dashboard", () => {
    const summary = summarizeAgentMesh([
      { id: "a1", commEnabled: true, canCall: true, status: "active" },
      { id: "a2", commEnabled: false, canCall: false, status: "sleeping" },
      { id: "a3", commEnabled: true, canCall: true, status: "error" },
    ]);

    expect(summary).toEqual({
      total: 3,
      callable: 2,
      needsEnable: 1,
      active: 1,
    });
  });

  it("builds GitHub env var writes from a token and default repo", () => {
    expect(
      buildGithubEnvWrites("  ghp_test  ", " HatcherLabs/hatcher "),
    ).toEqual([
      { key: "GH_TOKEN", value: "ghp_test" },
      { key: "GITHUB_TOKEN", value: "ghp_test" },
      { key: "GITHUB_DEFAULT_REPO", value: "HatcherLabs/hatcher" },
    ]);
  });

  it("builds an explicit allowed GitHub repos list without leaking duplicates", () => {
    expect(
      buildGithubEnvWrites("", "HatcherLabs/hatcher", [
        "HatcherLabs/hatcher",
        "https://github.com/HatcherLabs/frontend.git",
        "bad/repo/extra",
        "HatcherLabs/hatcher",
      ]),
    ).toEqual([
      { key: "GITHUB_DEFAULT_REPO", value: "HatcherLabs/hatcher" },
      {
        key: "GITHUB_ALLOWED_REPOS",
        value: "HatcherLabs/hatcher,HatcherLabs/frontend",
      },
    ]);
  });

  it("normalizes GitHub repo input before saving", () => {
    expect(
      normalizeGithubRepoInput("https://github.com/HatcherLabs/hatcher.git"),
    ).toBe("HatcherLabs/hatcher");
    expect(getGithubRepoInputError("bad/repo/extra")).toBeTruthy();
    expect(getGithubRepoInputError("")).toBeNull();
  });

  it("only exposes supported GitHub connection methods", () => {
    const methods = getGithubConnectionMethods();

    expect(methods.map((method) => method.id)).toEqual([
      "api-token",
      "github-connect",
    ]);
    expect(JSON.stringify(methods).toLowerCase()).not.toContain("password");
  });

  it("labels connected GitHub accounts separately from optional repo setup", () => {
    expect(getGithubConnectionUi(false, false)).toMatchObject({
      tokenLabel: "Not connected",
      connectButtonLabel: "Connect account",
      repoLabel: "Optional",
      repoAccessLabel: "Optional",
    });

    expect(getGithubConnectionUi(true, false)).toMatchObject({
      tokenLabel: "Connected",
      connectButtonLabel: "Reconnect account",
      repoLabel: "Optional",
      repoAccessLabel: "Optional",
    });

    expect(
      getGithubConnectionUi(true, false, {
        tokenConfigured: true,
        tokenValid: true,
        githubLogin: "HatcherLabs",
        scopes: "repo",
        repoConfigured: false,
        repoReachable: false,
        message: "GitHub token verified.",
      }),
    ).toMatchObject({
      tokenLabel: "Connected",
      repoAccessLabel: "Optional",
    });
  });

  it("formats GitHub repo dropdown labels with selected and access hints", () => {
    expect(
      getGithubDefaultRepoSelectLabel({
        fullName: "HatcherLabs/hatcher",
        private: true,
        defaultBranch: "main",
        permissions: { pull: true, push: true },
        selected: true,
        allowed: true,
        pushedAt: null,
      }),
    ).toBe("✓ HatcherLabs/hatcher · private · write");

    expect(
      getGithubDefaultRepoSelectLabel({
        fullName: "HatcherLabs/docs",
        private: false,
        defaultBranch: "main",
        permissions: { pull: true, push: false },
        selected: false,
        allowed: false,
        pushedAt: null,
      }),
    ).toBe("HatcherLabs/docs · public · read");
  });

  it("provides reusable A2A task templates", () => {
    const templates = getAgentTaskTemplates();

    expect(templates.length).toBeGreaterThanOrEqual(4);
    expect(templates.some((template) => template.mode === "async")).toBe(true);
    expect(templates.every((template) => template.prompt.length > 40)).toBe(
      true,
    );
  });
});
