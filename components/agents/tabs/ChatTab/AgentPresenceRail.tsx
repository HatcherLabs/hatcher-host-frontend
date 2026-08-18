"use client";

import type { DragEvent, KeyboardEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import type { ChatSessionSummary } from "@/lib/api";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useAgentContext } from "../../AgentContext";
import { AgentEyesLiveCard } from "./AgentEyesLiveCard";
import { groupChatSessionsByFolder } from "./chatFolders";

interface AgentPresenceRailProps {
  className?: string;
  onSessionSelect?: () => void;
}

interface ChatSessionRowProps {
  session: ChatSessionSummary;
  selected: boolean;
  deleting: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

function formatRelative(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function ChatSessionRow({
  session,
  selected,
  deleting,
  onSelect,
  onDelete,
}: ChatSessionRowProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", session.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group flex w-full cursor-grab items-stretch rounded-md border transition-colors active:cursor-grabbing ${
        selected
          ? "border-[var(--color-accent)]/35 bg-[rgba(6,182,212,0.08)]"
          : "border-transparent hover:bg-white/[0.04]"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(session.id)}
        className="min-w-0 flex-1 px-2.5 py-2 text-left"
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
            {session.title}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Clock size={10} />
            {formatRelative(session.updatedAt)}
          </span>
        </div>
        <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
          {session.preview || `${session.messageCount} turns`}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onDelete(session.id)}
        disabled={deleting}
        className="flex w-8 shrink-0 items-center justify-center rounded-r-md text-[var(--text-muted)] opacity-70 transition-colors hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive)] hover:opacity-100 focus-visible:bg-[var(--color-destructive-bg)] focus-visible:text-[var(--color-destructive)] focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Delete chat ${session.title}`}
        title="Delete chat"
      >
        {deleting ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Trash2 size={12} />
        )}
      </button>
    </div>
  );
}

