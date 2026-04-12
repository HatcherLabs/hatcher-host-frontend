'use client';

import { useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
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
  Sparkles,
  GitMerge,
  History,
  ChevronLeft,
  Bot,
  Cpu,
  TerminalSquare,
  Radio,
} from 'lucide-react';
import type { Tab } from './AgentContext';
import { STATUS_STYLES, FRAMEWORK_BADGE } from './AgentContext';
import { FRAMEWORKS } from '@hatcher/shared';
import type { LucideIcon } from 'lucide-react';
import type { Agent } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { generateAgentAvatar } from '@/lib/avatar-generator';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  group: 'main' | 'configure' | 'data' | 'advanced';
}

function getTabs(framework?: string): TabDef[] {
  return [
    // Internal id stays 'overview' to preserve persisted tab state on clients
    // that saved the previous label — the display-only rename to "Dashboard"
    // landed with the Etapa 1 dashboard refactor. See
    // components/agents/dashboard/DashboardTab.tsx for the new entry point.
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={18} />, group: 'main' },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} />, group: 'main' },
    { id: 'terminal', label: 'Terminal', icon: <TerminalSquare size={18} />, group: 'main' },
    { id: 'config', label: 'Config', icon: <Settings size={18} />, group: 'configure' },
    { id: 'integrations', label: 'Integrations', icon: <Puzzle size={18} />, group: 'configure' },
    { id: 'plugins', label: 'Plugins & Skills', icon: <Puzzle size={18} />, group: 'configure' },
    { id: 'logs', label: 'Logs', icon: <ScrollText size={18} />, group: 'data' },
    { id: 'stats', label: 'Stats', icon: <BarChart3 size={18} />, group: 'data' },
    // Memory tab: for openclaw/hermes reads files from the workspace,
    // for elizaos hits the elizaos REST API (PGLite-backed). Milady
    // doesn't expose a memory viewer yet.
    ...(framework !== 'milady' ? [{ id: 'memory' as const, label: 'Memory', icon: <Brain size={18} />, group: 'data' as const }] : []),
    // Sessions tab: framework-specific.
    //   elizaos → /api/agents/:uuid/rooms (PGLite-backed rooms)
    //   openclaw (managed) → /openclaw/sessions (reads agents/main/sessions/sessions.json)
    ...(framework === 'elizaos' || framework === 'openclaw'
      ? [{ id: 'sessions' as const, label: 'Sessions', icon: <MessageSquare size={18} />, group: 'data' as const }]
      : []),
    { id: 'files', label: 'Files', icon: <FolderOpen size={18} />, group: 'data' },
    // Workspace viewer — openclaw (managed) and managed hermes. Read-only
    // tree of the agent's workspace. Free for all users.
    ...(framework === 'openclaw' || framework === 'hermes' ? [{ id: 'workspace' as const, label: 'Workspace', icon: <FolderTree size={18} />, group: 'data' as const }] : []),
    // Schedules + Workflows: both tabs render for all frameworks (the
    // components themselves gate on framework-specific support — e.g.
    // SchedulesTab has FRAMEWORK_SCHEDULE_SUPPORT that distinguishes
    // native cron vs. external trigger). Before Phase 3 they were
    // reachable only via the "Manage" button in OpenClawSchedulesCard
    // (deep-link). Exposing them here in the Advanced group surfaces
    // the feature to every operator without cluttering the main tabs.
    { id: 'schedules', label: 'Schedules', icon: <Clock size={18} />, group: 'advanced' },
    { id: 'workflows', label: 'Workflows', icon: <GitMerge size={18} />, group: 'advanced' },
  ];
}

const FRAMEWORK_AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  openclaw: { bg: 'from-amber-600 to-amber-400', text: 'text-amber-100' },
  hermes: { bg: 'from-purple-600 to-purple-400', text: 'text-purple-100' },
  elizaos: { bg: 'from-cyan-600 to-cyan-400', text: 'text-cyan-100' },
  milady: { bg: 'from-rose-600 to-rose-400', text: 'text-rose-100' },
};
const DEFAULT_AVATAR = { bg: 'from-slate-600 to-slate-400', text: 'text-slate-100' };

