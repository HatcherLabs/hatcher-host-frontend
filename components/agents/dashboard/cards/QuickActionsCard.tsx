'use client';

import {
  MessageSquare,
  ScrollText,
  Settings,
} from 'lucide-react';
import { useAgentContext } from '../../AgentContext';

/**
 * Quick actions grid at the bottom of the agent dashboard.
 * Publish-to-marketplace was removed — marketplace feature is
 * discontinued.
 */
export function QuickActionsCard() {
  const { setTab } = useAgentContext();

  return (
    <div className="grid grid-cols-3 gap-4">
      <button
        onClick={() => setTab('chat')}
        className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-colors text-sm text-[var(--text-secondary)] bg-[var(--bg-card)]/40 cursor-pointer"
      >
        <MessageSquare size={18} className="text-[var(--color-accent)]" strokeWidth={1.75} />
        Chat
      </button>
      <button
        onClick={() => setTab('logs')}
        className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-colors text-sm text-[var(--text-secondary)] bg-[var(--bg-card)]/40 cursor-pointer"
      >
        <ScrollText size={18} className="text-[var(--color-accent)]" strokeWidth={1.75} />
        Full logs
      </button>
      <button
        onClick={() => setTab('config')}
        className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-colors text-sm text-[var(--text-secondary)] bg-[var(--bg-card)]/40 cursor-pointer"
      >
        <Settings size={18} className="text-[var(--color-accent)]" strokeWidth={1.75} />
        Configure
      </button>
    </div>
  );
}
