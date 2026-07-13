'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ListChecks, Loader2, PackageCheck, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import type { MissionTask } from '@/lib/api';
import { agentWorkspaceHref } from '@/lib/agent-workspace';
import { normalizeMissionTaskList } from '@/lib/mission-control';
import { useAgentContext } from '../../AgentContext';

export function AgentOperationsCard() {
  const { agent } = useAgentContext();
  const tMission = useTranslations('missionControl');
  const tOutcome = useTranslations('outcomePacks');
  const [tasks, setTasks] = useState<MissionTask[]>([]);
  const [counts, setCounts] = useState({ active: 0, approval: 0, actions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [result, approvals] = await Promise.all([
      api.getMissionTasks({ agentId: agent.id, limit: 5 }),
      api.getMcpActionInbox({ agentId: agent.id, status: 'pending', limit: 5 }),
    ]);
    if (result.success) {
      const model = normalizeMissionTaskList(result.data);
      setTasks(model.tasks);
      setCounts({
        active: model.summary.active,
        approval: model.summary.awaitingApproval,
        actions: approvals.success ? approvals.data.summary.pending : 0,
      });
      setError(false);
    } else {
      setTasks([]);
      setCounts({ active: 0, approval: 0, actions: 0 });
      setError(true);
    }
    setLoading(false);
  }, [agent.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="card glass-noise p-5" aria-labelledby="agent-operations-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]">
            <ListChecks size={17} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="agent-operations-title" className="m-0 text-sm font-bold text-[var(--text-primary)]">
              {tMission('title')}
            </h2>
            <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{agent.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={agentWorkspaceHref('/dashboard/missions', agent.id, { create: '1' })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--action)] bg-[var(--action)] px-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--action-hover)]"
          >
            <Plus size={13} aria-hidden /> {tMission('newTask')}
          </Link>
          <Link
            href={agentWorkspaceHref('/dashboard/outcome-packs', agent.id)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          >
            <PackageCheck size={13} aria-hidden /> {tOutcome('title')}
          </Link>
          <Link
            href={agentWorkspaceHref('/dashboard/approvals', agent.id)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          >
            <ShieldCheck size={13} aria-hidden /> Approvals
          </Link>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-5 border-y border-[var(--border-line)] py-3 text-xs text-[var(--text-muted)]">
        <span>{tMission('summary.active')} <strong className="ml-1 text-[var(--text-primary)]">{counts.active}</strong></span>
        <span>{tMission('summary.approval')} <strong className="ml-1 text-[var(--text-primary)]">{counts.approval}</strong></span>
        <Link
          href={agentWorkspaceHref('/dashboard/approvals', agent.id)}
          className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Pending actions <strong className="ml-1 text-[var(--text-primary)]">{counts.actions}</strong>
        </Link>
        <Link
          href={agentWorkspaceHref('/dashboard/missions', agent.id)}
          className="ml-auto inline-flex items-center gap-1 font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {tMission('taskList')} <ArrowRight size={13} aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-20 items-center justify-center text-[var(--text-muted)]">
          <Loader2 size={17} className="animate-spin" aria-label={tMission('loading')} />
        </div>
      ) : error ? (
        <div className="flex min-h-20 items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <span>{tMission('tryAgain')}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] hover:text-[var(--text-primary)]"
            aria-label={tMission('refresh')}
            title={tMission('refresh')}
          >
            <RefreshCw size={14} aria-hidden />
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex min-h-20 items-center text-xs text-[var(--text-muted)]">
          {tMission('empty.title')}
        </div>
      ) : (
        <div>
          {tasks.slice(0, 3).map((task) => (
            <Link
              key={task.id}
              href={agentWorkspaceHref('/dashboard/missions', agent.id, { task: task.id })}
              className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-3 border-b border-[var(--border-line)] text-xs last:border-b-0 hover:bg-[var(--bg-hover)]"
            >
              <span className="truncate font-semibold text-[var(--text-primary)]">{task.title}</span>
              <span className="text-[var(--text-muted)]">{tMission(`status.${task.status}`)}</span>
              <ArrowRight size={13} className="text-[var(--text-muted)]" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
