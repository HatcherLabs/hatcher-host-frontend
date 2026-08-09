import { describe, expect, it } from "vitest";
import {
  extractPendingGates,
  extractTimelineItems,
  isValidMcpServerUrl,
  normalizeRecentRuns,
  runAction,
} from "./ironclawRuntime";

describe("normalizeRecentRuns", () => {
  it("parses recent_runs newest-first and drops incomplete rows", () => {
    const runs = normalizeRecentRuns({
      recent_runs: [
        {
          run_id: "r1",
          thread_id: "t1",
          status: "Completed",
          fire_slot: "2026-08-08T09:00",
          submitted_at: "2026-08-08T09:00:00Z",
          completed_at: "2026-08-08T09:01:00Z",
        },
        { run_id: "r2", thread_id: "t1", status: "running", submitted_at: "2026-08-08T10:00:00Z" },
        { run_id: "no-thread" },
        "garbage",
      ],
    });
    expect(runs.map((run) => run.runId)).toEqual(["r2", "r1"]);
    expect(runs[0].status).toBe("running");
    expect(runs[1].status).toBe("completed");
    expect(runs[1].fireSlot).toBe("2026-08-08T09:00");
  });

  it("returns an empty list for unknown shapes", () => {
    expect(normalizeRecentRuns(null)).toEqual([]);
    expect(normalizeRecentRuns({ recent_runs: "nope" })).toEqual([]);
  });
});

describe("runAction", () => {
  it("offers cancel for active runs and retry for failed ones", () => {
    expect(runAction("running")).toBe("cancel");
    expect(runAction("Queued")).toBe("cancel");
    expect(runAction("failed")).toBe("retry");
    expect(runAction("completed")).toBeNull();
    expect(runAction("cancelled")).toBeNull();
  });
});

describe("extractTimelineItems", () => {
  it("finds the item array under any of the known keys", () => {
    expect(extractTimelineItems({ items: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(extractTimelineItems({ timeline: [{ b: 2 }] })).toEqual([{ b: 2 }]);
    expect(extractTimelineItems({ events: [] })).toEqual([]);
    expect(extractTimelineItems("nope")).toEqual([]);
    expect(extractTimelineItems({ items: "nope" })).toEqual([]);
  });
});

describe("extractPendingGates", () => {
  it("keeps unresolved gate items and reads nested payloads", () => {
    const gates = extractPendingGates([
      { type: "message", id: "m1" },
      {
        type: "approval_gate",
        id: "item-1",
        payload: { gate_ref: "g1", run_id: "r1", tool: "shell", status: "pending" },
      },
      { type: "gate", gate_ref: "g2", status: "approved" },
      { type: "gate", gate_ref: "g3", resolved: true },
      { kind: "tool_gate", ref: "g4" },
      { type: "gate", payload: {} },
    ]);
    expect(gates).toEqual([
      { gateRef: "g1", runId: "r1", label: "shell" },
      { gateRef: "g4", runId: null, label: "g4" },
    ]);
  });

  it("deduplicates by gate ref and survives garbage", () => {
    expect(extractPendingGates("nope")).toEqual([]);
    const gates = extractPendingGates([
      { type: "gate", gate_ref: "g1" },
      { type: "gate", gate_ref: "g1" },
      null,
      42,
    ]);
    expect(gates).toHaveLength(1);
  });
});

describe("isValidMcpServerUrl", () => {
  it("accepts only https URLs with a host", () => {
    expect(isValidMcpServerUrl("https://mcp.example.com/sse")).toBe(true);
    expect(isValidMcpServerUrl("  https://mcp.example.com  ")).toBe(true);
    expect(isValidMcpServerUrl("http://mcp.example.com")).toBe(false);
    expect(isValidMcpServerUrl("mcp.example.com")).toBe(false);
    expect(isValidMcpServerUrl("")).toBe(false);
    expect(isValidMcpServerUrl("https://")).toBe(false);
  });
});
