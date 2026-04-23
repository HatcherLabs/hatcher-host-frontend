'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Copy, Check, Github, FileText, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

const SKILL_URL = 'https://hatcher.host/skill.md';
const GITHUB_URL = 'https://github.com/HatcherLabs/hatcher-skill';
const PROMPT = `Read ${SKILL_URL} and follow the instructions to deploy AI agents on Hatcher.`;

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
};

export function AgentDiscoverySection() {
  const t = useTranslations('landing.agentDiscovery');
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked — silently ignore */
    }
  };

  const steps = [
    { num: '01', text: t('step01') },
    { num: '02', text: t('step02') },
    { num: '03', text: t('step03') },
  ];

  return (
    <section
      id="for-ai-agents"
      className="py-16 sm:py-20 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden"
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, ease }}
          className="mb-10 max-w-2xl"
        >
          <p className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <Bot className="w-3.5 h-3.5" strokeWidth={2} />
            {t('eyebrow')}
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            {t('heading')}
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">
            {t('body')}
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="mb-10"
        >
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              <span>{t('promptLabel')}</span>
              <button
                onClick={onCopy}
                aria-label={copied ? t('copiedAriaLabel') : t('copyAriaLabel')}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" strokeWidth={2} />
                    {t('copiedLabel')}
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" strokeWidth={1.75} />
                    {t('copyLabel')}
                  </>
                )}
              </button>
            </div>
            <div
              className="px-4 py-5 sm:py-6 font-mono text-sm sm:text-base text-[var(--text-primary)] break-words"
              style={{ fontFamily: 'var(--font-mono), monospace' }}
            >
              Read <span className="text-[var(--color-accent)]">{SKILL_URL}</span> and follow the instructions to deploy AI agents on Hatcher.
            </div>
          </div>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6"
        >
          {steps.map((step) => (
            <div key={step.num} className="flex gap-3">
              <span className="font-mono text-sm font-semibold text-[var(--color-accent)] tabular-nums shrink-0 pt-0.5">
                {step.num}
              </span>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {step.text}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm"
        >
          <a
            href="/skill.md"
            className="inline-flex items-center gap-1.5 font-medium text-[var(--color-accent)] hover:underline underline-offset-4"
          >
            <FileText className="w-4 h-4" strokeWidth={1.75} />
            {t('viewSkillMd')}
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)] hover:text-[var(--color-accent)] transition"
          >
            <Github className="w-4 h-4" strokeWidth={1.75} />
            {t('githubSource')}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
