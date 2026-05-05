// ============================================================
// useWebSocketChat — WebSocket-based real-time chat streaming
// Progressive enhancement: falls back to HTTP SSE if WS fails.
// ============================================================

import { useRef, useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';

/** Derive ws:// or wss:// URL from the API base URL */
function getWsUrl(agentId: string): string {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/agents/${agentId}/ws`;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Structured tool-call event surfaced from the agent container while
 *  it runs its agentic loop. UI consumers render an inline indicator
 *  ("🔧 calling exec…") so users see what the agent is doing instead
 *  of staring at silence between thinking and final answer. */
export interface ChatToolEvent {
  callId: string;
  name: string;
  phase: 'start' | 'done';
  argsPreview?: string;
  agentId?: string;
}

interface UseWebSocketChatOptions {
  agentId: string;
  /** Whether the hook should attempt to connect (e.g. only when authenticated) */
  enabled?: boolean;
  onToken: (token: string) => void;
  onDone: (content: string, model: string) => void;
  onError: (error: string) => void;
  /** Called when the agent invokes a tool mid-stream. Optional — chats
   *  that don't render tool indicators can omit. */
  onToolEvent?: (evt: ChatToolEvent) => void;
  /** Called when connection status changes */
  onStatusChange?: (agentId: string, status: string) => void;
  onRateLimit?: (error: string, limit: number, used: number) => void;
}

interface UseWebSocketChatReturn {
  /** Send a chat message through the WebSocket */
  send: (message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) => boolean;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether the WebSocket is connected and ready to send */
  isConnected: boolean;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

export function useWebSocketChat({
  agentId,
  enabled = true,
  onToken,
  onDone,
  onError,
  onToolEvent,
  onStatusChange,
  onRateLimit,
}: UseWebSocketChatOptions): UseWebSocketChatReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const enabledRef = useRef(enabled);
  const agentIdRef = useRef(agentId);

  // Keep refs in sync for callbacks
  enabledRef.current = enabled;
  agentIdRef.current = agentId;

  // Store latest callbacks in refs to avoid reconnection on callback changes
  const onTokenRef = useRef(onToken);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  const onToolEventRef = useRef(onToolEvent);
  const onStatusChangeRef = useRef(onStatusChange);
  const onRateLimitRef = useRef(onRateLimit);
  onTokenRef.current = onToken;
  onDoneRef.current = onDone;
  onErrorRef.current = onError;
  onToolEventRef.current = onToolEvent;
  onStatusChangeRef.current = onStatusChange;
  onRateLimitRef.current = onRateLimit;

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'cleanup');
      }
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabledRef.current) return;

    cleanup();
    setConnectionState('connecting');

    const url = getWsUrl(agentIdRef.current);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setConnectionState('connected');
    };

    ws.onmessage = (event) => {
      let msg: { type: string; payload: Record<string, unknown> };
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'chat_token':
          onTokenRef.current(msg.payload.token as string);
          break;
        case 'chat_done':
          onDoneRef.current(
            msg.payload.content as string,
            msg.payload.model as string,
          );
          break;
        case 'chat_response':
          // Legacy non-streaming response (full content at once)
          // Emit as token + done for uniform handling
          onTokenRef.current(msg.payload.content as string);
          onDoneRef.current(
            msg.payload.content as string,
            msg.payload.model as string,
          );
          break;
        case 'chat_error':
          onErrorRef.current(msg.payload.error as string);
          break;
        case 'chat_tool_event':
          if (onToolEventRef.current) {
            onToolEventRef.current({
              callId: msg.payload.callId as string,
              name: msg.payload.name as string,
              phase: msg.payload.phase as 'start' | 'done',
              argsPreview: msg.payload.argsPreview as string | undefined,
              agentId: msg.payload.agentId as string | undefined,
            });
          }
          break;
        case 'rate_limit':
          if (onRateLimitRef.current) {
            onRateLimitRef.current(
              msg.payload.error as string,
              msg.payload.limit as number,
              msg.payload.used as number,
            );
          } else {
            onErrorRef.current(msg.payload.error as string);
          }
          break;
        case 'agent_status':
          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(
              msg.payload.agentId as string,
              msg.payload.status as string,
            );
          }
          break;
      }
    };

    ws.onerror = () => {
      // onerror is always followed by onclose, so we handle reconnect there
    };

    ws.onclose = (event) => {
      wsRef.current = null;

      // Don't reconnect if explicitly closed or auth failure
      if (event.code === 1000 || event.code === 1008) {
        setConnectionState('disconnected');
        return;
      }

      // Attempt reconnect with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && enabledRef.current) {
        setConnectionState('connecting');
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        setConnectionState('error');
      }
    };
  }, [cleanup]);

  // Connect on mount / when agentId or enabled changes
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      cleanup();
      setConnectionState('disconnected');
    }
    return cleanup;
  }, [agentId, enabled, connect, cleanup]);

  const send = useCallback(
    (message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>): boolean => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return false;
      }
      try {
        wsRef.current.send(JSON.stringify({ message, ...(history?.length ? { history } : {}) }));
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState('disconnected');
  }, [cleanup]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  return {
    send,
    connectionState,
    isConnected: connectionState === 'connected',
    disconnect,
    reconnect,
  };
}
