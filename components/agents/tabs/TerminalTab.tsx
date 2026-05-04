'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAgentContext } from '../AgentContext';
import { api, getToken } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { RotateCcw, Circle, Send } from 'lucide-react';

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
type HistoryMessage = { role: string; content: string; ts: number };

function getWsUrl(agentId: string, token: string | null): string {
  const base = API_URL.replace(/^http/, 'ws');
  // Token in query is optional — backend also honours the httpOnly
  // `hatcher_jwt` cookie that the browser auto-sends on WS upgrade.
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${base}/agents/${agentId}/terminal/ws${qs}`;
}

export function TerminalTab() {
  const tTerminal = useTranslations('dashboard.agentDetail.terminal');
  const { agent } = useAgentContext();
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('@xterm/addon-fit').FitAddon> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<ConnectionState>('disconnected');
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyMarkerRef = useRef<string | null>(null);

  const isActive = agent?.status === 'active';

  // Keep ref in sync with state for use inside closures
  useEffect(() => { stateRef.current = state; }, [state]);

  const historyMarker = useCallback((m: HistoryMessage) => `${m.role}:${m.ts}:${m.content}`, []);

  const formatTerminalContent = useCallback((content: string) => (
    content
      .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
      .replace(/\r?\n/g, '\r\n')
  ), []);

  const pollProactiveMessages = useCallback(async () => {
    if (!agent?.id || !termInstance.current) return;

    try {
      const res = await api.getChatHistory(agent.id);
      if (!res.success) return;

      const history = res.data.messages as HistoryMessage[];
      if (history.length === 0) {
        historyMarkerRef.current = null;
        return;
      }

      const latestMarker = historyMarker(history[history.length - 1]!);
      const previousMarker = historyMarkerRef.current;
      if (!previousMarker) {
        historyMarkerRef.current = latestMarker;
        return;
      }

      const previousIndex = history.findIndex((m) => historyMarker(m) === previousMarker);
      historyMarkerRef.current = latestMarker;
      if (previousIndex === -1 || previousIndex === history.length - 1) return;

      const nextMessages = history.slice(previousIndex + 1);
      // Terminal-initiated chat is saved as a user+assistant pair. The
      // terminal already printed that response live, so only display
      // assistant-only additions produced by cron/workflow/webhook triggers.
      if (nextMessages.some((m) => m.role === 'user')) return;

      const assistantMessages = nextMessages.filter((m) => m.role === 'assistant' && m.content.trim());
      if (assistantMessages.length === 0) return;

      const term = termInstance.current;
      for (const msg of assistantMessages) {
        term.write(`\r\n\x1b[35m[agent]\x1b[0m ${formatTerminalContent(msg.content)}\r\n`);
      }
    } catch {
      // Non-fatal: terminal log streaming should keep working even if polling fails.
    }
  }, [agent?.id, formatTerminalContent, historyMarker]);

  // ── Initialize xterm + connect WebSocket ──
  const connect = useCallback(async () => {
    if (!agent?.id || !isActive) return;

    // Close existing connection first to avoid race conditions
    if (wsRef.current) {
      wsRef.current.close(1000, 'Reconnecting');
      wsRef.current = null;
    }

    setState('connecting');
    setErrorMsg(null);

    try {
      await loadXterm();
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
          scrollback: 5000,
          convertEol: true,
          disableStdin: true, // No raw keyboard input — messages only
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
      if (!term) throw new Error('Terminal not initialized');

      // Clear and show connecting message
      term.clear();
      term.writeln('\x1b[36m[hatcher]\x1b[0m Connecting to agent terminal...');

      // Pass the localStorage JWT via query when we have one. If the user
      // is on a cookie-only session (localStorage cleared, or first login
      // on this device), we still let the WebSocket upgrade happen — the
      // backend will read the httpOnly `hatcher_jwt` cookie the browser
      // sends automatically. The old "Not authenticated" early-throw path
      // was firing even for users who had a valid cookie session, blocking
      // the terminal entirely.
      const token = getToken();

      // Connect WebSocket
      const ws = new WebSocket(getWsUrl(agent.id, token));
      wsRef.current = ws;

      ws.onopen = () => {
        // Connected — wait for server confirmation
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'connected':
              setState('connected');
              term.writeln(`\x1b[32m[hatcher]\x1b[0m Connected to \x1b[1m${msg.agentName || agent.name}\x1b[0m (${msg.framework || agent.framework})`);
              term.writeln('\x1b[90m─────────────────────────────────────────\x1b[0m');
              term.writeln('\x1b[90mType a message below to talk to the agent.\x1b[0m');
              term.writeln('');
              inputRef.current?.focus();
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
          }
        } catch {
          // Non-JSON message — write raw
          term.write(event.data);
        }
      };

      ws.onerror = () => {
        setState('error');
        setErrorMsg('Connection error');
        term.writeln('\x1b[31m[error]\x1b[0m WebSocket connection failed');
      };

      ws.onclose = (e) => {
        if (stateRef.current !== 'error') setState('disconnected');
        if (e.code !== 1000) {
          term.writeln(`\x1b[33m[hatcher]\x1b[0m Connection closed (${e.reason || `code ${e.code}`})`);
        }
        wsRef.current = null;
      };

    } catch (e) {
      setState('error');
      setErrorMsg((e as Error).message);
    }
  }, [agent?.id, agent?.name, agent?.framework, isActive]);

  // ── Send message to agent ──
  const sendMessage = useCallback(() => {
    const text = messageInput.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || sending) return;

    setSending(true);
    wsRef.current.send(JSON.stringify({ type: 'input', data: text }));
    setMessageInput('');
    // Re-enable after response (or timeout)
    setTimeout(() => setSending(false), 30000);
  }, [messageInput, sending]);

  // Listen for output messages to detect when response is complete.
  //
  // Deps are `[state]` not empty: a ref change is not reactive, so we
  // key the effect on the connection state transition. `state` flips to
  // 'connected' after connect() finishes setting wsRef.current, at which
  // point we attach the message handler once; when state leaves
  // 'connected' the cleanup removes it and the next 'connected' run
  // re-attaches against the new socket. Previously the effect had no
  // dep array at all and re-ran on every component render, attaching
  // and removing the listener on every keystroke in the command input.
  useEffect(() => {
    if (state !== 'connected' || !wsRef.current) return;
    const ws = wsRef.current;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        // When we get output that's a green response (from proxyChat), the request is done
        if (msg.type === 'output' && typeof msg.data === 'string' && msg.data.includes('\x1b[32m')) {
          setSending(false);
        }
        // Error responses also unblock
        if (msg.type === 'output' && typeof msg.data === 'string' && msg.data.includes('\x1b[31m')) {
          setSending(false);
        }
      } catch { /* ignore */ }
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [state]);

  useEffect(() => {
    if (state !== 'connected') {
      historyMarkerRef.current = null;
      return;
    }

    void pollProactiveMessages();
    const timer = setInterval(() => {
      void pollProactiveMessages();
    }, 10_000);

    return () => clearInterval(timer);
  }, [pollProactiveMessages, state]);

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setState('disconnected');
  }, []);

  // ── Auto-connect when tab opens and agent is active ──
  useEffect(() => {
    if (isActive && state === 'disconnected') {
      connect();
    }
    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, connect, disconnect]);

  // ── Handle resize ──
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
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
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-zinc-400">
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
    <div className="flex flex-col h-full">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3">
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
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {agent.name} ({agent.framework})
          </span>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Terminal container */}
      <div className="flex-1 bg-[#0a0a0a] p-1 min-h-[400px]">
        <div ref={termRef} className="h-full w-full" />
      </div>

      {/* Message input */}
      {state === 'connected' && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={sending ? tTerminal('sending') : tTerminal('sendMessage')}
            disabled={sending}
            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-hover)] disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!messageInput.trim() || sending}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      )}

      {/* Info banner */}
      <div className="px-4 py-1.5 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-[var(--text-muted)] font-mono">
          Streaming agent logs. Send messages via the input field above.
          {errorMsg && <span className="text-red-400 ml-2">Error: {errorMsg}</span>}
        </p>
      </div>
    </div>
  );
}
