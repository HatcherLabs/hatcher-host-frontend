'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { DeploymentWalkthrough } from '@/components/landing/DeploymentWalkthrough';

import {
  ArrowRight,
  Check,
  ChevronDown,
  Bot,
  Sparkles,
  Cpu,
  Brain,
  Globe,
  Key,
  Moon,
  FolderOpen,
  Shield,
  Zap,
  MessageSquare,
  Server,
  BarChart3,
} from 'lucide-react';
import { DOCS_URL } from '@/lib/config';

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

// ─── Live agent demo preview ───────────────────────────────────
function AgentPreview() {
  const messages = [
    { role: 'user', text: 'What\'s the price of SOL right now?' },
    { role: 'agent', text: 'SOL is currently trading at $142.37, up 3.2% in the last 24h. Want me to set a price alert?' },
    { role: 'user', text: 'Yes, alert me if it drops below $135' },
    { role: 'agent', text: 'Done! I\'ll send you a notification on Telegram if SOL drops below $135.' },
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

// ─── Animated counter ─────────────────────────────────────────
function AnimatedStat({ value, suffix = '', label }: { value: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1800;
          const steps = 60;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  const formatted = count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : count.toString();

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
        {formatted}{suffix}
      </p>
      <p className="text-sm text-[#71717a] mt-1">{label}</p>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, accentColor = 'purple' }: {
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor?: string;
}) {
  const colorMap: Record<string, { icon: string; iconBg: string; border: string }> = {
    purple: { icon: 'text-purple-400', iconBg: 'bg-purple-500/10', border: 'hover:border-purple-500/20' },
    cyan: { icon: 'text-cyan-400', iconBg: 'bg-cyan-500/10', border: 'hover:border-cyan-500/20' },
    emerald: { icon: 'text-emerald-400', iconBg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/20' },
    amber: { icon: 'text-amber-400', iconBg: 'bg-amber-500/10', border: 'hover:border-amber-500/20' },
    rose: { icon: 'text-rose-400', iconBg: 'bg-rose-500/10', border: 'hover:border-rose-500/20' },
  };
  const c = colorMap[accentColor] || colorMap.purple;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 ${c.border} transition-colors duration-200`}
    >
      <div className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center mb-3`}>
        <Icon className={`w-4.5 h-4.5 ${c.icon}`} size={18} />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-[#a1a1aa] leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ██  LANDING PAGE
// ═══════════════════════════════════════════════════════════════
export default function LandingPage() {
  const { isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Prevent browser from restoring previous scroll position
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // While auth is resolving, render nothing to avoid flash
  if (authLoading) {
    return <div className="min-h-screen bg-[var(--bg-base)]" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-[var(--bg-base)] text-white"
    >
      {/* ── 1. HERO ─────────────────────────────────────── */}
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
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="mb-5"
              >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  4 AI frameworks, 20+ platforms
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Deploy AI agents
                <br />
                <span className="text-cyan-400">in 60 seconds</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                className="text-lg text-[#a1a1aa] leading-relaxed mb-8 max-w-lg"
              >
                Pick a framework, configure your agent, connect to Telegram, Discord, Twitter or any platform.
                No code, no servers, no credit card.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                className="flex flex-wrap items-center gap-4"
              >
                <Link
                  href="/create"
                  className="clay-btn-primary clay-btn-lg text-base"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={DOCS_URL}
                  className="text-sm text-[#a1a1aa] hover:text-white transition-colors flex items-center gap-1.5"
                >
                  Read the docs
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
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

      {/* ── 2. HOW IT WORKS ─────────────────────────────── */}
      <Section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10 sm:mb-12"
          >
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              3 steps. 60 seconds.
            </h2>
            <p className="mt-4 text-[#a1a1aa] max-w-lg mx-auto">
              No coding, no setup guides, no configuration files. Just pick, customize, and launch.
            </p>
          </motion.div>

          <DeploymentWalkthrough />

          <div className="text-center mt-10">
            <Link
              href="/create"
              className="clay-btn-primary text-sm"
            >
              Try it now — it&apos;s free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ── 3. SOCIAL PROOF / STATS ──────────────────────── */}
      <Section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
            <AnimatedStat value={1200} suffix="+" label="Agents deployed" />
            <AnimatedStat value={580000} suffix="+" label="Messages processed" />
            <AnimatedStat value={4} label="AI frameworks" />
            <AnimatedStat value={23} label="Ready templates" />
          </div>
        </div>
      </Section>

      {/* ── 4. FRAMEWORK SHOWCASE ───────────────────────── */}
      <Section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]" id="frameworks">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10 sm:mb-12"
          >
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Choose your engine
            </h2>
            <p className="mt-4 text-[#a1a1aa] max-w-lg mx-auto">
              Each framework has a different personality. Pick the one that fits your use case — or try them all.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {[
              {
                icon: Cpu,
                name: 'OpenClaw',
                tagline: 'The all-rounder — powerful, flexible, and battle-tested.',
                href: `${DOCS_URL}/frameworks/openclaw`,
                color: 'text-amber-400',
                iconBg: 'bg-amber-500/15 border-amber-500/20',
                hoverBorder: 'hover:border-amber-500/30',
                badge: 'ADVANCED',
                badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              },
              {
                icon: Brain,
                name: 'Hermes',
                tagline: 'Speed-first design for sub-second, low-latency responses.',
                href: `${DOCS_URL}/frameworks/hermes`,
                color: 'text-purple-400',
                iconBg: 'bg-purple-500/15 border-purple-500/20',
                hoverBorder: 'hover:border-purple-500/30',
                badge: 'INTERMEDIATE',
                badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              },
              {
                icon: Bot,
                name: 'ElizaOS',
                tagline: 'Multi-agent coordination — build teams of specialized bots.',
                href: `${DOCS_URL}/frameworks/elizaos`,
                color: 'text-cyan-400',
                iconBg: 'bg-cyan-500/15 border-cyan-500/20',
                hoverBorder: 'hover:border-cyan-500/30',
                badge: 'INTERMEDIATE',
                badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
              },
              {
                icon: Sparkles,
                name: 'Milady',
                tagline: 'Crypto-native with on-chain awareness and wallet integrations.',
                href: `${DOCS_URL}/frameworks/milady`,
                color: 'text-rose-400',
                iconBg: 'bg-rose-500/15 border-rose-500/20',
                hoverBorder: 'hover:border-rose-500/30',
                badge: 'BEGINNER',
                badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              },
            ].map((fw) => (
              <motion.div
                key={fw.name}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 ${fw.hoverBorder} transition-colors duration-200`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${fw.iconBg} border flex items-center justify-center`}>
                    <fw.icon size={20} className={fw.color} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{fw.name}</h3>
                    <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${fw.badgeColor}`}>
                      {fw.badge}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4">{fw.tagline}</p>
                <Link href={fw.href} className={`text-sm ${fw.color} hover:brightness-125 transition-all`}>
                  Learn more &rarr;
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-xs text-[#71717a]">Not sure which to pick? Start with OpenClaw — you can switch anytime.</p>
          </div>
        </div>
      </Section>

      {/* ── 5. FEATURES GRID ─────────────────────────────── */}
      <Section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]" id="features">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10 sm:mb-14"
          >
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Everything you need to ship
            </h2>
            <p className="mt-4 text-[#a1a1aa] max-w-lg mx-auto">
              From free AI to enterprise features — all included, no hidden costs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Globe}
              title="20+ Platforms"
              description="Telegram, Discord, Twitter, WhatsApp, Slack, and more. Connect your agent everywhere your users are."
              accentColor="cyan"
            />
            <FeatureCard
              icon={Key}
              title="Bring Your Own Key"
              description="Use your OpenAI, Anthropic, Google, or Groq key for unlimited messages. Or use our free AI — no key needed."
              accentColor="amber"
            />
            <FeatureCard
              icon={Zap}
              title="Free AI Included"
              description="Every agent gets free AI via Groq (Llama 4 Scout). Start building immediately, upgrade when you want."
              accentColor="emerald"
            />
            <FeatureCard
              icon={Moon}
              title="Smart Auto-Sleep"
              description="Agents sleep when idle and wake instantly on new messages. You only use resources when you need them."
              accentColor="purple"
            />
            <FeatureCard
              icon={FolderOpen}
              title="File Manager"
              description="Browse, edit, and download your agent's config and workspace files directly from the dashboard."
              accentColor="rose"
            />
            <FeatureCard
              icon={Shield}
              title="Isolated Containers"
              description="Each agent runs in its own Docker container with dedicated resources. Your data never touches other agents."
              accentColor="cyan"
            />
            <FeatureCard
              icon={MessageSquare}
              title="Real-Time Chat"
              description="Test your agent live from the dashboard. WebSocket streaming with typing indicators and full history."
              accentColor="purple"
            />
            <FeatureCard
              icon={Server}
              title="24/7 Cloud Hosting"
              description="No servers to manage. Your agent runs on Hatcher Cloud with automatic restarts and health monitoring."
              accentColor="emerald"
            />
            <FeatureCard
              icon={BarChart3}
              title="Usage Analytics"
              description="Track messages, uptime, and resource usage per agent. Know exactly how your agents are performing."
              accentColor="amber"
            />
          </div>
        </div>
      </Section>

      {/* ── 6. PRICING PREVIEW ─────────────────────────── */}
      <Section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]" id="pricing">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Start free, grow when ready
            </h2>
            <p className="mt-4 text-[#a1a1aa] max-w-lg mx-auto">
              All platforms included on every plan. Bring your own AI key = unlimited messages.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="bg-[#0e0e14] border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] transition-colors duration-200">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400 mb-2">Free</p>
              <p className="text-3xl font-bold text-white mb-1">$0</p>
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
            </motion.div>

            {/* Basic */}
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="bg-[#0e0e14] border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] transition-colors duration-200">
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
            </motion.div>

            {/* Pro */}
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="bg-[#0e0e14] border border-cyan-500/30 rounded-2xl p-7 relative overflow-hidden transition-colors duration-200">
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
            </motion.div>
          </div>

          <p className="text-center text-xs text-[#71717a] mt-6">
            Need more agents? Add extras with stackable packs.{' '}
            <Link href="/pricing" className="text-[#06b6d4] hover:underline">See full pricing</Link>
          </p>
        </div>
      </Section>

      {/* ── 7. FAQ ──────────────────────────────────────── */}
      <Section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]" id="faq">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Common questions</h2>
            <p className="text-[#a1a1aa]">Everything you need to know</p>
          </motion.div>
          <div className="space-y-3">
            {[
              { q: 'Is it really free?', a: 'Yes. The free plan gives you 1 agent, 20 messages per day, and access to all platforms. We even include a free AI provider (Groq) so you don\'t need to pay anything to get started. No credit card required.' },
              { q: 'Do I need to know how to code?', a: 'Not at all! Creating an agent is like filling out a form — choose a name, describe what you want it to do, pick which platforms to connect, and hit launch. The whole process takes about 60 seconds.' },
              { q: 'What is "Bring Your Own Key"?', a: 'If you already have an account with OpenAI (ChatGPT), Google, Anthropic, or another AI provider, you can connect it to your agent. This gives you unlimited messages at no extra cost from us — you only pay your AI provider directly.' },
              { q: 'Where does my agent run?', a: 'Your agent runs on our cloud servers 24/7. You don\'t need to keep your computer on or install anything. Once you launch it, it just works.' },
              { q: 'How do I pay for upgrades?', a: 'Paid plans are in USD. You can pay with SOL (Solana) or platform tokens — just approve a wallet transaction and the upgrade activates instantly.' },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ────────────────────────────────── */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-purple-500/8 blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Your AI agent is 60 seconds away
          </h2>
          <p className="text-lg text-[#a1a1aa] mb-10 max-w-lg mx-auto">
            Pick a framework, describe what you want, and launch. Free forever on the free plan.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
              <Link
                href="/create"
                className="clay-btn-primary clay-btn-lg text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
              >
                Create Your Agent
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
            </motion.div>
            <Link
              href="/pricing"
              className="text-sm text-[#a1a1aa] hover:text-white transition-colors"
            >
              Compare plans &rarr;
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#52525b]">
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Free AI included</span>
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Deploy in 60s</span>
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> All platforms</span>
          </div>
        </motion.div>
      </section>

      {/* Global footer is rendered by LayoutShell */}
    </motion.div>
  );
}
