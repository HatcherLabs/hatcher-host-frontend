"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  GitBranch,
  LockKeyhole,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { api } from "@/lib/api";
import type {
  NeuralMeshDecision,
  NeuralMeshNode,
  NeuralMeshOverview,
  NeuralMeshPreview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/ToastProvider";
import styles from "./mesh.module.css";

const SAMPLE_NODES: NeuralMeshNode[] = [
  {
    id: "sample-1",
    name: "Research Agent",
    framework: "Hermes",
    status: "active",
    role: "Researcher",
    domain: "research",
    enabled: true,
    eligible: true,
    eligibilityReason: null,
    measured: { performance: 0.84 },
  },
  {
    id: "sample-2",
    name: "Builder Agent",
    framework: "OpenClaw",
    status: "active",
    role: "Coder",
    domain: "frontend",
    enabled: true,
    eligible: true,
    eligibilityReason: null,
    measured: { performance: 0.79 },
  },
  {
    id: "sample-3",
    name: "Ops Agent",
    framework: "IronClaw",
    status: "sleeping",
    role: "Operator",
    domain: "infrastructure",
    enabled: true,
    eligible: true,
    eligibilityReason: null,
    measured: { performance: 0.73 },
  },
  {
    id: "sample-4",
    name: "Review Agent",
    framework: "Hermes",
    status: "active",
    role: "Reviewer",
    domain: "security",
    enabled: true,
    eligible: true,
    eligibilityReason: null,
    measured: { performance: 0.88 },
  },
];

function percent(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function duration(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—";
  if (value < 1_000) return `${Math.round(value)} ms`;
  if (value < 60_000) return `${(value / 1_000).toFixed(1)} s`;
  return `${(value / 60_000).toFixed(1)} min`;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function MeshGraph({
  nodes,
  activeAgentId,
  onSelect,
  preview,
  mode = "shadow",
}: {
  nodes: NeuralMeshNode[];
  activeAgentId: string | null;
  onSelect: (agentId: string) => void;
  preview?: boolean;
  mode?: "shadow" | "live";
}) {
  const visibleNodes = nodes.slice(0, 8);
  const points = visibleNodes.map((node, index) => {
    const angle =
      (Math.PI * 2 * index) / Math.max(visibleNodes.length, 1) - Math.PI / 2;
    return {
      node,
      x: 400 + Math.cos(angle) * 275,
      y: 190 + Math.sin(angle) * 125,
    };
  });

  return (
    <div
      className={styles.graphViewport}
      aria-label={preview ? "Neural Mesh product preview" : "Your agent mesh"}
    >
      <svg className={styles.edges} viewBox="0 0 800 380" aria-hidden>
        {points.map(({ node, x, y }) => (
          <line key={node.id} x1="400" y1="190" x2={x} y2={y} />
        ))}
      </svg>
      <div className={styles.meshCore}>
        <Network size={22} aria-hidden />
        <strong>Mesh</strong>
        <span>{preview ? "preview" : mode}</span>
      </div>
      {points.map(({ node }, index) => (
        <button
          key={node.id}
          type="button"
          className={`${styles.agentNode} ${activeAgentId === node.id ? styles.agentNodeActive : ""} ${!node.eligible ? styles.agentNodeIneligible : ""}`}
          data-count={visibleNodes.length}
          data-index={index}
          onClick={() => onSelect(node.id)}
          aria-pressed={activeAgentId === node.id}
          aria-label={`${node.name}, ${node.eligible ? `eligible for ${mode} routing` : `not eligible: ${node.eligibilityReason ?? "unavailable"}`}`}
        >
          <span className={styles.nodeIcon}>
            <Bot size={16} aria-hidden />
          </span>
          <span className={styles.nodeCopy}>
            <strong>{node.name}</strong>
            <small>
              {node.domain} · {node.framework}
            </small>
          </span>
          <span className={styles.nodeScore}>
            {!node.eligible
              ? "off"
              : node.measured.performance === undefined ||
                  !Number.isFinite(node.measured.performance)
                ? "new"
                : `${Math.round(node.measured.performance * 100)}`}
          </span>
        </button>
      ))}
      {nodes.length > visibleNodes.length ? (
        <span className={styles.moreNodes}>
          +{nodes.length - visibleNodes.length} agents
        </span>
      ) : null}
    </div>
  );
}

function PreviewGate({ preview }: { preview: NeuralMeshPreview | null }) {
  const [selected, setSelected] = useState<string | null>(SAMPLE_NODES[0].id);
  return (
    <>
      <section className={styles.previewNotice}>
        <div className={styles.lockIcon}>
          <LockKeyhole size={20} aria-hidden />
        </div>
        <div>
          <span className={styles.eyebrow}>READ-ONLY PRODUCT PREVIEW</span>
          <h2>Your agents become the nodes</h2>
          <p>
            {preview?.description ??
              "See how Hatcher can compare routing decisions across an owner-isolated agent cohort."}
          </p>
        </div>
        <Link href="/dashboard/agents" className={styles.primaryButton}>
          Create an agent <ArrowRight size={15} aria-hidden />
        </Link>
      </section>
      <section className={`${styles.workspace} ${styles.previewWorkspace}`}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>SAMPLE DATA</span>
            <h2>Agent topology</h2>
          </div>
          <span className={styles.statusTag}>
            <Eye size={13} /> Preview
          </span>
        </div>
        <MeshGraph
          nodes={SAMPLE_NODES}
          activeAgentId={selected}
          onSelect={setSelected}
          preview
        />
      </section>
      <div className={styles.previewColumns}>
        <section className={styles.infoBlock}>
          <h3>What it adds</h3>
          <ul>
            {(preview?.capabilities ?? []).map((item) => (
              <li key={item}>
                <Sparkles size={14} />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.infoBlock}>
          <h3>Built-in boundaries</h3>
          <ul>
            {(preview?.safeguards ?? []).map((item) => (
              <li key={item}>
                <ShieldCheck size={14} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

export default function NeuralMeshPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [preview, setPreview] = useState<NeuralMeshPreview | null>(null);
  const [overview, setOverview] = useState<NeuralMeshOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(
    null,
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [liveCanaryPercent, setLiveCanaryPercent] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [previewResult, overviewResult] = await Promise.all([
      api.getNeuralMeshPreview(),
      isAuthenticated ? api.getNeuralMeshOverview() : Promise.resolve(null),
    ]);
    if (previewResult.success) setPreview(previewResult.data);
    if (overviewResult?.success) {
      setOverview(overviewResult.data);
      setLiveCanaryPercent(
        overviewResult.data.config.canaryPercent > 0
          ? overviewResult.data.config.canaryPercent
          : 10,
      );
      setSelectedDecisionId(
        (current) =>
          current ?? overviewResult.data.recentDecisions[0]?.id ?? null,
      );
      setSelectedAgentId(
        (current) => current ?? overviewResult.data.nodes[0]?.id ?? null,
      );
    } else if (overviewResult && !overviewResult.success) {
      setError(overviewResult.error);
    }
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const selectedDecision = useMemo(
    () =>
      overview?.recentDecisions.find(
        (decision) => decision.id === selectedDecisionId,
      ) ?? null,
    [overview, selectedDecisionId],
  );
  const nodeNames = useMemo(
    () => new Map(overview?.nodes.map((node) => [node.id, node.name]) ?? []),
    [overview],
  );

  const saveMeshConfig = async (enabled: boolean, mode: "shadow" | "live") => {
    if (!overview) return;
    if (
      enabled &&
      mode === "live" &&
      !window.confirm(
        `Live Mode can route Mission Control runs to another eligible agent in this workspace for up to ${liveCanaryPercent}% of runs. Continue?`,
      )
    ) {
      return;
    }
    setSaving(true);
    const result = await api.setNeuralMeshConfig({
      enabled,
      mode,
      canaryPercent: mode === "live" ? liveCanaryPercent : 1,
      acknowledgedLiveRouting: enabled && mode === "live",
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    await load();
    toast.success(
      !result.data.enabled
        ? "Neural Mesh paused"
        : result.data.mode === "live"
          ? `Neural Mesh Live Mode enabled at ${result.data.canaryPercent}% canary`
          : "Neural Mesh Shadow Mode enabled",
    );
  };

  const gated = !overview?.access.hasAgents;
  const showLoading = authLoading || loading;

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.pageHeader}>
          <div>
            <div className={styles.titleLine}>
              <span className={styles.brandMark}>
                <Network size={19} aria-hidden />
              </span>
              <span className={styles.eyebrow}>HATCHER INTELLIGENCE LAYER</span>
            </div>
            <h1>Neural Mesh</h1>
            <p>
              Coordinate owner-isolated agents with explainable routing,
              measured outcomes, and guarded live execution.
            </p>
          </div>
          <div className={styles.headerActions}>
            <span
              className={styles.shadowBadge}
              data-mode={
                overview?.config.enabled ? overview.config.mode : "paused"
              }
            >
              {overview?.config.enabled && overview.config.mode === "live" ? (
                <Activity size={14} aria-hidden />
              ) : (
                <Eye size={14} aria-hidden />
              )}
              {overview?.config.enabled
                ? overview.config.mode === "live"
                  ? "Live mode"
                  : "Shadow mode"
                : "Paused"}
            </span>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => void load()}
              disabled={showLoading}
              aria-label="Refresh Neural Mesh"
            >
              <RefreshCw
                size={16}
                className={showLoading ? styles.spin : ""}
                aria-hidden
              />
            </button>
          </div>
        </header>

        {showLoading ? (
          <div className={styles.loadingState}>
            <Network size={24} />
            <span>Mapping your agent mesh…</span>
          </div>
        ) : error && !overview ? (
          <div className={styles.errorState}>
            <TriangleAlert size={20} />
            <span>{error}</span>
            <button onClick={() => void load()}>Retry</button>
          </div>
        ) : gated ? (
          <PreviewGate preview={preview} />
        ) : overview ? (
          <>
            {!overview.config.globallyEnabled ? (
              <div className={styles.systemNotice}>
                <TriangleAlert size={16} />
                <span>
                  Mesh controls are available in the UI, but the Neural Mesh
                  sidecar is not enabled on this environment yet.
                </span>
              </div>
            ) : null}
            {overview.access.eligibleAgentCount === 0 ? (
              <div className={styles.systemNotice}>
                <TriangleAlert size={16} />
                <span>
                  No agent is currently eligible for routing. Start or wake a
                  supported agent and clear any workspace quota issue before
                  enabling the mesh.
                </span>
              </div>
            ) : null}
            {!overview.config.liveGloballyEnabled ? (
              <div className={styles.systemNotice}>
                <ShieldCheck size={16} />
                <span>
                  Live routing is protected by the environment kill switch.
                  Shadow Mode remains available until an operator enables it.
                </span>
              </div>
            ) : null}

            <section
              className={styles.metrics}
              aria-label="Neural Mesh metrics"
            >
              <div>
                <span>Eligible nodes</span>
                <strong>
                  {overview.access.eligibleAgentCount}/
                  {overview.access.agentCount}
                </strong>
                <small>owner-scoped agents</small>
              </div>
              <div>
                <span>Routing decisions</span>
                <strong>{overview.metrics.decisions}</strong>
                <small>
                  {overview.metrics.liveRoutesApplied} live routes applied
                </small>
              </div>
              <div>
                <span>Assigned-agent success</span>
                <strong>
                  {percent(overview.metrics.assignedReportedSuccessRate)}
                </strong>
                <small>{overview.metrics.outcomes} reported outcomes</small>
              </div>
              <div>
                <span>Recommendation alignment</span>
                <strong>
                  {percent(overview.metrics.recommendationAlignmentRate)}
                </strong>
                <small>excludes unavailable routes</small>
              </div>
              <div>
                <span>Matched-route success</span>
                <strong>
                  {percent(
                    overview.metrics.matchedRecommendationReportedSuccessRate,
                  )}
                </strong>
                <small>
                  {overview.metrics.comparableOutcomes} comparable outcomes
                </small>
              </div>
              <div>
                <span>Average runtime</span>
                <strong>{duration(overview.metrics.averageLatencyMs)}</strong>
                <small>assigned-agent runs</small>
              </div>
            </section>

            <div className={styles.modeBar}>
              <div>
                {overview.config.mode === "live" && overview.config.enabled ? (
                  <Activity size={17} />
                ) : (
                  <Eye size={17} />
                )}
                <span>
                  <strong>
                    {overview.config.mode === "live" && overview.config.enabled
                      ? "Guarded live routing"
                      : "Shadow evaluation"}
                  </strong>{" "}
                  {overview.config.mode === "live" && overview.config.enabled
                    ? `The mesh may route up to ${overview.config.effectiveCanaryPercent}% of runs after every safety gate passes.`
                    : "Records recommendations and outcomes without changing who executes."}
                </span>
              </div>
              <div className={styles.modeActions}>
                <label className={styles.canaryControl}>
                  <span>Live canary</span>
                  <select
                    value={liveCanaryPercent}
                    onChange={(event) =>
                      setLiveCanaryPercent(Number(event.target.value))
                    }
                    disabled={saving}
                  >
                    {[10, 25, 50, 100].map((value) => (
                      <option key={value} value={value}>
                        {value}%
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.pauseButton}
                  onClick={() =>
                    void saveMeshConfig(
                      !(
                        overview.config.enabled &&
                        overview.config.mode === "shadow"
                      ),
                      "shadow",
                    )
                  }
                  disabled={
                    saving ||
                    (!overview.config.globallyEnabled &&
                      !overview.config.enabled) ||
                    (overview.access.eligibleAgentCount === 0 &&
                      !overview.config.enabled)
                  }
                >
                  {saving
                    ? "Saving…"
                    : overview.config.enabled &&
                        overview.config.mode === "shadow"
                      ? "Pause"
                      : "Use Shadow"}
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() =>
                    void saveMeshConfig(
                      !(
                        overview.config.enabled &&
                        overview.config.mode === "live"
                      ),
                      "live",
                    )
                  }
                  disabled={
                    saving ||
                    !overview.config.globallyEnabled ||
                    !overview.config.liveGloballyEnabled ||
                    overview.access.eligibleAgentCount < 2
                  }
                >
                  {saving
                    ? "Saving…"
                    : overview.config.enabled && overview.config.mode === "live"
                      ? "Pause Live"
                      : "Enable Live"}
                </button>
              </div>
            </div>

            <div className={styles.mainGrid}>
              <section className={styles.workspace}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.eyebrow}>LIVE COHORT</span>
                    <h2>Agent topology</h2>
                  </div>
                  <span
                    className={styles.statusTag}
                    data-live={overview.config.enabled}
                  >
                    <span className={styles.statusDot} />
                    {overview.config.enabled
                      ? overview.config.mode === "live"
                        ? "Routing live"
                        : "Observing"
                      : "Paused"}
                  </span>
                </div>
                <MeshGraph
                  nodes={overview.nodes}
                  activeAgentId={selectedAgentId}
                  onSelect={setSelectedAgentId}
                  mode={overview.config.mode === "live" ? "live" : "shadow"}
                />
              </section>

              <aside className={styles.inspector}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.eyebrow}>DECISION INSPECTOR</span>
                    <h2>
                      {selectedDecision
                        ? selectedDecision.domain
                        : "Awaiting evidence"}
                    </h2>
                  </div>
                  {selectedDecision?.outcome ? (
                    selectedDecision.outcome.success ? (
                      <CheckCircle2 className={styles.successIcon} size={20} />
                    ) : (
                      <XCircle className={styles.failureIcon} size={20} />
                    )
                  ) : (
                    <Clock3 size={20} />
                  )}
                </div>
                {selectedDecision ? (
                  <div className={styles.inspectorBody}>
                    <div className={styles.decisionRoute}>
                      <div>
                        <span>Requested</span>
                        <strong>{selectedDecision.requestedAgentName}</strong>
                      </div>
                      <ArrowRight size={16} />
                      <div>
                        <span>Executed</span>
                        <strong>{selectedDecision.actualAgentName}</strong>
                      </div>
                    </div>
                    <dl className={styles.detailList}>
                      <div>
                        <dt>Confidence</dt>
                        <dd>{percent(selectedDecision.confidence)}</dd>
                      </div>
                      <div>
                        <dt>Mesh recommendation</dt>
                        <dd>
                          {selectedDecision.recommendedAgentName ??
                            "Unavailable"}
                        </dd>
                      </div>
                      <div>
                        <dt>Routing mode</dt>
                        <dd>
                          {selectedDecision.routeMode === "live"
                            ? selectedDecision.executionApplied
                              ? "Live · applied"
                              : "Live · fallback"
                            : "Shadow · observed"}
                        </dd>
                      </div>
                      <div>
                        <dt>Source</dt>
                        <dd>{selectedDecision.source}</dd>
                      </div>
                      <div>
                        <dt>Route latency</dt>
                        <dd>{duration(selectedDecision.routeLatencyMs)}</dd>
                      </div>
                      <div>
                        <dt>Executed-agent outcome</dt>
                        <dd>
                          {selectedDecision.outcome
                            ? selectedDecision.outcome.success
                              ? "Reported success"
                              : (selectedDecision.outcome.errorClass ??
                                "Failed")
                            : "Pending"}
                        </dd>
                      </div>
                      <div>
                        <dt>Recommendation evidence</dt>
                        <dd>
                          {selectedDecision.outcome?.recommendationObserved
                            ? "Observed on executed agent"
                            : "Unobserved counterfactual"}
                        </dd>
                      </div>
                    </dl>
                    <div className={styles.rationale}>
                      <span>Why this route</span>
                      <p>
                        {selectedDecision.rationale ??
                          "No rationale available."}
                      </p>
                    </div>
                    <div className={styles.candidates}>
                      <span>Ranked cohort</span>
                      {selectedDecision.candidates
                        .slice(0, 5)
                        .map((candidate, index) => (
                          <div key={candidate.agent_id}>
                            <b>{index + 1}</b>
                            <span>
                              {nodeNames.get(candidate.agent_id) ??
                                candidate.agent_id}
                            </span>
                            <strong>{candidate.score.toFixed(3)}</strong>
                          </div>
                        ))}
                    </div>
                    {selectedDecision.meshDigest ? (
                      <code className={styles.digest}>
                        mesh state {selectedDecision.meshDigest.slice(0, 20)}
                      </code>
                    ) : null}
                    {selectedDecision.outcome?.traceDigest ? (
                      <code className={styles.digest}>
                        executed outcome{" "}
                        {selectedDecision.outcome.traceDigest.slice(0, 20)}
                      </code>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.emptyInspector}>
                    <GitBranch size={24} />
                    <p>
                      Enable Shadow or Live Mode and run a Mission Control task.
                      The requested, recommended, and executed route will appear
                      here.
                    </p>
                  </div>
                )}
              </aside>
            </div>

            <section className={styles.decisionTable}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>AUDIT TRAIL</span>
                  <h2>Recent decisions</h2>
                </div>
                <Link href="/dashboard/missions" className={styles.textLink}>
                  Open Mission Control <ExternalLink size={13} />
                </Link>
              </div>
              {overview.recentDecisions.length ? (
                <div className={styles.tableScroll}>
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Requested</th>
                        <th>Executed</th>
                        <th>Mesh recommendation</th>
                        <th>Confidence</th>
                        <th>Executed outcome</th>
                        <th>Recommendation evidence</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentDecisions.map((decision) => (
                        <tr
                          key={decision.id}
                          data-selected={decision.id === selectedDecisionId}
                        >
                          <td>
                            <button
                              type="button"
                              className={styles.decisionSelector}
                              onClick={() => setSelectedDecisionId(decision.id)}
                              aria-pressed={decision.id === selectedDecisionId}
                            >
                              <strong>{decision.taskTitle}</strong>
                              <span>{decision.domain}</span>
                            </button>
                          </td>
                          <td>{decision.requestedAgentName}</td>
                          <td>
                            {decision.actualAgentName}
                            {decision.executionApplied ? " · Live" : ""}
                          </td>
                          <td>
                            {decision.recommendedAgentName ?? "Unavailable"}
                          </td>
                          <td>{percent(decision.confidence)}</td>
                          <td>
                            <span
                              className={styles.outcome}
                              data-status={
                                decision.outcome
                                  ? decision.outcome.success
                                    ? "success"
                                    : "failed"
                                  : "pending"
                              }
                            >
                              {decision.outcome
                                ? decision.outcome.success
                                  ? "Reported success"
                                  : (decision.outcome.errorClass ?? "Failed")
                                : "Pending"}
                            </span>
                          </td>
                          <td>
                            {decision.outcome?.recommendationObserved
                              ? "Observed — same agent"
                              : "Unobserved"}
                          </td>
                          <td>{dateLabel(decision.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyTable}>
                  <Eye size={22} />
                  <p>
                    No routing decisions yet. Run a Mission Control task to
                    create the first auditable decision.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : null}

        <footer className={styles.credit}>
          <span>
            Neural Mesh foundation by{" "}
            <a
              href={
                preview?.credit.github ??
                "https://github.com/Meta-Oracle/hatcher-agentic-neural-mesh"
              }
              target="_blank"
              rel="noreferrer"
            >
              Meta-Oracle
            </a>
          </span>
          <span>
            with{" "}
            <a
              href={preview?.credit.x ?? "https://x.com/Scematica"}
              target="_blank"
              rel="noreferrer"
            >
              @Scematica
            </a>{" "}
            · integrated and operated by HatcherLabs
          </span>
        </footer>
      </div>
    </main>
  );
}
