'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, ArrowLeft, Rocket, Bot, Cpu, Sparkles, Check, MessageSquare, Plug, BarChart3, Key } from 'lucide-react';

const FRAMEWORKS = [
  {
    id: 'openclaw',
    name: 'OpenClaw',
    description: 'Full-featured agent with tools, memory, and web search. Best for most use cases.',
    color: 'from-purple-500 to-violet-600',
    badge: 'Recommended',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    description: 'Ultra-fast responses with function calling. Great for real-time chat bots.',
    color: 'from-cyan-500 to-blue-600',
    badge: 'Fast',
  },
  {
    id: 'elizaos',
    name: 'ElizaOS',
    description: 'Multi-agent system with advanced personality. Best for complex interactions.',
    color: 'from-emerald-500 to-teal-600',
    badge: 'Advanced',
  },
  {
    id: 'milady',
    name: 'Milady',
    description: 'Personality-driven agent with unique character traits. Best for social media.',
    color: 'from-pink-500 to-rose-600',
    badge: 'Creative',
  },
];

const DASHBOARD_FEATURES = [
  {
    icon: MessageSquare,
    title: 'Chat with your agent',
    description: 'Test your agent\'s responses in real-time',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: Plug,
    title: 'Configure integrations',
    description: 'Connect Telegram, Discord, Twitter & more',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: BarChart3,
    title: 'Monitor performance',
    description: 'View analytics, usage stats, and logs',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Key,
    title: 'Bring Your Own Key',
    description: 'Use your own LLM API key for unlimited messages',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
];

const STEPS = ['Welcome', 'Framework', 'Features', 'Ready'];

export function OnboardingWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedFramework, setSelectedFramework] = useState('openclaw');

  const dismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    onClose();
  };

  const complete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
    router.push(`/create?framework=${selectedFramework}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Close button */}
        <button onClick={dismiss} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-white transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6 pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-purple-500' : i < step ? 'w-4 bg-purple-500/40' : 'w-4 bg-[var(--bg-hover)]'
              }`}
            />
          ))}
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
                    <Rocket className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome to Hatcher!</h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Deploy your first AI agent in under 60 seconds. Pick a framework, name your agent, and you&apos;re live.
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { icon: Bot, text: '4 AI frameworks to choose from' },
                    { icon: Cpu, text: 'Deploy to Telegram, Discord, Twitter & more' },
                    { icon: Sparkles, text: 'Free tier — no credit card required' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-[#d4d4d8]">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4 text-purple-400" />
                      </div>
                      {item.text}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium py-3 rounded-xl text-sm hover:from-purple-500 hover:to-purple-400 transition-all"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 1: Pick Framework */}
            {step === 1 && (
              <motion.div key="framework" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <h2 className="text-xl font-bold text-white mb-1">Choose your engine</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Each framework has different strengths. You can always change later.</p>

                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  {FRAMEWORKS.map((fw) => (
                    <button
                      key={fw.id}
                      onClick={() => setSelectedFramework(fw.id)}
                      className={`relative text-left p-3.5 rounded-xl border transition-all duration-200 ${
                        selectedFramework === fw.id
                          ? 'border-purple-500/50 bg-purple-500/[0.08] shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      {selectedFramework === fw.id && (
                        <div className="absolute top-2.5 right-2.5">
                          <Check className="w-4 h-4 text-purple-400" />
                        </div>
                      )}
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${fw.color} flex items-center justify-center mb-2`}>
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-white">{fw.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{fw.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setStep(0)}
                    className="flex items-center justify-center gap-1.5 border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium py-3 px-5 rounded-xl text-sm hover:bg-[var(--bg-card)] transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium py-3 rounded-xl text-sm hover:from-purple-500 hover:to-purple-400 transition-all"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Dashboard Features */}
            {step === 2 && (
              <motion.div key="features" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <h2 className="text-xl font-bold text-white mb-1">What you can do</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Your dashboard gives you full control over every agent.</p>

                <div className="space-y-2.5 mb-6">
                  {DASHBOARD_FEATURES.map((feat, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl border ${feat.bg} transition-all`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center shrink-0 mt-0.5">
                        <feat.icon className={`w-4.5 h-4.5 ${feat.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{feat.title}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">{feat.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1.5 border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium py-3 px-5 rounded-xl text-sm hover:bg-[var(--bg-card)] transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium py-3 rounded-xl text-sm hover:from-purple-500 hover:to-purple-400 transition-all"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Ready to create */}
            {step === 3 && (
              <motion.div key="ready" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    We&apos;ll take you to the agent creator where you can name your agent, configure integrations, and deploy in one click.
                  </p>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${FRAMEWORKS.find(f => f.id === selectedFramework)?.color} flex items-center justify-center`}>
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{FRAMEWORKS.find(f => f.id === selectedFramework)?.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">Free tier — 10 messages/day</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center gap-1.5 border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium py-3 px-5 rounded-xl text-sm hover:bg-[var(--bg-card)] transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={complete}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium py-3 rounded-xl text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all"
                  >
                    <Rocket className="w-4 h-4" /> Create My Agent
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Skip link */}
        <div className="text-center pb-5">
          <button onClick={dismiss} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            Skip for now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
