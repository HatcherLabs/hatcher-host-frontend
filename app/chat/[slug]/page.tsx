'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Send, Loader2, AlertTriangle, Bot, User } from 'lucide-react';

interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  framework: string;
  slug: string;
  status: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function PublicChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slug) return;
    api.getPublicAgent(slug).then((res) => {
      if (res.success) {
        setAgent(res.data);
      } else {
        setNotFound(true);
      }
    }).catch(() => {
      setNotFound(true);
    }).finally(() => {
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !agent) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);
    setRateLimited(false);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.sendPublicMessage(slug, text, history);

      if (res.success) {
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.data.content,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        if (res.error?.toLowerCase().includes('too many') || res.error?.toLowerCase().includes('rate limit')) {
          setRateLimited(true);
          setError('Rate limit reached. Please wait a moment before sending another message.');
        } else {
          setError(res.error || 'Failed to get response');
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0B1A] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#06b6d4]" />
      </div>
    );
  }

  // Not found
  if (notFound || !agent) {
    return (
      <div className="min-h-screen bg-[#0D0B1A] flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-6xl opacity-30">404</div>
        <p className="text-[#A5A1C2] text-sm">Agent not found</p>
        <Link
          href="/"
          className="text-xs text-[#06b6d4] hover:text-[#22d3ee] transition-colors"
        >
          Go to Hatcher
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0B1A] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/[0.06] bg-[#0F0D1F]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="w-9 h-9 rounded-full object-cover border border-white/[0.08]"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#06b6d4]/20 to-violet-500/20 border border-white/[0.08] flex items-center justify-center">
              <Bot size={16} className="text-[#06b6d4]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{agent.name}</h1>
            {agent.description && (
              <p className="text-xs text-[#71717a] truncate">{agent.description}</p>
            )}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            agent.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {agent.status === 'active' ? 'Online' : 'Waking...'}
          </span>
        </div>
      </header>

      {/* Chat messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#06b6d4]/10 to-violet-500/10 border border-white/[0.06] flex items-center justify-center">
                <Bot size={28} className="text-[#06b6d4]/60" />
              </div>
              <p className="text-sm text-[#A5A1C2]">
                Start a conversation with <span className="text-white font-medium">{agent.name}</span>
              </p>
              <p className="text-xs text-[#71717a]">
                Type a message below to begin
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                msg.role === 'user'
                  ? 'bg-[#06b6d4]/10 border border-[#06b6d4]/20'
                  : 'bg-violet-500/10 border border-violet-500/20'
              }`}>
                {msg.role === 'user' ? (
                  <User size={12} className="text-[#06b6d4]" />
                ) : (
                  <Bot size={12} className="text-violet-400" />
                )}
              </div>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-white rounded-br-md'
                    : 'bg-white/[0.04] border border-white/[0.06] text-[#e4e4e7] rounded-bl-md'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Bot size={12} className="text-violet-400" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white/[0.04] border border-white/[0.06]">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#71717a] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#71717a] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#71717a] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Error / rate limit */}
      {(error || rateLimited) && (
        <div className="flex-shrink-0 max-w-3xl mx-auto w-full px-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="flex-shrink-0 border-t border-white/[0.06] bg-[#0F0D1F]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 h-10 px-4 rounded-xl text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:border-[#06b6d4]/50 focus:outline-none placeholder:text-[#71717a] transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] disabled:opacity-40 transition-colors"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <Send size={16} className="text-white" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-center mt-2">
            <Link
              href="https://hatcher.host"
              target="_blank"
              className="text-[10px] text-[#71717a] hover:text-[#A5A1C2] transition-colors"
            >
              Powered by Hatcher
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
