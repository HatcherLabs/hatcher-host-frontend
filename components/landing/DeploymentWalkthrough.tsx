'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Bot, MessageCircle, Zap, Rocket, Check, Send } from 'lucide-react';

// ─── Step data ─────────────────────────────────────────────────
const FRAMEWORK_OPTIONS = [
  { name: 'OpenClaw', desc: 'General purpose', selected: true },
  { name: 'Hermes', desc: 'Lightweight & fast', selected: false },
  { name: 'ElizaOS', desc: 'Social agents', selected: false },
];

const CONFIG_FIELDS = [
  { label: 'Name', value: 'CryptoBot', typing: true },
  { label: 'Personality', value: 'Friendly crypto expert who explains clearly', typing: true },
  { label: 'Model', value: 'Llama 4 Scout (Free)', typing: false },
];

const PLATFORM_OPTIONS = [
  { name: 'Telegram', connected: true },
  { name: 'Discord', connected: true },
  { name: 'Twitter', connected: false },
  { name: 'WhatsApp', connected: false },
];

const STEPS = [
  { id: 'choose', label: 'Choose Framework', icon: Bot, color: 'purple', title: 'Pick your AI engine' },
  { id: 'configure', label: 'Configure', icon: MessageCircle, color: 'cyan', title: 'Customize your agent' },
  { id: 'connect', label: 'Connect', icon: Zap, color: 'emerald', title: 'Link your platforms' },
  { id: 'launch', label: 'Launch', icon: Rocket, color: 'amber', title: 'Your agent is live!' },
  { id: 'chat', label: 'Chat', icon: Send, color: 'rose', title: 'Talk to your agent' },
];

const STEP_DURATION = 3000;

// ─── Color helpers ─────────────────────────────────────────────
function accent(color: string, variant: 'bg' | 'text' | 'border' | 'glow') {
  const map: Record<string, Record<string, string>> = {
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', glow: 'shadow-rose-500/20' },
  };
  return map[color]?.[variant] ?? '';
}

// ─── Typing effect for field values ────────────────────────────
function TypedValue({ value, animate: shouldAnimate }: { value: string; animate: boolean }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayed(value);
      return;
    }
    setDisplayed('');
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setDisplayed(value.slice(0, idx));
      if (idx >= value.length) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value, shouldAnimate]);

  return (
    <span>
      {displayed}
      {shouldAnimate && displayed.length < value.length && (
        <span className="inline-block w-[2px] h-3.5 bg-white/60 animate-pulse ml-[1px] align-middle" />
      )}
    </span>
  );
}

// ─── Step content panels ───────────────────────────────────────
function ChoosePanel() {
  const opts = FRAMEWORK_OPTIONS;
  return (
    <div className="space-y-2.5">
      {opts.map((opt, i) => (
        <motion.div
          key={opt.name}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12, duration: 0.3 }}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
            opt.selected
              ? 'border-purple-500/40 bg-purple-500/10'
              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            opt.selected ? 'border-purple-400 bg-purple-500/30' : 'border-white/20'
          }`}>
            {opt.selected && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{opt.name}</p>
            <p className="text-xs text-[#71717a]">{opt.desc}</p>
          </div>
          {opt.selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
              className="ml-auto"
            >
              <Check className="w-4 h-4 text-purple-400" />
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ConfigurePanel() {
  const fields = CONFIG_FIELDS;
  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <motion.div
          key={field.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.3 }}
        >
          <label className="text-xs text-[#71717a] mb-1 block">{field.label}</label>
          <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white">
            <TypedValue value={field.value} animate={field.typing} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ConnectPanel() {
  const platforms = PLATFORM_OPTIONS;
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {platforms.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
            p.connected
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-white/[0.06] bg-white/[0.02]'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-white/20'}`} />
          <span className="text-sm text-white">{p.name}</span>
          {p.connected && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
        </motion.div>
      ))}
    </div>
  );
}

function LaunchPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-4 gap-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/30"
      >
        <Check className="w-8 h-8 text-[#0a0a0f]" strokeWidth={3} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="text-base font-semibold text-white">CryptoBot is online</p>
        <p className="text-sm text-[#a1a1aa] mt-1">Running 24/7 on Hatcher Cloud</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Live on Telegram & Discord</span>
        </div>
      </motion.div>
    </div>
  );
}

const CHAT_MESSAGES = [
  { role: 'user', text: 'What are the top DeFi protocols on Solana?' },
  { role: 'bot', text: 'Great question! The top Solana DeFi protocols by TVL are:\n\n1. **Marinade Finance** — liquid staking\n2. **Raydium** — AMM & liquidity\n3. **Jupiter** — DEX aggregator\n\nWant me to analyze any of these in detail?' },
  { role: 'user', text: 'What\'s the APY on Marinade?' },
  { role: 'bot', text: 'Marinade currently offers ~7.2% APY on mSOL staking. This is variable based on validator performance and MEV rewards.' },
];

function ChatPanel() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx > CHAT_MESSAGES.length) {
        clearInterval(timer);
        return;
      }
      setVisibleCount(idx);
    }, 700);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-2.5 max-h-[220px] overflow-hidden">
      {CHAT_MESSAGES.slice(0, visibleCount).map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
            msg.role === 'user'
              ? 'bg-purple-500/20 border border-purple-500/30 text-purple-100'
              : 'bg-white/[0.04] border border-white/[0.08] text-[#d4d4d8]'
          }`}>
            {msg.role === 'bot' && (
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Bot className="w-2.5 h-2.5 text-[#0a0a0f]" />
                </div>
                <span className="text-[10px] font-medium text-amber-400">CryptoBot</span>
              </div>
            )}
            <p className="whitespace-pre-line">{msg.text}</p>
          </div>
        </motion.div>
      ))}
      {visibleCount < CHAT_MESSAGES.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 px-3 py-2"
        >
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[10px] text-[#52525b]">CryptoBot is typing...</span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export function DeploymentWalkthrough() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [activeStep, setActiveStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!isInView || paused) return;
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
    }, STEP_DURATION);
    return () => clearInterval(timer);
  }, [isInView, paused]);

  const step = STEPS[activeStep]!;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
      className="max-w-lg mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Window chrome */}
      <div className={`rounded-2xl border border-white/[0.08] bg-[#0c0c14] shadow-2xl ${accent(step.color, 'glow')} overflow-hidden transition-shadow duration-500`}>
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0e0e16]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="ml-3 text-xs text-[#52525b] font-mono select-none">hatcher.host/create</span>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-white/[0.06]">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === activeStep;
            const isDone = i < activeStep;
            return (
              <button
                key={s.id}
                onClick={() => { setActiveStep(i); setPaused(true); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative ${
                  isActive ? accent(s.color, 'text') : isDone ? 'text-emerald-400/60' : 'text-[#52525b]'
                }`}
              >
                {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="step-indicator"
                    className={`absolute bottom-0 left-0 right-0 h-[2px] ${accent(s.color, 'bg').replace('/20', '/60')}`}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="p-5 min-h-[240px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="flex-1"
            >
              <p className={`text-sm font-semibold mb-4 ${accent(step.color, 'text')}`}>
                {step.title}
              </p>

              {step.id === 'choose' && <ChoosePanel />}
              {step.id === 'configure' && <ConfigurePanel />}
              {step.id === 'connect' && <ConnectPanel />}
              {step.id === 'launch' && <LaunchPanel />}
              {step.id === 'chat' && <ChatPanel />}
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="mt-4 flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                {i === activeStep && !paused ? (
                  <motion.div
                    className={`h-full rounded-full ${accent(s.color, 'bg').replace('/20', '/60')}`}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: STEP_DURATION / 1000, ease: 'linear' }}
                    key={`${s.id}-${activeStep}`}
                  />
                ) : (
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      i < activeStep ? 'bg-emerald-400/40 w-full' : i === activeStep ? accent(s.color, 'bg').replace('/20', '/60') + ' w-full' : 'w-0'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
