'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Copy, Check, Github, FileText } from 'lucide-react';

const SKILL_URL = 'https://hatcher.host/skill.md';
const GITHUB_URL = 'https://github.com/HatcherLabs/hatcher-skill';

const EXAMPLE_PROMPTS = [
  'Deploy a Telegram bot that answers FAQ about my startup.',
  'Build a trading monitor agent that pings me with daily price alerts.',
  'Create a research agent that summarizes my industry news every morning.',
];

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
};

export function AgentDiscoverySection() {
  const [copied, setCopied] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPromptIdx((i) => (i + 1) % EXAMPLE_PROMPTS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(SKILL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked — silently ignore */
    }
  };

  return (
    <section
      id="for-ai-agents"
      className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, ease }}
          className="mb-12 max-w-2xl"
        >
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            For AI Agents
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Your AI can deploy AI
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">
            Give your agent this URL and it will register, create, and run Hatcher-hosted agents for you — Telegram bots, research agents, trading monitors, anything.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
            <Bot className="w-5 h-5 text-[var(--color-accent)] flex-none" strokeWidth={1.75} />
            <code className="flex-1 overflow-hidden truncate text-sm sm:text-base text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-mono), monospace' }}>
              {SKILL_URL}
            </code>
            <button
              onClick={onCopy}
              aria-label={copied ? 'Copied' : 'Copy URL'}
              className="flex-none inline-flex items-center gap-1.5 rounded-md border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={2} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Copy
                </>
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="mb-10 flex items-start gap-2 text-sm text-[var(--text-secondary)]"
        >
          <span className="shrink-0 text-[var(--text-muted)]">Try:</span>
          <span key={promptIdx} className="italic transition-opacity duration-500 ease-in-out">
            &ldquo;{EXAMPLE_PROMPTS[promptIdx]}&rdquo;
          </span>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="flex flex-wrap items-center gap-3"
        >
          <a
            href="/skill.md"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
          >
            <FileText className="w-4 h-4" strokeWidth={1.75} />
            View skill.md
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
          >
            <Github className="w-4 h-4" strokeWidth={1.75} />
            GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
