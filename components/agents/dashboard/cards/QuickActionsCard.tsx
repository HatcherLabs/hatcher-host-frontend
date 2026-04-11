'use client';

import { useState } from 'react';
import {
  MessageSquare,
  ScrollText,
  Settings,
  Store,
  Loader2,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext } from '../../AgentContext';

// ── Publish to Marketplace button ────────────────────────────
// Renders as a grid item matching the other 3 quick actions.
function PublishToMarketplaceButton({ agentId }: { agentId: string }) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await api.publishToMarketplace(agentId);
      if (res.success) {
        setPublished(true);
        setTimeout(() => setPublished(false), 3000);
      } else {
        setError('error' in res ? res.error : 'Failed to publish');
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError('Network error');
      setTimeout(() => setError(null), 3000);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <button
      onClick={handlePublish}
      disabled={publishing || published}
      className={`group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all duration-200 text-sm bg-[var(--bg-elevated)] ${
        published
          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
          : error
            ? 'border-red-500/30 bg-red-500/5 text-red-400'
            : 'border-[var(--border-default)] hover:border-purple-500/30 hover:bg-purple-500/5 text-[var(--text-secondary)]'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          published ? 'bg-emerald-500/15' : 'bg-purple-500/10 group-hover/btn:bg-purple-500/15'
        }`}
      >
        {publishing ? (
          <Loader2 size={16} className="text-purple-400 animate-spin" />
        ) : published ? (
          <Check size={16} className="text-emerald-400" />
        ) : (
          <Store size={16} className="text-purple-400" />
        )}
      </div>
      {publishing ? 'Publishing...' : published ? 'Published!' : error ? error : 'Publish'}
    </button>
  );
}

/**
 * Quick actions grid — 4 buttons at the bottom of the dashboard
 * (Chat, Full Logs, Configure, Publish). Each wired into the tab
 * router (setTab) except Publish which calls the marketplace API.
 */
export function QuickActionsCard() {
  const { agent, setTab } = useAgentContext();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <button
        onClick={() => setTab('chat')}
        className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all duration-200 text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center group-hover/btn:bg-[var(--color-accent)]/15 transition-colors">
          <MessageSquare size={16} className="text-[var(--color-accent)]" />
        </div>
        Chat
      </button>
      <button
        onClick={() => setTab('logs')}
        className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all duration-200 text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center group-hover/btn:bg-[var(--color-accent)]/15 transition-colors">
          <ScrollText size={16} className="text-[var(--color-accent)]" />
        </div>
        Full Logs
      </button>
      <button
        onClick={() => setTab('config')}
        className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all duration-200 text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center group-hover/btn:bg-[var(--color-accent)]/15 transition-colors">
          <Settings size={16} className="text-[var(--color-accent)]" />
        </div>
        Configure
      </button>
      <PublishToMarketplaceButton agentId={agent.id} />
    </div>
  );
}
