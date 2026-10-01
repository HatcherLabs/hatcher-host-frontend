'use client';

import { CalendarClock, ListChecks, MessageSquare, Plug, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { agentWorkspaceHref } from '@/lib/agent-workspace';
import { useAgentContext } from '../AgentContext';

const actionClass = 'flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 text-left transition-colors hover:border-[var(--accent)]';

export function SimpleAgentOverview() {
  const { agent, setTab } = useAgentContext();
  const t = useTranslations('simpleExperience');
  const ready = agent.status === 'active';
  const starting = ['starting', 'restarting'].includes(agent.status);
  const actions = [
    { key: 'tasks', description: 'resultsHelp', href: agentWorkspaceHref('/dashboard/missions', agent.id), icon: ListChecks },
    { key: 'approvals', description: 'approvalsHelp', href: agentWorkspaceHref('/dashboard/approvals', agent.id), icon: ShieldCheck },
    { key: 'automations', description: 'automationsHelp', href: '/dashboard/automations', icon: CalendarClock },
  ] as const;

  return (
    <section className="space-y-6" data-testid="simple-agent-overview">
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 sm:p-8">
        <p className="mb-2 text-sm font-medium text-[var(--accent)]">
          {ready ? t('ready') : starting ? t('starting') : t('notReady')}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{agent.name}</h2>
        {agent.description && <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">{agent.description}</p>}
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {ready ? t('chatHelp') : starting ? t('startingHelp') : t('notReadyHelp')}
        </p>
        <button type="button" onClick={() => setTab('chat')} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--action)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--action-hover)]">
          <MessageSquare size={17} aria-hidden />{t('chat')}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map(({ key, description, href, icon: Icon }) => (
          <Link href={href} key={key} className={actionClass}>
            <Icon size={20} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden />
            <span><strong className="block text-sm text-[var(--text-primary)]">{t(key)}</strong><span className="mt-1 block text-sm leading-relaxed text-[var(--text-secondary)]">{t(description)}</span></span>
          </Link>
        ))}
        {['openclaw', 'hermes', 'custom'].includes(agent.framework) && (
          <button type="button" onClick={() => setTab('integrations')} className={actionClass}>
            <Plug size={20} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden />
            <span><strong className="block text-sm text-[var(--text-primary)]">{t('connections')}</strong><span className="mt-1 block text-sm leading-relaxed text-[var(--text-secondary)]">{t('connectionsBody')}</span></span>
          </button>
        )}
      </div>
      <p className="text-sm text-[var(--text-muted)]">{t('advancedHint')}</p>
    </section>
  );
}
