'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAgentContext } from '../AgentContext';
import { API_URL } from '@/lib/config';
import { RotateCcw, Circle, ShieldCheck } from 'lucide-react';

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

function getWsUrl(agentId: string): string {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/agents/${agentId}/terminal/ws`;
}

export function TerminalTab() {
  const tTerminal = useTranslations('dashboard.agentDetail.terminal');
  const { agent, stats } = useAgentContext();
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('@xterm/addon-fit').FitAddon> | null>(null);
  const terminalInputRef = useRef<{ dispose: () => void } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<ConnectionState>('disconnected');
  const connectionSeqRef = useRef(0);
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isActive = agent?.status === 'active';
  const shortContainerId = stats?.containerId ? stats.containerId.slice(0, 12) : null;

  // Keep ref in sync with state for use inside closures
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Initialize xterm + connect WebSocket ──
  const connect = useCallback(async () => {
    if (!agent?.id || !isActive) return;
    const connectionSeq = ++connectionSeqRef.current;

    // Close existing connection first to avoid race conditions
    if (wsRef.current) {
      wsRef.current.close(1000, 'Reconnecting');
      wsRef.current = null;
    }

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
          scrollback: 5000,
          convertEol: true,
          disableStdin: false,
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

      // Clear and show connecting message
      term.clear();
      term.writeln('\x1b[36m[hatcher]\x1b[0m Connecting to agent terminal...');

      // Connect WebSocket
      const ws = new WebSocket(getWsUrl(agent.id));
      wsRef.current = ws;

      terminalInputRef.current?.dispose();
      terminalInputRef.current = term.onData((data: string) => {
        const current = wsRef.current;
        if (connectionSeqRef.current !== connectionSeq) return;
        if (!current || current.readyState !== WebSocket.OPEN) return;
        current.send(JSON.stringify({ type: 'input', data }));
      });

      ws.onopen = () => {
        // Connected — wait for server confirmation
      };

      ws.onmessage = (event) => {
        if (connectionSeqRef.current !== connectionSeq || wsRef.current !== ws) return;
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'connected':
              setState('connected');
              fitAddonRef.current?.fit();
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
              }
              term.writeln(`\x1b[32m[hatcher]\x1b[0m Connected to \x1b[1m${msg.agentName || agent.name}\x1b[0m (${msg.framework || agent.framework})`);
              term.writeln('\x1b[90m─────────────────────────────────────────\x1b[0m');
              term.writeln('\x1b[90mInteractive shell attached inside the agent container.\x1b[0m');
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

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    terminalInputRef.current?.dispose();
    terminalInputRef.current = null;
    connectionSeqRef.current += 1;
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
          <span className="hidden xl:inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
            <ShieldCheck size={11} />
            Container shell
          </span>
          {shortContainerId && (
            <span className="hidden 2xl:inline text-[10px] font-mono text-[var(--text-muted)]">
              {shortContainerId}
            </span>
          )}
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

      {/* Info banner */}
      <div className="px-4 py-1.5 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-[var(--text-muted)] font-mono">
          Shell runs inside the isolated agent container, not on the host. Terminal open/close and entered commands are audited with secret redaction.
          {errorMsg && <span className="text-red-400 ml-2">Error: {errorMsg}</span>}
        </p>
      </div>
    </div>
  );
}
