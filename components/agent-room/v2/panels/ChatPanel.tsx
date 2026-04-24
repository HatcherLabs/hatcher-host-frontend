'use client';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { PanelShell } from './PanelShell';
import { useWebSocketChat } from '@/hooks/useWebSocketChat';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  agentId: string;
  framework: string;
  onClose: () => void;
}

export function ChatPanel({ agentId, framework, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState('');
  const bufferRef = useRef('');

  const { send, isConnected } = useWebSocketChat({
    agentId,
    enabled: true,
    onToken: (tok) => {
      bufferRef.current += tok;
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: bufferRef.current };
        else copy.push({ role: 'assistant', content: bufferRef.current });
        return copy;
      });
    },
    onDone: (content) => {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        const final = content || bufferRef.current;
        if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: final };
        else copy.push({ role: 'assistant', content: final });
        return copy;
      });
      bufferRef.current = '';
      setStreaming(false);
    },
    onError: (err) => {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }]);
      bufferRef.current = '';
      setStreaming(false);
    },
  });

  const submit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    bufferRef.current = '';
    setStreaming(true);
    const ok = send(text);
    if (!ok) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Can't reach the agent right now." }]);
      setStreaming(false);
    }
    setInput('');
  }, [input, streaming, send]);

  return (
    <PanelShell title="Chat" framework={framework} onClose={onClose}>
      <div className="mb-3 flex items-center gap-2 text-xs text-neutral-400">
        <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-neutral-600'}`} />
        {isConnected ? 'connected' : 'connecting…'}
      </div>
      <div className="mb-3 h-[50vh] space-y-2 overflow-y-auto rounded-lg bg-neutral-950 p-3 text-sm">
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
