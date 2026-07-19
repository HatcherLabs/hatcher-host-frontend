import { AlertTriangle, Bot, ExternalLink, Mail, Radio } from "lucide-react";
import type { AdminHealthResponse } from "@/lib/api";

type Props = Pick<AdminHealthResponse, "emailOutbox" | "externalServices" | "runtimeReleases">;

const probeLabels: Record<AdminHealthResponse["externalServices"]["probes"][number]["name"], string> = {
  helius: "Helius",
  smtp: "Email / SMTP",
  llm_gateway: "LLM gateway",
  stripe: "Stripe",
  solana_rpc: "Solana RPC",
};

export function runtimeHealthTone(runtime: AdminHealthResponse["runtimeReleases"]["runtimes"][number]) {
  if (runtime.updateAvailable || runtime.containers.stale > 0) return "warning";
  if (runtime.updateAvailable === null) return "unknown";
  return "healthy";
}

function StatusPill({ status }: { status: string }) {
  const healthy = status === "healthy";
  const muted = status === "unknown" || status === "not_configured";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
      healthy
        ? "bg-emerald-500/10 text-emerald-400"
        : muted
          ? "bg-white/5 text-[var(--text-muted)]"
          : "bg-amber-500/10 text-amber-300"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-emerald-400" : muted ? "bg-zinc-500" : "bg-amber-400"}`} />
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function RuntimeReliabilityPanel({ emailOutbox, externalServices, runtimeReleases }: Props) {
  return (
    <section aria-labelledby="runtime-reliability-title" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 id="runtime-reliability-title" className="text-sm font-semibold text-[var(--text-primary)]">Runtime reliability</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Release pins, live container adoption, delivery queue, and synthetic dependencies.</p>
        </div>
        {runtimeReleases.latestCheckError && (
          <span className="flex items-center gap-1.5 text-[10px] text-amber-300" title={runtimeReleases.latestCheckError}>
            <AlertTriangle size={12} /> Release check unavailable
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {runtimeReleases.runtimes.map((runtime) => {
          const tone = runtimeHealthTone(runtime);
          return (
            <article key={runtime.framework} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]"><Bot size={17} /></div>
                  <div>
                    <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">{runtime.framework}</p>
                    <p className="font-mono text-[10px] text-[var(--text-muted)]">image {runtime.imageId ?? "unavailable"}</p>
                  </div>
                </div>
                <StatusPill status={tone === "healthy" ? "healthy" : tone === "warning" ? "attention" : "unknown"} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-[var(--text-muted)]">Pinned</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">v{runtime.currentVersion}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Latest</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{runtime.latestVersion ? `v${runtime.latestVersion}` : "Unknown"}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Current containers</dt><dd className="mt-1 font-medium text-[var(--text-primary)]">{runtime.containers.current} / {runtime.containers.total}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Stale</dt><dd className={`mt-1 font-medium ${runtime.containers.stale ? "text-amber-300" : "text-emerald-400"}`}>{runtime.containers.stale}</dd></div>
              </dl>
              <a href={runtime.releaseUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)] hover:text-[var(--text-primary)]">
                Release details <ExternalLink size={11} />
              </a>
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Radio size={15} className="text-[var(--color-accent)]" /><h4 className="text-sm font-semibold text-[var(--text-primary)]">External services</h4></div>
            <StatusPill status={externalServices.status} />
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {externalServices.probes.map((probe) => (
              <div key={probe.name} className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-0">
                <div className="min-w-0"><p className="text-xs font-medium text-[var(--text-primary)]">{probeLabels[probe.name]}</p>{probe.error && <p className="truncate text-[10px] text-amber-300" title={probe.error}>{probe.error}</p>}</div>
                <div className="flex shrink-0 items-center gap-2"><span className="font-mono text-[10px] text-[var(--text-muted)]">{probe.latencyMs}ms</span><StatusPill status={probe.status} /></div>
              </div>
            ))}
            {externalServices.probes.length === 0 && <p className="py-3 text-xs text-[var(--text-muted)]">Waiting for the first synthetic check.</p>}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
          <div className="mb-4 flex items-center gap-2"><Mail size={15} className="text-[var(--color-accent)]" /><h4 className="text-sm font-semibold text-[var(--text-primary)]">Email outbox</h4></div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-white/[0.025] p-3"><dt className="text-[var(--text-muted)]">Pending</dt><dd className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{emailOutbox.pending + emailOutbox.processing}</dd></div>
            <div className="rounded-lg bg-white/[0.025] p-3"><dt className="text-[var(--text-muted)]">Dead letter</dt><dd className={`mt-1 text-lg font-semibold ${emailOutbox.deadLetter ? "text-red-400" : "text-emerald-400"}`}>{emailOutbox.deadLetter}</dd></div>
            <div className="col-span-2 flex items-center justify-between pt-1"><dt className="text-[var(--text-muted)]">Delivered (retained)</dt><dd className="font-medium text-[var(--text-secondary)]">{emailOutbox.sent}</dd></div>
          </dl>
          {emailOutbox.oldestPendingAt && <p className="mt-3 text-[10px] text-[var(--text-muted)]">Oldest pending: {new Date(emailOutbox.oldestPendingAt).toLocaleString()}</p>}
        </article>
      </div>
    </section>
  );
}
