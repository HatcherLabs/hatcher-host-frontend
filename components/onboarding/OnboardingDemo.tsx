'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, MessageSquare, Settings, Sparkles } from 'lucide-react';

const FRAMEWORKS = [
  { name: 'OpenClaw' },
  { name: 'Hermes' },
  { name: 'ElizaOS' },
  { name: 'Milady' },
];

const TYPING_NAME = 'my-trading-bot';
const PERSONALITY_TEXT = 'A crypto-savvy trading assistant with real-time market analysis...';
const CHAT_RESPONSE = 'BTC is at $67,420 (+2.3%). RSI shows bullish momentum. Want me to set alerts?';

const STEP_DURATION = 3500;

function FrameworkScreen() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-[0.15em]">Step 1</span>
        <span className="text-[11px] text-[var(--text-muted)]">Pick a framework</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {FRAMEWORKS.map((fw, i) => (
          <motion.div
            key={fw.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.3 }}
            className={`flex items-center gap-2 p-2 rounded-lg border ${
              i === 0
                ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10'
                : 'border-[var(--border-default)] bg-[var(--bg-card)]'
            }`}
          >
            <Bot className={`w-3.5 h-3.5 shrink-0 ${i === 0 ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]'}`} strokeWidth={1.75} />
            <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">{fw.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ConfigScreen() {
  const [nameLen, setNameLen] = useState(0);
  const [showPersonality, setShowPersonality] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNameLen((prev) => (prev < TYPING_NAME.length ? prev + 1 : prev));
    }, 80);
    const timer = setTimeout(() => setShowPersonality(true), TYPING_NAME.length * 80 + 200);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, []);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 mb-3">
        <Settings className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Step 2</span>
        <span className="text-[11px] text-[var(--text-muted)]">Configure</span>
      </div>
      {/* Name field */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-2">
        <div className="text-[10px] text-[var(--text-muted)] mb-1">Agent Name</div>
        <div className="text-xs text-white font-mono">
          {TYPING_NAME.slice(0, nameLen)}
          <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="inline-block w-[1px] h-3 bg-purple-400 ml-px align-middle" />
        </div>
      </div>
      {/* Personality */}
      <AnimatePresence>
        {showPersonality && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-2"
          >
            <div className="text-[10px] text-[var(--text-muted)] mb-1">Personality</div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-[11px] text-[var(--text-secondary)] leading-relaxed"
            >
              {PERSONALITY_TEXT}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatScreen() {
  const [showDots, setShowDots] = useState(true);
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setShowDots(false); setShowReply(true); }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Step 3</span>
        <span className="text-[11px] text-[var(--text-muted)]">Chat</span>
      </div>
      {/* User message */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="bg-purple-500/20 border border-purple-500/20 rounded-xl rounded-br-md px-3 py-1.5 max-w-[80%]">
          <span className="text-[11px] text-white">What&apos;s the BTC price?</span>
        </div>
      </motion.div>
      {/* Bot response */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-start"
      >
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl rounded-bl-md px-3 py-1.5 max-w-[85%]">
          {showDots && (
            <div className="flex gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#71717a]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                />
              ))}
            </div>
          )}
          {showReply && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-[11px] text-[#d4d4d8] leading-relaxed"
            >
              {CHAT_RESPONSE}
            </motion.span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const SCREENS = [FrameworkScreen, ConfigScreen, ChatScreen];
const LABELS = ['Pick Framework', 'Configure', 'Chat'];

export function OnboardingDemo() {
  const [activeScreen, setActiveScreen] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (localStorage.getItem('onboarding_demo_dismissed') === 'true') {
      setDismissed(true);
    }
  }, []);

  // Auto-cycle screens
  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % SCREENS.length);
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem('onboarding_demo_dismissed', 'true');
    setDismissed(true);
  };

  const ActiveComponent = SCREENS[activeScreen];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="relative w-full max-w-md mx-auto mb-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-sidebar)]/80 backdrop-blur-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">How it works</h3>
            <p className="text-[10px] text-[var(--text-muted)]">Deploy an agent in 60 seconds</p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="p-1 rounded-md hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 px-4 pb-3">
        {LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setActiveScreen(i)}
            className="flex-1 group"
          >
            <div className={`h-0.5 rounded-full mb-1 transition-all duration-500 ${
              i === activeScreen ? 'bg-purple-500' : i < activeScreen ? 'bg-purple-500/30' : 'bg-[var(--bg-card)]'
            }`} />
            <span className={`text-[9px] font-medium transition-colors ${
              i === activeScreen ? 'text-[#d4d4d8]' : 'text-[var(--text-muted)]'
            }`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Animated content */}
      <div className="px-4 pb-4 min-h-[140px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
