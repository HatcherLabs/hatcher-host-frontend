'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { PanelShell } from './PanelShell';
import { useWebSocketChat } from '@/hooks/useWebSocketChat';

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
  const bufferRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { send, isConnected } = useWebSocketChat({
    agentId,
    enabled: true,
    onToken: (tok) => {
      bufferRef.current += tok;
      onUpdateLast(bufferRef.current);
    },
    onDone: (content) => {
      const final = content || bufferRef.current;
      onUpdateLast(final);
      bufferRef.current = '';
      setStreaming(false);
    },
    onError: (err) => {
      onUpdateLast(`Error: ${err}`);
      bufferRef.current = '';
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
    setStreaming(true);
    const ok = send(text);
    if (!ok) {
      onUpdateLast("Can't reach the agent right now.");
      setStreaming(false);
    }
    setInput('');
  }, [input, streaming, send, onAppend, onUpdateLast]);

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
