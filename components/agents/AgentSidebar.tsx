'use client';

import { useRef, useEffect, memo, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
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
  Code2,
  Box,
  Bot,
  BrainCircuit,
} from 'lucide-react';
import type { Tab } from './AgentContext';
import { STATUS_STYLES, useAgentContext } from './AgentContext';
import type { Agent } from '@/lib/api';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { AgentStatusPill } from '@/components/ui/AgentStatusPill';
import {
  AGENT_NAVIGATION_GROUPS,
  EASY_AGENT_TABS,
  buildAgentNavigationTabs,
  type AgentNavigationGroup,
} from './navigationModel';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  group: AgentNavigationGroup;
}

function getTabs(framework: string | undefined, tTabs: ReturnType<typeof useTranslations<'dashboard.agentDetail.tabs'>>): TabDef[] {
  return buildAgentNavigationTabs(framework, (id) => tTabs(id === 'overview' ? 'dashboard' : id), 'advanced')
    .map((tab) => ({ ...tab, icon: iconForTab(tab.id) }));
}

function iconForTab(tab: Tab): React.ReactNode {
  const icons: Record<Tab, React.ReactNode> = {
    overview: <LayoutDashboard size={16} />,
    chat: <MessageSquare size={16} />,
    mail: <Mail size={16} />,
    terminal: <TerminalSquare size={16} />,
    dev: <Code2 size={16} />,
    config: <Settings size={16} />,
    integrations: <Puzzle size={16} />,
    skills: <Puzzle size={16} />,
    plugins: <Puzzle size={16} />,
    logs: <ScrollText size={16} />,
    stats: <BarChart3 size={16} />,
    memory: <Brain size={16} />,
    sessions: <MessageSquare size={16} />,
    knowledge: <BookOpen size={16} />,
    wallet: <Wallet size={16} />,
    files: <FolderOpen size={16} />,
    schedules: <Clock size={16} />,
    workflows: <GitMerge size={16} />,
  };

  return icons[tab];
}

const FRAMEWORK_COLOR: Record<string, string> = {
  openclaw: '#4a778b',
  hermes: '#486a79',
};

function FrameworkIcon({ framework, size = 18 }: { framework?: string; size?: number }) {
  const key = framework?.toLowerCase();
  if (key === 'openclaw') return <Bot size={size} strokeWidth={1.8} aria-hidden />;
  if (key === 'hermes') return <BrainCircuit size={size} strokeWidth={1.8} aria-hidden />;
  return <Box size={size} strokeWidth={1.8} aria-hidden />;
}

interface AgentSidebarProps {
  agent: Agent;
  agents?: Agent[];
  agentsLoading?: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

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
    ? 'group flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg text-left text-sm font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]'
    : 'group flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-lg text-left text-xs font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]';

