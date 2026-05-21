'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAgentContext } from '../AgentContext';
import { API_URL } from '@/lib/config';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Circle,
  GitBranch,
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

// xterm.js CSS — imported once when component loads
import '@xterm/xterm/css/xterm.css';

// xterm.js dynamic imports (heavy library — only load when tab is active)
let Terminal: typeof import('@xterm/xterm').Terminal | null = null;
let FitAddon: typeof import('@xterm/addon-fit').FitAddon | null = null;
let WebLinksAddon: typeof import('@xterm/addon-web-links').WebLinksAddon | null = null;

async function loadXterm() {
  if (Terminal) return;
  const [xtermMod, fitMod, linksMod] = await Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
    import('@xterm/addon-web-links'),
  ]);
  Terminal = xtermMod.Terminal;
  FitAddon = fitMod.FitAddon;
  WebLinksAddon = linksMod.WebLinksAddon;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface TerminalTabProps {
  isVisible?: boolean;
}

const TERMINAL_KEEPALIVE_MS = 25_000;
const TERMINAL_RECONNECT_DELAY_MS = 1_500;
const TERMINAL_SCROLL_SPEED_KEY = 'hatcher-terminal-scroll-lines';
const TERMINAL_SCROLL_SPEEDS = [3, 6, 10, 16] as const;
const TERMINAL_SESSION_STORAGE_PREFIX = 'hatcher-terminal-sessions:';
const TERMINAL_CREDENTIAL_STORAGE_KEY = 'hatcher-terminal-credential-mounts-v1';
const DEFAULT_TERMINAL_SESSION_ID = 'main';
const DEFAULT_TERMINAL_TAIL_LINES = '600';

interface TerminalSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

type CredentialScope = 'account' | 'agent';

interface TerminalCredentialMount {
  id: string;
  scope: CredentialScope;
  key: string;
  value: string;
  enabled: boolean;
  agentId?: string;
}

function getWsUrl(agentId: string, sessionId: string, mountCredentials: boolean): string {
  const base = API_URL.replace(/^http/, 'ws');
  const params = new URLSearchParams({
    mode: 'gateway',
    session: sessionId || DEFAULT_TERMINAL_SESSION_ID,
    tail: DEFAULT_TERMINAL_TAIL_LINES,
  });
  if (mountCredentials) params.set('mountCredentials', '1');
  return `${base}/agents/${agentId}/terminal/ws?${params.toString()}`;
}

function loadSavedScrollLines(): number {
  if (typeof window === 'undefined') return 6;
  const saved = Number(window.localStorage.getItem(TERMINAL_SCROLL_SPEED_KEY));
  return TERMINAL_SCROLL_SPEEDS.includes(saved as typeof TERMINAL_SCROLL_SPEEDS[number]) ? saved : 6;
}

function wheelDeltaToRows(event: WheelEvent): number {
  if (event.deltaY === 0) return 0;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * 24;
  return event.deltaY / 18;
}

function createLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

function readAllCredentialMounts(): TerminalCredentialMount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(TERMINAL_CREDENTIAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((candidate): candidate is TerminalCredentialMount => (
      candidate &&
      typeof candidate.id === 'string' &&
      (candidate.scope === 'account' || candidate.scope === 'agent') &&
      typeof candidate.key === 'string' &&
      typeof candidate.value === 'string' &&
      typeof candidate.enabled === 'boolean'
    ));
  } catch {
    return [];
  }
}

function loadCredentialMounts(agentId: string): TerminalCredentialMount[] {
  return readAllCredentialMounts().filter((mount) => (
    mount.scope === 'account' || mount.agentId === agentId
  ));
}