const FRAMEWORK_ICONS: Record<string, LucideIcon> = {
  openclaw: Cpu,
  hermes: Brain,
  elizaos: Bot,
  milady: Sparkles,
};

const GROUP_LABELS: Record<string, string> = {
  main: '',
  configure: 'Configure',
  data: 'Monitor',
  advanced: 'Advanced',
};

interface AgentSidebarProps {
  agent: Agent;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const AgentSidebar = memo(function AgentSidebar({ agent, activeTab, onTabChange }: AgentSidebarProps) {
  const tabs = getTabs(agent.framework);
  const statusInfo = STATUS_STYLES[agent.status] ?? STATUS_STYLES.paused;
  const frameworkMeta = FRAMEWORKS[agent.framework];
  const avatarColors = FRAMEWORK_AVATAR_COLORS[agent.framework] ?? DEFAULT_AVATAR;
  const FrameworkIcon = FRAMEWORK_ICONS[agent.framework] ?? Bot;

  const groups = ['main', 'configure', 'data', 'advanced'] as const;

  const navContent = (
    <nav className="flex flex-col h-full" aria-label="Agent navigation">
      {/* Agent identity */}
      <div className="p-4 border-b border-[var(--border-default)]">
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-1.5 text-xs mb-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ChevronLeft size={14} />
          All Agents
        </Link>
        <div className="flex items-center gap-3">
          <Image
            src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)}
            alt={agent.name}
            width={40}
            height={40}
            unoptimized
            className="w-10 h-10 rounded-full object-cover border border-[var(--border-default)] flex-shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">{agent.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${FRAMEWORK_BADGE[agent.framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                {frameworkMeta?.name ?? agent.framework}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {groups.map((group) => {
          const groupTabs = tabs.filter((t) => t.group === group);
          if (groupTabs.length === 0) return null;
          return (
            <div key={group} className={group !== 'main' ? 'mt-4' : ''}>
              {GROUP_LABELS[group] && (
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] px-3 mb-1">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative cursor-pointer ${
                      isActive
                        ? 'text-[var(--text-primary)] bg-[var(--color-accent)]/10'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActive"
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[var(--color-accent)]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={isActive ? 'text-[var(--color-accent)]' : ''}>{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );

  // Mobile horizontal tab strip — scroll active tab into view
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileTabsRef.current) return;
    const activeEl = mobileTabsRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTab]);

  return (
    <>
      {/* Mobile: sticky horizontal tab bar — replaces hamburger on small screens */}
      <div className="lg:hidden sticky top-14 z-30 border-b border-[var(--border-default)] bg-[var(--bg-base)]/95 backdrop-blur-sm">
        {/* Agent identity strip */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-default)]">
          <Link
            href="/dashboard/agents"
            className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            aria-label="Back to all agents"
          >
            <ChevronLeft size={16} />
          </Link>
          <Image
            src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)}
            alt={agent.name}
            width={20}
            height={20}
            unoptimized
            className="w-5 h-5 rounded-full object-cover border border-[var(--border-default)] flex-shrink-0"
          />
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate min-w-0">{agent.name}</span>
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <span
              role="status"
              aria-label={`Agent status: ${statusInfo.label}`}
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${statusInfo.classes}`}
            >
              {statusInfo.pulse && (
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.dotColor} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusInfo.dotColor}`} />
                </span>
              )}
              {statusInfo.label}
            </span>
            <span className={`hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-full border ${FRAMEWORK_BADGE[agent.framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
              {frameworkMeta?.name ?? agent.framework}
            </span>
          </div>
        </div>

        {/* Horizontal scrolling tab list with group dividers */}
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
                  <div className="w-px bg-[var(--border-default)] my-1.5 flex-shrink-0" aria-hidden="true" />
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
                      className={`relative flex flex-col items-center gap-0.5 px-3 py-2 min-w-[58px] flex-shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50 focus-visible:ring-inset ${
                        isActive ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="mobileTabUnderline"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--color-accent)]"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span aria-hidden="true">{t.icon}</span>
                      <span className="text-[9px] font-medium leading-tight whitespace-nowrap">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 flex-shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-base)]/50 min-h-screen sticky top-0 max-h-screen overflow-hidden">
        {navContent}
      </aside>
    </>
  );
});
