'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAgentContext } from '../AgentContext';
import { useAuth } from '@/lib/auth-context';
import {
  clearLegacyTerminalCredentialStorage,
  loadTerminalCredentialMounts,
  persistTerminalCredentialMounts,
  type TerminalCredentialMount,
  type TerminalCredentialScope,
} from '@/lib/terminal-credentials';
import { canRunNativeTerminalFork, nativeTerminalForkInput } from '@/components/agents/terminalNativeCommands';
import {
  DEFAULT_TERMINAL_SESSION_ID,
  TERMINAL_SCROLL_SPEEDS,
  TerminalPane,
  loadSavedTerminalScrollLines,
  persistTerminalScrollLines,
  type TerminalConnectionState,
  type TerminalPaneHandle,
} from '@/components/agents/terminal/TerminalPane';
import {
  Circle,
  GitBranch,
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface TerminalTabProps {
  isVisible?: boolean;
}

interface TerminalSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

const TERMINAL_SESSION_STORAGE_PREFIX = 'hatcher-terminal-sessions:';

function createLocalId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi) {
    throw new Error('Secure random ID generation is unavailable');
  }
  if (typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}_${cryptoApi.randomUUID().replaceAll('-', '').slice(0, 16)}`;
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${suffix}`;
}

function defaultTerminalSession(): TerminalSession {
  return {
    id: DEFAULT_TERMINAL_SESSION_ID,
    name: 'Main',
    createdAt: 0,
    updatedAt: 0,
  };
}

function isTerminalSession(value: unknown): value is TerminalSession {
  const candidate = value as TerminalSession;
  return Boolean(
    candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number',
  );
}

