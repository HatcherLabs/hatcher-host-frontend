'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { PanelShell } from './PanelShell';
import { useWebSocketChat, type ChatToolEvent } from '@/hooks/useWebSocketChat';

interface InflightTool {
  callId: string;
  name: string;
  argsPreview?: string;
  startedAt: number;
}

function toolGlyph(name: string): string {
  if (name === '*') return '🔧';
  if (name.startsWith('exec') || name === 'shell' || name === 'bash') return '⚡';
  if (name.includes('web_search') || name === 'search') return '🔎';
  if (name.includes('web_fetch') || name === 'fetch' || name === 'curl') return '🌐';
  if (name.includes('write') || name.includes('mkdir') || name.includes('create')) return '✏️';
  if (name.includes('read') || name.includes('cat') || name.includes('ls')) return '📂';
  if (name.includes('memory')) return '🧠';
  return '🔧';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts?: number;
}

interface Props {
  agentId: string;
  framework: string;
  messages: ChatMessage[];
  onAppend: (msg: ChatMessage) => void;
  onUpdateLast: (content: string) => void;
  onStreamingChange?: (streaming: boolean) => void;
  onClose: () => void;
}

export function ChatPanel({
  agentId,
  framework,
  messages,
  onAppend,
  onUpdateLast,
  onStreamingChange,
  onClose,
}: Props) {
  const [streaming, setStreamingLocal] = useState(false);
  const setStreaming = useCallback((v: boolean) => {
    setStreamingLocal(v);
    onStreamingChange?.(v);
  }, [onStreamingChange]);
  const [input, setInput] = useState('');
  const [inflightTools, setInflightTools] = useState<InflightTool[]>([]);
  const [completedTools, setCompletedTools] = useState<InflightTool[]>([]);
  const bufferRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleToolEvent = useCallback((evt: ChatToolEvent) => {
    if (evt.phase === 'start') {
      setInflightTools((prev) => {
        if (prev.some((t) => t.callId === evt.callId)) return prev;
        return [...prev, {
          callId: evt.callId,
          name: evt.name,
          argsPreview: evt.argsPreview,
          startedAt: Date.now(),
        }];
      });
    } else {
      // OpenAI-compat returns {callId:'all', name:'*'} to close the
      // whole tool-call round; treat it as "all current inflight done".
      if (evt.callId === 'all' && evt.name === '*') {
        setInflightTools((prev) => {
          setCompletedTools((c) => [...c, ...prev].slice(-5));
          return [];
        });
      } else {
        setInflightTools((prev) => {
          const matched = prev.find((t) => t.callId === evt.callId);
          if (matched) setCompletedTools((c) => [...c, matched].slice(-5));
          return prev.filter((t) => t.callId !== evt.callId);
        });
      }
    }
  }, []);

  const { send, isConnected } = useWebSocketChat({
    agentId,
    enabled: true,
    onToken: (tok) => {
      bufferRef.current += tok;
      onUpdateLast(bufferRef.current);
    },
    onToolEvent: handleToolEvent,
    onDone: (content) => {
      const final = content || bufferRef.current;
      onUpdateLast(final);
      bufferRef.current = '';
      setInflightTools([]);
      setStreaming(false);
    },
    onError: (err) => {
      onUpdateLast(`Error: ${err}`);
      bufferRef.current = '';
      setInflightTools([]);
      setStreaming(false);
    },
  });

  const submit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    onAppend({ role: 'user', content: text, ts: Date.now() });
    onAppend({ role: 'assistant', content: '', ts: Date.now() });
    bufferRef.current = '';
    setInflightTools([]);
    setCompletedTools([]);
    setStreaming(true);
    const ok = send(text);
    if (!ok) {
      onUpdateLast("Can't reach the agent right now.");
      setStreaming(false);
    }
    setInput('');
  }, [input, streaming, send, onAppend, onUpdateLast, setStreaming]);

  // Auto-scroll to bottom when messages change or stream.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  return (
    <PanelShell title="Chat" framework={framework} onClose={onClose}>
      <div className="mb-3 flex items-center gap-2 text-xs text-neutral-400">
        <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-neutral-600'}`} />
        {isConnected ? 'connected' : 'connecting…'}
      </div>
      <div
        ref={scrollRef}
        className="mb-3 h-[50vh] space-y-2 overflow-y-auto rounded-lg bg-neutral-950 p-3 text-sm"
      >
        {messages.length === 0 && (
          <div className="text-center text-neutral-500">Say something to your agent.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 ${
                m.role === 'user' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-100'
              }`}
            >
              {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
            </span>
          </div>
        ))}
        {streaming && (inflightTools.length > 0 || completedTools.length > 0) && (
          <div className="space-y-1 pt-1">
            {completedTools.map((t) => (
              <div key={`done-${t.callId}`} className="flex items-center gap-2 text-[11px] text-neutral-500">
                <span>{toolGlyph(t.name)}</span>
                <span className="font-mono">{t.name}</span>
                <span className="text-neutral-600">· done</span>
              </div>
            ))}
            {inflightTools.map((t) => (
              <div key={`live-${t.callId}`} className="flex items-center gap-2 text-[11px] text-[var(--phosphor,#39ff88)]">
                <span className="animate-pulse">{toolGlyph(t.name)}</span>
                <span className="font-mono">{t.name}</span>
                {t.argsPreview && (
                  <span className="truncate font-mono text-neutral-400" title={t.argsPreview}>
                    {t.argsPreview.length > 60 ? t.argsPreview.slice(0, 57) + '…' : t.argsPreview}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Talk to your agent…"
          disabled={streaming}
          className="flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </PanelShell>
  );
}
