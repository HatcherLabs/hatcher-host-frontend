'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, FolderTree, Power } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface WorkspaceSummary {
  fileCount: number;
  dirCount: number;
  totalBytes: number;
  truncated: boolean;
  topEntries: Array<{ path: string; type: 'file' | 'dir'; size: number }>;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * OpenClaw managed-mode workspace overview. Aggregates file/dir
 * counts and total bytes from the `/workspace/tree` endpoint,
 * surfaces the top-level directories, and links to the Workspace
 * tab for the full browser.
 *
 * Only useful for managed OpenClaw — legacy agents have no
 * workspace viewer so this card surfaces a "not available" state.
 *
 * Gated on `agent.status === 'active'` because /workspace/tree
 * execs into the container via `find`; if the DB says active but
 * the container is actually dead, the backend throws a raw
 * "Container X is not running" error that bubbles as 500. Easier
 * to not fetch at all and show a friendly "container stopped"
 * empty state than to rely on backend error handling we don't
 * control.
 */
export function OpenClawWorkspaceCard() {
  const { agent, setTab } = useAgentContext();
  const [data, setData] = useState<WorkspaceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isActive = agent.status === 'active';

  const fetchTree = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getAgentWorkspaceTree(agent.id, 2);
      if (res.success) {
        const entries = res.data.entries ?? [];
        let fileCount = 0;
        let dirCount = 0;
        let totalBytes = 0;
        const topLevelDirs: Array<{ path: string; type: 'file' | 'dir'; size: number }> = [];

        for (const entry of entries) {
          if (entry.type === 'file') {
            fileCount++;
            totalBytes += entry.size;
          } else if (entry.type === 'dir') {
            dirCount++;
          }
          // Collect top-level entries (no slash in their relative path)
          if (!entry.path.includes('/') && topLevelDirs.length < 8) {
            topLevelDirs.push(entry);
          }
        }

        setData({
          fileCount,
          dirCount,
          totalBytes,
          truncated: res.data.truncated,
          topEntries: topLevelDirs,
        });
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load workspace');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id, isActive]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  if (!isActive) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <FolderTree size={14} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Workspace</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Power size={12} className="text-[var(--text-muted)]" />
          Start the agent to view its workspace.
        </div>
      </GlassCard>
    );
  }

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-14 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Workspace unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderTree size={14} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Workspace</h3>
        </div>
        <button
          onClick={() => setTab('workspace')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Browse
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
            {data.fileCount}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Files</div>
        </div>
        <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
            {data.dirCount}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Directories</div>
        </div>
        <div className="rounded-xl px-3 py-2.5 bg-amber-500/10 border border-amber-500/20">
          <div className="text-lg font-bold text-amber-400 tabular-nums">
            {formatBytes(data.totalBytes)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Total Size</div>
        </div>
      </div>

      {data.topEntries.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Top Level
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.topEntries.map((entry) => (
              <span
                key={entry.path}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] font-mono"
              >
                {entry.type === 'dir' ? `${entry.path}/` : entry.path}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.truncated && (
        <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
          Listing truncated — the full tree has more entries. Open the Workspace tab for the complete view.
        </p>
      )}
    </GlassCard>
  );
}
