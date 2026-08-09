"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Blocks,
  Brain,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FRAMEWORKS } from "@hatcher/shared";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  GlassCard,
  tabContentVariants,
  useAgentContext,
} from "../AgentContext";
import { HealthPerformanceCard } from "./cards/HealthPerformanceCard";
import { CostCard } from "./cards/CostCard";
import { EgressCard } from "./cards/EgressCard";
import { FrameworkCapabilitiesCard } from "./cards/FrameworkCapabilitiesCard";
import { LiveLogsPreviewCard } from "./cards/LiveLogsPreviewCard";
import { QuickActionsCard } from "./cards/QuickActionsCard";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** "nearaidev/ironclaw:1.1.0@sha256:…" → "v1.1.0" — keeps the badge in
 *  sync with the image the platform actually deploys. */
function ironclawVersion(): string | null {
  const match = /:([^:@/]+)(?:@|$)/.exec(FRAMEWORKS.ironclaw.dockerImage);
  return match ? `v${match[1]}` : null;
}

function IronClawRuntimeCard() {
  const t = useTranslations("dashboard.agentDetail.ironclaw.dashboard");
  const { agent, setTab } = useAgentContext();
  const [data, setData] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await api.getIronClawOverview(agent.id);
    setData(response.success ? response.data : null);
    setLoading(false);
  }, [agent.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = useMemo(() => {
    const operatorStatus = record(record(data?.status).operator_status);
    const checks = Array.isArray(operatorStatus.checks)
      ? operatorStatus.checks.map(record)
      : [];
    const previewStorage = checks.some(
      (check) =>
        String(check.id) === "readiness_composition_profile" &&
        String(check.summary).includes("hosted-single-tenant-volume-preview"),
    );
    const blocking = checks.some(
      (check) =>
        String(check.severity) === "error" ||
        ["failed", "unavailable", "unhealthy"].includes(String(check.status)),
    );
    const overall = String(
      operatorStatus.overall ?? record(data?.status).status ?? "unknown",
    );
    return {
      overall,
      label: previewStorage && !blocking ? t("statusOperationalPreview") : overall,
      previewStorage,
      blocking,
      healthy: checks.filter((check) =>
        ["ok", "healthy", "available", "ready"].includes(String(check.status)),
      ).length,
      total: checks.length,
    };
  }, [data, t]);
  const counts = record(data?.counts);
  const version = ironclawVersion();
  const stats = [
    {
      label: t("statAutomations"),
      value: count(counts.automations),
      icon: Clock,
      tab: "schedules" as const,
    },
    {
      label: t("statExtensions"),
      value: count(counts.extensions),
      icon: Blocks,
      tab: "plugins" as const,
    },
    {
      label: t("statSkills"),
      value: count(counts.skills),
      icon: Sparkles,
      tab: "plugins" as const,
    },
    {
      label: t("statToolPolicies"),
      value: count(counts.tools),
      icon: Wrench,
      tab: "plugins" as const,
    },
  ];

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("title")}
            </h3>
            {version && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                {version}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-[var(--border-default)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-[var(--text-muted)]">
          <Loader2 size={14} className="animate-spin" /> {t("reading")}
        </div>
      ) : data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, tab }) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(tab)}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-left transition-colors hover:border-emerald-500/30"
              >
                <Icon size={14} className="text-emerald-400" />
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {value}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-xs">
            <Activity
              size={13}
              className={
                !status.blocking && !status.previewStorage
                  ? "text-emerald-400"
                  : "text-amber-300"
              }
            />
            <span className="text-[var(--text-secondary)]">
              {t("runtimeLabel")}{" "}
              <strong className="capitalize text-[var(--text-primary)]">
                {status.label}
              </strong>
            </span>
            {status.total > 0 && (
              <span className="text-[var(--text-muted)]">
                {t("checksReady", { healthy: status.healthy, total: status.total })}
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-[var(--text-muted)]">
              <Brain size={12} /> {t("privateState")}
            </span>
          </div>
          {status.previewStorage && (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
              {t("previewStorageWarning")}
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {t("unavailable")}
        </div>
      )}
    </GlassCard>
  );
}

/** Outbound delivery preference — where IronClaw sends final replies.
 *  Older runtimes without the endpoint (or with no targets) hide the card. */
function IronClawOutboundCard() {
  const t = useTranslations("dashboard.agentDetail.ironclaw.outbound");
  const { agent } = useAgentContext();
  const { toast } = useToast();
  const [targets, setTargets] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await api.getIronClawOutbound(agent.id);
    if (!response.success) {
      setTargets([]);
      setLoaded(true);
      return;
    }
    const data = record(response.data);
    const rawTargets = Array.isArray(data.targets) ? data.targets : [];
    setTargets(
      rawTargets
        .map((raw) => {
          const target = record(raw);
          const id = String(target.id ?? target.target_id ?? "");
          return {
            id,
            label: String(
              target.label ?? target.name ?? target.kind ?? target.channel ?? id,
            ),
          };
        })
        .filter((target) => target.id),
    );
    const preferences = record(data.preferences);
    const current =
      preferences.finalReplyTargetId ?? preferences.final_reply_target_id;
    setSelected(typeof current === "string" ? current : "");
    setLoaded(true);
  }, [agent.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded || targets.length === 0) return null;

  const apply = async (value: string) => {
    const previous = selected;
    setSelected(value);
    setSaving(true);
    const response = await api.setIronClawOutboundPreferences(
      agent.id,
      value || null,
    );
    setSaving(false);
    if (!response.success) {
      setSelected(previous);
      toast.error(response.error ?? t("updateFailed"));
      return;
    }
    toast.success(t("updated"));
  };

  return (
    <GlassCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Send size={15} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("title")}
            </h3>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t("subtitle")}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-[var(--text-secondary)]">
          {t("finalReplyLabel")}
          <select
            value={selected}
            disabled={saving}
            onChange={(event) => void apply(event.target.value)}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] disabled:opacity-50"
          >
            <option value="">{t("defaultOption")}</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </GlassCard>
  );
}

export function IronClawDashboard() {
  const { agent, isActive } = useAgentContext();
  return (
    <motion.div
      key="tab-overview"
      className="space-y-6"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <IronClawRuntimeCard />
      <IronClawOutboundCard />
      <HealthPerformanceCard agentId={agent.id} isActive={isActive} />
      <CostCard agentId={agent.id} />
      <EgressCard agentId={agent.id} />
      <FrameworkCapabilitiesCard framework={agent.framework} />
      <LiveLogsPreviewCard />
      <QuickActionsCard />
    </motion.div>
  );
}
