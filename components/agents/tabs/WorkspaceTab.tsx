'use client';

// ============================================================
// WorkspaceTab — managed workspace viewer (OpenClaw + Hermes)
//
// Read-only file browser for the agent's workspace. Backed by the
// framework-aware `/agents/:id/workspace/*` routes in api-repo:
//
//   - OpenClaw: /home/node/.openclaw/workspace (everything)
//   - Hermes:   /home/hermes/.hermes restricted to SOUL.md,
//               memories/, sessions/, skills/ via a backend allowlist
//               (enforced in getWorkspaceConfig + isUnderAllowedRoot)
//
// Shows a tree on the left (dirs collapsed by default) and the selected
// file's content on the right. Binary or oversized files render a
// metadata-only placeholder with the upstream reason.
//
// Editing is NOT exposed here — the philosophy is that the agent owns
// its workspace and users drive changes by chatting with it. Power users
// can still edit openclaw.json via ConfigTab (Etapa 2), edit config.yaml
// via HermesConfigTab, and talk to the agent about SOUL.md / memory
// updates.
// ============================================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  FolderTree,
  FileText,
  Folder,
  FolderOpen,
  RotateCcw,
  AlertCircle,
  PauseCircle,
  FileX,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';

interface TreeEntry {
  path: string;
  type: 'file' | 'dir';
  size: number;
}

interface TreeNode {
  name: string;
  path: string; // full relative path
  type: 'file' | 'dir';
  size: number;
  children: TreeNode[];
}

/**
 * Convert the flat entry list from the API into a nested tree so the
 * UI can render collapsible directories. The API returns paths like
 * "memory/2026-04-10.md" — we split on "/" and build the hierarchy.
 */
function buildTree(entries: TreeEntry[]): TreeNode[] {
  const root: TreeNode = { name: 'workspace', path: '', type: 'dir', size: 0, children: [] };

  for (const entry of entries) {
    const parts = entry.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const partPath = parts.slice(0, i + 1).join('/');

      let next = current.children.find((c) => c.name === part);
      if (!next) {
        next = {
          name: part,
          path: partPath,
          type: isLast ? entry.type : 'dir',
          size: isLast ? entry.size : 0,
          children: [],
        };
        current.children.push(next);
      }
      current = next;
    }
  }

  // Sort children: dirs first, then files, both alphabetically
  function sortRecursive(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortRecursive);
  }
  sortRecursive(root);

  return root.children;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function TreeNodeView({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedDirs,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedDirs: Set<string>;
  onToggle: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedPath === node.path;

  if (node.type === 'dir') {
    return (
      <>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-[var(--bg-hover)] transition-colors text-left"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-amber-400/80" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-amber-400/80" />
          )}
          <span className="text-[var(--text-primary)] truncate">{node.name}</span>
          <span className="ml-auto text-xs text-[var(--text-muted)]">{node.children.length}</span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeNodeView
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedDirs={expandedDirs}
              onToggle={onToggle}
            />
          ))}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-2 px-2 py-1 text-sm rounded-md transition-colors text-left ${
        isSelected
          ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
          : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <FileText className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" />
      <span className="truncate">{node.name}</span>
      <span className="ml-auto text-xs text-[var(--text-muted)] flex-shrink-0">
        {formatSize(node.size)}
      </span>
    </button>
  );
}

