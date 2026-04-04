'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAgentContext } from '../AgentContext';
import { getToken } from '@/lib/api';
import { RotateCcw, Circle } from 'lucide-react';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getWsUrl(agentId: string, token: string): string {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/agents/${agentId}/terminal/ws?token=${encodeURIComponent(token)}`;
}

export function TerminalTab() {
  const { agent } = useAgentContext();
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('@xterm/addon-fit').FitAddon> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onDataDisposable = useRef<{ dispose: () => void } | null>(null);
  const stateRef = useRef<ConnectionState>('disconnected');
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isActive = agent?.status === 'active';

  // Keep ref in sync with state for use inside closures
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Initialize xterm + connect WebSocket ──
  const connect = useCallback(async () => {
    if (!agent?.id || !isActive) return;

    // Close existing connection first to avoid race conditions
    if (wsRef.current) {
      wsRef.current.close(1000, 'Reconnecting');
      wsRef.current = null;
    }

    // Dispose previous onData listener to prevent duplicate keystrokes
    if (onDataDisposable.current) {
      onDataDisposable.current.dispose();
      onDataDisposable.current = null;
    }

    setState('connecting');
    setErrorMsg(null);

    try {
      await loadXterm();
      if (!Terminal || !FitAddon || !WebLinksAddon) throw new Error('Failed to load terminal library');

      // Create terminal instance if not exists
      if (!termInstance.current && termRef.current) {
        const term = new Terminal({
          cursorBlink: true,
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

      // Get JWT
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

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
              term.writeln('');
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
              if (msg.reason?.includes('stopped')) {
                term.writeln('\x1b[90mPress the Restart button to reconnect.\x1b[0m');
              }
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

      // Forward terminal input to WebSocket
      onDataDisposable.current = term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

    } catch (e) {
      setState('error');
      setErrorMsg((e as Error).message);
    }
  }, [agent?.id, agent?.name, agent?.framework, isActive]);

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    if (onDataDisposable.current) {
      onDataDisposable.current.dispose();
      onDataDisposable.current = null;
    }
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
  }, []);

  // ── Not running state ──
  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-zinc-400">
        <div className="text-5xl opacity-50">⬛</div>
        <p className="text-lg font-medium">Agent is not running</p>
        <p className="text-sm text-zinc-500">Start the agent to access the terminal</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Circle
              size={8}
              fill={state === 'connected' ? '#00ff41' : state === 'connecting' ? '#ffb86c' : '#ff5555'}
              className={state === 'connected' ? 'text-green-400' : state === 'connecting' ? 'text-yellow-400' : 'text-red-400'}
            />
            <span className="text-xs font-mono text-zinc-500">
              {state === 'connected' ? 'connected' : state === 'connecting' ? 'connecting...' : 'disconnected'}
            </span>
          </div>
          <span className="text-xs text-zinc-600">|</span>
          <span className="text-xs font-mono text-zinc-500">
            {agent.name} ({agent.framework})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {state === 'disconnected' && (
            <button
              onClick={connect}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              <RotateCcw size={12} />
              Reconnect
            </button>
          )}
          {state === 'connected' && (
            <button
              onClick={disconnect}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
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
      <div className="px-4 py-1.5 border-t border-zinc-800 bg-zinc-900/50">
        <p className="text-[10px] text-zinc-600 font-mono">
          Streaming agent process output. Input is forwarded to the agent&apos;s stdin.
          {errorMsg && <span className="text-red-400 ml-2">Error: {errorMsg}</span>}
        </p>
      </div>
    </div>
  );
}
