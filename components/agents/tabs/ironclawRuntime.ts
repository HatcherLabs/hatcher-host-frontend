// ============================================================
// IronClaw runtime helpers — runs, approval gates, MCP register
// ============================================================
// Pure functions over unknown-shaped IronClaw runtime JSON. Every reader
// narrows defensively and returns nothing rather than throwing, so the
// dashboard keeps rendering when the runtime evolves its payloads.

type JsonRecord = Record<string, unknown>;

export interface IronClawRunEntry {
  runId: string;
  threadId: string;
  status: string;
  fireSlot: string | null;
  submittedAt: string | null;
  completedAt: string | null;
}

export interface IronClawPendingGate {
  gateRef: string;
  runId: string | null;
  label: string;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Parse an automation's `recent_runs[]`, newest first. Rows without a
 *  run and thread id are dropped — every action needs both. */
export function normalizeRecentRuns(automation: unknown): IronClawRunEntry[] {
  const runs = record(automation).recent_runs;
  if (!Array.isArray(runs)) return [];
  return runs
    .map((raw): IronClawRunEntry | null => {
      const run = record(raw);
      const runId = optionalString(run.run_id) ?? optionalString(run.runId);
      const threadId =
        optionalString(run.thread_id) ?? optionalString(run.threadId);
      if (!runId || !threadId) return null;
      return {
        runId,
        threadId,
        status: (optionalString(run.status) ?? "unknown").toLowerCase(),
        fireSlot: optionalString(run.fire_slot),
        submittedAt: optionalString(run.submitted_at),
        completedAt: optionalString(run.completed_at),
      };
    })
    .filter((run): run is IronClawRunEntry => run !== null)
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
}

const ACTIVE_RUN_STATUSES = new Set([
  "running",
  "queued",
  "pending",
  "in_progress",
  "started",
]);
const FAILED_RUN_STATUSES = new Set([
  "failed",
  "error",
  "errored",
  "timed_out",
]);

/** Which control a run row offers: cancel while it can still stop,
 *  retry once it failed, nothing otherwise. */
export function runAction(status: string): "cancel" | "retry" | null {
  const normalized = status.toLowerCase();
  if (ACTIVE_RUN_STATUSES.has(normalized)) return "cancel";
  if (FAILED_RUN_STATUSES.has(normalized)) return "retry";
  return null;
}

/** The runtime has shipped the timeline array under a few different keys. */
export function extractTimelineItems(payload: unknown): JsonRecord[] {
  const data = record(payload);
  for (const key of ["items", "timeline", "entries", "events", "history"]) {
    const value = data[key];
    if (Array.isArray(value)) return value.map(record);
  }
  return [];
}

const RESOLVED_GATE_STATUSES = new Set([
  "approved",
  "declined",
  "resolved",
  "cancelled",
  "canceled",
  "expired",
  "credential_provided",
]);

/** Scan timeline items for unresolved approval gates. Recognizes any item
 *  whose type/kind mentions "gate"; unknown shapes yield an empty list. */
export function extractPendingGates(items: unknown): IronClawPendingGate[] {
  if (!Array.isArray(items)) return [];
  const gates: IronClawPendingGate[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const item = record(raw);
    const type = String(
      item.type ?? item.kind ?? item.item_type ?? "",
    ).toLowerCase();
    if (!type.includes("gate")) continue;
    // Nested payloads win over the envelope so a timeline item id never
    // shadows the actual gate reference.
    const gate = { ...item, ...record(item.payload), ...record(item.gate) };
    const gateRef =
      optionalString(gate.gate_ref) ??
      optionalString(gate.gateRef) ??
      optionalString(gate.ref) ??
      optionalString(gate.gate_id) ??
      optionalString(gate.id);
    if (!gateRef || seen.has(gateRef)) continue;
    if (gate.resolved === true) continue;
    const status = String(
      gate.status ?? gate.state ?? gate.resolution ?? "",
    ).toLowerCase();
    if (status && RESOLVED_GATE_STATUSES.has(status)) continue;
    seen.add(gateRef);
    gates.push({
      gateRef,
      runId: optionalString(gate.run_id) ?? optionalString(gate.runId),
      label:
        optionalString(gate.tool) ??
        optionalString(gate.tool_name) ??
        optionalString(gate.title) ??
        optionalString(gate.label) ??
        gateRef,
    });
  }
  return gates;
}

/** Hosted MCP servers must be reachable over https. */
export function isValidMcpServerUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}