export function WorkspaceTab() {
  const { agent } = useAgentContext();
  const t = useTranslations('dashboard.agentDetail.workspace');

  const [entries, setEntries] = useState<TreeEntry[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileReason, setFileReason] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [agentNotRunning, setAgentNotRunning] = useState(false);

  // loadTree intentionally does NOT auto-select SOUL.md — that's handled by
  // a separate effect below after the tree has loaded. Keeping loadTree's
  // deps to `agent?.id` means it doesn't re-create when selectedPath changes,
  // which avoids a reload loop.
  const loadTree = useCallback(async () => {
    if (!agent?.id) return;
    setTreeLoading(true);
    setTreeError(null);
    setAgentNotRunning(false);
    try {
      const res = await api.getAgentWorkspaceTree(agent.id);
      if (res.success) {
        setEntries(res.data.entries);
        setTruncated(res.data.truncated);
      } else {
        if (res.code === 'AGENT_NOT_RUNNING') {
          setAgentNotRunning(true);
        } else {
          setTreeError(res.error || 'Failed to load workspace');
        }
      }
    } catch (e) {
      setTreeError((e as Error).message || 'Failed to load workspace');
    } finally {
      setTreeLoading(false);
    }
  }, [agent?.id]);

  const loadFile = useCallback(
    async (filePath: string) => {
      if (!agent?.id) return;
      setFileLoading(true);
      setFileError(null);
      setFileContent(null);
      setFileReason(null);
      try {
        const res = await api.getAgentWorkspaceFile(agent.id, filePath);
        if (res.success) {
          setFileContent(res.data.content);
          setFileReason(res.data.reason ?? null);
          setFileSize(res.data.size);
        } else {
          setFileError(res.error || 'Failed to load file');
        }
      } catch (e) {
        setFileError((e as Error).message || 'Failed to load file');
      } finally {
        setFileLoading(false);
      }
    },
    [agent?.id],
  );

  // On agent switch, clear ALL tab state before loading the new agent's
  // tree. Without this reset, `selectedPath` from the previous agent lingers
  // in state, which would trigger `loadFile` against the new agent.id with
  // a path that doesn't exist in its workspace → confusing 404.
  useEffect(() => {
    setSelectedPath(null);
    setFileContent(null);
    setFileReason(null);
    setFileSize(null);
    setFileError(null);
    setExpandedDirs(new Set());
    loadTree();
  }, [agent?.id, loadTree]);

  // After the tree loads and if nothing is selected yet, auto-pick SOUL.md
  // so the right pane lands on a meaningful file. Split from loadTree so we
  // don't need selectedPath in loadTree's closure.
  useEffect(() => {
    if (selectedPath || treeLoading || entries.length === 0) return;
    const soul = entries.find((e) => e.path === 'SOUL.md');
    if (soul) setSelectedPath('SOUL.md');
  }, [entries, treeLoading, selectedPath]);

  useEffect(() => {
    if (selectedPath) loadFile(selectedPath);
  }, [selectedPath, loadFile]);

  const tree = useMemo(() => buildTree(entries), [entries]);

  const handleToggle = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Framework gate — backend only exposes the workspace viewer for
  // OpenClaw (any mode) and managed Hermes. Legacy Hermes regenerates
  // its config dir on every start so there's nothing useful to browse,
  // and ElizaOS/Milady don't have a "workspace" in this sense at all.
  // Keep this in sync with getWorkspaceConfig() in
  // apps/api/src/routes/agents/workspace.ts.
  const isOpenClaw = agent?.framework === 'openclaw';
  const isManagedHermes = agent?.framework === 'hermes' && true;
  if (!isOpenClaw && !isManagedHermes) {
    const isLegacyHermes = agent?.framework === 'hermes';
    return (
      <motion.div variants={tabContentVariants} initial="hidden" animate="visible">
        <GlassCard className="p-8 text-center">
          <FolderTree className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Workspace viewer not available
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {isLegacyHermes
              ? 'Legacy Hermes agents regenerate their config directory on every start, so there\'s no persistent workspace to browse. Recreate this agent to switch to managed mode and get the workspace viewer.'
              : 'The workspace viewer is only available for OpenClaw agents and managed-mode Hermes.'}
          </p>
        </GlassCard>
      </motion.div>
    );
  }

  if (agentNotRunning) {
    return (
      <motion.div variants={tabContentVariants} initial="hidden" animate="visible">
        <GlassCard className="p-8 text-center">
          <PauseCircle className="w-12 h-12 mx-auto mb-4 text-amber-400/80" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Agent is stopped
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Start the agent to browse its workspace files.
          </p>
          <button
            type="button"
            onClick={loadTree}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--color-accent)] transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div variants={tabContentVariants} initial="hidden" animate="visible">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[var(--color-accent)]" />
            Workspace
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Read-only view of files your agent maintains in its workspace directory.
          </p>
        </div>
        <button
          type="button"
          onClick={loadTree}
          disabled={treeLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--color-accent)] transition-colors text-sm disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${treeLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {truncated && (
        <div className="mb-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm text-amber-400/90 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Tree listing was truncated — your workspace has more than the display
            limit. Ask the agent to tidy up, or select a specific file to view.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,320px)_1fr] gap-4">
        {/* Tree pane */}
        <GlassCard className="p-2 md:max-h-[70vh] overflow-y-auto">
          {treeLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : treeError ? (
            <div className="p-4 text-sm text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {treeError}
            </div>
          ) : tree.length === 0 ? (
            <div className="p-4 text-sm text-[var(--text-muted)] text-center">
              Workspace is empty.
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeNodeView
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedPath}
                  onSelect={setSelectedPath}
                  expandedDirs={expandedDirs}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </GlassCard>

        {/* File viewer pane */}
        <GlassCard className="p-4 md:max-h-[70vh] overflow-hidden flex flex-col">
          {!selectedPath ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
              <FileText className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">Select a file from the tree to view it.</p>
            </div>
          ) : fileLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : fileError ? (
            <div className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {fileError}
            </div>
          ) : fileContent !== null ? (
            <>
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" />
                  <span className="text-sm font-mono text-[var(--text-primary)] truncate">
                    {selectedPath}
                  </span>
                </div>
                {fileSize != null && (
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">
                    {formatSize(fileSize)}
                  </span>
                )}
              </div>
              <pre className="flex-1 overflow-auto text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-base)]/50 p-3 rounded-md border border-[var(--border-default)] whitespace-pre-wrap break-words">
                {fileContent}
              </pre>
            </>
          ) : fileReason ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
              <FileX className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm text-center">{fileReason}</p>
              {fileSize != null && (
                <p className="text-xs mt-2">{formatSize(fileSize)}</p>
              )}
            </div>
          ) : null}
        </GlassCard>
      </div>
    </motion.div>
  );
}
