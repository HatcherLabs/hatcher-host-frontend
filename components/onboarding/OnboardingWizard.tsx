'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n/routing';
import { X, ArrowRight, ArrowLeft, Check, MessageSquare, Plug, BarChart3, Key, Cpu, Brain } from 'lucide-react';

// Editorial onboarding wizard — replaces the prior gradient-heavy
// 4-color layout. One accent (cyan), typography-led, consistent with
// the rest of the site. Routes to /create with the chosen framework param.

const FRAMEWORKS = [
  { id: 'openclaw', name: 'OpenClaw', icon: Cpu,   desc: 'Skill-heavy automation with integrations, files, cron, and workspace tools.', tag: 'recommended' },
  { id: 'hermes',   name: 'Hermes',   icon: Brain, desc: 'Adaptive long-running agents with memory, research tools, and live config.',  tag: 'memory' },
];

const DASHBOARD_FEATURES = [
  { icon: MessageSquare, title: 'Chat with your agent',    description: 'Test responses in real-time.' },
  { icon: Plug,          title: 'Configure integrations',   description: 'Connect Telegram, Discord, Twitter & more.' },
  { icon: BarChart3,     title: 'Monitor performance',      description: 'Analytics, usage stats, and logs.' },
  { icon: Key,           title: 'Bring your own key',       description: 'Use your own LLM API key for unlimited messages.' },
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

  const selectedFw = FRAMEWORKS.find((f) => f.id === selectedFramework);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden"
      >
        <button onClick={dismiss} aria-label="Close" className="absolute top-4 right-4 p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        {/* Slim progress dots — cyan accent, no gradient */}
        <div className="flex justify-center gap-1.5 pt-6 pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-[var(--color-accent)]' : i < step ? 'w-4 bg-[var(--color-accent)]/40' : 'w-4 bg-[var(--bg-hover)]'
              }`}
            />
          ))}
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Getting started</p>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  Welcome to Hatcher.
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  Deploy your first AI agent in under 60 seconds. Pick a framework, name it, and you&apos;re live.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    '4 AI frameworks to choose from',
                    'Deploy to Telegram, Discord, Twitter, WhatsApp & Slack',
                    'Free tier with BYOK — no credit card required',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setStep(1)}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="framework" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Step 1 of 3</p>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Choose your engine</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Each framework has different strengths. You can change later.</p>

                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  {FRAMEWORKS.map((fw) => {
                    const selected = selectedFramework === fw.id;
                    return (
                      <button
                        key={fw.id}
                        onClick={() => setSelectedFramework(fw.id)}
                        className={`relative text-left p-3.5 rounded-lg border transition-colors ${
                          selected
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                            : 'border-[var(--border-default)] bg-[var(--bg-card)]/40 hover:border-[var(--border-hover)]'
                        }`}
                      >
                        {selected && (
                          <div className="absolute top-2.5 right-2.5">
                            <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={3} />
                          </div>
                        )}
                        <fw.icon className={`w-4 h-4 mb-2 transition-colors ${selected ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]'}`} strokeWidth={1.75} />
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{fw.name}</p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] mt-0.5">{fw.tag}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-2 leading-snug">{fw.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setStep(0)}
                    className="inline-flex items-center justify-center gap-1.5 border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium py-2.5 px-4 rounded-md text-sm hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold py-2.5 rounded-md text-sm hover:opacity-90 transition-opacity"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="features" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Step 2 of 3</p>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">What you can do</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Your dashboard gives you full control over every agent.</p>

                <div className="space-y-4 mb-7">
                  {DASHBOARD_FEATURES.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <feat.icon className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" strokeWidth={1.75} />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{feat.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">{feat.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center justify-center gap-1.5 border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium py-2.5 px-4 rounded-md text-sm hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold py-2.5 rounded-md text-sm hover:opacity-90 transition-opacity"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="ready" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">Ready</p>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  You&apos;re all set.
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  We&apos;ll take you to the agent creator where you can name your agent, configure integrations, and deploy in one click.
                </p>

                {selectedFw && (
                  <div className="bg-[var(--bg-card)]/40 border border-[var(--border-default)] rounded-lg p-4 mb-6 flex items-center gap-3">
                    <selectedFw.icon className="w-5 h-5 text-[var(--color-accent)] shrink-0" strokeWidth={1.75} />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedFw.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">Free tier — 20 messages/day, BYOK unlimited</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center justify-center gap-1.5 border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium py-2.5 px-4 rounded-md text-sm hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={complete}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold py-2.5 rounded-md text-sm hover:opacity-90 transition-opacity"
                  >
                    Create my agent
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center pb-5">
          <button onClick={dismiss} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            Skip for now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
