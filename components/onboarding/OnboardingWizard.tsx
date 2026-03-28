'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  TrendingUp,
  Headphones,
  Sparkles,
  Rocket,
  Zap,
  Send,
  Wrench,
} from 'lucide-react';

const TOTAL_STEPS = 3;

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  // Focus trap
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusable[0]?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const all = el!.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }
    document.addEventListener('keydown', trap);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('keydown', trap);
      document.removeEventListener('keydown', onEsc);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    localStorage.setItem('onboarding_dismissed', 'true');
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
    router.push(path);
  }, [onClose, router]);

  const dismiss = useCallback(() => {
    localStorage.setItem('onboarding_dismissed', 'true');
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] overflow-hidden"
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
              {step === 1 && <StepWelcome onNext={next} />}
              {step === 2 && <StepChoose onComplete={complete} />}
              {step === 3 && <StepTips onComplete={complete} />}
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
              {step > 1 && (
                <button
                  onClick={prev}
                  className="h-9 px-3 flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-all"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
              )}
              {step < TOTAL_STEPS && step !== 1 && (
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

/* ---- Step 1: Welcome ----------------------------------------- */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
      <motion.div
        className="relative mb-5"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
            transform: 'scale(2)',
          }}
        />
        <div className="relative w-20 h-20 rounded-2xl bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/30">
          <Rocket size={40} className="text-purple-400" />
        </div>
      </motion.div>

      <h2 id="onboarding-title" className="text-2xl font-bold text-white mb-3">
        Welcome to Hatcher!
      </h2>
      <p className="text-sm text-[#a1a1aa] max-w-sm leading-relaxed mb-8">
        Let&apos;s deploy your first AI agent in under 2 minutes.
      </p>

      <button
        onClick={onNext}
        className="h-11 px-8 flex items-center gap-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/20"
      >
        <Sparkles size={16} />
        Get Started
      </button>
    </div>
  );
}

/* ---- Step 2: Choose What You Want ----------------------------- */
const QUICK_PICKS = [
  {
    icon: MessageSquare,
    label: 'Chat Bot',
    desc: 'Conversational AI for any platform',
    color: 'cyan',
    href: '/create?template=chatbot',
    borderClass: 'border-cyan-500/20 hover:border-cyan-500/40',
    bgClass: 'bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08]',
    iconBgClass: 'bg-cyan-500/15',
    iconClass: 'text-cyan-400',
  },
  {
    icon: TrendingUp,
    label: 'Trading Bot',
    desc: 'Market analysis and trading signals',
    color: 'emerald',
    href: '/create?template=trading-analyst',
    borderClass: 'border-emerald-500/20 hover:border-emerald-500/40',
    bgClass: 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]',
    iconBgClass: 'bg-emerald-500/15',
    iconClass: 'text-emerald-400',
  },
  {
    icon: Headphones,
    label: 'Support Agent',
    desc: 'Handle tickets and answer FAQs',
    color: 'amber',
    href: '/create?template=customer-support',
    borderClass: 'border-amber-500/20 hover:border-amber-500/40',
    bgClass: 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]',
    iconBgClass: 'bg-amber-500/15',
    iconClass: 'text-amber-400',
  },
  {
    icon: Sparkles,
    label: 'Custom',
    desc: 'Build from scratch, full freedom',
    color: 'purple',
    href: '/create',
    borderClass: 'border-purple-500/20 hover:border-purple-500/40',
    bgClass: 'bg-purple-500/[0.04] hover:bg-purple-500/[0.08]',
    iconBgClass: 'bg-purple-500/15',
    iconClass: 'text-purple-400',
  },
];

function StepChoose({ onComplete }: { onComplete: (path: string) => void }) {
  return (
    <div className="flex-1 flex flex-col py-4">
      <h2 id="onboarding-title" className="text-xl font-bold text-white mb-2 text-center">
        What do you want your agent to do?
      </h2>
      <p className="text-xs text-[#a1a1aa] mb-5 text-center">
        Pick a starting point. You can always customize everything later.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick.label}
            onClick={() => onComplete(pick.href)}
            className={`rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${pick.borderClass} ${pick.bgClass}`}
          >
            <div className={`w-10 h-10 rounded-lg ${pick.iconBgClass} flex items-center justify-center mb-3`}>
              <pick.icon size={20} className={pick.iconClass} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{pick.label}</h3>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">{pick.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- Step 3: Quick Tips --------------------------------------- */
const TIPS = [
  {
    icon: Zap,
    text: 'Start with the free Groq model \u2014 upgrade to BYOK anytime',
    iconClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
  },
  {
    icon: Send,
    text: 'Add Telegram first \u2014 it\'s the easiest platform to test with',
    iconClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10',
  },
  {
    icon: Wrench,
    text: 'Check the Skills tab to add web search, calculator, and more',
    iconClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
  },
];

function StepTips({ onComplete }: { onComplete: (path: string) => void }) {
  return (
    <div className="flex-1 flex flex-col py-4">
      <h2 id="onboarding-title" className="text-xl font-bold text-white mb-2 text-center">
        Pro tips for getting started
      </h2>
      <p className="text-xs text-[#a1a1aa] mb-5 text-center">
        A few things to know before you dive in.
      </p>

      <div className="space-y-3 mb-8">
        {TIPS.map((tip, i) => (
          <motion.div
            key={i}
            className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <div className={`w-9 h-9 rounded-lg ${tip.bgClass} flex items-center justify-center flex-shrink-0`}>
              <tip.icon size={16} className={tip.iconClass} />
            </div>
            <p className="text-sm text-[#d4d4d8] leading-relaxed pt-1.5">{tip.text}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center mt-auto">
        <button
          onClick={() => onComplete('/create')}
          className="h-11 px-8 flex items-center gap-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/20"
        >
          <Rocket size={16} />
          Create My First Agent
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