  const menuClass = variant === 'desktop'
    ? 'absolute left-0 top-[calc(100%+8px)] z-50 w-[min(28rem,calc(100vw-2rem))] max-h-[340px] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-1.5 shadow-[var(--shadow-card)]'
    : 'absolute left-0 top-[calc(100%+10px)] z-50 w-[min(24rem,calc(100vw-1.5rem))] max-h-[60vh] overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-card)]';

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
      >
        <span className="min-w-0 truncate">{agent.name}</span>
            <span className={`ml-auto inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
          open
            ? variant === 'desktop'
              ? 'border-[var(--border-hover)] bg-[var(--tech-accent-soft)] text-[var(--accent)]'
              : 'border-[var(--accent)] bg-[rgba(74,119,139,0.08)] text-[var(--accent)]'
            : canSwitch
              ? variant === 'desktop'
                ? 'border-[var(--border-default)] text-[var(--text-muted)] group-hover:border-[var(--border-hover)] group-hover:text-[var(--accent)]'
                : 'border-[var(--border-default)] text-[var(--text-muted)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]'
              : variant === 'desktop'
                ? 'border-[var(--border-default)] text-[var(--text-muted)] opacity-50'
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
          <div className="px-2 py-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
            {tSidebar('switchAgent')}
          </div>
          {switcherAgents.map((item) => {
            const isCurrent = item.id === agent.id;
            const itemStatus = STATUS_STYLES[item.status] ?? STATUS_STYLES.paused;
            return (
              <Link
                key={item.id}
                href={agentDashboardHref(item.id, activeTab)}
                role="menuitem"
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                  variant === 'desktop'
                    ? isCurrent
                      ? 'bg-[var(--tech-accent-soft)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    : isCurrent
                      ? 'bg-[rgba(74,119,139,0.08)] text-[var(--accent)]'
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
                    className="h-7 w-7 flex-shrink-0 rounded-md border border-[var(--border-default)] object-cover"
                  />
                ) : (
                  <span
                    className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-base)]"
                    style={{ color: FRAMEWORK_COLOR[item.framework] ?? 'var(--text-muted)' }}
                    aria-hidden
                  >
                    <FrameworkIcon framework={item.framework} size={15} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">
                    {item.name}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-none text-[var(--text-muted)]">
                    <span className="truncate">{item.framework}</span>
                    <span className="h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" aria-hidden />
                    <span className="inline-flex flex-shrink-0 items-center gap-1 leading-none">
                      <span className={`h-1.5 w-1.5 rounded-full ${itemStatus.dotColor}`} aria-hidden />
                      <span>{itemStatus.label}</span>
                    </span>
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
  const tabs = viewMode === 'easy' ? allTabs.filter(t => EASY_AGENT_TABS.includes(t.id)) : allTabs;
  const statusInfo = STATUS_STYLES[agent.status] ?? STATUS_STYLES.paused;
  const frameworkColor = FRAMEWORK_COLOR[agent.framework] ?? 'var(--text-muted)';

  const GROUP_LABELS: Record<string, string> = {
    operate: tSidebarGroups('operate'),
    configure: tSidebarGroups('configure'),
    assets: tSidebarGroups('monitor'),
    advanced: tSidebarGroups('advanced'),
  };

  const groups = AGENT_NAVIGATION_GROUPS;

  // Mobile: scroll active tab into view
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileTabsRef.current) return;
    const activeEl = mobileTabsRef.current.querySelector('[data-active="true"]');
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeTab]);

  const scrollMobileTabs = (direction: -1 | 1) => {
    const container = mobileTabsRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * Math.max(180, Math.round(container.clientWidth * 0.72)),
      behavior: 'smooth',
    });
  };

  // ── Desktop sidebar content ──
  const navContent = (
    <nav className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-[var(--bg-sidebar)] text-[var(--text-primary)]" aria-label="Agent navigation">
      {/* Identity strip */}
      <div className="border-b border-[var(--border-default)] p-3">
        <Link
          href="/dashboard/agents"
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
        >
          <ChevronLeft size={12} />
          {tNav('allAgents')}
        </Link>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            {agent.avatarUrl ? (
              <Image
                src={agent.avatarUrl}
                alt={agent.name}
                width={44}
                height={44}
                unoptimized
                className="h-11 w-11 flex-shrink-0 rounded-xl border border-[var(--border-default)] object-cover"
              />
            ) : (
              <span
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]"
                style={{ color: frameworkColor }}
                aria-hidden
              >
                <FrameworkIcon framework={agent.framework} size={22} />
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
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-lg border px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: frameworkColor, borderColor: frameworkColor + '70', background: frameworkColor + '18' }}
                >
                  {agent.framework}
                </span>
                <AgentStatusPill status={agent.status} label={statusInfo.label} pulse={statusInfo.pulse} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab list */}
      <div className="min-h-0 overflow-y-auto overscroll-contain px-2 py-3">
        {groups.map((group) => {
          const groupTabs = tabs.filter((t) => t.group === group);
          if (groupTabs.length === 0) return null;
          return (
            <div key={group} className="mt-4 first:mt-0">
              {GROUP_LABELS[group] && (
                <p
                  className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.08em] text-[var(--text-muted)]"
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
                    className={`relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors duration-150 ${
                      isActive
                        ? 'bg-[var(--control-active)] text-[var(--control-active-text)] shadow-[var(--shadow-soft)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {isActive && (
                      <span
                        className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full bg-[var(--tech-accent)]"
                        aria-hidden
                      />
                    )}
                    <span
                      className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border ${
                        isActive
                          ? 'border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] text-[var(--control-active-text)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                      }`}
                    >
                      {t.icon}
                    </span>
                    <span className="font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--border-default)] p-3">
        <Link
          href={`/agent/${agent.slug ?? agent.id}/room?from=dashboard`}
          className="group flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 text-[var(--text-primary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
          title={tSidebar('enter3DRoomTooltip')}
        >
          <Box size={15} className="text-[var(--accent)]" aria-hidden />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-semibold">{tSidebar('enter3DRoom')}</span>
            <span className="truncate text-[10px] text-[var(--text-muted)]">{tSidebar('enter3DRoomSubtitle')}</span>
          </span>
          <ArrowRight size={13} className="ml-auto text-[var(--accent)] opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile: sticky horizontal tab bar */}
      <div className="sticky top-[var(--app-nav-height,64px)] z-30 border-b border-[var(--border-default)] bg-[var(--bg-base)] shadow-[var(--shadow-soft)] backdrop-blur-md xl:hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border-line)] px-3 py-2">
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
              className="h-6 w-6 flex-shrink-0 rounded-lg border border-[var(--border-default)] object-cover"
            />
          ) : (
            <span
              className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]"
              style={{ color: frameworkColor }}
              aria-hidden
            >
              <FrameworkIcon framework={agent.framework} size={13} />
            </span>
          )}
          <AgentSwitcher
            agent={agent}
            agents={agents}
            agentsLoading={agentsLoading}
            activeTab={activeTab}
            variant="mobile"
          />
          <AgentStatusPill
            status={agent.status}
            label={statusInfo.label}
            pulse={statusInfo.pulse}
            className="ml-auto"
          />
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-1 px-2 py-2">
          <button
            type="button"
            onClick={() => scrollMobileTabs(-1)}
            className="inline-flex w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
            aria-label="Scroll agent tabs left"
          >
            <ChevronLeft size={14} />
          </button>
          <div
            ref={mobileTabsRef}
            className="flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-lg px-1"
            role="tablist"
            aria-label="Agent navigation"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
          >
            {groups.map((group, groupIndex) => {
              const groupTabs = tabs.filter((t) => t.group === group);
              if (groupTabs.length === 0) return null;
              return (
                <div key={group} className="flex flex-shrink-0 snap-x items-stretch gap-1">
                  {groupIndex > 0 && <div className="w-1 flex-shrink-0" aria-hidden />}
                  {groupTabs.map((t) => {
                    const isActive = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        role="tab"
                        aria-selected={isActive}
                        data-active={isActive}
                        onClick={() => onTabChange(t.id)}
                        className={`relative flex min-w-[76px] flex-shrink-0 snap-start cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-3 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-inset ${
                          isActive
                            ? 'border-[var(--border-hover)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]'
                            : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className={isActive ? 'text-[var(--accent)]' : ''} aria-hidden>{t.icon}</span>
                        <span className="text-[11px] font-medium leading-tight whitespace-nowrap">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => scrollMobileTabs(1)}
            className="inline-flex w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
            aria-label="Scroll agent tabs right"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-[var(--app-nav-height,64px)] hidden h-[calc(100dvh-var(--app-nav-height,64px))] min-h-0 w-60 flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-default)] bg-[var(--bg-sidebar)] shadow-[16px_0_42px_rgba(0,0,0,0.05)] xl:flex xl:w-64">
        {navContent}
      </aside>
    </>
  );
});