function loadTerminalSessions(agentId: string): TerminalSession[] {
  if (typeof window === 'undefined') return [defaultTerminalSession()];
  try {
    const raw = window.localStorage.getItem(`${TERMINAL_SESSION_STORAGE_PREFIX}${agentId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const sessions = parsed.filter(isTerminalSession);
      if (sessions.length > 0) return sessions;
    }
  } catch {
    // Ignore malformed browser storage.
  }
  return [defaultTerminalSession()];
}

function persistTerminalSessions(agentId: string, sessions: TerminalSession[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${TERMINAL_SESSION_STORAGE_PREFIX}${agentId}`, JSON.stringify(sessions));
}

function credentialEnv(mounts: TerminalCredentialMount[]): Array<{ key: string; value: string }> {
  const seenKeys = new Set<string>();
  const envValues: Array<{ key: string; value: string }> = [];
  for (const mount of mounts) {
    const key = mount.key.trim().toUpperCase();
    if (!mount.enabled || !key || !mount.value || seenKeys.has(key)) continue;
    if (!/^[A-Z_][A-Z0-9_]{0,127}$/.test(key)) continue;
    seenKeys.add(key);
    envValues.push({ key, value: mount.value });
  }
  return envValues;
}

export function TerminalTab({ isVisible = true }: TerminalTabProps) {
  const tTerminal = useTranslations('dashboard.agentDetail.terminal');
  const { agent, stats } = useAgentContext();
  const { user } = useAuth();
  const paneRef = useRef<TerminalPaneHandle>(null);
  const stateRef = useRef<TerminalConnectionState>('disconnected');
  const [state, setState] = useState<TerminalConnectionState>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scrollLines, setScrollLinesState] = useState(() => loadSavedTerminalScrollLines());
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>(() => [defaultTerminalSession()]);
  const [activeSessionId, setActiveSessionId] = useState(DEFAULT_TERMINAL_SESSION_ID);
  const [credentialMounts, setCredentialMounts] = useState<TerminalCredentialMount[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);

  const isActive = agent?.status === 'active';
  const shortContainerId = stats?.containerId ? stats.containerId.slice(0, 12) : null;
  const activeTerminalSession = terminalSessions.find((session) => session.id === activeSessionId) ?? terminalSessions[0] ?? defaultTerminalSession();
  const activeCredentialEnv = credentialEnv(credentialMounts);
  const activeCredentialCount = activeCredentialEnv.length;

  useEffect(() => { stateRef.current = state; }, [state]);

  const setScrollLines = useCallback((value: number) => {
    const next = TERMINAL_SCROLL_SPEEDS.includes(value as typeof TERMINAL_SCROLL_SPEEDS[number]) ? value : 6;
    setScrollLinesState(next);
    persistTerminalScrollLines(next);
  }, []);

  useEffect(() => {
    clearLegacyTerminalCredentialStorage();
  }, []);

  useEffect(() => {
    if (!agent?.id || !user?.id) {
      setCredentialMounts([]);
      return;
    }
    const sessions = loadTerminalSessions(agent.id);
    setTerminalSessions(sessions);
    setActiveSessionId((current) => (
      sessions.some((session) => session.id === current) ? current : sessions[0]?.id ?? DEFAULT_TERMINAL_SESSION_ID
    ));
    setCredentialMounts(loadTerminalCredentialMounts(user.id, agent.id));
    setShowCredentials(false);
  }, [agent?.id, user?.id]);

  const updateTerminalSessions = useCallback((updater: (sessions: TerminalSession[]) => TerminalSession[]) => {
    if (!agent?.id) return;
    setTerminalSessions((current) => {
      const next = updater(current.length > 0 ? current : [defaultTerminalSession()]);
      persistTerminalSessions(agent.id, next);
      return next;
    });
  }, [agent?.id]);

  const createTerminalSession = useCallback((baseName = 'Session') => {
    const now = Date.now();
    const session: TerminalSession = {
      id: createLocalId('session'),
      name: baseName,
      createdAt: now,
      updatedAt: now,
    };
    updateTerminalSessions((sessions) => [...sessions, session]);
    setActiveSessionId(session.id);
  }, [updateTerminalSessions]);

  const selectTerminalSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    updateTerminalSessions((sessions) => sessions.map((session) => (
      session.id === sessionId ? { ...session, updatedAt: Date.now() } : session
    )));
  }, [updateTerminalSessions]);

  const renameTerminalSession = useCallback((targetSession: TerminalSession = activeTerminalSession) => {
    const name = window.prompt('Terminal session name', targetSession.name)?.trim();
    if (!name) return;
    updateTerminalSessions((sessions) => sessions.map((session) => (
      session.id === targetSession.id ? { ...session, name, updatedAt: Date.now() } : session
    )));
  }, [activeTerminalSession, updateTerminalSessions]);

  const forkTerminalSession = useCallback(() => {
    const pane = paneRef.current;
    if (!canRunNativeTerminalFork(stateRef.current) || !pane?.sendInput(nativeTerminalForkInput())) {
      setErrorMsg('Connect the terminal before running native /fork.');
      return;
    }
    pane.focus();
  }, []);

  const deleteTerminalSession = useCallback((targetSession: TerminalSession = activeTerminalSession) => {
    if (terminalSessions.length <= 1) return;
    if (!window.confirm(`Delete terminal session "${targetSession.name}"?`)) return;
    const nextSessions = terminalSessions.filter((session) => session.id !== targetSession.id);
    updateTerminalSessions(() => nextSessions);
    if (activeSessionId === targetSession.id) {
      setActiveSessionId(nextSessions[0]?.id ?? DEFAULT_TERMINAL_SESSION_ID);
    }
  }, [activeSessionId, activeTerminalSession, terminalSessions, updateTerminalSessions]);

  const updateCredentialMounts = useCallback((
    updater: (mounts: TerminalCredentialMount[]) => TerminalCredentialMount[],
  ) => {
    if (!agent?.id || !user?.id) return;
    setCredentialMounts((current) => {
      const next = updater(current);
      persistTerminalCredentialMounts(user.id, agent.id, next);
      return next;
    });
  }, [agent?.id, user?.id]);

  const addCredentialMount = useCallback((scope: TerminalCredentialScope) => {
    updateCredentialMounts((mounts) => [
      ...mounts,
      {
        id: createLocalId('cred'),
        scope,
        agentId: scope === 'agent' ? agent?.id : undefined,
        key: '',
        value: '',
        enabled: true,
      },
    ]);
  }, [agent?.id, updateCredentialMounts]);

  const patchCredentialMount = useCallback((id: string, patch: Partial<TerminalCredentialMount>) => {
    updateCredentialMounts((mounts) => mounts.map((mount) => (
      mount.id === id ? { ...mount, ...patch } : mount
    )));
  }, [updateCredentialMounts]);

  const removeCredentialMount = useCallback((id: string) => {
    updateCredentialMounts((mounts) => mounts.filter((mount) => mount.id !== id));
  }, [updateCredentialMounts]);

  // ── Not running / starting state ──
  if (!isActive) {
    const isStarting = agent?.status === 'starting';
    return (
      <div className="flex h-[calc(100dvh-190px)] min-h-[520px] flex-col items-center justify-center gap-4 text-[var(--text-muted)] lg:min-h-[620px] 2xl:min-h-[720px]">
        {isStarting ? (
          <>
            <div className="w-10 h-10 rounded-full border-2 border-[var(--color-accent)]/40 border-t-[var(--color-accent)] animate-spin" />
            <p className="text-lg font-medium text-[var(--text-primary)]">{tTerminal('agentNotActive')}</p>
            <p className="text-sm text-[var(--text-muted)]">The terminal will connect automatically when ready</p>
          </>
        ) : (
          <>
            <div className="text-5xl opacity-50">⬛</div>
            <p className="text-lg font-medium">{tTerminal('agentNotActive')}</p>
            <p className="text-sm text-[var(--text-muted)]">{tTerminal('startAgent')}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="hatcher-terminal-frame flex h-[calc(100dvh-190px)] min-h-[520px] flex-col overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] lg:min-h-[620px] 2xl:h-[calc(100dvh-170px)] 2xl:min-h-[720px]">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Circle
              size={8}
              fill={state === 'connected' ? 'var(--status-live)' : state === 'connecting' ? 'var(--status-deploying)' : 'var(--color-destructive)'}
              className={state === 'connected' ? 'text-[var(--status-live)]' : state === 'connecting' ? 'text-[var(--status-deploying)]' : 'text-[var(--color-destructive)]'}
            />
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {state === 'connected' ? tTerminal('connected') : state === 'connecting' ? tTerminal('connecting') : tTerminal('disconnected')}
            </span>
          </div>
          <span className="text-xs text-[var(--border-default)]">|</span>
          <span className="min-w-0 truncate text-xs font-mono text-[var(--text-muted)]">
            {agent.name} ({agent.framework})
          </span>
          <span className="hidden min-w-0 truncate rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-[10px] font-mono text-[var(--text-secondary)] md:inline">
            {activeTerminalSession.name}
          </span>
          <span className="hidden xl:inline-flex items-center gap-1.5 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2 py-0.5 text-[10px] font-mono text-[var(--color-success)]">
            <ShieldCheck size={11} />
            Isolated container
          </span>
          {shortContainerId && (
            <span className="hidden 2xl:inline text-[10px] font-mono text-[var(--text-muted)]">
              {shortContainerId}
            </span>
          )}
          <label className="hidden min-w-0 items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)] xl:inline-flex">
            Scroll
            <select
              value={scrollLines}
              onChange={(event) => setScrollLines(Number(event.target.value))}
              className="h-6 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-1.5 text-[10px] text-[var(--text-secondary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
              title="Mouse wheel scroll speed"
            >
              {TERMINAL_SCROLL_SPEEDS.map((value) => (
                <option key={value} value={value}>{value} lines</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCredentials((current) => !current)}
            className={`hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors md:inline-flex ${
              showCredentials
                ? 'border-[var(--accent)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
            title="Mount browser-held credentials into the terminal session"
          >
            <KeyRound size={12} />
            {activeCredentialCount > 0 ? activeCredentialCount : 'Creds'}
          </button>
          {state === 'disconnected' && (
            <button
              onClick={() => paneRef.current?.connect()}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)] transition-colors"
            >
              <RotateCcw size={12} />
              {tTerminal('reconnect')}
            </button>
          )}
          {state === 'connected' && (
            <button
              onClick={() => paneRef.current?.disconnect()}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)] transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {showCredentials && (
        <div className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--text-muted)]">Session credential mounts</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Values stay in this browser session and are injected only into new terminal execs, not saved to the agent config.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addCredentialMount('account')}
                className="rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
              >
                Add account var
              </button>
              <button
                type="button"
                onClick={() => addCredentialMount('agent')}
                className="rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
              >
                Add agent var
              </button>
            </div>
          </div>
          {credentialMounts.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-muted)]">
              No terminal-only credentials configured for this browser session.
            </p>
          ) : (
            <div className="grid gap-2">
              {credentialMounts.map((mount) => (
                <div key={mount.id} className="grid gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] p-2 md:grid-cols-[auto,120px,1fr,1.4fr,auto] md:items-center">
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={mount.enabled}
                      onChange={(event) => patchCredentialMount(mount.id, { enabled: event.target.checked })}
                    />
                    mount
                  </label>
                  <select
                    value={mount.scope}
                    onChange={(event) => patchCredentialMount(mount.id, {
                      scope: event.target.value as TerminalCredentialScope,
                      agentId: event.target.value === 'agent' ? agent?.id : undefined,
                    })}
                    className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-xs text-[var(--text-secondary)] outline-none"
                  >
                    <option value="account">account</option>
                    <option value="agent">agent</option>
                  </select>
                  <input
                    value={mount.key}
                    onChange={(event) => patchCredentialMount(mount.id, { key: event.target.value.toUpperCase() })}
                    placeholder="API_KEY"
                    className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-xs font-mono text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    value={mount.value}
                    onChange={(event) => patchCredentialMount(mount.id, { value: event.target.value })}
                    placeholder="Value"
                    type="password"
                    className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-xs font-mono text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeCredentialMount(mount.id)}
                    className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--color-destructive)]"
                    title="Remove credential"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] font-mono text-[var(--text-muted)]">
            Reconnect after editing credentials. Existing terminal processes keep the environment they started with.
          </p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-card)] lg:flex">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] px-3 py-2">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Terminal
              </p>
              <p className="mt-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                {terminalSessions.length} session{terminalSessions.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => createTerminalSession(`Session ${terminalSessions.length + 1}`)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              title="New terminal session"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <div className="space-y-1.5">
              {terminalSessions.map((session, index) => {
                const isActiveSession = session.id === activeTerminalSession.id;
                return (
                  <div
                    key={session.id}
                    className={`group rounded-md border transition-colors ${
                      isActiveSession
                        ? 'border-[var(--accent)] bg-[var(--color-accent-bg)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center">
                      <button
                        type="button"
                        onClick={() => selectTerminalSession(session.id)}
                        className="min-w-0 flex-1 px-2.5 py-2 text-left"
                        title={session.name}
                      >
                        <span className={`block truncate text-xs font-mono font-semibold ${isActiveSession ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                          {session.name || `Session ${index + 1}`}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-mono text-[var(--text-muted)]">
                          {session.id === DEFAULT_TERMINAL_SESSION_ID ? 'primary shell' : 'isolated shell'}
                        </span>
                      </button>
                      <div className="flex flex-shrink-0 items-center gap-0.5 pr-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => renameTerminalSession(session)}
                          className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                          title="Rename terminal session"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTerminalSession(session)}
                          disabled={terminalSessions.length <= 1}
                          className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--color-destructive)] disabled:cursor-not-allowed disabled:opacity-35"
                          title="Delete terminal session"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-[var(--border-default)] p-2">
            <button
              type="button"
              onClick={forkTerminalSession}
              disabled={!canRunNativeTerminalFork(state)}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--border-default)] px-2 py-1.5 text-xs font-mono text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border-default)] disabled:hover:text-[var(--text-secondary)]"
              title="Run native /fork in the active terminal"
            >
              <GitBranch size={13} />
              /fork
            </button>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => createTerminalSession(`Session ${terminalSessions.length + 1}`)}
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)]"
              title="New terminal session"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={forkTerminalSession}
              disabled={!canRunNativeTerminalFork(state)}
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
              title="Run native /fork in the active terminal"
            >
              <GitBranch size={14} />
            </button>
            {terminalSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => selectTerminalSession(session.id)}
                className={`max-w-40 flex-shrink-0 truncate rounded-md border px-2.5 py-1.5 text-xs font-mono ${
                  session.id === activeTerminalSession.id
                    ? 'border-[var(--accent)] bg-[var(--color-accent-bg)] text-[var(--accent)]'
                    : 'border-[var(--border-default)] text-[var(--text-secondary)]'
                }`}
                title={session.name}
              >
                {session.name}
              </button>
            ))}
          </div>

          {/* Terminal container */}
          <TerminalPane
            ref={paneRef}
            agentId={agent.id}
            agentName={agent.name}
            framework={agent.framework}
            active={isActive}
            isVisible={isVisible}
            sessionId={activeTerminalSession.id}
            sessionName={activeTerminalSession.name}
            mode="gateway"
            credentialEnv={activeCredentialEnv}
            scrollLines={scrollLines}
            onStateChange={setState}
            onErrorMessage={setErrorMsg}
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="px-4 py-1.5 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-[var(--text-muted)] font-mono">
          Attached to the framework CLI inside the isolated agent container. The gateway keeps running separately for chat and integrations. Terminal open/close and entered commands are audited with secret redaction.
          {errorMsg && <span className="text-[var(--color-destructive)] ml-2">Error: {errorMsg}</span>}
        </p>
      </div>
    </div>
  );
}
