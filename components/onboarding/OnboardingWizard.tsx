'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Zap,
  Bot,
  Cpu,
  Sparkles,
  Key,
  Check,
  Rocket,
  Globe,
  MessageSquare,
  Code,
  Briefcase,
  Search,
} from 'lucide-react';

const TOTAL_STEPS = 5;

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -80 : 80, transition: { duration: 0.2 } }),
};

interface Props {
  onClose: () => void;
}

export function OnboardingWizard({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const next = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step]);

  const prev = useCallback(() => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  const complete = useCallback((path: string) => {
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
    router.push(path);
  }, [onClose, router]);

  const dismiss = useCallback(() => {
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <motion.div
        className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 16, 40, 0.97), rgba(10, 8, 24, 0.98))',
          boxShadow: '0 0 80px rgba(139, 92, 246, 0.15), 0 0 40px rgba(6, 182, 212, 0.08)',
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5">
          <button
            onClick={dismiss}
            className="text-xs text-[#71717a] hover:text-white transition-colors"
          >
            Skip
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-[#71717a]" />
          </button>
        </div>

        {/* Steps content */}
        <div className="px-6 pb-6 min-h-[380px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex-1 flex flex-col"
            >
              {step === 1 && <StepWelcome />}
              {step === 2 && <StepFramework />}
              {step === 3 && <StepTemplates />}
              {step === 4 && <StepLLM />}
              {step === 5 && <StepReady onComplete={complete} />}
            </motion.div>
          </AnimatePresence>

          {/* Bottom: progress dots + nav buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i + 1 === step
                      ? 'w-6 bg-purple-500'
                      : i + 1 < step
                        ? 'w-1.5 bg-purple-500/50'
                        : 'w-1.5 bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2">
              {step > 1 && step < 5 && (
                <button
                  onClick={prev}
                  className="h-9 px-3 flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-all"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
              )}
              {step < 5 && (
                <button
                  onClick={next}
                  className="h-9 px-4 flex items-center gap-1 text-xs font-medium text-white rounded-lg bg-purple-600 hover:bg-purple-500 transition-all"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Step 1: Welcome ──────────────────────────────────── */
function StepWelcome() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
      <div className="text-5xl mb-5">&#129370;</div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Welcome to Hatcher!
      </h2>
      <p className="text-sm text-[#a1a1aa] max-w-sm leading-relaxed">
        Let&apos;s get your first AI agent up and running in 60 seconds.
        We&apos;ll walk you through the basics.
      </p>
    </div>
  );
}

/* ─── Step 2: Framework ────────────────────────────────── */
function StepFramework() {
  return (
    <div className="flex-1 flex flex-col py-4">
      <h2 className="text-xl font-bold text-white mb-2 text-center">Pick Your Framework</h2>
      <p className="text-xs text-[#a1a1aa] mb-5 text-center">
        Choose the engine that powers your agent.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* OpenClaw */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 hover:bg-amber-500/[0.08] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center mb-3">
            <Cpu size={20} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">OpenClaw</h3>
          <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
            Full-featured with 13K+ skills. Rich integrations, web search, code execution, and more.
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">13K+ skills</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">Feature-rich</span>
          </div>
        </div>

        {/* Hermes */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4 hover:bg-purple-500/[0.08] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center mb-3">
            <Zap size={20} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Hermes</h3>
          <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
            Fast and lightweight. Optimized for speed. Perfect for focused tasks and quick responses.
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">Lightning fast</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">Lightweight</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[#71717a] mt-3 text-center">
        You can change your framework anytime when creating an agent.
      </p>
    </div>
  );
}

/* ─── Step 3: Templates ────────────────────────────────── */
const POPULAR_TEMPLATES = [
  { icon: Briefcase, label: 'Marketing Strategist', desc: 'Content & growth automation' },
  { icon: Code, label: 'Code Assistant', desc: 'Write, review & debug code' },
  { icon: MessageSquare, label: 'Customer Support', desc: 'Handle tickets & FAQs' },
  { icon: Search, label: 'Research Analyst', desc: 'Deep research & summaries' },
  { icon: Globe, label: 'Social Media Bot', desc: 'Manage Twitter, Discord & more' },
];

function StepTemplates() {
  return (
    <div className="flex-1 flex flex-col py-4">
      <h2 className="text-xl font-bold text-white mb-2 text-center">Choose a Template</h2>
      <p className="text-xs text-[#a1a1aa] mb-4 text-center">
        Start with a pre-built template or create from scratch.
      </p>

      <div className="space-y-2">
        {POPULAR_TEMPLATES.map((t) => (
          <div
            key={t.label}
            className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-default"
          >
            <div className="w-9 h-9 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center flex-shrink-0">
              <t.icon size={16} className="text-[#06b6d4]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t.label}</p>
              <p className="text-[11px] text-[#71717a]">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#71717a] mt-3 text-center">
        Or start from scratch &mdash; full creative freedom.
      </p>
    </div>
  );
}

/* ─── Step 4: LLM ─────────────────────────────────────── */
function StepLLM() {
  return (
    <div className="flex-1 flex flex-col py-4">
      <h2 className="text-xl font-bold text-white mb-2 text-center">Connect Your LLM</h2>
      <p className="text-xs text-[#a1a1aa] mb-5 text-center">
        Every agent needs a brain. Pick how you want to power yours.
      </p>

      <div className="space-y-3">
        {/* Free Groq */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={20} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Free: Groq (included)</h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium">
                Included
              </span>
            </div>
            <p className="text-[11px] text-[#a1a1aa] mt-1 leading-relaxed">
              We provide a Groq API key at no cost. 20 messages/day on Free tier,
              100 on Basic, 300 on Pro.
            </p>
          </div>
        </div>

        {/* BYOK */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.04]">
          <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Key size={20} className="text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">BYOK: Bring Your Own Key</h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-medium">
                Unlimited
              </span>
            </div>
            <p className="text-[11px] text-[#a1a1aa] mt-1 leading-relaxed">
              Use your own OpenAI, Anthropic, Groq, or other API key.
              Always free, unlimited messages.
            </p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[#71717a] mt-4 text-center">
        Both options are always free to use. You can switch anytime.
      </p>
    </div>
  );
}

/* ─── Step 5: Ready ────────────────────────────────────── */
function StepReady({ onComplete }: { onComplete: (path: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center mb-5 ring-1 ring-purple-500/30">
        <Rocket size={32} className="text-purple-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        You&apos;re Ready!
      </h2>
      <p className="text-sm text-[#a1a1aa] max-w-xs mb-8 leading-relaxed">
        Your first AI agent is just one click away.
        Let&apos;s hatch something amazing.
      </p>

      <button
        onClick={() => onComplete('/create')}
        className="h-11 px-8 flex items-center gap-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/20"
      >
        <Sparkles size={16} />
        Create My First Agent
      </button>

      <button
        onClick={() => onComplete('/explore')}
        className="mt-3 text-xs text-[#a1a1aa] hover:text-white transition-colors underline underline-offset-2"
      >
        Explore agents first
      </button>
    </div>
  );
}
