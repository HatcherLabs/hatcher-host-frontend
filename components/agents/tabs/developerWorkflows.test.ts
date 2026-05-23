import { describe, expect, it } from "vitest";
import {
  getDevCapabilityCards,
  getDevWorkflowTemplates,
  getOrchestrationRoadmap,
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
      "ready",
      "next",
    ]);
    expect(
      capabilities.every((capability) => capability.title.length > 0),
    ).toBe(true);
  });

  it("keeps the orchestration roadmap ordered by product maturity", () => {
    const roadmap = getOrchestrationRoadmap();

    expect(roadmap.map((item) => item.phase)).toEqual(["Now", "Next", "Later"]);
    expect(roadmap[0].items.length).toBeGreaterThan(0);
  });
});
