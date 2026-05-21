'use client';

import { useRef, useEffect, memo, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Mail,
  MessageSquare,
  Settings,
  Puzzle,
  ScrollText,
  LayoutDashboard,
  BarChart3,
  FolderOpen,
  Brain,
  Clock,
  BookOpen,
  GitMerge,
  ChevronLeft,
  TerminalSquare,
  Wallet,
  Rocket,
} from 'lucide-react';
import type { Tab } from './AgentContext';
import { STATUS_STYLES, useAgentContext } from './AgentContext';
import type { Agent } from '@/lib/api';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { generateAgentAvatar } from '@/lib/avatar-generator';
import { useTranslations } from 'next-intl';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  group: 'main' | 'configure' | 'data' | 'advanced';
}

function getTabs(framework: string | undefined, tTabs: ReturnType<typeof useTranslations<'dashboard.agentDetail.tabs'>>): TabDef[] {
  return [
    { id: 'overview', label: tTabs('dashboard'), icon: <LayoutDashboard size={16} />, group: 'main' },
    { id: 'chat', label: tTabs('chat'), icon: <MessageSquare size={16} />, group: 'main' },
    { id: 'mail', label: tTabs('mail'), icon: <Mail size={16} />, group: 'main' },
    { id: 'terminal', label: tTabs('terminal'), icon: <TerminalSquare size={16} />, group: 'main' },
    { id: 'spawn' as const, label: tTabs('spawn'), icon: <Rocket size={16} />, group: 'main' as const },
    { id: 'config', label: tTabs('config'), icon: <Settings size={16} />, group: 'configure' },
    { id: 'integrations', label: tTabs('integrations'), icon: <Puzzle size={16} />, group: 'configure' },
    { id: 'plugins', label: tTabs('plugins'), icon: <Puzzle size={16} />, group: 'configure' },
    { id: 'logs', label: tTabs('logs'), icon: <ScrollText size={16} />, group: 'data' },
    { id: 'stats', label: tTabs('stats'), icon: <BarChart3 size={16} />, group: 'data' },
    { id: 'memory' as const, label: tTabs('memory'), icon: <Brain size={16} />, group: 'data' as const },
    ...(framework === 'openclaw'
      ? [{ id: 'sessions' as const, label: tTabs('sessions'), icon: <MessageSquare size={16} />, group: 'data' as const }]
      : []),
    { id: 'knowledge' as const, label: tTabs('knowledge'), icon: <BookOpen size={16} />, group: 'data' as const },
    { id: 'wallet' as const, label: tTabs('wallet'), icon: <Wallet size={16} />, group: 'data' as const },
    { id: 'files', label: tTabs('files'), icon: <FolderOpen size={16} />, group: 'data' },
    { id: 'schedules', label: tTabs('schedules'), icon: <Clock size={16} />, group: 'advanced' },
    { id: 'workflows', label: tTabs('workflows'), icon: <GitMerge size={16} />, group: 'advanced' },
  ];
}

const FRAMEWORK_GLYPH: Record<string, string> = {
  openclaw: '⊞',
  hermes: '◇',
};

const FRAMEWORK_COLOR: Record<string, string> = {
  openclaw: '#f59e0b',
  hermes: '#a855f7',
};

