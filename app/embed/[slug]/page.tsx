'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Send, Loader2, Bot, Brain, Cpu, Sparkles, User, Zap } from 'lucide-react';

const FRAMEWORK_AVATAR: Record<string, { gradient: string; icon: React.ComponentType<{ className?: string }> }> = {
  openclaw: { gradient: 'from-amber-600 to-amber-400', icon: Cpu },
  hermes:   { gradient: 'from-purple-600 to-purple-400', icon: Brain },
  elizaos:  { gradient: 'from-cyan-600 to-cyan-400', icon: Bot },
  milady:   { gradient: 'from-rose-600 to-rose-400', icon: Sparkles },
};

interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  framework: string;
  slug: string;
  status: string;
  isPublic: boolean;
  messageCount: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function EmbedPage() {
  const { slug } = useParams<{ slug: string }>();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slug) return;
    api.getPublicAgent(slug).then((res) => {
      if (res.success) setAgent(res.data);
      else setNotFound(true);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !agent) return;

    setInput('');
    setRateLimited(false);

    const userMsg: Message = { id: genId(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await api.sendPublicMessage(slug, text, history);
      if (res.success) {
        setMessages((prev) => [...prev, { id: genId(), role: 'assistant', content: res.data.content }]);
      }
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
        setRateLimited(true);
      }
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, sending, agent, messages, slug]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fwAvatar = agent ? (FRAMEWORK_AVATAR[agent.framework] ?? { gradient: 'from-slate-600 to-slate-400', icon: Bot }) : { gradient: 'from-slate-600 to-slate-400', icon: Bot };
  const FwIcon = fwAvatar.icon;

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-2 px-4 text-center">
        <Bot className="w-10 h-10 text-zinc-600" />
        <p className="text-zinc-400 text-sm">Agent not found or set to private.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Mini header */}
      <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-2.5 shrink-0">
        {agent.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agent.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
        ) : (
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${fwAvatar.gradient} flex items-center justify-center shrink-0`}>
            <FwIcon className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{agent.name}</p>
        </div>
        <Link
          href={`/a/${agent.slug}`}
          target="_blank"
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
        >
          <Zap className="w-3 h-3 text-violet-400" />
          Hatcher
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-zinc-500 text-xs">
              Chat with <span className="text-zinc-300">{agent.name}</span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              agent.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agent.avatarUrl} alt="" className="w-6 h-6 rounded-md object-cover shrink-0 mt-0.5" />
              ) : (
                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${fwAvatar.gradient} flex items-center justify-center shrink-0 mt-0.5`}>
                  <FwIcon className="w-3.5 h-3.5 text-white" />
                </div>
              )
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-sm'
                  : 'bg-white/5 text-zinc-200 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-zinc-300" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-2">
            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${fwAvatar.gradient} flex items-center justify-center shrink-0`}>
              <FwIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white/5 rounded-xl rounded-bl-sm px-3 py-2.5">
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {rateLimited && (
          <p className="text-center text-[10px] text-amber-400">Rate limit reached. Please wait.</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-white/5 shrink-0">
        <div className="flex gap-1.5 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending || rateLimited}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || rateLimited}
            className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
