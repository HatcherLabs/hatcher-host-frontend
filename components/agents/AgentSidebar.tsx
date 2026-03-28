'use client';

import { motion } from 'framer-motion';
import type { Agent } from '@/lib/api';
import type { Tab } from './AgentContext';
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Plug,
  FileText,
  BarChart2,
  Brain,
  BookOpen,
  Clock,
  GitFork,
  Zap,
  History,
  Wrench,
} from 'lucide-react';

interface AgentSidebarProps {
  agent: Agent;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',      icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'chat',         label: 'Chat',          icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'config',       label: 'Config',        icon: <Settings className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integrations',  icon: <Plug className="w-4 h-4" /> },
  { id: 'skills',       label: 'Skills',        icon: <Zap className="w-4 h-4" /> },
  { id: 'memory',       label: 'Memory',        icon: <Brain className="w-4 h-4" /> },
  { id: 'knowledge',    label: 'Knowledge',     icon: <BookOpen className="w-4 h-4" /> },
  { id: 'files',        label: 'Files',         icon: <FileText className="w-4 h-4" /> },
  { id: 'logs',         label: 'Logs',          icon: <Wrench className="w-4 h-4" /> },
  { id: 'schedules',    label: 'Schedules',     icon: <Clock className="w-4 h-4" /> },
  { id: 'workflows',    label: 'Workflows',     icon: <GitFork className="w-4 h-4" /> },
  { id: 'versions',     label: 'Versions',      icon: <History className="w-4 h-4" /> },
  { id: 'stats',        label: 'Stats',         icon: <BarChart2 className="w-4 h-4" /> },
];

export function AgentSidebar({ activeTab, onTabChange }: AgentSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-[200px] flex-shrink-0 border-r border-[rgba(46,43,74,0.3)] py-4"
        style={{ background: 'rgba(10, 9, 20, 0.5)' }}
      >
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left"
                style={{
                  color: isActive ? '#ffffff' : '#71717a',
                  background: isActive ? 'rgba(6,182,212,0.08)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#a1a1aa';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#71717a';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#06b6d4]"
                    layoutId="agentSidebarActive"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span style={{ color: isActive ? '#06b6d4' : 'inherit' }}>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: horizontal scroll tab bar */}
      <div
        className="md:hidden border-b border-[rgba(46,43,74,0.3)] flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ background: 'rgba(10, 9, 20, 0.5)' }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center gap-0.5 py-2.5 px-3 text-[10px] transition-all flex-shrink-0 min-w-[60px] font-medium"
              style={{ color: isActive ? '#06b6d4' : '#71717a' }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
