'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, useInView, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { IntroSplash } from '@/components/landing/IntroSplash';
import { DeploymentWalkthrough } from '@/components/landing/DeploymentWalkthrough';
import { DemoChat } from '@/components/demo/DemoChat';

import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe,
  Zap,
  Brain,
  Clock,
  Users,
  Mic,
  Star,
  Quote,
  Shield,
  KeyRound,
  Lock,
  Code,
  MessageCircle,
  TrendingUp,
  Headphones,
  Search,
  Sparkles,
  Bot,
  Heart,
  ShoppingCart,
  Palette,
  GraduationCap,
  Rocket,
} from 'lucide-react';
import { DOCS_URL } from '@/lib/config';

// ─── Animated Counter ──────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(count, target, { duration: 2, ease: 'easeOut' });
    return controls.stop;
  }, [isInView, count, target]);

  useEffect(() => {
    const unsub = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${v.toLocaleString()}${suffix}`;
    });
    return unsub;
  }, [rounded, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

// ─── Section wrapper ───────────────────────────────────────────
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`relative overflow-hidden ${className}`}>
      {children}
    </section>
  );
}

// ─── FAQ accordion ─────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02] hover:border-white/[0.1] transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <span className="text-sm font-medium text-white">{question}</span>
        <ChevronDown className={`w-4 h-4 text-[#71717a] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-4 text-sm text-[#a1a1aa] leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Use Case Card ─────────────────────────────────────────────
function UseCaseCard({
  icon: Icon,
  title,
  description,
  example,
  gradient,
  platforms,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  example: string;
  gradient: string;
  platforms: string[];
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay }}
      className="group relative bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 sm:p-8 hover:border-purple-500/30 hover:shadow-[0_0_40px_rgba(139,92,246,0.08)] transition-all duration-500"
    >
      <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-5`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4">{description}</p>
      <div className="bg-[rgba(139,92,246,0.06)] border border-purple-500/10 rounded-xl p-4 mb-4">
        <p className="text-xs text-purple-300/80 italic leading-relaxed">&ldquo;{example}&rdquo;</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {platforms.map((p) => (
          <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[#71717a]">
            {p}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Step Card ─────────────────────────────────────────────────
function StepCard({
  number,
  title,
  description,
  delay = 0,
}: {
  number: string;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
      className="relative text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{number}</span>
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#a1a1aa] leading-relaxed max-w-xs mx-auto">{description}</p>
    </motion.div>
  );
}

// ─── Live agent demo preview ───────────────────────────────────
function AgentPreview() {
  const messages = [
    { role: 'user', text: 'What\'s the price of SOL right now?' },
    { role: 'agent', text: 'SOL is currently trading at $142.37, up 3.2% in the last 24h. Want me to set a price alert?' },
    { role: 'user', text: 'Yes, alert me if it drops below $135' },
    { role: 'agent', text: 'Done! I\'ll send you a notification on Telegram if SOL drops below $135. 🔔' },
  ];

  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= messages.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), visibleCount === 0 ? 800 : 1500);
    return () => clearTimeout(timer);
  }, [visibleCount, messages.length]);

  return (
    <div className="bg-[#0e0e14] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/5">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0f]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-[#a1a1aa]">CryptoHelper — Online</span>
        </div>
      </div>
      {/* Messages */}
      <div className="p-4 space-y-3 min-h-[220px]">
        {messages.slice(0, visibleCount).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple-500/20 text-purple-100 rounded-br-md'
                  : 'bg-white/[0.04] text-[#d4d4d8] border border-white/[0.06] rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        {visibleCount < messages.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Live Activity Ticker ──────────────────────────────────────
const TICKER_EVENTS = [
  { framework: 'OpenClaw', action: 'deployed', platform: 'Telegram' },
  { framework: 'Hermes', action: 'deployed', platform: 'Discord' },
  { framework: 'ElizaOS', action: 'deployed', platform: 'Twitter' },
  { framework: 'OpenClaw', action: 'deployed', platform: 'Slack' },
  { framework: 'Hermes', action: 'deployed', platform: 'WhatsApp' },
  { framework: 'OpenClaw', action: 'deployed', platform: 'Telegram' },
  { framework: 'ElizaOS', action: 'deployed', platform: 'Discord' },
  { framework: 'Hermes', action: 'deployed', platform: 'Telegram' },
];

const FRAMEWORK_COLORS: Record<string, string> = {
  OpenClaw: 'text-purple-400',
  Hermes: 'text-cyan-400',
  ElizaOS: 'text-emerald-400',
  Milady: 'text-amber-400',
};

function LiveActivityTicker() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % TICKER_EVENTS.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const event = TICKER_EVENTS[index];
  const timeAgo = ['just now', '2m ago', '5m ago', '1m ago', 'just now', '3m ago'];
  const time = timeAgo[index % timeAgo.length];

  return (
    <div className="flex items-center justify-center gap-2 py-2.5 px-4">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <AnimatePresence mode="wait">
        {visible && (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-[#71717a]"
          >
            Someone just deployed a{' '}
            <span className={`font-semibold ${FRAMEWORK_COLORS[event.framework] ?? 'text-white'}`}>
              {event.framework}
            </span>{' '}
            agent on{' '}
            <span className="text-[#a1a1aa]">{event.platform}</span>
            <span className="ml-2 text-[#52525b]">· {time}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ██  LANDING PAGE
// ═══════════════════════════════════════════════════════════════
export default function LandingPage() {
  const { isLoading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(false);

  // No auto-redirect — logged-in users can still see the landing page
  // They can navigate to dashboard via the navbar

  useEffect(() => {
    if (!sessionStorage.getItem('hatcher_splash_seen')) {
      setShowSplash(true);
    }
  }, []);
  const [stats, setStats] = useState({ agents: 0, users: 0, messages: 0, platforms: 20, frameworks: 4 });

  useEffect(() => {
    api.getPublicStats().then((r) => {
      if (r.success) setStats((s) => ({
        ...s,
        agents: r.data.totalAgents || 0,
        users: r.data.totalUsers || 0,
        messages: r.data.totalMessages || 0,
      }));
    }).catch(() => {});
  }, []);

  // While auth is resolving, render nothing to avoid flash
  if (authLoading) {
    return <div className="min-h-screen bg-[var(--bg-base)]" />;
  }

  if (showSplash) {
    return <IntroSplash onComplete={() => {
      sessionStorage.setItem('hatcher_splash_seen', '1');
      setShowSplash(false);
    }} />;
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-[var(--bg-base)] text-white"
    >
      {/* ── HERO ─────────────────────────────────────── */}
      <Section className="relative pt-20 sm:pt-28 md:pt-36 pb-16 sm:pb-24 md:pb-32 px-4 sm:px-6">
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(139,92,246,0.12), transparent 70%), radial-gradient(ellipse 40% 40% at 70% 60%, rgba(6,182,212,0.06), transparent 60%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.3,
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent)',
        }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-300">Deploy in 60 seconds — free forever</span>
                </div>

                <h1
                  className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
                  style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                >
                  Your AI agent,
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                    live on every platform
                  </span>
                </h1>

                <p className="text-lg text-[#a1a1aa] leading-relaxed mb-4 max-w-lg">
                  Build and deploy AI agents to Telegram, Discord, Twitter, and 20+ platforms.
                  Choose from 4 AI engines. No code, no servers, no limits.
                </p>
                <p className="text-sm text-[#71717a] mb-8 max-w-lg">
                  Bring your own API key for <strong className="text-white">unlimited free messages</strong> — or use our included AI credits to start instantly.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/create"
                    className="clay-btn-primary clay-btn-lg text-base"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={DOCS_URL}
                    className="inline-flex items-center justify-center gap-2 border border-white/[0.12] text-[#d4d4d8] font-medium px-7 py-4 rounded-[20px] text-base hover:bg-white/[0.04] hover:border-white/20 transition-all duration-200"
                  >
                    View Docs
                  </Link>
                </div>

                {/* Framework badges */}
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#71717a]">Powered by</span>
                  {['OpenClaw', 'Hermes', 'ElizaOS', 'Milady'].map((fw) => (
                    <span
                      key={fw}
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#a1a1aa] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 cursor-default"
                    >
                      {fw}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right — Chat preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <AgentPreview />
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── SOCIAL PROOF BAR ─────────────────────────── */}
      <Section className="py-10 sm:py-12 px-4 sm:px-6 border-t border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8 sm:gap-14 lg:gap-20">
            {[
              { value: stats.agents || 250, suffix: '+', label: 'Agents deployed', color: 'text-purple-400' },
              { value: stats.users || 180, suffix: '+', label: 'Developers trust us', color: 'text-cyan-400' },
              { value: 20, suffix: '+', label: 'Platforms supported', color: 'text-emerald-400' },
              { value: 4, suffix: '', label: 'AI engines', color: 'text-amber-400' },
              { value: 0, suffix: '$0', label: 'To get started', color: 'text-emerald-400' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>
                  {stat.value === 0 ? (
                    <span>{stat.suffix}</span>
                  ) : (
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  )}
                </p>
                <p className="text-xs text-[#71717a] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[#52525b] mt-5">
            The only platform with 4 AI engines, all integrations on every tier, and a real free plan
          </p>
        </div>
      </Section>

      {/* ── LIVE ACTIVITY TICKER ─────────────────────── */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0f]">
        <LiveActivityTicker />
      </div>

      {/* ── WHY HATCHER (comparison) ────────────────── */}
      <Section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400/80 mb-3">Why Hatcher</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Others charge $60/mo for one bot.
              <br className="hidden sm:block" />
              <span className="text-[#a1a1aa]"> We start at $0.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Most competitors', items: ['1 framework only', 'No free tier', '$40–$100/mo minimum', 'Limited platforms'], bad: true },
              { label: 'Self-hosting', items: ['Technical setup required', 'You manage servers', 'No dashboard or UI', 'Manual updates'], bad: true },
              { label: 'Hatcher', items: ['4 AI engines to choose from', 'Free forever tier', 'All 20+ platforms included', '60-second deploy, no code'], bad: false },
            ].map((col, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-xl p-5 border ${
                  col.bad
                    ? 'bg-white/[0.01] border-white/[0.06]'
                    : 'bg-purple-500/[0.06] border-purple-500/20'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${col.bad ? 'text-[#71717a]' : 'text-purple-400'}`}>{col.label}</p>
                <ul className="space-y-2">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      {col.bad ? (
                        <span className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span className={col.bad ? 'text-[#71717a]' : 'text-[#d4d4d8]'}>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FRAMEWORK SHOWCASE ───────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="frameworks">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-purple-400/80 mb-4">4 AI engines</p>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Choose your engine
              </h2>
              <p className="mt-4 text-[#a1a1aa] max-w-lg mx-auto">
                Each framework has a different personality. Pick the one that fits your use case — or try them all.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {[
              {
                icon: Bot,
                name: 'OpenClaw',
                badge: 'Most popular',
                badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                tagline: 'The all-rounder',
                desc: 'Powerful, flexible, and battle-tested. OpenClaw handles everything from simple Q&A bots to complex multi-tool agents with memory and web search.',
                features: ['Web search & browsing', 'Long-term memory', 'File management', 'All 20+ platforms'],
                accentColor: 'border-purple-500/20 hover:border-purple-500/40',
                bgAccent: 'bg-purple-500/[0.04]',
                iconBg: 'bg-purple-500/15',
                iconColor: 'text-purple-400',
                barColor: 'bg-purple-500',
                pct: 50,
              },
              {
                icon: Zap,
                name: 'Hermes',
                badge: 'Fastest',
                badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                tagline: 'Speed-first design',
                desc: 'Built for low-latency responses and minimal overhead. Hermes is ideal when your users need instant replies and you want the leanest possible agent.',
                features: ['Sub-second responses', 'Lightweight footprint', 'Real-time streaming', 'Telegram & Discord native'],
                accentColor: 'border-cyan-500/20 hover:border-cyan-500/40',
                bgAccent: 'bg-cyan-500/[0.04]',
                iconBg: 'bg-cyan-500/15',
                iconColor: 'text-cyan-400',
                barColor: 'bg-cyan-500',
                pct: 30,
              },
              {
                icon: Users,
                name: 'ElizaOS',
                badge: 'Multi-agent',
                badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                tagline: 'Team of agents',
                desc: 'Coordinate multiple AI agents that collaborate on complex tasks. ElizaOS lets you build agent networks where each bot specializes in one thing.',
                features: ['Agent-to-agent messaging', 'Role-based coordination', 'Shared memory pool', 'Parallel task execution'],
                accentColor: 'border-emerald-500/20 hover:border-emerald-500/40',
                bgAccent: 'bg-emerald-500/[0.04]',
                iconBg: 'bg-emerald-500/15',
                iconColor: 'text-emerald-400',
                barColor: 'bg-emerald-500',
                pct: 15,
              },
              {
                icon: Sparkles,
                name: 'Milady',
                badge: 'Crypto-native',
                badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                tagline: 'Built for web3',
                desc: 'Designed for the crypto-native builder. Milady has on-chain awareness, wallet integrations, and fits right into DeFi, NFT, and token communities.',
                features: ['On-chain data access', 'Wallet & token aware', 'DeFi protocol hooks', 'Crypto community tone'],
                accentColor: 'border-amber-500/20 hover:border-amber-500/40',
                bgAccent: 'bg-amber-500/[0.04]',
                iconBg: 'bg-amber-500/15',
                iconColor: 'text-amber-400',
                barColor: 'bg-amber-500',
                pct: 5,
              },
            ].map((fw, i) => (
              <motion.div
                key={fw.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-2xl border p-6 transition-all duration-300 ${fw.accentColor} ${fw.bgAccent}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${fw.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <fw.icon size={22} className={fw.iconColor} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{fw.name}</h3>
                      <p className="text-xs text-[#71717a]">{fw.tagline}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${fw.badgeColor}`}>
                    {fw.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4">{fw.desc}</p>

                {/* Features */}
                <ul className="space-y-1.5 mb-5">
                  {fw.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs text-[#d4d4d8]">
                      <Check className={`w-3 h-3 ${fw.iconColor} shrink-0`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* Popularity bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${fw.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${fw.barColor} opacity-60`}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${fw.iconColor} shrink-0 tabular-nums`}>{fw.pct}% of agents</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-10"
          >
            <p className="text-xs text-[#71717a]">Not sure which to pick? Start with OpenClaw — you can switch anytime.</p>
          </motion.div>
        </div>
      </Section>

      {/* ── WHAT CAN YOUR AGENT DO? ──────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="use-cases">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-purple-400/80 mb-4">Real examples</p>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                What can your agent do?
              </h2>
              <p className="mt-4 text-[#a1a1aa] max-w-xl mx-auto">
                From crypto trading bots to customer support — your agent handles it while you sleep.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <UseCaseCard
              icon={TrendingUp}
              title="Crypto & Trading Assistant"
              description="Track prices, analyze trends, and get alerts. Your agent watches the market while you sleep."
              example="Hey, SOL just hit $145 — that's the target you set. Want me to track the next resistance level?"
              gradient="bg-gradient-to-br from-emerald-500/80 to-emerald-600/80"
              platforms={['Telegram', 'Discord', 'Twitter']}
              delay={0}
            />
            <UseCaseCard
              icon={Headphones}
              title="Customer Support Agent"
              description="Answer questions, handle complaints, and help customers 24/7 — in any language."
              example="Hi! I checked your order #4521 — it shipped yesterday and should arrive by Friday. Need anything else?"
              gradient="bg-gradient-to-br from-blue-500/80 to-blue-600/80"
              platforms={['Website', 'Telegram', 'WhatsApp']}
              delay={0.1}
            />
            <UseCaseCard
              icon={Users}
              title="Community Manager"
              description="Welcome new members, moderate chats, answer FAQs, and keep your community active."
              example="Welcome to the server, @alex! 👋 Check out #getting-started for a quick intro. Feel free to ask me anything!"
              gradient="bg-gradient-to-br from-purple-500/80 to-purple-600/80"
              platforms={['Discord', 'Telegram', 'Slack']}
              delay={0.2}
            />
            <UseCaseCard
              icon={Search}
              title="Research Assistant"
              description="Summarize articles, track news, and compile reports on any topic automatically."
              example="I found 3 new articles about AI regulation today. Here's a quick summary of each..."
              gradient="bg-gradient-to-br from-amber-500/80 to-orange-600/80"
              platforms={['Telegram', 'Email', 'Discord']}
              delay={0.3}
            />
            <UseCaseCard
              icon={ShoppingCart}
              title="Sales & Lead Agent"
              description="Chat with potential customers, answer product questions, and qualify leads while you focus on closing."
              example="Thanks for your interest! Based on what you described, our Pro plan would be the best fit. Want me to schedule a demo?"
              gradient="bg-gradient-to-br from-pink-500/80 to-rose-600/80"
              platforms={['Website', 'Instagram', 'Twitter']}
              delay={0.4}
            />
            <UseCaseCard
              icon={GraduationCap}
              title="Personal Tutor"
              description="Help students learn, explain concepts, quiz them, and track their progress."
              example="Great job on question 4! You're getting better at derivatives. Let's try a harder one — ready?"
              gradient="bg-gradient-to-br from-cyan-500/80 to-teal-600/80"
              platforms={['Telegram', 'Discord', 'Website']}
              delay={0.5}
            />
          </div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400/80 mb-4">Simple setup</p>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                3 steps. 60 seconds.
              </h2>
              <p className="mt-4 text-[#a1a1aa] max-w-lg mx-auto">
                No coding, no setup guides, no configuration files. Just pick, customize, and launch.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            <StepCard
              number="1"
              title="Choose a style"
              description="Pick the type of AI brain that powers your agent. Each style has different strengths — we'll help you choose."
              delay={0}
            />
            <StepCard
              number="2"
              title="Customize it"
              description="Give it a name, personality, and tell it what to do. Connect it to Telegram, Discord, or any platform you want."
              delay={0.15}
            />
            <StepCard
              number="3"
              title="Launch it"
              description="Hit the button and your agent goes live. It runs 24/7 in the cloud — no computer needs to stay on."
              delay={0.3}
            />
          </div>

          {/* Interactive deployment walkthrough */}
          <div className="mt-14 sm:mt-16">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center text-xs text-[#71717a] mb-6 uppercase tracking-widest"
            >
              See it in action
            </motion.p>
            <DeploymentWalkthrough />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-12"
          >
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-white font-medium px-6 py-3 rounded-full text-sm hover:bg-white/[0.1] hover:border-white/20 transition-all duration-200"
            >
              Try it now — it&apos;s free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ── FEATURES GRID ────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-purple-400/80 mb-4">Everything included</p>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Powerful, yet simple
              </h2>
              <p className="mt-4 text-[#a1a1aa] max-w-lg mx-auto">
                Your agent comes packed with features — all included, even on the free plan.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: Globe, title: '20+ Platforms', desc: 'Telegram, Discord, Twitter, Slack, and more' },
              { icon: Brain, title: 'Smart AI Brains', desc: 'GPT, Claude, Gemini, Groq — your choice' },
              { icon: Mic, title: 'Voice Chat', desc: 'Your agent can talk and listen in real-time' },
              { icon: Clock, title: 'Scheduled Tasks', desc: 'Set it to run tasks at specific times' },
              { icon: MessageCircle, title: 'Multi-language', desc: 'Speaks any language your users speak' },
              { icon: Heart, title: 'Memory', desc: 'Remembers past conversations with each user' },
              { icon: Users, title: 'Multi-Agent', desc: 'Run multiple agents that work together' },
              { icon: Shield, title: 'Safe & Private', desc: 'Your data stays encrypted and protected' },
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 sm:p-5 hover:border-purple-500/20 hover:bg-white/[0.03] transition-all duration-300"
              >
                <feat.icon className="w-5 h-5 text-purple-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1">{feat.title}</h3>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── BRING YOUR OWN KEY ───────────────────────── */}
      <Section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">Always free</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Use your own AI account
              </h2>
              <p className="text-[#a1a1aa] leading-relaxed mb-4">
                Already have an account with OpenAI, Google, or another AI provider? Connect it to your agent 
                and get <strong className="text-white">unlimited messages</strong> at no extra cost from us.
              </p>
              <p className="text-sm text-[#71717a]">
                Don&apos;t have one? No worries — we include a free AI provider so you can start right away.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { name: 'OpenAI (ChatGPT)', color: 'text-emerald-400' },
                { name: 'Google (Gemini)', color: 'text-blue-400' },
                { name: 'Anthropic (Claude)', color: 'text-amber-400' },
                { name: 'Groq (Free)', color: 'text-orange-400' },
                { name: 'xAI (Grok)', color: 'text-purple-400' },
                { name: 'OpenRouter', color: 'text-cyan-400' },
              ].map((provider) => (
                <div
                  key={provider.name}
                  className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
                >
                  <Check className={`w-4 h-4 ${provider.color} shrink-0`} />
                  <span className="text-sm text-[#d4d4d8]">{provider.name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── INTERACTIVE DEMO ────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-4">Try it now</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Chat with a live agent</h2>
            <p className="text-[#a1a1aa] max-w-lg mx-auto">
              This is a real Hatcher agent running on our platform. Ask it anything — no signup required.
            </p>
          </div>
          <DemoChat />
        </div>
      </Section>

      {/* ── TESTIMONIALS ─────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-4">What people say</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Loved by builders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                quote: 'I set up a Telegram bot for my crypto community in literally 5 minutes. It answers questions, tracks prices, and my members love it.',
                name: 'Alex R.',
                role: 'Community founder',
                stars: 5,
                gradient: 'bg-gradient-to-br from-purple-500 to-violet-600',
              },
              {
                quote: 'Replaced our $200/month customer support tool. The agent handles 80% of tickets automatically and sounds way more natural.',
                name: 'Sarah K.',
                role: 'Startup founder',
                stars: 5,
                gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
              },
              {
                quote: 'I use it as a personal research assistant on Discord. It summarizes news, finds papers, and keeps me updated on my niche topics.',
                name: 'Marcus T.',
                role: 'PhD student',
                stars: 5,
                gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${t.gradient}`}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-[#71717a]">{t.role}</p>
                  </div>
                </div>
                <Quote className="w-5 h-5 text-white/[0.06] absolute top-5 right-5" />
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[#d4d4d8] leading-relaxed">{t.quote}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── SECURITY ─────────────────────────────────── */}
      <Section className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(139,92,246,0.06), transparent)',
        }} />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Your data is safe</h2>
            <p className="text-sm text-[#a1a1aa]">Enterprise-grade security, even on the free plan</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Lock, title: 'Encrypted', desc: 'All your data is encrypted with bank-level security', color: 'text-emerald-400' },
              { icon: KeyRound, title: 'Private Keys', desc: 'Your AI keys never touch our servers', color: 'text-amber-400' },
              { icon: Shield, title: 'Isolated', desc: 'Each agent runs in its own secure environment', color: 'text-purple-400' },
              { icon: Code, title: 'Open Source', desc: 'Built on open-source tech — fully transparent', color: 'text-cyan-400' },
            ].map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-center hover:border-purple-500/20 transition-all duration-300"
              >
                <badge.icon className={`w-5 h-5 ${badge.color} mx-auto mb-3`} />
                <h3 className="text-sm font-semibold text-white mb-1">{badge.title}</h3>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">{badge.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── PRICING PREVIEW ──────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-4">Pricing</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Start free, grow when ready
            </h2>
            <p className="mt-4 text-[#a1a1aa] max-w-lg mx-auto">
              All platforms included on every plan. Bring your own AI key = unlimited messages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="bg-[#0e0e14] border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] hover:translate-y-[-2px] transition-all duration-300">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400 mb-2">Free</p>
              <p className="text-3xl font-bold text-emerald-400 mb-1">$0</p>
              <p className="text-sm text-[#a1a1aa] mb-1">Get started with zero cost</p>
              <p className="text-xs text-emerald-400/70 mb-5">No credit card required</p>
              <ul className="space-y-2.5">
                {[
                  '1 AI agent',
                  '20 messages per day',
                  'All platforms included',
                  'Use your own AI key (free)',
                  'Free AI included (Groq)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#a1a1aa]">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-7 block text-center border border-white/20 text-white font-medium px-6 py-2.5 rounded-full hover:bg-white/5 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 text-sm"
              >
                Get Started
              </Link>
            </div>

            {/* Basic */}
            <div className="bg-[#0e0e14] border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] hover:translate-y-[-2px] transition-all duration-300">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-purple-400 mb-2">Basic</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-white">$9.99</p>
                <span className="text-sm text-[#71717a]">/mo</span>
              </div>
              <p className="text-sm text-[#a1a1aa] mb-6 mt-1">More messages, more power</p>
              <ul className="space-y-2.5">
                {[
                  '1 AI agent',
                  '100 messages/day',
                  'Unlimited with your AI key',
                  'All platforms included',
                  'Longer active time',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#a1a1aa]">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-7 block text-center border border-white/20 text-white font-medium px-6 py-2.5 rounded-full hover:bg-white/5 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 text-sm"
              >
                Subscribe
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-[#0e0e14] border border-cyan-500/30 rounded-2xl p-7 relative overflow-hidden hover:translate-y-[-2px] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400">Pro</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">POPULAR</span>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-white">$19.99</p>
                <span className="text-sm text-[#71717a]">/mo</span>
              </div>
              <p className="text-sm text-[#a1a1aa] mb-6 mt-1">For serious creators</p>
              <ul className="space-y-2.5">
                {[
                  '5 AI agents',
                  '300 messages/day per agent',
                  'Unlimited with your AI key',
                  'More storage & resources',
                  'Priority support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#a1a1aa]">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-7 block text-center bg-white text-black font-semibold px-6 py-2.5 rounded-full hover:bg-white/90 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 text-sm"
              >
                Go Pro
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-[#71717a] mt-6">
            Need more agents? Add extras with stackable packs.{' '}
            <Link href="/pricing" className="text-[#06b6d4] hover:underline">See full pricing</Link>
          </p>
        </div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Common questions</h2>
            <p className="text-[#a1a1aa]">Everything you need to know</p>
          </div>
          <div className="space-y-3">
            {[
              { q: 'Do I need to know how to code?', a: 'Not at all! Creating an agent is like filling out a form — choose a name, describe what you want it to do, pick which platforms to connect, and hit launch. The whole process takes about 60 seconds.' },
              { q: 'Is it really free?', a: 'Yes. The free plan gives you 1 agent, 20 messages per day, and access to all platforms. We even include a free AI provider (Groq) so you don\'t need to pay anything to get started. No credit card required.' },
              { q: 'What is "Bring Your Own Key"?', a: 'If you already have an account with OpenAI (ChatGPT), Google, Anthropic, or another AI provider, you can connect it to your agent. This gives you unlimited messages at no extra cost from us — you only pay your AI provider directly.' },
              { q: 'Where does my agent run?', a: 'Your agent runs on our cloud servers 24/7. You don\'t need to keep your computer on or install anything. Once you launch it, it just works.' },
              { q: 'Can I connect it to Telegram / Discord / Twitter?', a: 'Yes! Your agent can connect to 20+ platforms including Telegram, Discord, Twitter, Slack, and more. You can even connect it to multiple platforms at the same time.' },
              { q: 'How do I pay for upgrades?', a: 'Paid plans are in USD. You can pay with SOL (Solana) or platform tokens — just approve a wallet transaction and the upgrade activates instantly.' },
              { q: 'How do I get help?', a: 'Email support@hatcher.host for technical help, or join our Discord community at discord.gg/7tY3HjKjMc. We\'re here to help!' },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="relative py-20 sm:py-32 md:py-40 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[80px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Stop paying $60/mo
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">for a single bot</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-lg text-[#a1a1aa] mb-10 max-w-lg mx-auto"
          >
            Deploy your first agent for free in 60 seconds. 4 AI engines, 20+ platforms, zero credit card required.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <Link
              href="/create"
              className="clay-btn-primary clay-btn-lg text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
            >
              Create Your Agent
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Global footer is rendered by LayoutShell */}
    </motion.div>
    </>
  );
}