interface AgentSidebarProps {
  agent: Agent;
  agents?: Agent[];
  agentsLoading?: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const EASY_TABS: Tab[] = ['overview', 'chat', 'mail', 'integrations', 'logs', 'stats'];

function agentDashboardHref(agentId: string, activeTab: Tab): string {
  return activeTab === 'overview'
    ? `/dashboard/agent/${agentId}`
    : `/dashboard/agent/${agentId}?tab=${activeTab}`;
}

function mergeSwitcherAgents(currentAgent: Agent, agents: Agent[] | undefined): Agent[] {
  const byId = new Map<string, Agent>();
  for (const item of agents ?? []) {
    byId.set(item.id, item.id === currentAgent.id ? { ...item, ...currentAgent } : item);
  }
  byId.set(currentAgent.id, byId.has(currentAgent.id) ? { ...byId.get(currentAgent.id)!, ...currentAgent } : currentAgent);
  return Array.from(byId.values()).sort((a, b) => {
    if (a.id === currentAgent.id) return -1;
    if (b.id === currentAgent.id) return 1;
    return a.name.localeCompare(b.name);
  });
}

function AgentSwitcher({
  agent,
  agents,
  agentsLoading,
  activeTab,
  variant,
}: {
  agent: Agent;
  agents?: Agent[];
  agentsLoading?: boolean;
  activeTab: Tab;
  variant: 'desktop' | 'mobile';
}) {
  const tSidebar = useTranslations('dashboard.agentDetail.sidebar');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const switcherAgents = useMemo(() => mergeSwitcherAgents(agent, agents), [agent, agents]);
  const canSwitch = switcherAgents.length > 1;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const triggerClass = variant === 'desktop'
    ? 'group flex min-h-7 w-full min-w-0 items-center gap-2 rounded-[3px] text-left text-sm font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]'
    : 'group flex min-h-7 min-w-0 flex-1 items-center gap-2 rounded-[3px] text-left text-xs font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]';

  const menuClass = variant === 'desktop'
    ? 'absolute left-0 top-[calc(100%+8px)] z-50 w-[min(28rem,calc(100vw-2rem))] max-h-[340px] overflow-y-auto rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-2xl shadow-black/40'
    : 'absolute left-0 top-[calc(100%+10px)] z-50 w-[min(24rem,calc(100vw-1.5rem))] max-h-[60vh] overflow-y-auto rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-2xl shadow-black/50';

  return (
    <div ref={rootRef} className={`relative min-w-0 ${variant === 'mobile' ? 'flex-1' : 'w-full'}`}>
      <button
        type="button"
        className={triggerClass}
        onClick={() => canSwitch && setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tSidebar('switchAgent')}
        disabled={!canSwitch}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span className="min-w-0 truncate">{agent.name}</span>
        <span className={`ml-auto inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
          open
            ? 'border-[var(--accent)] bg-[rgba(74,222,128,0.08)] text-[var(--accent)]'
            : canSwitch
              ? 'border-[var(--border-default)] text-[var(--text-muted)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]'
              : 'border-[var(--border-default)] text-[var(--text-muted)] opacity-40'
        }`}>
          {agentsLoading ? (
            <span className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" aria-hidden />
          ) : (
            <ChevronDown
              size={14}
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          )}
        </span>
      </button>

      {open && canSwitch && (
        <div className={menuClass} role="menu" aria-label={tSidebar('switchAgent')}>
          <div className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {tSidebar('switchAgent')}
          </div>
          {switcherAgents.map((item) => {
            const isCurrent = item.id === agent.id;
            const itemFrameworkColor = FRAMEWORK_COLOR[item.framework] ?? 'var(--text-muted)';
            const itemStatus = STATUS_STYLES[item.status] ?? STATUS_STYLES.paused;
            return (
              <Link
                key={item.id}
                href={agentDashboardHref(item.id, activeTab)}
                role="menuitem"
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`flex min-w-0 items-center gap-2 rounded-[3px] px-2 py-2 text-left transition-colors ${
                  isCurrent
                    ? 'bg-[rgba(74,222,128,0.08)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.avatarUrl ? (
                  <Image
                    src={item.avatarUrl}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="h-7 w-7 flex-shrink-0 rounded-[3px] border border-[var(--border-default)] object-cover"
                  />
                ) : (
                  <span
                    className="h-7 w-7 flex-shrink-0 rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] inline-flex items-center justify-center"
                    style={{ color: itemFrameworkColor, fontFamily: 'var(--font-mono)' }}
                    aria-hidden
                  >
                    {FRAMEWORK_GLYPH[item.framework] ?? '◇'}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                    {item.name}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[9px] uppercase tracking-[0.06em] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span className="truncate">{item.framework}</span>
                    <span className="h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" aria-hidden />
                    <span className="truncate">{itemStatus.label}</span>
                  </span>
                </span>
                {isCurrent && <Check size={13} className="flex-shrink-0 text-[var(--accent)]" aria-hidden />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const AgentSidebar = memo(function AgentSidebar({ agent, agents, agentsLoading, activeTab, onTabChange }: AgentSidebarProps) {
  const { viewMode } = useAgentContext();
  const tTabs = useTranslations('dashboard.agentDetail.tabs');
  const tSidebarGroups = useTranslations('dashboard.agentDetail.sidebarGroups');
  const tNav = useTranslations('dashboard.agentDetail.nav');
  const tSidebar = useTranslations('dashboard.agentDetail.sidebar');
  const allTabs = getTabs(agent.framework, tTabs);
  const tabs = viewMode === 'easy' ? allTabs.filter(t => EASY_TABS.includes(t.id)) : allTabs;
  const statusInfo = STATUS_STYLES[agent.status] ?? STATUS_STYLES.paused;
  const frameworkColor = FRAMEWORK_COLOR[agent.framework] ?? 'var(--text-muted)';
  const frameworkGlyph = FRAMEWORK_GLYPH[agent.framework] ?? '◇';

  const GROUP_LABELS: Record<string, string> = {
    main: tSidebarGroups('operate'),
    configure: tSidebarGroups('configure'),
    data: tSidebarGroups('monitor'),
    advanced: tSidebarGroups('advanced'),
  };

  const groups = ['main', 'configure', 'data', 'advanced'] as const;

  // Mobile: scroll active tab into view
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileTabsRef.current) return;
    const activeEl = mobileTabsRef.current.querySelector('[data-active="true"]');
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeTab]);

  const isPulse = statusInfo.pulse;
  const statusToneClass =
    agent.status === 'active' ? 'text-[var(--accent)] border-[rgba(74,222,128,0.4)] bg-[rgba(74,222,128,0.08)]'
      : (agent.status === 'error' || agent.status === 'killed') ? 'text-[#ff8a8a] border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.08)]'
      : (agent.status === 'paused' || agent.status === 'restarting' || agent.status === 'stopping') ? 'text-[#fbbf24] border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.08)]'
      : 'text-[var(--text-muted)] border-[var(--border-default)] bg-transparent';

  // ── Desktop sidebar content ──
  const navContent = (
    <nav className="flex flex-col h-full" aria-label="Agent navigation">
      {/* Identity strip */}
      <div className="p-4 border-b border-[var(--border-default)]">
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-1.5 text-[11px] mb-3 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors uppercase tracking-[0.12em]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <ChevronLeft size={12} />
          {tNav('allAgents')}
        </Link>
        <div className="flex items-center gap-3">
          {agent.avatarUrl ? (
            <Image
              src={agent.avatarUrl}
              alt={agent.name}
              width={40}
              height={40}
              unoptimized
              className="w-10 h-10 rounded-[3px] object-cover border border-[var(--border-default)] flex-shrink-0"
            />
          ) : (
            <span
              className="w-10 h-10 rounded-[3px] inline-flex items-center justify-center border border-[var(--border-default)] bg-[var(--bg-elevated)] flex-shrink-0"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: frameworkColor }}
              aria-hidden
            >
              {frameworkGlyph}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <AgentSwitcher
              agent={agent}
              agents={agents}
              agentsLoading={agentsLoading}
              activeTab={activeTab}
              variant="desktop"
            />
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[9px] px-1.5 py-px rounded-[3px] border uppercase font-bold tracking-[0.06em]"
                style={{ fontFamily: 'var(--font-mono)', color: frameworkColor, borderColor: frameworkColor + '50', background: frameworkColor + '14' }}
              >
                {agent.framework}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-px rounded-[3px] border uppercase font-bold tracking-[0.06em] ${statusToneClass}`}
                style={{ fontFamily: 'var(--font-mono)' }}
                role="status"
              >
                {isPulse && <span className="w-1 h-1 rounded-full bg-current animate-pulse" aria-hidden />}
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enter 3D Room — pinned shortcut */}
      <div className="px-3 pt-3">
        <Link
          href={`/agent/${agent.slug ?? agent.id}/room?from=dashboard`}
          className="group flex items-center gap-2 rounded-[3px] border px-3 py-2.5 transition-all"
          style={{
            fontFamily: 'var(--font-mono)',
            color: frameworkColor,
            borderColor: frameworkColor + '50',
            background: frameworkColor + '0d',
          }}
          title={tSidebar('enter3DRoomTooltip')}
        >
          <span className="text-base leading-none" aria-hidden>▎</span>
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em]">
              {tSidebar('enter3DRoom')}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              {tSidebar('enter3DRoomSubtitle')}
            </span>
          </span>
          <span
            className="ml-auto opacity-60 group-hover:opacity-100 transition-opacity"
            aria-hidden
          >
            →
          </span>
        </Link>
      </div>

      {/* Tab list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {groups.map((group) => {
          const groupTabs = tabs.filter((t) => t.group === group);
          if (groupTabs.length === 0) return null;
          return (
            <div key={group} className={group !== 'main' ? 'mt-4' : ''}>
              {GROUP_LABELS[group] && (
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] px-3 mb-1.5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {GROUP_LABELS[group]}
                </p>
              )}
              {groupTabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onTabChange(t.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-[3px] text-[13px] transition-colors duration-150 relative cursor-pointer ${
                      isActive
                        ? 'text-[var(--accent)] bg-[rgba(74,222,128,0.06)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[var(--accent)]"
                        style={{ boxShadow: '0 0 6px var(--accent-glow)' }}
                        aria-hidden
                      />
                    )}
                    <span className={isActive ? 'text-[var(--accent)]' : ''}>{t.icon}</span>
                    <span className="font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile: sticky horizontal tab bar */}
      <div className="lg:hidden sticky top-14 z-30 border-b border-[var(--border-default)] bg-[var(--bg-base)]/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-default)]">
          <Link
            href="/dashboard/agents"
            className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            aria-label={tNav('allAgents')}
          >
            <ChevronLeft size={16} />
          </Link>
          {agent.avatarUrl ? (
            <Image
              src={agent.avatarUrl}
              alt={agent.name}
              width={20}
              height={20}
              unoptimized
              className="w-5 h-5 rounded-[3px] object-cover border border-[var(--border-default)] flex-shrink-0"
            />
          ) : (
            <span
              className="w-5 h-5 rounded-[3px] inline-flex items-center justify-center border border-[var(--border-default)] bg-[var(--bg-elevated)] flex-shrink-0"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: frameworkColor }}
              aria-hidden
            >
              {frameworkGlyph}
            </span>
          )}
          <AgentSwitcher
            agent={agent}
            agents={agents}
            agentsLoading={agentsLoading}
            activeTab={activeTab}
            variant="mobile"
          />
          <span
            className={`ml-auto inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-[3px] border uppercase font-bold tracking-[0.06em] ${statusToneClass}`}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {isPulse && <span className="w-1 h-1 rounded-full bg-current animate-pulse" aria-hidden />}
            {statusInfo.label}
          </span>
        </div>

        <div
          ref={mobileTabsRef}
          className="flex overflow-x-auto scrollbar-hide"
          role="tablist"
          aria-label="Agent navigation"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {groups.map((group, groupIndex) => {
            const groupTabs = tabs.filter((t) => t.group === group);
            if (groupTabs.length === 0) return null;
            return (
              <div key={group} className="flex flex-shrink-0 items-stretch">
                {groupIndex > 0 && (
                  <div className="w-px bg-[var(--border-default)] my-1.5 flex-shrink-0" aria-hidden />
                )}
                {groupTabs.map((t) => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={isActive}
                      data-active={isActive}
                      onClick={() => onTabChange(t.id)}
                      className={`relative flex flex-col items-center gap-0.5 px-3 py-2 min-w-[58px] flex-shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-inset ${
                        isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {isActive && (
                        <span
                          className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--accent)]"
                          style={{ boxShadow: '0 0 6px var(--accent-glow)' }}
                          aria-hidden
                        />
                      )}
                      <span aria-hidden>{t.icon}</span>
                      <span className="text-[9px] font-medium leading-tight whitespace-nowrap uppercase tracking-[0.06em]">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 flex-shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-base)] min-h-screen sticky top-0 max-h-screen overflow-visible">
        {navContent}
      </aside>
    </>
  );
});
