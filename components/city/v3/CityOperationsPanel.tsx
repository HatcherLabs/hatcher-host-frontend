'use client';

import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CircleDollarSign,
  GitFork,
  ShieldCheck,
} from 'lucide-react';
import type { CityOperationsSummary } from '@/lib/api';
import {
  cityOperationsAttentionTotal,
  primarySettlementLabel,
  settlementCountLabel,
} from '@/lib/city-operations';
import { agentRoomFromBuildingHref } from './cityNavigation';

interface Props {
  summary: CityOperationsSummary | null;
  loading?: boolean;
  error?: boolean;
  embedded?: boolean;
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function attentionReason(reason: string | null, status: string): string {
  if (reason === 'workspace_over_quota') return 'storage quota';
  return reason ?? status;
}

export function CityOperationsPanel({
  summary,
  loading = false,
  error = false,
  embedded = false,
}: Props) {
  const attention = summary ? cityOperationsAttentionTotal(summary) : 0;
  const operationalItems = summary?.agents.items
    .filter((agent) => agent.status === 'crashed' || agent.reason === 'workspace_over_quota')
    .slice(0, 3) ?? [];
  const incidentItems = summary?.incidents.items.slice(0, 2) ?? [];
  const delegations = summary?.delegations.slice(0, 2) ?? [];
  const taskItems: Array<{ key: string; label: string; detail: string }> = [];
  if (summary?.tasks.awaitingApproval) {
    taskItems.push({
      key: 'approvals',
      label: 'Mission approvals',
      detail: `${summary.tasks.awaitingApproval} waiting`,
    });
  }
  if (summary?.tasks.failed) {
    taskItems.push({
      key: 'failed',
      label: 'Failed missions',
      detail: `${summary.tasks.failed} failed`,
    });
  }
  const freshness = summary ? relativeTime(summary.generatedAt) : '';

  return (
    <section
      aria-label="Private operations summary"
      className={embedded
        ? 'text-white'
        : 'rounded-lg border border-white/12 bg-black/65 p-3 text-white shadow-2xl backdrop-blur-xl'}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-cyan-200" />
          <h2 className="text-xs font-semibold uppercase text-white">Operations</h2>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase ${
            error ? 'text-amber-200/85' : 'text-cyan-100/70'
          }`}
        >
          {error ? <AlertTriangle size={11} /> : <ShieldCheck size={11} />}
          {error ? (summary ? 'stale' : 'degraded') : 'private'}
        </span>
      </div>

      {summary && (
        <p className={`mt-1 text-[10px] ${error ? 'text-amber-100/70' : 'text-white/45'}`}>
          {error
            ? `Refresh unavailable; last good ${freshness || 'unknown'}`
            : `Updated ${freshness || 'recently'}`}
        </p>
      )}

      {loading && !summary ? (
        <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-md bg-white/10">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="h-12 animate-pulse bg-white/[0.045]" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-md bg-white/10">
            {[
              ['agents', summary.agents.running, `${summary.agents.total} total`],
              ['tasks', summary.tasks.active, `${summary.tasks.total} total`],
              ['approvals', summary.tasks.awaitingApproval, 'waiting'],
              ['alerts', attention, attention === 1 ? 'item' : 'items'],
            ].map(([label, value, detail]) => (
              <div key={String(label)} className="min-w-0 bg-white/[0.045] px-2 py-2">
                <strong className="block text-base font-semibold tabular-nums text-white">
                  {value}
                </strong>
                <span className="block truncate text-[9px] font-medium uppercase text-white/45">
                  {label}
                </span>
                <span className="block truncate text-[9px] text-white/35">{detail}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-y border-white/10 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase text-white/45">
                <CircleDollarSign size={12} />
                verified gross / {summary.partnerEarnings.windowDays}d
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold text-emerald-200">
                {primarySettlementLabel(summary)}
              </p>
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-white/45">
              {settlementCountLabel(summary)}
            </span>
          </div>

          {attention > 0 ? (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-amber-200/80">
                <AlertTriangle size={12} />
                Needs attention
              </div>
              <div className="divide-y divide-white/8">
                {taskItems.map((task) => (
                  <Link
                    key={task.key}
                    href="/dashboard/missions"
                    className="flex items-center justify-between gap-3 py-1.5 text-xs hover:text-amber-100"
                  >
                    <span className="min-w-0 truncate text-white/80">{task.label}</span>
                    <span className="shrink-0 text-[10px] uppercase text-amber-200/70">
                      {task.detail}
                    </span>
                  </Link>
                ))}
                {operationalItems.map((agent) => (
                  <Link
                    key={`agent-${agent.id}`}
                    href={agentRoomFromBuildingHref(agent.id)}
                    className="flex items-center justify-between gap-3 py-1.5 text-xs hover:text-amber-100"
                  >
                    <span className="min-w-0 truncate text-white/80">{agent.name}</span>
                    <span className="shrink-0 text-[10px] uppercase text-amber-200/70">
                      {attentionReason(agent.reason, agent.status)}
                    </span>
                  </Link>
                ))}
                {incidentItems.map((incident) => (
                  <div key={`incident-${incident.id}`} className="flex items-start justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate text-xs text-white/75">{incident.title}</span>
                    <span className="shrink-0 text-[10px] text-white/35">
                      {relativeTime(incident.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-emerald-200/75">No operational alerts</p>
          )}

          {delegations.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-white/45">
                <GitFork size={12} />
                Recent delegations
              </div>
              <div className="space-y-1.5">
                {delegations.map((delegation) => (
                  <div key={delegation.id} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="min-w-0 truncate text-white/70">
                      {delegation.source.name} → {delegation.target.name}
                    </span>
                    <span className="shrink-0 uppercase text-cyan-100/55">
                      {delegation.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5">
            <Link
              href="/dashboard/missions"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-cyan-200 px-2 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-100"
            >
              Mission Control
              <ArrowUpRight size={13} />
            </Link>
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/12 bg-white/[0.045] px-2 py-2 text-xs font-semibold text-white/75 hover:border-white/25 hover:text-white"
            >
              Agents
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </>
      ) : (
        <p className={`mt-3 text-xs ${error ? 'text-amber-100/75' : 'text-white/50'}`}>
          {error ? 'Live operations refresh unavailable' : 'Operations unavailable'}
        </p>
      )}
    </section>
  );
}
