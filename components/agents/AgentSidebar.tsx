'use client';

import { useRef, useEffect, memo } from 'react';
import {
  MessageSquare,
  Settings,
  Puzzle,
  ScrollText,
  LayoutDashboard,
  BarChart3,
  FolderOpen,
  FolderTree,
  Brain,
  Clock,
  BookOpen,
  GitMerge,
  ChevronLeft,
  TerminalSquare,
  ShoppingCart,
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
    { id: 'terminal', label: tTabs('terminal'), icon: <TerminalSquare size={16} />, group: 'main' },
    { id: 'config', label: tTabs('config'), icon: <Settings size={16} />, group: 'configure' },
    { id: 'integrations', label: tTabs('integrations'), icon: <Puzzle size={16} />, group: 'configure' },
    { id: 'plugins', label: tTabs('plugins'), icon: <Puzzle size={16} />, group: 'configure' },
    { id: 'logs', label: tTabs('logs'), icon: <ScrollText size={16} />, group: 'data' },
    { id: 'stats', label: tTabs('stats'), icon: <BarChart3 size={16} />, group: 'data' },
    ...(framework !== 'milady' ? [{ id: 'memory' as const, label: tTabs('memory'), icon: <Brain size={16} />, group: 'data' as const }] : []),
    ...(framework === 'elizaos' || framework === 'openclaw'
      ? [{ id: 'sessions' as const, label: tTabs('sessions'), icon: <MessageSquare size={16} />, group: 'data' as const }]
      : []),
    { id: 'knowledge' as const, label: tTabs('knowledge'), icon: <BookOpen size={16} />, group: 'data' as const },
    { id: 'addons' as const, label: tTabs('addons'), icon: <ShoppingCart size={16} />, group: 'data' as const },
    { id: 'files', label: tTabs('files'), icon: <FolderOpen size={16} />, group: 'data' },
    ...(framework === 'openclaw' || framework === 'hermes' ? [{ id: 'workspace' as const, label: tTabs('workspace'), icon: <FolderTree size={16} />, group: 'data' as const }] : []),
    { id: 'schedules', label: tTabs('schedules'), icon: <Clock size={16} />, group: 'advanced' },
    { id: 'workflows', label: tTabs('workflows'), icon: <GitMerge size={16} />, group: 'advanced' },
  ];
}

const FRAMEWORK_GLYPH: Record<string, string> = {
  openclaw: '⊞',
  hermes: '◇',
  elizaos: '◯',
  milady: '★',
};

const FRAMEWORK_COLOR: Record<string, string> = {
  openclaw: '#f59e0b',
  hermes: '#a855f7',
  elizaos: '#38bdf8',
  milady: '#f43f5e',
};

interface AgentSidebarProps {
  agent: Agent;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const EASY_TABS: Tab[] = ['overview', 'chat', 'integrations', 'logs', 'stats'];

export const AgentSidebar = memo(function AgentSidebar({ agent, activeTab, onTabChange }: AgentSidebarProps) {
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
    main: '',
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
            <h2 className="text-sm font-bold text-[var(--text-primary)] truncate" style={{ fontFamily: 'var(--font-mono)' }}>{agent.name}</h2>
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
          <span
            className="text-xs font-bold text-[var(--text-primary)] truncate min-w-0"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {agent.name}
          </span>
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
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 flex-shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-base)] min-h-screen sticky top-0 max-h-screen overflow-hidden">
        {navContent}
      </aside>
    </>
  );
});
