'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Sparkles,
  GitMerge,
  History,
  Menu,
  X,
  ChevronLeft,
  Activity,
  TrendingUp,
  HeartPulse,
} from 'lucide-react';
import type { Tab } from './AgentContext';
import { STATUS_STYLES, FRAMEWORK_BADGE } from './AgentContext';
import { FRAMEWORKS } from '@hatcher/shared';
import { getInitials, stringToColor } from '@/lib/utils';
import type { Agent } from '@/lib/api';
import Link from 'next/link';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  group: 'main' | 'configure' | 'data' | 'advanced';
}

function getTabs(framework?: string): TabDef[] {
  return [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} />, group: 'main' },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} />, group: 'main' },
    { id: 'config', label: 'Config', icon: <Settings size={18} />, group: 'configure' },
    { id: 'integrations', label: 'Integrations', icon: <Puzzle size={18} />, group: 'configure' },
    { id: 'skills', label: framework === 'elizaos' ? 'Plugins' : 'Skills', icon: <Sparkles size={18} />, group: 'configure' },
    { id: 'logs', label: 'Logs', icon: <ScrollText size={18} />, group: 'data' },
    { id: 'stats', label: 'Stats', icon: <BarChart3 size={18} />, group: 'data' },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} />, group: 'data' },
    { id: 'usage', label: 'Usage', icon: <Activity size={18} />, group: 'data' },
    { id: 'health', label: 'Health', icon: <HeartPulse size={18} />, group: 'data' },
    { id: 'memory', label: 'Memory', icon: <Brain size={18} />, group: 'data' },
    { id: 'knowledge', label: 'Knowledge', icon: <BookOpen size={18} />, group: 'data' },
    { id: 'files', label: 'Files', icon: <FolderOpen size={18} />, group: 'data' },
    { id: 'schedules', label: 'Schedules', icon: <Clock size={18} />, group: 'advanced' },
    { id: 'workflows', label: 'Workflows', icon: <GitMerge size={18} />, group: 'advanced' },
    { id: 'versions', label: 'Versions', icon: <History size={18} />, group: 'advanced' },
  ];
}

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

export function AgentSidebar({ agent, activeTab, onTabChange }: AgentSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tabs = getTabs(agent.framework);
  const statusInfo = STATUS_STYLES[agent.status] ?? STATUS_STYLES.paused;
  const frameworkMeta = FRAMEWORKS[agent.framework];
  const gradient = stringToColor(agent.id);
  const initials = getInitials(agent.name);

  const groups = ['main', 'configure', 'data', 'advanced'] as const;

  const navContent = (
    <nav className="flex flex-col h-full" aria-label="Agent navigation">
      {/* Agent identity */}
      <div className="p-4 border-b border-[rgba(46,43,74,0.3)]">
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-1.5 text-xs mb-3 text-[#71717a] hover:text-[#A5A1C2] transition-colors"
        >
          <ChevronLeft size={14} />
          All Agents
        </Link>
        <div className="flex items-center gap-3">
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="w-10 h-10 rounded-full object-cover border border-[rgba(46,43,74,0.3)] flex-shrink-0"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm border border-[rgba(46,43,74,0.3)] flex-shrink-0`}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#FFFFFF] truncate">{agent.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
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
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#52506b] px-3 mb-1">
                  {GROUP_LABELS[group]}
                </p>
              )}
              {groupTabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onTabChange(t.id);
                      setMobileOpen(false);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative cursor-pointer ${
                      isActive
                        ? 'text-[#FFFFFF] bg-[#06b6d4]/10'
                        : 'text-[#71717a] hover:text-[#A5A1C2] hover:bg-white/[0.03]'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActive"
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#06b6d4]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={isActive ? 'text-[#06b6d4]' : ''}>{t.icon}</span>
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

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-[68px] left-3 z-40 w-11 h-11 flex items-center justify-center rounded-lg border border-[rgba(46,43,74,0.4)] bg-[#0a0a12]/90 backdrop-blur-sm text-[#A5A1C2] hover:text-white transition-colors cursor-pointer"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 flex-shrink-0 border-r border-[rgba(46,43,74,0.3)] bg-[#0a0a12]/50 min-h-screen sticky top-0 max-h-screen overflow-hidden">
        {navContent}
      </aside>

      {/* Mobile overlay sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-[#0a0a12] border-r border-[rgba(46,43,74,0.3)] flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[#71717a] hover:text-white transition-colors"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