export function AgentPresenceRail({
  className = "",
  onSessionSelect,
}: AgentPresenceRailProps) {
  const {
    agent,
    chatSessions,
    chatFolders,
    activeChatSessionId,
    setActiveChatSessionId,
    startNewChatSession,
    deleteChatSession,
    createChatFolder,
    renameChatFolder,
    deleteChatFolder,
    moveChatSession,
    deletingChatSessionId,
    refreshChatSessions,
  } = useAgentContext();
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const grouped = useMemo(
    () => groupChatSessionsByFolder(chatSessions, chatFolders),
    [chatFolders, chatSessions],
  );

  const handleRefreshSessions = useCallback(async () => {
    setRefreshingSessions(true);
    try {
      await refreshChatSessions();
    } finally {
      setRefreshingSessions(false);
    }
  }, [refreshChatSessions]);

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      setActiveChatSessionId(sessionId);
      onSessionSelect?.();
    },
    [onSessionSelect, setActiveChatSessionId],
  );

  const handleStartNewChatSession = useCallback(
    async (folderId?: string) => {
      await startNewChatSession(folderId);
      onSessionSelect?.();
    },
    [onSessionSelect, startNewChatSession],
  );

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (await createChatFolder(name)) {
      setNewFolderName("");
      setCreatingFolder(false);
    }
  }, [createChatFolder, newFolderName]);

  const handleRenameFolder = useCallback(async () => {
    const name = editingFolderName.trim();
    if (!editingFolderId || !name) return;
    if (await renameChatFolder(editingFolderId, name)) {
      setEditingFolderId(null);
      setEditingFolderName("");
    }
  }, [editingFolderId, editingFolderName, renameChatFolder]);

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    submit: () => void,
    cancel: () => void,
  ) => {
    if (event.key === "Enter") submit();
    if (event.key === "Escape") cancel();
  };

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>, folderId: string | null) => {
      event.preventDefault();
      const sessionId = event.dataTransfer.getData("text/plain");
      setDropTarget(null);
      if (sessionId) await moveChatSession(sessionId, folderId);
    },
    [moveChatSession],
  );

  const renderSessions = (sessions: ChatSessionSummary[]) =>
    sessions.map((session) => (
      <ChatSessionRow
        key={session.id}
        session={session}
        selected={
          session.id === activeChatSessionId ||
          (!activeChatSessionId && session.current)
        }
        deleting={deletingChatSessionId === session.id}
        onSelect={handleSessionSelect}
        onDelete={(sessionId) => void deleteChatSession(sessionId)}
      />
    ));

  return (
    <aside
      className={`flex max-h-full w-full shrink-0 flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]/60 md:w-72 lg:w-[22rem] 2xl:w-96 ${className}`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 md:px-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSessionsOpen((value) => !value)}
              className="flex min-w-0 items-center gap-2 text-left text-xs font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--color-accent)]"
              aria-expanded={sessionsOpen}
            >
              {sessionsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span className="truncate">Chats</span>
              {chatSessions.length > 0 && (
                <span className="text-[10px] font-normal text-[var(--text-muted)]">
                  {chatSessions.length > 99 ? "99+" : chatSessions.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCreatingFolder(true)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
                aria-label="Create chat folder"
                title="New folder"
              >
                <FolderPlus size={13} />
              </button>
              <button
                type="button"
                onClick={() => void handleRefreshSessions()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
                aria-label="Refresh chat sessions"
                title="Refresh"
              >
                <RefreshCw
                  size={12}
                  className={refreshingSessions ? "animate-spin" : ""}
                />
              </button>
              <button
                type="button"
                onClick={() => void handleStartNewChatSession()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/15"
                aria-label="Start new chat"
                title="New chat"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {sessionsOpen && (
            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {creatingFolder && (
                <div className="flex items-center gap-1 rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/5 p-1.5">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    onKeyDown={(event) =>
                      handleInputKeyDown(
                        event,
                        () => void handleCreateFolder(),
                        () => setCreatingFolder(false),
                      )
                    }
                    placeholder="Folder name"
                    maxLength={80}
                    className="min-w-0 flex-1 bg-transparent px-1 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateFolder()}
                    aria-label="Save folder"
                  >
                    <Check size={13} className="text-[var(--color-accent)]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatingFolder(false)}
                    aria-label="Cancel"
                  >
                    <X size={13} className="text-[var(--text-muted)]" />
                  </button>
                </div>
              )}

              {chatFolders.map((folder) => {
                const folderSessions = grouped.byFolder.get(folder.id) ?? [];
                const collapsed = collapsedFolders.has(folder.id);
                return (
                  <div
                    key={folder.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTarget(folder.id);
                    }}
                    onDragLeave={() =>
                      setDropTarget((value) =>
                        value === folder.id ? null : value,
                      )
                    }
                    onDrop={(event) => void handleDrop(event, folder.id)}
                    className={`rounded-md border p-1 transition-colors ${
                      dropTarget === folder.id
                        ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10"
                        : "border-[var(--border-default)]/70"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1">
                      {editingFolderId === folder.id ? (
                        <>
                          <input
                            autoFocus
                            value={editingFolderName}
                            onChange={(event) =>
                              setEditingFolderName(event.target.value)
                            }
                            onKeyDown={(event) =>
                              handleInputKeyDown(
                                event,
                                () => void handleRenameFolder(),
                                () => setEditingFolderId(null),
                              )
                            }
                            maxLength={80}
                            className="min-w-0 flex-1 bg-transparent px-1 text-xs text-[var(--text-primary)] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleRenameFolder()}
                            aria-label="Save folder name"
                          >
                            <Check
                              size={12}
                              className="text-[var(--color-accent)]"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFolderId(null)}
                            aria-label="Cancel rename"
                          >
                            <X size={12} className="text-[var(--text-muted)]" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedFolders((prev) => {
                                const next = new Set(prev);
                                if (next.has(folder.id)) next.delete(folder.id);
                                else next.add(folder.id);
                                return next;
                              })
                            }
                            className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-1 text-left"
                            aria-expanded={!collapsed}
                          >
                            {collapsed ? (
                              <ChevronRight size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                            <Folder
                              size={12}
                              className="shrink-0 text-[var(--color-accent)]"
                            />
                            <span className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
                              {folder.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {folderSessions.length}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleStartNewChatSession(folder.id)
                            }
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--color-accent)]"
                            aria-label={`New chat in ${folder.name}`}
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFolderId(folder.id);
                              setEditingFolderName(folder.name);
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            aria-label={`Rename ${folder.name}`}
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete folder "${folder.name}"? Its chats will be kept.`,
                                )
                              ) {
                                void deleteChatFolder(folder.id);
                              }
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--color-destructive)]"
                            aria-label={`Delete folder ${folder.name}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                    {!collapsed && (
                      <div className="mt-1 space-y-1">
                        {folderSessions.length > 0 ? (
                          renderSessions(folderSessions)
                        ) : (
                          <div className="rounded px-2 py-2 text-[10px] text-[var(--text-muted)]">
                            Drop chats here
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget("unfiled");
                }}
                onDragLeave={() =>
                  setDropTarget((value) => (value === "unfiled" ? null : value))
                }
                onDrop={(event) => void handleDrop(event, null)}
                className={`rounded-md border p-1 transition-colors ${
                  dropTarget === "unfiled"
                    ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10"
                    : chatFolders.length > 0
                      ? "border-dashed border-[var(--border-default)]/60"
                      : "border-transparent"
                }`}
              >
                {chatFolders.length > 0 && (
                  <div className="px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Unfiled · {grouped.unfiled.length}
                  </div>
                )}
                <div className="space-y-1">
                  {grouped.unfiled.length > 0 ? (
                    renderSessions(grouped.unfiled)
                  ) : chatSessions.length === 0 && chatFolders.length === 0 ? (
                    <div className="rounded-md border border-dashed border-[var(--border-default)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                      No chats yet
                    </div>
                  ) : chatFolders.length > 0 ? (
                    <div className="px-2 py-2 text-[10px] text-[var(--text-muted)]">
                      Drop here to remove a chat from its folder
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--border-default)] px-3 py-3 md:px-4">
        <AgentEyesLiveCard
          agentId={agent.id}
          agentName={agent.name}
          framework={agent.framework}
          status={agent.status}
        />
      </div>
    </aside>
  );
}
