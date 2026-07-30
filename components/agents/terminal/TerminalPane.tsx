'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTheme } from 'next-themes';
import { API_URL } from '@/lib/config';
import { resolveTerminalTheme } from '../tabs/terminalTheme';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';

// xterm.js CSS — imported once when component loads
import '@xterm/xterm/css/xterm.css';

// xterm.js dynamic imports (heavy library — only load when the pane is active)
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

export type TerminalConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type TerminalMode = 'gateway' | 'shell';

const TERMINAL_KEEPALIVE_MS = 25_000;
const TERMINAL_RECONNECT_DELAY_MS = 1_500;
const TERMINAL_SCROLL_SPEED_KEY = 'hatcher-terminal-scroll-lines';
export const TERMINAL_SCROLL_SPEEDS = [3, 6, 10, 16] as const;
export const DEFAULT_TERMINAL_SESSION_ID = 'main';
const DEFAULT_TERMINAL_TAIL_LINES = '600';

type TerminalScrollState = {
  canScrollUp: boolean;
  canScrollDown: boolean;
};

const EMPTY_TERMINAL_SCROLL_STATE: TerminalScrollState = {
  canScrollUp: false,
  canScrollDown: false,
};

export function getTerminalWsUrl(
  agentId: string,
  sessionId: string,
  options: { mode?: TerminalMode; mountCredentials?: boolean } = {},
): string {
  const base = API_URL.replace(/^http/, 'ws');
  const params = new URLSearchParams({
    mode: options.mode ?? 'gateway',
    session: sessionId || DEFAULT_TERMINAL_SESSION_ID,
    tail: DEFAULT_TERMINAL_TAIL_LINES,
  });
  if (options.mountCredentials) params.set('mountCredentials', '1');
  return `${base}/agents/${agentId}/terminal/ws?${params.toString()}`;
}

export function loadSavedTerminalScrollLines(): number {
  if (typeof window === 'undefined') return 6;
  const saved = Number(window.localStorage.getItem(TERMINAL_SCROLL_SPEED_KEY));
  return TERMINAL_SCROLL_SPEEDS.includes(saved as typeof TERMINAL_SCROLL_SPEEDS[number]) ? saved : 6;
}

export function persistTerminalScrollLines(value: number): void {
  window.localStorage.setItem(TERMINAL_SCROLL_SPEED_KEY, String(value));
}

function wheelDeltaToRows(event: WheelEvent): number {
  if (event.deltaY === 0) return 0;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * 24;
  return event.deltaY / 18;
}

export interface TerminalPaneHandle {
  connect: () => void;
  disconnect: () => void;
  /** Send raw input to the remote terminal. Returns false when not connected. */
  sendInput: (data: string) => boolean;
  focus: () => void;
}

export interface TerminalPaneProps {
  agentId: string;
  agentName: string;
  framework: string;
  /** Whether the agent container is running — the pane auto-connects while true. */
  active: boolean;
  isVisible?: boolean;
  sessionId: string;
  sessionName: string;
  mode?: TerminalMode;
  credentialEnv?: Array<{ key: string; value: string }>;
  /** Mouse-wheel scroll speed in lines (one of TERMINAL_SCROLL_SPEEDS). */
  scrollLines?: number;
  onStateChange?: (state: TerminalConnectionState) => void;
  onErrorMessage?: (message: string | null) => void;
}

/**
 * xterm.js core extracted from TerminalTab: terminal lifecycle, WebSocket
 * connect/reconnect/keepalive, resize, wheel handling, and scroll buttons.
 * The tab keeps its session/credential chrome; the agent desktop reuses the
 * pane directly (in shell mode).
 */
