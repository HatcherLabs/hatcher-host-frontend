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
        className="w-full h-full animate-[float-gentle_4s_ease-in-out_infinite]"
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
      <section id="hero" className="relative min-h-screen flex items-center">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Radial glow — shifted right to illuminate robot */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 50% 50% at 65% 35%, rgba(249,115,22,0.12), transparent)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 40% 40% at 30% 50%, rgba(249,115,22,0.06), transparent)',
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            {/* Left — Text content */}
            <div className="flex-1 text-center lg:text-left pt-20 lg:pt-0">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold tracking-tight leading-[0.9]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  <span className="text-white">Hatch</span>
                  <br />
                  <span className="text-white">Your </span>
                  <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                    AI Agent
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-[#A5A1C2] max-w-lg leading-relaxed mx-auto lg:mx-0"
              >
                Deploy autonomous AI agents across 20+ platforms.
                Choose your framework, pick a template, and go live in 60 seconds.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="mt-10 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4"
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
                className="mt-12"
              >
                <div className="inline-flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-3 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs sm:text-sm text-[#A5A1C2]">
                  {platformStats.totalAgents > 0 ? (
                    <>
                      <span><AnimatedCounter target={platformStats.totalAgents} /> Agents Deployed</span>
                      <span className="w-px h-4 bg-white/10" aria-hidden="true" />
                      <span><AnimatedCounter target={platformStats.activeAgents} /> Active Now</span>
                    </>
                  ) : (
                    <>
                      <span>Deploy in Seconds</span>
                      <span className="w-px h-4 bg-white/10" aria-hidden="true" />
                      <span>All Integrations Included</span>
                    </>
                  )}
                  <span className="w-px h-4 bg-white/10" aria-hidden="true" />
                  <span>Free to Start</span>
                </div>
              </motion.div>
            </div>

            {/* Right — Robot mascot */}
            <motion.div
              className="flex-shrink-0 relative hidden md:flex items-center justify-center"
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Glow behind robot */}
              <div
                className="absolute inset-0 -m-16 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at center, rgba(249,115,22,0.12) 0%, transparent 65%)',
                }}
              />
              <div className="relative w-[280px] h-[340px] lg:w-[400px] lg:h-[480px] xl:w-[460px] xl:h-[560px]">
                <HeroRobot />
              </div>
            </motion.div>
          </div>
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
              <MarqueeItem name="Hermes" />
              <MarqueeItem name="Multi-Framework" />
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
              description="Telegram, Discord, Twitter, WhatsApp, Signal, Slack, Farcaster, Twitch, and more. Deploy once, reach everywhere."
              delay={0}
            />
            <BentoCard
              className="lg:col-span-2 lg:row-span-2"
              icon={Zap}
              value="2"
              title="Frameworks"
              description="Choose between OpenClaw (13,700+ skills, plugin ecosystem) and Hermes (lightweight, fast, API-focused). Pick the right tool for the job."
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
              Four steps to launch
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
            {[
              {
                num: '01',
                title: 'Pick a Framework',
                desc: 'Choose OpenClaw for a rich plugin ecosystem, or Hermes for a lightweight, API-first approach.',
              },
              {
                num: '02',
                title: 'Choose a Template',
                desc: 'Start from a pre-built template or go blank. Each one is tuned for common use cases.',
              },
              {
                num: '03',
                title: 'Configure',
                desc: 'Set your agent\'s name, personality, integrations, and LLM. Bring your own API key or use ours.',
              },
              {
                num: '04',
                title: 'Launch',
                desc: 'Hit deploy and your agent goes live across 20+ platforms in under 60 seconds. We handle everything.',
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

      {/* ── PRICING PREVIEW ────────────────────────────── */}
      <Section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/[0.06]" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-4">Pricing</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Start free, scale up
            </h2>
            <p className="mt-4 text-[#A5A1C2] max-w-lg mx-auto">
              All integrations included. BYOK always free. Pay with SOL or platform tokens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="bg-[#111019] border border-white/[0.06] rounded-2xl p-7">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-2">Free</p>
              <p className="text-3xl font-bold text-white mb-1">$0</p>
              <p className="text-sm text-[#A5A1C2] mb-6">0.5 CPU, 1GB RAM. No credit card.</p>
              <ul className="space-y-2.5">
                {[
                  '1 agent',
                  '20 messages/day',
                  'All integrations',
                  'BYOK any LLM',
                  '150MB workspace',
                  'Auto-sleep (15 min)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#A5A1C2]">
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
            <div className="bg-[#111019] border border-white/[0.06] rounded-2xl p-7">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#71717a] mb-2">Basic</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-white">$9.99</p>
                <span className="text-sm text-[#71717a]">/mo</span>
              </div>
              <p className="text-sm text-[#A5A1C2] mb-6 mt-1">100 messages/day, 1 CPU, 1.5GB RAM.</p>
              <ul className="space-y-2.5">
                {[
                  '1 agent included',
                  '100 messages/day (BYOK = unlimited)',
                  'All integrations',
                  'BYOK any LLM',
                  '300MB workspace',
                  'Auto-sleep after 6h idle',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#A5A1C2]">
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
            <div className="bg-[#111019] border border-orange-500/30 rounded-2xl p-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-orange-400">Pro</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">POPULAR</span>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-white">$19.99</p>
                <span className="text-sm text-[#71717a]">/mo</span>
              </div>
              <p className="text-sm text-[#A5A1C2] mb-6 mt-1">Full power for serious builders.</p>
              <ul className="space-y-2.5">
                {[
                  '5 agents included',
                  '300 messages/day (BYOK = unlimited)',
                  'Dedicated resources (2 CPU, 2GB)',
                  'File manager',
                  'Full log viewer',
                  '600MB workspace/agent',
                  'Priority support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#A5A1C2]">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
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
            Need more agents? Add +3, +5, or +10 with stackable add-ons.{' '}
            <Link href="/pricing" className="text-[#f97316] hover:underline">See full pricing</Link>
          </p>
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
              { q: 'Is it really free to start?', a: 'Yes. You get 1 agent, a free LLM (Groq), 20 messages/day, and BYOK — all at zero cost. No credit card or tokens required.' },
              { q: 'What frameworks are supported?', a: 'Hatcher supports OpenClaw (feature-rich, 13,700+ skills, plugin ecosystem) and Hermes (lightweight, fast, API-focused). You choose when creating an agent.' },
              { q: 'What is BYOK?', a: 'Bring Your Own Key — use your own API keys from OpenAI, Anthropic, Google, Groq, xAI, OpenRouter, or Ollama. Always free, no markup.' },
              { q: 'How do I pay for upgrades?', a: 'All prices are in USD, paid with SOL or platform tokens on Solana. Approve a wallet transaction and the upgrade activates instantly.' },
              { q: 'Can I run multiple agents?', a: 'Free tier includes 1 agent. Basic includes 1. Pro includes 5. Need more? Stack add-ons for +3, +5, or +10 agents.' },
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