function persistCredentialMounts(agentId: string, visibleMounts: TerminalCredentialMount[]): void {
  if (typeof window === 'undefined') return;
  const otherAgentMounts = readAllCredentialMounts().filter((mount) => (
    mount.scope === 'agent' && mount.agentId !== agentId
  ));
  window.sessionStorage.setItem(
    TERMINAL_CREDENTIAL_STORAGE_KEY,
    JSON.stringify([...otherAgentMounts, ...visibleMounts]),
  );
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
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('@xterm/addon-fit').FitAddon> | null>(null);
  const terminalInputRef = useRef<{ dispose: () => void } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const stateRef = useRef<ConnectionState>('disconnected');
  const connectionSeqRef = useRef(0);
  const credentialEnvRef = useRef<Array<{ key: string; value: string }>>([]);
  const scrollLinesRef = useRef(loadSavedScrollLines());
  const wheelRemainderRef = useRef(0);
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scrollLines, setScrollLinesState] = useState(scrollLinesRef.current);
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>(() => [defaultTerminalSession()]);
  const [activeSessionId, setActiveSessionId] = useState(DEFAULT_TERMINAL_SESSION_ID);
  const [credentialMounts, setCredentialMounts] = useState<TerminalCredentialMount[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);

  const isActive = agent?.status === 'active';
  const shortContainerId = stats?.containerId ? stats.containerId.slice(0, 12) : null;
  const activeTerminalSession = terminalSessions.find((session) => session.id === activeSessionId) ?? terminalSessions[0] ?? defaultTerminalSession();
  const activeCredentialCount = credentialEnv(credentialMounts).length;

  const setScrollLines = useCallback((value: number) => {
    const next = TERMINAL_SCROLL_SPEEDS.includes(value as typeof TERMINAL_SCROLL_SPEEDS[number]) ? value : 6;
    scrollLinesRef.current = next;
    setScrollLinesState(next);
    window.localStorage.setItem(TERMINAL_SCROLL_SPEED_KEY, String(next));
    const term = termInstance.current;
    if (term) {
      term.options.scrollSensitivity = next;
      term.options.fastScrollSensitivity = next * 2;
    }
  }, []);

  const consumeWheelScrollLines = useCallback((event: WheelEvent): number => {
    const configuredLines = scrollLinesRef.current;
    const scaledRows = wheelDeltaToRows(event) * (configuredLines / 6);
    if (scaledRows === 0) return 0;

    const next = wheelRemainderRef.current + scaledRows;
    const wholeLines = next > 0 ? Math.floor(next) : Math.ceil(next);
    wheelRemainderRef.current = next - wholeLines;

    if (wholeLines === 0) return 0;
    return Math.max(-configuredLines, Math.min(configuredLines, wholeLines));
  }, []);

  // Keep ref in sync with state for use inside closures
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { credentialEnvRef.current = credentialEnv(credentialMounts); }, [credentialMounts]);

  useEffect(() => {
    if (!agent?.id) return;
    const sessions = loadTerminalSessions(agent.id);
    setTerminalSessions(sessions);
    setActiveSessionId((current) => (
      sessions.some((session) => session.id === current) ? current : sessions[0]?.id ?? DEFAULT_TERMINAL_SESSION_ID
    ));
    setCredentialMounts(loadCredentialMounts(agent.id));
    setShowCredentials(false);
  }, [agent?.id]);

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

  const renameTerminalSession = useCallback(() => {
    const name = window.prompt('Terminal session name', activeTerminalSession.name)?.trim();
    if (!name) return;
    updateTerminalSessions((sessions) => sessions.map((session) => (
      session.id === activeTerminalSession.id ? { ...session, name, updatedAt: Date.now() } : session
    )));
  }, [activeTerminalSession.id, activeTerminalSession.name, updateTerminalSessions]);

  const forkTerminalSession = useCallback(() => {
    createTerminalSession(`Fork of ${activeTerminalSession.name}`);
  }, [activeTerminalSession.name, createTerminalSession]);

  const deleteTerminalSession = useCallback(() => {
    if (terminalSessions.length <= 1) return;
    const nextSessions = terminalSessions.filter((session) => session.id !== activeTerminalSession.id);
    updateTerminalSessions(() => nextSessions);
    setActiveSessionId(nextSessions[0]?.id ?? DEFAULT_TERMINAL_SESSION_ID);
  }, [activeTerminalSession.id, terminalSessions, updateTerminalSessions]);

  const updateCredentialMounts = useCallback((
    updater: (mounts: TerminalCredentialMount[]) => TerminalCredentialMount[],
  ) => {
    if (!agent?.id) return;
    setCredentialMounts((current) => {
      const next = updater(current);
      persistCredentialMounts(agent.id, next);
      return next;
    });
  }, [agent?.id]);

  const addCredentialMount = useCallback((scope: CredentialScope) => {
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

  const stopKeepAlive = useCallback(() => {
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
  }, []);

  const stopReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // ── Initialize xterm + connect WebSocket ──
  const connect = useCallback(async () => {
    if (!agent?.id || !isActive) return;
    manualDisconnectRef.current = false;
    stopReconnect();
    const connectionSeq = ++connectionSeqRef.current;

    // Close existing connection first to avoid race conditions
    if (wsRef.current) {
      wsRef.current.close(1000, 'Reconnecting');
      wsRef.current = null;
    }
    stopKeepAlive();

    setState('connecting');
    setErrorMsg(null);

    try {
      await loadXterm();
      if (connectionSeqRef.current !== connectionSeq) return;
      if (!Terminal || !FitAddon || !WebLinksAddon) throw new Error('Failed to load terminal library');

      // Create terminal instance if not exists
      if (!termInstance.current && termRef.current) {
        const term = new Terminal({
          cursorBlink: false,
          fontSize: 13,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, monospace',
          theme: {
            background: '#0a0a0a',
            foreground: '#e0e0e0',
            cursor: '#00ff41',
            cursorAccent: '#0a0a0a',
            selectionBackground: 'rgba(0, 255, 65, 0.2)',
            black: '#0a0a0a',
            red: '#ff5555',
            green: '#00ff41',
            yellow: '#ffb86c',
            blue: '#6272a4',
            magenta: '#ff79c6',
            cyan: '#8be9fd',
            white: '#e0e0e0',
            brightBlack: '#6272a4',
            brightRed: '#ff6e6e',
            brightGreen: '#69ff94',
            brightYellow: '#ffffa5',
            brightBlue: '#d6acff',
            brightMagenta: '#ff92df',
            brightCyan: '#a4ffff',
            brightWhite: '#ffffff',
          },
          allowTransparency: true,
          scrollback: 50000,
          scrollSensitivity: scrollLinesRef.current,
          fastScrollSensitivity: scrollLinesRef.current * 2,
          scrollOnUserInput: true,
          convertEol: true,
          disableStdin: false,
        });
        term.attachCustomWheelEventHandler((event: WheelEvent) => {
          if (event.ctrlKey) return true;
          const lines = consumeWheelScrollLines(event);
          if (lines === 0) return false;
          event.preventDefault();
          event.stopPropagation();
          term.scrollLines(lines);
          return false;
        });

        const fit = new FitAddon();
        const links = new WebLinksAddon();
        term.loadAddon(fit);
        term.loadAddon(links);
        term.open(termRef.current);
        fit.fit();

        termInstance.current = term;
        fitAddonRef.current = fit;
      }

      const term = termInstance.current;
      if (connectionSeqRef.current !== connectionSeq) return;
      if (!term) throw new Error('Terminal not initialized');
      term.options.disableStdin = false;

      // Clear and show connecting message
      term.clear();
      term.writeln('\x1b[36m[hatcher]\x1b[0m Connecting to agent CLI...');

      // Connect WebSocket
      const mountedCredentials = credentialEnvRef.current;
      const ws = new WebSocket(getWsUrl(agent.id, activeTerminalSession.id, mountedCredentials.length > 0));
      wsRef.current = ws;
      keepAliveTimerRef.current = setInterval(() => {
        if (connectionSeqRef.current !== connectionSeq) return;
        if (wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'ping', at: Date.now() }));
      }, TERMINAL_KEEPALIVE_MS);

      terminalInputRef.current?.dispose();
      terminalInputRef.current = term.onData((data: string) => {
        const current = wsRef.current;
        if (connectionSeqRef.current !== connectionSeq) return;
        if (!current || current.readyState !== WebSocket.OPEN) return;
        current.send(JSON.stringify({ type: 'input', data }));
      });

      ws.onopen = () => {
        // Connected — wait for server confirmation after the backend attaches.
      };

      ws.onmessage = (event) => {
        if (connectionSeqRef.current !== connectionSeq || wsRef.current !== ws) return;
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'mount_credentials_request':
              if (mountedCredentials.length > 0 && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'mount_credentials', env: mountedCredentials }));
              }
              break;

            case 'connected':
              setState('connected');
              fitAddonRef.current?.fit();
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
              }
              term.writeln(`\x1b[32m[hatcher]\x1b[0m Connected to \x1b[1m${msg.agentName || agent.name}\x1b[0m (${msg.framework || agent.framework})`);
              term.writeln(`\x1b[90mSession: ${activeTerminalSession.name}${mountedCredentials.length > 0 ? ` · mounted ${mountedCredentials.length} credential${mountedCredentials.length === 1 ? '' : 's'}` : ''}\x1b[0m`);
              term.writeln('\x1b[90m─────────────────────────────────────────\x1b[0m');
              term.writeln('\x1b[90mAttached to the framework CLI inside the agent container.\x1b[0m');
              term.writeln('\x1b[90mThe gateway keeps running separately for chat and integrations.\x1b[0m');
              term.writeln('');
              term.focus();
              break;

            case 'output':
              if (msg.data) {
                term.write(msg.data);
              }
              break;

            case 'disconnected':
              setState('disconnected');
              term.writeln('');
              term.writeln(`\x1b[33m[hatcher]\x1b[0m ${msg.reason || 'Disconnected'}`);
              break;

            case 'error':
              setState('error');
              setErrorMsg(msg.message);
              term.writeln(`\x1b[31m[error]\x1b[0m ${msg.message}`);
              break;

            case 'pong':
              break;
          }
        } catch {
          // Non-JSON message — write raw
          term.write(event.data);
        }
      };

      ws.onerror = () => {
        if (connectionSeqRef.current !== connectionSeq || wsRef.current !== ws) return;
        setState('error');
        setErrorMsg('Connection error');
        term.writeln('\x1b[31m[error]\x1b[0m WebSocket connection failed');
      };

      ws.onclose = (e) => {
        if (connectionSeqRef.current !== connectionSeq || wsRef.current !== ws) return;
        stopKeepAlive();
        if (stateRef.current !== 'error') setState('disconnected');
        if (e.code !== 1000) {
          term.writeln(`\x1b[33m[hatcher]\x1b[0m Connection closed (${e.reason || `code ${e.code}`})`);
        }
        wsRef.current = null;
        if (!manualDisconnectRef.current && e.code !== 1000) {
          term.writeln('\x1b[90m[hatcher] Reconnecting terminal session...\x1b[0m');
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            void connect();
          }, TERMINAL_RECONNECT_DELAY_MS);
        }
      };

    } catch (e) {
      setState('error');
      setErrorMsg((e as Error).message);
    }
  }, [
    activeTerminalSession.id,
    activeTerminalSession.name,
    agent?.id,
    agent?.name,
    agent?.framework,
    consumeWheelScrollLines,
    isActive,
    stopKeepAlive,
    stopReconnect,
  ]);

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    stopReconnect();
    stopKeepAlive();
    terminalInputRef.current?.dispose();
    terminalInputRef.current = null;
    connectionSeqRef.current += 1;
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setState('disconnected');
  }, [stopKeepAlive, stopReconnect]);

  // ── Auto-connect when tab opens and agent is active ──
  useEffect(() => {
    if (isActive) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [isActive, connect, disconnect]);

  useEffect(() => {
    if (!isVisible) return;
    const frame = requestAnimationFrame(() => {
      fitAddonRef.current?.fit();
      const term = termInstance.current;
      const ws = wsRef.current;
      if (term && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        term.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isVisible]);

  useEffect(() => {
    const root = termRef.current;
    if (!root) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const term = termInstance.current;
      if (!term) return;
      const lines = consumeWheelScrollLines(event);
      if (lines === 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      term.scrollLines(lines);
    };

    root.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => root.removeEventListener('wheel', onWheel, { capture: true });
  }, [consumeWheelScrollLines]);

  // ── Handle resize ──
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const term = termInstance.current;
        const ws = wsRef.current;
        if (term && ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      disconnect();
      if (termInstance.current) {
        termInstance.current.dispose();
        termInstance.current = null;
      }
    };
  }, [disconnect]);

  // ── Not running / starting state ──
  if (!isActive) {
    const isStarting = agent?.status === 'starting';
    return (
      <div className="flex h-[calc(100dvh-190px)] min-h-[520px] flex-col items-center justify-center gap-4 text-zinc-400 lg:min-h-[620px] 2xl:min-h-[720px]">
        {isStarting ? (
          <>
            <div className="w-10 h-10 rounded-full border-2 border-[var(--color-accent)]/40 border-t-[var(--color-accent)] animate-spin" />
            <p className="text-lg font-medium text-[var(--text-primary)]">{tTerminal('agentNotActive')}</p>
            <p className="text-sm text-zinc-500">The terminal will connect automatically when ready</p>
          </>
        ) : (
          <>
            <div className="text-5xl opacity-50">⬛</div>
            <p className="text-lg font-medium">{tTerminal('agentNotActive')}</p>
            <p className="text-sm text-zinc-500">{tTerminal('startAgent')}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="hatcher-terminal-frame flex h-[calc(100dvh-190px)] min-h-[520px] flex-col overflow-hidden border border-[var(--border-default)] bg-[#0a0a0a] lg:min-h-[620px] 2xl:h-[calc(100dvh-170px)] 2xl:min-h-[720px]">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Circle
              size={8}
              fill={state === 'connected' ? '#00ff41' : state === 'connecting' ? '#ffb86c' : '#ff5555'}
              className={state === 'connected' ? 'text-green-400' : state === 'connecting' ? 'text-yellow-400' : 'text-red-400'}
            />
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {state === 'connected' ? tTerminal('connected') : state === 'connecting' ? tTerminal('connecting') : tTerminal('disconnected')}
            </span>
          </div>
          <span className="text-xs text-[var(--border-default)]">|</span>
          <span className="min-w-0 truncate text-xs font-mono text-[var(--text-muted)]">
            {agent.name} ({agent.framework})
          </span>
          <label className="hidden min-w-0 items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)] lg:inline-flex">
            Session
            <select
              value={activeTerminalSession.id}
              onChange={(event) => setActiveSessionId(event.target.value)}
              className="h-6 max-w-[160px] rounded-md border border-[var(--border-default)] bg-[#0a0a0a] px-1.5 text-[10px] text-[var(--text-secondary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
              title="Terminal session"
            >
              {terminalSessions.map((session) => (
                <option key={session.id} value={session.id}>{session.name}</option>
              ))}
            </select>
          </label>
          <span className="hidden xl:inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
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
              className="h-6 rounded-md border border-[var(--border-default)] bg-[#0a0a0a] px-1.5 text-[10px] text-[var(--text-secondary)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
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
            onClick={() => createTerminalSession(`Session ${terminalSessions.length + 1}`)}
            className="hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] md:inline-flex"
            title="New terminal session"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={renameTerminalSession}
            className="hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] lg:inline-flex"
            title="Rename terminal session"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={forkTerminalSession}
            className="hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] lg:inline-flex"
            title="Fork to a new terminal session"
          >
            <GitBranch size={13} />
          </button>
          <button
            type="button"
            onClick={deleteTerminalSession}
            disabled={terminalSessions.length <= 1}
            className="hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40 lg:inline-flex"
            title="Delete terminal session"
          >
            <Trash2 size={13} />
          </button>
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
              onClick={connect}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)] transition-colors"
            >
              <RotateCcw size={12} />
              {tTerminal('reconnect')}
            </button>
          )}
          {state === 'connected' && (
            <button
              onClick={disconnect}
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
                <div key={mount.id} className="grid gap-2 rounded-md border border-[var(--border-default)] bg-[#0a0a0a] p-2 md:grid-cols-[auto,120px,1fr,1.4fr,auto] md:items-center">
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
                      scope: event.target.value as CredentialScope,
                      agentId: event.target.value === 'agent' ? agent?.id : undefined,
                    })}
                    className="h-8 rounded-md border border-[var(--border-default)] bg-[#0a0a0a] px-2 text-xs text-[var(--text-secondary)] outline-none"
                  >
                    <option value="account">account</option>
                    <option value="agent">agent</option>
                  </select>
                  <input
                    value={mount.key}
                    onChange={(event) => patchCredentialMount(mount.id, { key: event.target.value.toUpperCase() })}
                    placeholder="API_KEY"
                    className="h-8 rounded-md border border-[var(--border-default)] bg-[#0a0a0a] px-2 text-xs font-mono text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    value={mount.value}
                    onChange={(event) => patchCredentialMount(mount.id, { value: event.target.value })}
                    placeholder="Value"
                    type="password"
                    className="h-8 rounded-md border border-[var(--border-default)] bg-[#0a0a0a] px-2 text-xs font-mono text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeCredentialMount(mount.id)}
                    className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:text-red-300"
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

      {/* Terminal container */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0a0a0a] p-1">
        <div className="absolute left-2 top-2 z-20 flex flex-col overflow-hidden rounded-md border border-[var(--border-default)] bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => termInstance.current?.scrollLines(-Math.max(24, scrollLines * 4))}
            className="border-b border-[var(--border-default)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
            title="Scroll up"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => termInstance.current?.scrollLines(-Math.max(80, scrollLines * 12))}
            className="border-b border-[var(--border-default)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
            title="Page up"
          >
            <ChevronsUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => termInstance.current?.scrollLines(Math.max(80, scrollLines * 12))}
            className="border-b border-[var(--border-default)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
            title="Page down"
          >
            <ChevronsDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => termInstance.current?.scrollToBottom()}
            className="p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
            title="Scroll to bottom"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <div ref={termRef} className="h-full w-full overflow-hidden [&_.xterm-viewport]:overflow-y-auto" />
      </div>

      {/* Info banner */}
      <div className="px-4 py-1.5 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-[var(--text-muted)] font-mono">
          Attached to the framework CLI inside the isolated agent container. The gateway keeps running separately for chat and integrations. Terminal open/close and entered commands are audited with secret redaction.
          {errorMsg && <span className="text-red-400 ml-2">Error: {errorMsg}</span>}
        </p>
      </div>
    </div>
  );
}
