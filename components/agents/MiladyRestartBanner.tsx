'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext } from './AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Shows a yellow "Restart required" banner when Milady reports
 * pendingRestart=true. Polls /milady/status every 15s while the
 * agent is active. One-click restart button.
 */
export function MiladyRestartBanner() {
  const { agent, loadAgent } = useAgentContext();
  const { toast } = useToast();
  const [pendingRestart, setPendingRestart] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [restarting, setRestarting] = useState(false);

  const poll = useCallback(async () => {
    if (!agent?.id || agent.framework !== 'milady' || agent.status !== 'active') {
      setPendingRestart(false);
      return;
    }
    try {
      const res = await api.getMiladyStatus(agent.id);
      if (res.success) {
        setPendingRestart(Boolean(res.data.pendingRestart));
        setReasons(res.data.pendingRestartReasons ?? []);
      }
    } catch {
      // Silent — container may have just stopped
    }
  }, [agent?.id, agent?.framework, agent?.status]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 15_000);
    return () => clearInterval(interval);
  }, [poll]);

  const restart = async () => {
    if (!agent?.id) return;
    setRestarting(true);
    try {
      const res = await api.restartMilady(agent.id);
      if (res.success) {
        toast.success('Milady restart initiated — give it ~30s to come back');
        setPendingRestart(false);
        // Refresh the agent state after a short delay
        setTimeout(() => loadAgent(), 3000);
      } else {
        toast.error(res.error || 'Restart failed');
      }
    } catch (e) {
      toast.error((e as Error).message || 'Restart failed');
    } finally {
      setRestarting(false);
    }
  };

  if (!pendingRestart) return null;

  return (
    <div className="mx-4 sm:mx-6 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 flex items-center gap-3">
      <AlertTriangle size={18} className="text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-300">Restart required</p>
        <p className="text-xs text-amber-400/80 mt-0.5">
          {reasons.length > 0
            ? reasons.join(', ')
            : 'Config changes are saved but need a restart to take effect.'}
        </p>
      </div>
      <button
        onClick={restart}
        disabled={restarting}
        className="text-xs px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
      >
        <RotateCw size={12} className={restarting ? 'animate-spin' : ''} />
        {restarting ? 'Restarting...' : 'Restart now'}
      </button>
    </div>
  );
}
