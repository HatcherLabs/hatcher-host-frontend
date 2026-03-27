'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { Tab } from './AgentContext';

// Core tabs always visible on desktop
const CORE_TAB_IDS: Tab[] = ['overview', 'chat', 'config', 'logs', 'stats'];

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  tabs: TabDef[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function AgentTabBar({ tabs, activeTab, onTabChange }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const coreTabs = tabs.filter(t => CORE_TAB_IDS.includes(t.id));
  const moreTabs = tabs.filter(t => !CORE_TAB_IDS.includes(t.id));
  const activeMoreTab = moreTabs.find(t => t.id === activeTab);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div id="agent-tabs" className="mb-8 border-b border-[rgba(46,43,74,0.3)]" role="tablist">
      {/* Mobile: horizontal scroll (all tabs) */}
      <div className="flex sm:hidden overflow-x-auto gap-0.5 px-1 py-1 -mx-1" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg text-[10px] transition-all flex-shrink-0 min-w-[56px] ${
              activeTab === t.id ? 'text-[#06b6d4] bg-[#06b6d4]/10' : 'text-[#71717a]'
            }`}
          >
            {t.icon}
            <span className="whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Desktop: core tabs + "More" dropdown */}
      <div className="hidden sm:flex items-center gap-0 relative">
        {coreTabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => onTabChange(t.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm transition-all duration-200 ${
              activeTab === t.id ? 'text-[#FFFFFF]' : 'text-[#71717a] hover:text-[#A5A1C2]'
            }`}
          >
            {t.icon}
            {t.label}
            {activeTab === t.id && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06b6d4] rounded-full"
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}

        {/* More dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(o => !o)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm transition-all duration-200 ${
              activeMoreTab ? 'text-[#FFFFFF]' : 'text-[#71717a] hover:text-[#A5A1C2]'
            }`}
          >
            {activeMoreTab ? activeMoreTab.icon : null}
            {activeMoreTab ? activeMoreTab.label : 'More'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
            {activeMoreTab && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06b6d4] rounded-full"
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-1 w-48 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                style={{
                  background: 'rgba(14, 14, 20, 0.95)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {moreTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { onTabChange(t.id); setMoreOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors duration-200 ${
                      activeTab === t.id
                        ? 'text-[#06b6d4] bg-[#06b6d4]/10'
                        : 'text-[#a1a1aa] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
