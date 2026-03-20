'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { api } from '@/lib/api';

import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe,
  Zap,
  Brain,
  Clock,
  Webhook,
  Users,
  Mic,
} from 'lucide-react';
import { DOCS_URL } from '@/lib/config';

// ─── Animated Robot SVG ─────────────────────────────────────────
function HeroRobot() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="0 0 320 400"
        className="w-[500px] h-[600px] animate-[float-gentle_4s_ease-in-out_infinite]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow behind robot */}
        <defs>
          <radialGradient id="robotGlow" cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E2B4A" />
            <stop offset="100%" stopColor="#1A1730" />
          </linearGradient>
          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0D0B1A" />
            <stop offset="100%" stopColor="#1A1730" />
          </linearGradient>
        </defs>

        <circle cx="160" cy="180" r="150" fill="url(#robotGlow)" />

        {/* Antenna */}
        <line x1="160" y1="65" x2="160" y2="40" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round">
          <animate attributeName="y2" values="40;35;40" dur="2s" repeatCount="indefinite" />
        </line>
        <circle cx="160" cy="35" r="6" fill="#f97316" opacity="0.9">
          <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Head */}
        <rect x="100" y="65" width="120" height="90" rx="20" fill="url(#bodyGrad)" stroke="#3D375E" strokeWidth="1.5" />

        {/* Face screen */}
        <rect x="115" y="78" width="90" height="55" rx="12" fill="url(#screenGrad)" stroke="#f97316" strokeWidth="0.5" opacity="0.8" />

        {/* Eyes */}
        <circle cx="140" cy="102" r="8" fill="#f97316" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="180" cy="102" r="8" fill="#f97316" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="3s" begin="0.5s" repeatCount="indefinite" />
        </circle>
        {/* Eye highlights */}
        <circle cx="143" cy="99" r="3" fill="white" opacity="0.6" />
        <circle cx="183" cy="99" r="3" fill="white" opacity="0.6" />

        {/* Mouth — happy arc */}
        <path d="M142 120 Q160 132 178 120" stroke="#f97316" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* Neck */}
        <rect x="148" y="155" width="24" height="15" rx="4" fill="#2E2B4A" stroke="#3D375E" strokeWidth="1" />

        {/* Body */}
        <rect x="85" y="170" width="150" height="120" rx="24" fill="url(#bodyGrad)" stroke="#3D375E" strokeWidth="1.5" />

        {/* Chest plate / screen */}
        <rect x="110" y="190" width="100" height="60" rx="14" fill="url(#screenGrad)" stroke="#f97316" strokeWidth="0.5" opacity="0.6" />

        {/* Chest indicator lights */}
        <circle cx="135" cy="210" r="4" fill="#4ADE80" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="160" cy="210" r="4" fill="#FBBF24" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="185" cy="210" r="4" fill="#f97316" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.1s" repeatCount="indefinite" />
        </circle>

        {/* Chest text lines (like code) */}
        <rect x="125" y="225" width="50" height="3" rx="1.5" fill="#f97316" opacity="0.3" />
        <rect x="125" y="232" width="70" height="3" rx="1.5" fill="#f97316" opacity="0.2" />
        <rect x="125" y="239" width="40" height="3" rx="1.5" fill="#f97316" opacity="0.25" />

        {/* Left arm */}
        <rect x="55" y="185" width="26" height="75" rx="13" fill="url(#bodyGrad)" stroke="#3D375E" strokeWidth="1.5">
          <animateTransform attributeName="transform" type="rotate" values="-3,68,220;3,68,220;-3,68,220" dur="3s" repeatCount="indefinite" />
        </rect>
        {/* Left hand */}
        <circle cx="68" cy="268" r="12" fill="#2E2B4A" stroke="#3D375E" strokeWidth="1.5">
          <animateTransform attributeName="transform" type="rotate" values="-3,68,268;3,68,268;-3,68,268" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Right arm — waving */}
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0,252,220;-15,252,185;0,252,220" dur="2s" repeatCount="indefinite" />
          <rect x="239" y="185" width="26" height="75" rx="13" fill="url(#bodyGrad)" stroke="#3D375E" strokeWidth="1.5" />
          <circle cx="252" cy="268" r="12" fill="#2E2B4A" stroke="#3D375E" strokeWidth="1.5" />
        </g>

        {/* Legs */}
        <rect x="115" y="290" width="28" height="55" rx="12" fill="url(#bodyGrad)" stroke="#3D375E" strokeWidth="1.5" />
        <rect x="177" y="290" width="28" height="55" rx="12" fill="url(#bodyGrad)" stroke="#3D375E" strokeWidth="1.5" />

        {/* Feet */}
        <rect x="105" y="340" width="48" height="18" rx="9" fill="#2E2B4A" stroke="#3D375E" strokeWidth="1.5" />
        <rect x="167" y="340" width="48" height="18" rx="9" fill="#2E2B4A" stroke="#3D375E" strokeWidth="1.5" />

        {/* Ear pieces */}
        <rect x="88" y="90" width="12" height="25" rx="6" fill="url(#accentGrad)" opacity="0.5" />
        <rect x="220" y="90" width="12" height="25" rx="6" fill="url(#accentGrad)" opacity="0.5" />
      </svg>
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    if (target >= 1000) return prefix + (v / 1000).toFixed(1) + 'K' + suffix;
    if (target >= 100) return prefix + Math.round(v).toLocaleString() + suffix;
    return prefix + Math.round(v).toString() + suffix;
  });

  useEffect(() => {
    if (isInView) {
      animate(count, target, { duration: 1.5, ease: 'easeOut' });
    }
  }, [isInView, target, count]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

// ─── Section wrapper with scroll animation ────────────────────
function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
      className={`${id ? 'scroll-mt-20' : ''} ${className}`}
    >
      {children}
    </motion.section>
  );
}

