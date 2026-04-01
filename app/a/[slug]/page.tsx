'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { generateAgentAvatar } from '@/lib/avatar-generator';
import { ShareModal } from '@/components/agents/ShareModal';
import {
  Send,
  Loader2,
  Bot,
  Brain,
  Cpu,
  Sparkles,
  User,
  ExternalLink,
  Share2,
  Code2,
  MessageSquare,
  Zap,
  Globe,
} from 'lucide-react';

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

const FRAMEWORK_LABELS: Record<string, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  elizaos: 'ElizaOS',
  milady: 'Milady',
};

const STATUS_STYLES: Record<string, { dot: string; label: string; pulse: boolean }> = {
  active: { dot: 'bg-emerald-400', label: 'Online', pulse: true },
  sleeping: { dot: 'bg-blue-400', label: 'Sleeping', pulse: false },
  paused: { dot: 'bg-amber-400', label: 'Paused', pulse: false },
  error: { dot: 'bg-red-400', label: 'Error', pulse: false },
  restarting: { dot: 'bg-amber-400', label: 'Starting', pulse: true },
};

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AgentPublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !agent) return;

    setInput('');
    setError(null);
    setRateLimited(false);

    const userMsg: Message = { id: genId(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await api.sendPublicMessage(slug, text, history);
      if (res.success) {
        const assistantMsg: Message = { id: genId(), role: 'assistant', content: res.data.content };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setError('Failed to get a response. Please try again.');
      }
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
        setRateLimited(true);
      } else {
        setError(msg || 'Something went wrong. Please try again.');
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

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const embedCode = agent
    ? `<iframe\n  src="${typeof window !== 'undefined' ? window.location.origin : 'https://hatcher.host'}/embed/${agent.slug}"\n  width="400"\n  height="600"\n  style="border: none; border-radius: 12px;"\n  allow="microphone"\n></iframe>`
    : '';

  const statusInfo = agent ? (STATUS_STYLES[agent.status] ?? STATUS_STYLES.sleeping) : null;
  const fwAvatar = agent ? (FRAMEWORK_AVATAR[agent.framework] ?? { gradient: 'from-slate-600 to-slate-400', icon: Bot }) : { gradient: 'from-slate-600 to-slate-400', icon: Bot };
  const FwIcon = fwAvatar.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center gap-4 px-4">
        <Bot className="w-16 h-16 text-zinc-600" />
        <h1 className="text-2xl font-bold text-zinc-200">Agent not found</h1>
        <p className="text-zinc-500 text-center">This agent doesn't exist or is set to private.</p>
        <Link
          href="/"
          className="mt-4 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          Go to Hatcher
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-[var(--bg-base)]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
            <Zap className="w-4 h-4 text-violet-400" />
            <span className="font-semibold text-white">Hatcher</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Embed + Share disabled until abuse protection is implemented */}
          </div>
        </div>
      </header>

      {/* Embed code panel — disabled until abuse protection */}

      <div className="max-w-5xl mx-auto px-4 py-6 flex-1 flex flex-col gap-6 w-full">
        {/* Agent profile card */}
        <div className="bg-[var(--bg-elevated)] border border-white/8 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)} alt={agent.name} className="w-20 h-20 rounded-2xl object-cover shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">{agent.name}</h1>
              {/* Status badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo!.dot} ${statusInfo!.pulse ? 'animate-pulse' : ''}`} />
                {statusInfo!.label}
              </span>
            </div>

            {agent.description && (
              <p className="text-zinc-400 text-sm mb-3 leading-relaxed">{agent.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                {FRAMEWORK_LABELS[agent.framework] ?? agent.framework}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                {agent.messageCount.toLocaleString()} messages
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Public agent
              </span>
            </div>
          </div>

          <Link
            href={`https://hatcher.host`}
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            Powered by Hatcher
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Chat interface */}
        <div className="flex-1 bg-[var(--bg-elevated)] border border-white/8 rounded-2xl flex flex-col overflow-hidden min-h-[500px]">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-zinc-300">Chat with {agent.name}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)} alt={agent.name} className="w-12 h-12 rounded-xl object-cover" />
                <p className="text-zinc-400 text-sm">
                  Say hello to <span className="text-white font-medium">{agent.name}</span>
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5" />
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white/5 text-zinc-200 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 justify-start">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${fwAvatar.gradient} flex items-center justify-center shrink-0 mt-0.5`}>
                  <FwIcon className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {rateLimited && (
              <div className="text-center py-2">
                <p className="text-amber-400 text-xs">Rate limit reached. Please wait a moment before sending more messages.</p>
              </div>
            )}

            {error && !rateLimited && (
              <div className="text-center py-2">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${agent.name}...`}
                disabled={sending || rateLimited}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 disabled:opacity-50 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || rateLimited}
                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-center text-xs text-zinc-600 mt-2">
              Powered by{' '}
              <Link href="/" className="text-violet-400 hover:text-violet-300 transition-colors">
                Hatcher
              </Link>
            </p>
          </div>
        </div>
      </div>

      {agent && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          agentName={agent.name}
          agentSlug={agent.slug}
        />
      )}
    </div>
  );
}