export const TerminalPane = forwardRef<TerminalPaneHandle, TerminalPaneProps>(function TerminalPane({
  agentId,
  agentName,
  framework,
  active,
  isVisible = true,
  sessionId,
  sessionName,
  mode = 'gateway',
  credentialEnv = [],
  scrollLines,
  onStateChange,
  onErrorMessage,
}, ref) {
  const { resolvedTheme, theme } = useTheme();
  const terminalTheme = useMemo(
    () => resolveTerminalTheme(resolvedTheme ?? theme),
    [resolvedTheme, theme],
  );
  const terminalThemeRef = useRef(terminalTheme);
  const termRef = useRef<HTMLDivElement>(null);
  const terminalInteractionRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null);
  const fitAddonRef = useRef<InstanceType<typeof import('@xterm/addon-fit').FitAddon> | null>(null);
  const terminalInputRef = useRef<{ dispose: () => void } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const stateRef = useRef<TerminalConnectionState>('disconnected');
  const connectionSeqRef = useRef(0);
  const credentialEnvRef = useRef(credentialEnv);
  const scrollLinesRef = useRef(scrollLines ?? loadSavedTerminalScrollLines());
  const wheelRemainderRef = useRef(0);
  const terminalSelectedRef = useRef(false);
  const onStateChangeRef = useRef(onStateChange);
  const onErrorMessageRef = useRef(onErrorMessage);
  const [state, setState] = useState<TerminalConnectionState>('disconnected');
  const [terminalScrollState, setTerminalScrollState] = useState<TerminalScrollState>(EMPTY_TERMINAL_SCROLL_STATE);

  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onErrorMessageRef.current = onErrorMessage; }, [onErrorMessage]);
  useEffect(() => { onStateChangeRef.current?.(state); }, [state]);

  const reportError = useCallback((message: string | null) => {
    onErrorMessageRef.current?.(message);
  }, []);

  // Keep refs in sync with state/props for use inside closures
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { credentialEnvRef.current = credentialEnv; }, [credentialEnv]);
  useEffect(() => {
    if (scrollLines === undefined) return;
    scrollLinesRef.current = scrollLines;
    const term = termInstance.current;
    if (term) {
      term.options.scrollSensitivity = scrollLines;
      term.options.fastScrollSensitivity = scrollLines * 2;
    }
  }, [scrollLines]);

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

  const readTerminalScrollState = useCallback((): TerminalScrollState => {
    const term = termInstance.current;
    if (!term) return EMPTY_TERMINAL_SCROLL_STATE;
    const buffer = term.buffer.active;
    return {
      canScrollUp: buffer.viewportY > 0,
      canScrollDown: buffer.viewportY < buffer.baseY,
    };
  }, []);

  const refreshTerminalScrollState = useCallback(() => {
    const next = readTerminalScrollState();
    setTerminalScrollState((current) => (
      current.canScrollUp === next.canScrollUp && current.canScrollDown === next.canScrollDown
        ? current
        : next
    ));
  }, [readTerminalScrollState]);

  const scrollTerminal = useCallback((action: 'line-up' | 'page-up' | 'page-down' | 'bottom') => {
    const term = termInstance.current;
    if (!term) return;
    const scrollState = readTerminalScrollState();

    if ((action === 'line-up' || action === 'page-up') && !scrollState.canScrollUp) return;
    if ((action === 'page-down' || action === 'bottom') && !scrollState.canScrollDown) return;

    switch (action) {
      case 'line-up':
        term.scrollLines(-Math.max(24, scrollLinesRef.current * 4));
        break;
      case 'page-up':
        term.scrollPages(-1);
        break;
      case 'page-down':
        term.scrollPages(1);
        break;
      case 'bottom':
        term.scrollToBottom();
        break;
    }

    window.requestAnimationFrame(refreshTerminalScrollState);
  }, [readTerminalScrollState, refreshTerminalScrollState]);

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
    if (!agentId || !active) return;
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
    reportError(null);

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
          theme: terminalThemeRef.current,
          allowTransparency: true,
          scrollback: 50000,
          scrollSensitivity: scrollLinesRef.current,
          fastScrollSensitivity: scrollLinesRef.current * 2,
          scrollOnUserInput: true,
          convertEol: true,
          disableStdin: false,
        });
        const fit = new FitAddon();
        const links = new WebLinksAddon();
        term.loadAddon(fit);
        term.loadAddon(links);
        term.open(termRef.current);
        fit.fit();
        term.onScroll(refreshTerminalScrollState);
        term.onWriteParsed(refreshTerminalScrollState);

        termInstance.current = term;
        fitAddonRef.current = fit;
        refreshTerminalScrollState();
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
      const ws = new WebSocket(getTerminalWsUrl(agentId, sessionId, {
        mode,
        mountCredentials: mountedCredentials.length > 0,
      }));
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
              term.writeln(`\x1b[32m[hatcher]\x1b[0m Connected to \x1b[1m${msg.agentName || agentName}\x1b[0m (${msg.framework || framework})`);
              term.writeln(`\x1b[90mSession: ${sessionName}${mountedCredentials.length > 0 ? ` · mounted ${mountedCredentials.length} credential${mountedCredentials.length === 1 ? '' : 's'}` : ''}\x1b[0m`);
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
              reportError(msg.message);
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
        reportError('Connection error');
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
      reportError((e as Error).message);
    }
  }, [
    agentId,
    agentName,
    framework,
    active,
    sessionId,
    sessionName,
    mode,
    refreshTerminalScrollState,
    reportError,
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

  useImperativeHandle(ref, () => ({
    connect: () => { void connect(); },
    disconnect,
    sendInput: (data: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type: 'input', data }));
      return true;
    },
    focus: () => { termInstance.current?.focus(); },
  }), [connect, disconnect]);

  // ── Auto-connect when the pane mounts and the agent is active ──
  useEffect(() => {
    if (active) {
      void connect();
    }
    return () => {
      disconnect();
    };
  }, [active, connect, disconnect]);

  useEffect(() => {
    terminalThemeRef.current = terminalTheme;
    if (termInstance.current) {
      termInstance.current.options.theme = terminalTheme;
    }
  }, [terminalTheme]);

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
    const root = terminalInteractionRef.current;
    if (!root) return;

    const markSelected = () => {
      terminalSelectedRef.current = true;
    };
    const markDeselected = (event: FocusEvent) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (!nextTarget || !root.contains(nextTarget)) {
        terminalSelectedRef.current = false;
      }
    };

    root.addEventListener('pointerdown', markSelected, { capture: true });
    root.addEventListener('focusin', markSelected);
    root.addEventListener('focusout', markDeselected);
    return () => {
      root.removeEventListener('pointerdown', markSelected, { capture: true });
      root.removeEventListener('focusin', markSelected);
      root.removeEventListener('focusout', markDeselected);
    };
  }, [active]);

  useEffect(() => {
    const root = terminalInteractionRef.current;
    if (!root) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const term = termInstance.current;
      if (!term) return;

      const lines = consumeWheelScrollLines(event);
      const selected = terminalSelectedRef.current || termRef.current?.contains(document.activeElement);
      let didScroll = false;

      if (lines !== 0) {
        const scrollState = readTerminalScrollState();
        const canScrollDirection = lines < 0 ? scrollState.canScrollUp : scrollState.canScrollDown;
        if (canScrollDirection) {
          term.scrollLines(lines);
          didScroll = true;
          window.requestAnimationFrame(refreshTerminalScrollState);
        } else {
          wheelRemainderRef.current = 0;
          refreshTerminalScrollState();
        }
      }

      if (selected || didScroll) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    root.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => root.removeEventListener('wheel', onWheel, { capture: true });
  }, [consumeWheelScrollLines, active, readTerminalScrollState, refreshTerminalScrollState]);

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

  return (
    <div ref={terminalInteractionRef} className="min-h-0 flex-1 overflow-hidden bg-[var(--bg-elevated)] p-1">
      <div className="flex h-full min-h-0 flex-col gap-1 sm:flex-row">
        <div ref={termRef} className="order-2 min-h-0 min-w-0 flex-1 overflow-hidden sm:order-1 [&_.xterm-viewport]:overflow-y-auto" />
        <div className="order-1 flex flex-shrink-0 flex-row self-end overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-card)]/90 backdrop-blur-sm sm:order-2 sm:flex-col sm:self-start">
          <button
            type="button"
            onClick={() => scrollTerminal('line-up')}
            disabled={!terminalScrollState.canScrollUp}
            className="border-r border-[var(--border-default)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] sm:border-b sm:border-r-0"
            title="Scroll up"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => scrollTerminal('page-up')}
            disabled={!terminalScrollState.canScrollUp}
            className="border-r border-[var(--border-default)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] sm:border-b sm:border-r-0"
            title="Page up"
          >
            <ChevronsUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => scrollTerminal('page-down')}
            disabled={!terminalScrollState.canScrollDown}
            className="border-r border-[var(--border-default)] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] sm:border-b sm:border-r-0"
            title="Page down"
          >
            <ChevronsDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => scrollTerminal('bottom')}
            disabled={!terminalScrollState.canScrollDown}
            className="p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]"
            title="Scroll to bottom"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});