// ─── FAQ accordion item ──────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-xl border border-[rgba(46,43,74,0.6)] bg-[rgba(26,23,48,0.6)] backdrop-blur-sm hover:border-[rgba(249,115,22,0.4)] transition-colors duration-200"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <span className="font-medium text-[#fafafa] text-sm sm:text-base pr-4">{question}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#71717a] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>
      <div
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="px-5 pb-4 text-sm text-[#A5A1C2] leading-relaxed">{answer}</p>
      </div>
    </button>
  );
}

// ─── Logo Marquee Item ────────────────────────────────────────
function MarqueeItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 px-8 text-[#71717a] text-sm font-medium tracking-wide select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-[#71717a]/40" />
      {name}
    </div>
  );
}

// ─── Bento Card ───────────────────────────────────────────────
function BentoCard({
  title,
  value,
  description,
  icon: Icon,
  className = '',
  delay = 0,
}: {
  title: string;
  value?: string;
  description: string;
  icon: React.ElementType;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={`group relative bg-gradient-to-br from-[rgba(26,23,48,0.6)] to-[rgba(20,18,40,0.8)] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 transition-all duration-300 hover:border-[rgba(249,115,22,0.35)] hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] hover:scale-[1.02] active:scale-[0.98] will-change-transform ${className}`}
    >
      {/* Gradient border accent on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(6,182,212,0.04))', borderRadius: 'inherit' }} />
      <div className="relative flex flex-col h-full justify-between gap-4">
        <div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-6 group-hover:bg-[rgba(249,115,22,0.1)] group-hover:border-[rgba(249,115,22,0.2)] transition-all duration-300">
            <Icon className="w-5 h-5 text-[#A5A1C2] group-hover:text-[#f97316] transition-colors duration-300" />
          </div>
          {value && (
            <p className="text-4xl font-bold text-white tracking-tight mb-2">{value}</p>
          )}
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        </div>
        <p className="text-sm text-[#A5A1C2] leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Agent Showcase Card ──────────────────────────────────────
function AgentCard({
  name,
  description,
  status,
  platforms,
  delay = 0,
}: {
  name: string;
  description: string;
  status: string;
  platforms: string[];
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="group relative bg-gradient-to-br from-[rgba(26,23,48,0.6)] to-[rgba(20,18,40,0.8)] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 hover:border-[rgba(249,115,22,0.3)] hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(249,115,22,0.1)] active:scale-[0.98] will-change-transform"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white group-hover:from-orange-500/30 group-hover:to-orange-500/30 group-hover:border-[rgba(249,115,22,0.3)] transition-all duration-300">
          {name[0]}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          status === 'active'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : status === 'sleeping'
            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            : status === 'error'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'active' ? 'bg-emerald-400 animate-pulse'
            : status === 'sleeping' ? 'bg-blue-400'
            : status === 'error' ? 'bg-red-400'
            : 'bg-amber-400'
          }`} />
          {status === 'active' ? 'Active' : status === 'sleeping' ? 'Sleeping' : status === 'error' ? 'Error' : 'Paused'}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{name}</h3>
      <p className="text-sm text-[#A5A1C2] leading-relaxed mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[#71717a]">
            {p}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [platformStats, setPlatformStats] = useState({ totalAgents: 0, activeAgents: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    api.getPublicStats().then((res) => {
      if (res.success) setPlatformStats(res.data);
    }).catch(() => {/* keep defaults */});
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0D0B1A] text-white overflow-x-hidden">

      {/* ── HERO ───────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(249,115,22,0.15), transparent)',
          }}
        />
        {/* Secondary orange glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 40% 30% at 50% 30%, rgba(249,115,22,0.06), transparent)',
          }}
        />

        {/* Animated Robot — background accent */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-25 hidden lg:block">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
            <HeroRobot />
          </div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-extrabold tracking-tight leading-[0.9]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              <span className="text-white">Hatch Your</span>
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                AI Agent
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-[#A5A1C2] max-w-xl mx-auto leading-relaxed px-2"
          >
            Deploy autonomous agents across 20+ platforms with 13,700+ skills.
            Zero infrastructure. Live in 60 seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/create"
              className="bg-white text-black font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-base hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0B1A]"
            >
              Create Agent
            </Link>
            <Link
              href="/explore"
              className="border border-white/20 text-white font-medium px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-base hover:bg-white/5 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0B1A]"
            >
              Explore
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-16"
          >
            <div className="inline-flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-3 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs sm:text-sm text-[#A5A1C2]">
              <span><AnimatedCounter target={platformStats.totalAgents} /> Agents</span>
              <span className="w-px h-4 bg-white/10" aria-hidden="true" />
              <span><AnimatedCounter target={platformStats.activeAgents} /> Active</span>
              <span className="w-px h-4 bg-white/10" aria-hidden="true" />
              <span>Free to Start</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent" />
        </motion.div>
      </section>

      {/* ── LOGO MARQUEE ───────────────────────────────── */}
      <section className="border-y border-white/[0.06] py-6 overflow-hidden">
        <div className="marquee-track">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center shrink-0">
              <MarqueeItem name="OpenClaw" />
              <MarqueeItem name="ClawHub" />
              <MarqueeItem name="Solana" />
              <MarqueeItem name="Groq" />
              <MarqueeItem name="Anthropic" />
              <MarqueeItem name="OpenAI" />
              <MarqueeItem name="Google AI" />
              <MarqueeItem name="OpenRouter" />
              <MarqueeItem name="xAI" />
              <MarqueeItem name="Jupiter" />
              <MarqueeItem name="Telegram" />
              <MarqueeItem name="Discord" />
              <MarqueeItem name="Twitter" />
              <MarqueeItem name="Slack" />
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES BENTO GRID ────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6" id="capabilities">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-4">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              <span className="text-white">Everything your agent</span>{' '}
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">needs</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Row 1: 2 tall cards */}
            <BentoCard
              className="lg:col-span-2 lg:row-span-2"
              icon={Globe}
              value="20+"
              title="Platforms"
              description="Telegram, Discord, Twitter, WhatsApp, Signal, Slack, iMessage, Farcaster, Twitch, and more. Deploy once, reach everywhere."
              delay={0}
            />
            <BentoCard
              className="lg:col-span-2 lg:row-span-2"
              icon={Zap}
              value="13,700+"
              title="Skills"
              description="Access thousands of pre-built skills via ClawHub. Web scraping, trading, image generation, code execution, and custom actions."
              delay={0.1}
            />

            {/* Row 2: 3 cards */}
            <BentoCard
              icon={Mic}
              title="Voice"
              description="Text-to-speech and speech-to-text for voice-enabled agents on supported platforms."
              delay={0.2}
            />
            <BentoCard
              icon={Clock}
              title="Cron Jobs"
              description="Schedule recurring tasks. Post daily updates, fetch data on intervals, automate workflows."
              delay={0.25}
            />
            <BentoCard
              className="lg:col-span-2"
              icon={Webhook}
              title="Webhooks"
              description="HTTP triggers for external integrations. Connect your agents to any service, API, or automation pipeline."
              delay={0.3}
            />

            {/* Row 3: 2 cards */}
            <BentoCard
              className="lg:col-span-2"
              icon={Brain}
              title="Persistent Memory"
              description="Long-term memory across conversations. Your agent remembers context, preferences, and history."
              delay={0.35}
            />
            <BentoCard
              className="lg:col-span-2"
              icon={Users}
              title="Multi-Agent Routing"
              description="Coordinate multiple agents in complex workflows. Route messages, share context, and orchestrate actions."
              delay={0.4}
            />
          </div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-20">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-4">How it works</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Three steps to launch
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
            {[
              {
                num: '01',
                title: 'Configure',
                desc: 'Pick a template, customize your agent\'s personality and skills. Powered by OpenClaw.',
              },
              {
                num: '02',
                title: 'Power Up',
                desc: 'Unlock platforms and features with $HATCH tokens. Bring your own API keys — always free.',
              },
              {
                num: '03',
                title: 'Deploy',
                desc: 'Your agent goes live across 20+ platforms in under 60 seconds. We handle all the infrastructure.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <p className="text-6xl font-mono font-bold text-white/[0.07] mb-4 select-none">{step.num}</p>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-[#A5A1C2] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── AGENT SHOWCASE ─────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="showcase">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-4">Showcase</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">Built on Hatcher</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AgentCard
              name="Alpha Trader"
              description="Autonomous trading agent monitoring Solana DEX opportunities 24/7 with real-time alerts."
              status="active"
              platforms={['Telegram', 'Discord']}
              delay={0}
            />
            <AgentCard
              name="Social Butterfly"
              description="Multi-platform social agent posting daily insights with 13,700+ skills and content generation."
              status="active"
              platforms={['Twitter', 'Discord', 'Telegram']}
              delay={0.1}
            />
            <AgentCard
              name="Research Bot"
              description="Web research agent that scrapes, summarizes, and delivers crypto news on schedule."
              status="active"
              platforms={['Slack', 'WhatsApp']}
              delay={0.2}
            />
            <AgentCard
              name="DeFi Sentinel"
              description="Monitors DeFi protocols for yield opportunities, liquidation risks, and arbitrage."
              status="active"
              platforms={['Telegram', 'Signal']}
              delay={0.3}
            />
            <AgentCard
              name="Community Mod"
              description="AI-powered community moderator with anti-spam, auto-responses, and sentiment analysis."
              status="active"
              platforms={['Discord', 'Telegram']}
              delay={0.4}
            />
            <AgentCard
              name="News Curator"
              description="Curates personalized crypto and tech news briefings delivered every morning."
              status="paused"
              platforms={['WhatsApp', 'Slack', 'iMessage']}
              delay={0.5}
            />
          </div>
        </div>
      </Section>

      {/* ── PRICING PREVIEW ────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="pricing">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-4">Pricing</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Start free, scale up
            </h2>
            <p className="mt-4 text-[#A5A1C2] max-w-lg mx-auto">
              No rigid tiers. Free baseline with Groq. Unlock features with $HATCH. Bring your own keys -- always free.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free */}
            <div className="bg-[#111019] border border-white/[0.06] rounded-2xl p-8">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-2">Free</p>
              <p className="text-4xl font-bold text-white mb-1">$0</p>
              <p className="text-sm text-[#A5A1C2] mb-8">Forever. No credit card.</p>
              <ul className="space-y-3">
                {[
                  '1 active agent',
                  'Groq LLM (free tier)',
                  'BYOK any provider',
                  '1 platform (Telegram or Discord)',
                  '24h log retention',
                  'Shared container',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#A5A1C2]">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/create"
                className="mt-8 block text-center border border-white/20 text-white font-medium px-6 py-3 rounded-full hover:bg-white/5 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
              >
                Get Started
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-[#111019] border border-orange-500/30 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-orange-400 mb-2">Premium</p>
              <p className="text-4xl font-bold text-white mb-1">Pay as you go</p>
              <p className="text-sm text-[#A5A1C2] mb-8">Unlock with $HATCH tokens.</p>
              <ul className="space-y-3">
                {[
                  'Unlimited agents',
                  'All 20+ platforms',
                  'Hosted LLM credits',
                  '13,700+ skills',
                  'Dedicated containers',
                  'Persistent memory & cron',
                  'Voice, webhooks, multi-agent',
                  'Full log retention',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#A5A1C2]">
                    <Check className="w-4 h-4 text-orange-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/create"
                className="mt-8 block text-center bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-white/90 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
              >
                Create Agent
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ── FAQ ────────────────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">FAQ</h2>
            <p className="text-[#A5A1C2]">Common questions about Hatcher</p>
          </div>
          <div className="space-y-3">
            {[
              { q: 'Is it really free to start?', a: 'Yes. You get 1 agent, Groq free LLM, 50 messages/day, and BYOK — all at zero cost. No $HATCH required.' },
              { q: 'What is BYOK?', a: 'Bring Your Own Key — use your own API keys from OpenAI, Anthropic, Google, Groq, xAI, OpenRouter, or Ollama. Always free, no payment needed.' },
              { q: 'How do I pay for features?', a: 'All prices are in USD, paid with $HATCH tokens on Solana. Approve a wallet transaction and the feature activates instantly.' },
              { q: 'What happens when a subscription expires?', a: 'Your agent keeps running, but the feature is disabled. Renew anytime to re-enable it. 24-hour grace period included.' },
              { q: 'Can I run multiple agents?', a: 'Free tier includes 1 agent. Unlock up to 5, 20, or unlimited agents with account-level subscriptions.' },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-32 md:py-40 px-4 sm:px-6 border-t border-white/[0.06]">
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(249,115,22,0.1), transparent)',
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Ready to hatch?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-lg text-[#A5A1C2] mb-10 max-w-md mx-auto"
          >
            Create your first agent in 60 seconds. Free to start, no credit card required.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 sm:px-10 py-3.5 sm:py-4 rounded-full text-base sm:text-lg hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0B1A]"
            >
              Create Agent
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Global footer is rendered by LayoutShell */}
    </div>
  );
}
