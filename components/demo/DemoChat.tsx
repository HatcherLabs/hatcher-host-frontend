'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Send, Loader2, Bot, Sparkles, ArrowRight, Zap } from 'lucide-react';

// ── Config ────────────────────────────────────────────────
const DEMO_SLUG = process.env.NEXT_PUBLIC_DEMO_AGENT_SLUG || 'hatcher-demo';
const MAX_MESSAGES = 5; // free tries before sign-up CTA
const SESSION_KEY = 'hatcher_demo_count';

// ── Types ─────────────────────────────────────────────────
type Message = { id: string; role: 'user' | 'assistant'; content: string };

// ── Suggestion chips ──────────────────────────────────────
const CHIPS = [
  'What can you do?',
  'Search the web for AI news',
  'Write me a tweet about crypto',
];

// ─────────────────────────────────────────────────────────
export function DemoChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore count from sessionStorage
  useEffect(() => {
    const saved = parseInt(sessionStorage.getItem(SESSION_KEY) ?? '0', 10);
    setMsgCount(saved);
    if (saved >= MAX_MESSAGES) setLimitReached(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || limitReached) return;

    const newCount = msgCount + 1;
    setMsgCount(newCount);
    sessionStorage.setItem(SESSION_KEY, String(newCount));

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const history = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const res = await api.sendPublicMessage(DEMO_SLUG, trimmed, history);

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: res.data.content },
        ]);
      } else {
        // Agent not found or unavailable
        if (res.error?.includes('404') || res.error?.toLowerCase().includes('not found')) {
          setUnavailable(true);
        } else {
          setMessages((prev) => [
            ...prev,
            { id: `e-${Date.now()}`, role: 'assistant', content: 'Sorry, I ran into an error. Try again in a moment!' },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', content: 'Network error. Please try again.' },
      ]);
    } finally {
      setSending(false);
      if (newCount >= MAX_MESSAGES) setLimitReached(true);
      else inputRef.current?.focus();
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const empty = messages.length === 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* ── Terminal chrome ──────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d14] overflow-hidden shadow-2xl shadow-black/60">

        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-white/[0.08]" />
            <span className="w-3 h-3 rounded-full bg-white/[0.08]" />
            <span className="w-3 h-3 rounded-full bg-white/[0.08]" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
            <span className="text-xs font-medium text-[#71717a]">Hatcher Demo Agent</span>
          </div>
          <span className="text-[10px] text-[#52525b] font-mono">
            {MAX_MESSAGES - msgCount > 0 ? `${MAX_MESSAGES - msgCount} msg left` : 'limit reached'}
          </span>
        </div>

        {/* Messages area */}
        <div className="h-72 sm:h-80 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {/* Empty state — welcome + chips */}
          {empty && !unavailable && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center h-full gap-5 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/30 to-cyan-500/20 border border-purple-500/20 flex items-center justify-center">
                <Bot size={22} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Ask me anything</p>
                <p className="text-xs text-[#71717a]">No sign-up required · {MAX_MESSAGES} free messages</p>
              </div>
              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => send(chip)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/[0.08] bg-white/[0.04] text-[#a1a1aa] hover:border-purple-500/30 hover:bg-purple-500/[0.08] hover:text-purple-300 transition-all duration-200 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Unavailable state */}
          {unavailable && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Zap size={24} className="text-amber-400 opacity-60" />
              <p className="text-sm text-[#a1a1aa]">Demo agent warming up — check back in a moment</p>
              <Link href="/register" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2">
                Or sign up now to deploy your own
              </Link>
            </div>
          )}

          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === 'assistant'
                    ? 'bg-gradient-to-br from-purple-600/40 to-cyan-500/20 border border-purple-500/20'
                    : 'bg-white/[0.06] border border-white/[0.08]'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot size={12} className="text-purple-400" />
                    : <span className="text-[10px] text-[#a1a1aa] font-bold">U</span>
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[var(--primary-500)]/15 border border-[var(--primary-500)]/20 text-[var(--text-primary)]'
                    : 'bg-white/[0.04] border border-white/[0.06] text-[#d4d4d8]'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2.5"
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-600/40 to-cyan-500/20 border border-purple-500/20">
                <Bot size={12} className="text-purple-400" />
              </div>
              <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#71717a]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── CTA after limit ────────────────────────────── */}
        {limitReached ? (
          <div className="border-t border-white/[0.06] px-4 py-4 flex flex-col sm:flex-row items-center gap-3 bg-gradient-to-r from-purple-600/[0.07] to-cyan-500/[0.04]">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Ready to deploy your own?</p>
              <p className="text-xs text-[#71717a] mt-0.5">Free tier — deploy in 60 seconds, no credit card required</p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-900/30 whitespace-nowrap"
            >
              Start free <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          /* ── Input bar ──────────────────────────────────── */
          <form
            onSubmit={handleSubmit}
            className="border-t border-white/[0.06] px-3 py-3 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the demo agent anything..."
              disabled={sending || limitReached}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[#52525b] outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || limitReached}
              className="w-8 h-8 rounded-lg bg-[var(--primary-500)]/15 border border-[var(--primary-500)]/20 hover:bg-[var(--primary-500)]/25 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending
                ? <Loader2 size={13} className="animate-spin text-[var(--primary-400)]" />
                : <Send size={13} className="text-[var(--primary-400)]" />
              }
            </button>
          </form>
        )}
      </div>

      {/* Suggestion chips — shown when messages exist but not at limit */}
      {!empty && !limitReached && !sending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap gap-2 justify-center mt-3"
        >
          {CHIPS.filter((c) => !messages.some((m) => m.role === 'user' && m.content === c)).slice(0, 2).map((chip) => (
            <button
              key={chip}
              onClick={() => send(chip)}
              className="px-3 py-1 rounded-full text-xs border border-white/[0.06] bg-white/[0.02] text-[#71717a] hover:border-purple-500/20 hover:text-[#a1a1aa] transition-all cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </motion.div>
      )}

      {/* Social proof line */}
      <p className="text-center text-[11px] text-[#52525b] mt-4 flex items-center justify-center gap-1.5">
        <Sparkles size={10} className="text-purple-500/60" />
        Powered by Hatcher · Deploy your own agent in 60 seconds
      </p>
    </div>
  );
}
