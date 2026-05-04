'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  X,
  Zap,
  Bot,
  Cpu,
  Rocket,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Framework data ───────────────────────────────────────────

const FRAMEWORKS = [
  {
    key: 'openclaw',
    name: 'OpenClaw',
    tagline: 'Skill-heavy autonomous worker',
    emoji: 'OC',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    border: 'border-[#f59e0b]/30',
    bg: 'bg-[#f59e0b]/10',
    text: 'text-[#f59e0b]',
    complexity: 'Advanced',
    complexityColor: 'text-red-400 bg-red-400/10 border-red-400/20',
    bestFor: 'Power users who need maximum capability: autonomous task execution, persistent workspace, skills, cron, and multi-channel integrations.',
    useCases: ['Enterprise automation', 'Multi-step research', 'Code generation pipelines', 'Cron-driven back-office agents', 'Full multi-platform bots'],
    features: [
      { name: '2,500+ ClawHub skills', supported: true },
      { name: 'Browser automation', supported: true },
      { name: 'Cron jobs & triggers', supported: true },
      { name: 'Multi-channel gateway', supported: true },
      { name: 'Persistent memory', supported: true },
      { name: 'Character personas', supported: false },
      { name: 'Plugin ecosystem', supported: true },
      { name: 'Social media native', supported: false },
      { name: 'Lightweight deploy', supported: false },
    ],
    integrations: ['Telegram', 'Discord', 'Slack', 'WhatsApp', 'X (Twitter)'],
    llmSupport: ['OpenRouter', 'OpenAI', 'Anthropic', 'Google', 'xAI', 'BYOK'],
    startupMs: 3200,
    memoryMb: 400,
    docsUrl: 'https://docs.openclaw.ai',
    configExample: `# openclaw/config.yaml
model: deepseek/deepseek-v4-flash
provider: openrouter

skills:
  - web_search
  - calculator
  - file_manager
  - code_interpreter

platforms:
  telegram:
    token: "\${TELEGRAM_BOT_TOKEN}"
  discord:
    token: "\${DISCORD_BOT_TOKEN}"

memory:
  backend: sqlite
  path: ./workspace/memory.db`,
  },
  {
    key: 'hermes',
    name: 'Hermes',
    tagline: 'Learning agent',
    emoji: 'HM',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
    border: 'border-[#a855f7]/30',
    bg: 'bg-[#a855f7]/10',
    text: 'text-[#a855f7]',
    complexity: 'Intermediate',
    complexityColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    bestFor: 'Agents that learn and adapt: long-running memory, live config editing, tool routing, and persistent research workflows.',
    useCases: ['Research assistants', 'Knowledge base bots', 'DevOps copilots', 'Security/red-team helpers', 'Long-running memory workflows'],
    features: [
      { name: '2,500+ ClawHub skills', supported: true },
      { name: 'Browser automation', supported: true },
      { name: 'Cron jobs & triggers', supported: true },
      { name: 'Multi-channel gateway', supported: true },
      { name: 'Persistent memory', supported: true },
      { name: 'Character personas', supported: false },
      { name: 'Plugin ecosystem', supported: true },
      { name: 'Social media native', supported: false },
      { name: 'Lightweight deploy', supported: false },
    ],
    integrations: ['Telegram', 'Discord', 'Slack', 'WhatsApp'],
    llmSupport: ['OpenRouter', 'OpenAI', 'Anthropic', 'Google', 'xAI', 'BYOK'],
    startupMs: 2800,
    memoryMb: 350,
    docsUrl: 'https://hermes-agent.nousresearch.com',
    configExample: `# hermes/config.toml
[model]
provider = "openrouter"
model = "deepseek/deepseek-v4-flash"

[memory]
backend = "chromadb"
persist = true
embeddings = "nomic-embed-text"

[tools]
enabled = [
  "web_search",
  "calculator",
  "code_exec",
  "file_read",
  "browser",
]

[platforms]
telegram = { token = "\${TELEGRAM_BOT_TOKEN}" }`,
  },
];

const ALL_FEATURES = [
  '2,500+ ClawHub skills',
  'Browser automation',
  'Cron jobs & triggers',
  'Multi-channel gateway',
  'Persistent memory',
  'Character personas',
  'Plugin ecosystem',
  'Social media native',
  'Lightweight deploy',
];

// ── Animation variants ────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Helpers ───────────────────────────────────────────────────

function StartupBar({ ms, max }: { ms: number; max: number }) {
  const pct = Math.round((ms / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[#a78bfa]"
        />
      </div>
      <span className="text-xs font-mono text-[var(--text-secondary)] w-14 text-right">{(ms / 1000).toFixed(1)}s</span>
    </div>
  );
}

function MemoryBar({ mb, max }: { mb: number; max: number }) {
  const pct = Math.round((mb / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#f472b6]"
        />
      </div>
      <span className="text-xs font-mono text-[var(--text-secondary)] w-14 text-right">{mb} MB</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function FrameworksPage() {
  const t = useTranslations('frameworks');
  const [activeCode, setActiveCode] = useState<string>('openclaw');
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);

  const maxStartup = Math.max(...FRAMEWORKS.map((f) => f.startupMs));
  const maxMemory = Math.max(...FRAMEWORKS.map((f) => f.memoryMb));

  const activeFramework = FRAMEWORKS.find((f) => f.key === activeCode)!;

  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl space-y-20 px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Hero — editorial, left-aligned ───────────────────── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('eyebrow')}</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-[var(--text-primary)] max-w-3xl" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            {t('heading')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--text-secondary)] leading-relaxed">
            {t('subheading')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {t('deployCta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://docs.hatcher.host/frameworks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 group"
            >
              {t('docsLink')}
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </motion.div>

        {/* ── Framework cards overview — unified editorial cards ─── */}
        <section>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="mb-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]"
          >
            {t('atAGlance')}
          </motion.p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FRAMEWORKS.map((fw) => (
              <motion.div
                key={fw.key}
                initial={{ y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4 }}
                className="relative flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/40 p-5 hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--text-muted)]">{fw.name}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                    {fw.complexity}
                  </span>
                </div>

                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{fw.tagline}</p>
                <p className="mb-4 text-[13px] leading-relaxed text-[var(--text-secondary)] flex-1">
                  {fw.bestFor}
                </p>

                <div className="mb-4 space-y-1.5">
                  {fw.features.filter(f => f.supported).slice(0, 3).map((feat) => (
                    <div key={feat.name} className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                      <Check className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-accent)]" strokeWidth={2.5} />
                      {feat.name}
                    </div>
                  ))}
                </div>

                <a
                  href={fw.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:underline underline-offset-2 mt-auto"
                >
                  {t('docsSuffix')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Feature matrix ──────────────────────────────────── */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="mb-6 text-xl font-bold text-[var(--text-primary)]"
          >
            {t('featureMatrix')}
          </motion.h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border-default)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
                  <th className="px-5 py-4 text-left font-semibold text-[var(--text-secondary)]">{t('featureCol')}</th>
                  {FRAMEWORKS.map((fw) => (
                    <th key={fw.key} className="px-4 py-4 text-center">
                      <span className={cn('font-bold', fw.text)}>{fw.emoji} {fw.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_FEATURES.map((feat, i) => (
                  <tr
                    key={feat}
                    className={cn(
                      'border-b border-[var(--border-default)] transition-colors duration-150 hover:bg-[var(--bg-card)]',
                      i === ALL_FEATURES.length - 1 && 'border-none'
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-[var(--text-primary)]">{feat}</td>
                    {FRAMEWORKS.map((fw) => {
                      const supported = fw.features.find((f) => f.name === feat)?.supported ?? false;
                      return (
                        <td key={fw.key} className="px-4 py-3.5 text-center">
                          {supported ? (
                            <Check className={cn('mx-auto h-4 w-4', fw.text)} />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-[var(--text-muted)]" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Use case recommendations ─────────────────────── */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="mb-2 text-xl font-bold text-[var(--text-primary)]"
          >
            {t('bestFor')}
          </motion.h2>
          <p className="mb-6 text-sm text-[var(--text-secondary)]">
            {t('bestForSubheading')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FRAMEWORKS.map((fw) => (
              <motion.div
                key={fw.key}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'rounded-2xl border p-5 transition-colors duration-200',
                  fw.border,
                  fw.bg
                )}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl">{fw.emoji}</span>
                  <div>
                    <h3 className={cn('font-bold', fw.text)}>{fw.name}</h3>
                    <span className={cn('text-xs rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide', fw.complexityColor)}>
                      {fw.complexity}
                    </span>
                  </div>
                </div>

                <p className="mb-3 text-sm text-[var(--text-secondary)]">{fw.bestFor}</p>

                <div className="space-y-1.5">
                  {fw.useCases.map((uc) => (
                    <div key={uc} className="flex items-center gap-2 text-xs text-[var(--text-primary)]/80">
                      <Sparkles className={cn('h-3 w-3 flex-shrink-0', fw.text)} />
                      {uc}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {fw.integrations.map((p) => (
                    <span
                      key={p}
                      className="rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Performance benchmarks ───────────────────────── */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="mb-2 text-xl font-bold text-[var(--text-primary)]"
          >
            {t('benchmarks')}
          </motion.h2>
          <p className="mb-6 text-sm text-[var(--text-secondary)]">
            {t('benchmarksSubheading')}
          </p>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
            <div className="grid gap-8 sm:grid-cols-2">
              {/* Startup time */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--color-accent)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">{t('coldStart')}</h3>
                </div>
                <div className="space-y-4">
                  {FRAMEWORKS.map((fw) => (
                    <div key={fw.key}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className={cn('text-sm font-medium', fw.text)}>
                          {fw.emoji} {fw.name}
                        </span>
                      </div>
                      <StartupBar ms={fw.startupMs} max={maxStartup} />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">{t('lowerFaster')}</p>
              </div>

              {/* Memory */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[#a78bfa]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">{t('memoryUsage')}</h3>
                </div>
                <div className="space-y-4">
                  {FRAMEWORKS.map((fw) => (
                    <div key={fw.key}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className={cn('text-sm font-medium', fw.text)}>
                          {fw.emoji} {fw.name}
                        </span>
                      </div>
                      <MemoryBar mb={fw.memoryMb} max={maxMemory} />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">{t('lowerLeaner')}</p>
              </div>
            </div>

            {/* Summary callout */}
            <div className="mt-6 rounded-xl border border-[#f472b6]/20 bg-[#f472b6]/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
              {t('benchmarkCallout')}
            </div>
          </div>
        </section>

        {/* ── Code examples ─────────────────────────────────── */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="mb-2 text-xl font-bold text-[var(--text-primary)]"
          >
            {t('configExamples')}
          </motion.h2>
          <p className="mb-6 text-sm text-[var(--text-secondary)]">
            {t('configSubheading')}
          </p>

          {/* Tab bar */}
          <div className="mb-0 flex flex-wrap gap-2">
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.key}
                onClick={() => setActiveCode(fw.key)}
                className={cn(
                  'rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                  activeCode === fw.key
                    ? cn('border-[var(--border-hover)] bg-[var(--bg-card)]', fw.text)
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                )}
              >
                {fw.emoji} {fw.name}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="rounded-b-2xl rounded-tr-2xl border border-[var(--border-hover)] bg-[rgba(8,8,14,0.95)] p-5">
            <AnimatePresence mode="wait">
              <motion.pre
                key={activeCode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="overflow-x-auto font-mono text-xs leading-relaxed text-[var(--text-secondary)]"
              >
                <code>{activeFramework.configExample}</code>
              </motion.pre>
            </AnimatePresence>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-default)] pt-4">
              <span className="text-xs text-[var(--text-muted)]">
                {t('configRef')}
              </span>
              <a
                href={activeFramework.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('inline-flex items-center gap-1 text-xs font-medium', activeFramework.text)}
              >
                {activeFramework.name} {t('docsSuffix')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </section>

        {/* ── LLM support ───────────────────────────────────── */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="mb-2 text-xl font-bold text-[var(--text-primary)]"
          >
            {t('llmSupport')}
          </motion.h2>
          <p className="mb-6 text-sm text-[var(--text-secondary)]">
            {t('llmSubheading')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FRAMEWORKS.map((fw) => (
              <div
                key={fw.key}
                className={cn('rounded-2xl border p-4', fw.border, 'bg-[var(--bg-card)]')}
              >
                <h3 className={cn('mb-3 font-semibold', fw.text)}>
                  {fw.emoji} {fw.name}
                </h3>
                <div className="space-y-1.5">
                  {fw.llmSupport.map((llm) => (
                    <div key={llm} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Check className={cn('h-3 w-3 flex-shrink-0', fw.text)} />
                      {llm}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {t('byokNote')}{' '}
            <Link href="/docs/api" className="text-[var(--color-accent)] underline-offset-2 hover:underline">
              {t('byokSetupLink')}
            </Link>
          </p>
        </section>

        {/* ── Decision guide ────────────────────────────────── */}
        <section>
          <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-gradient-to-br from-[var(--color-accent)]/5 to-[#a78bfa]/5 p-8">
            <h2 className="mb-6 text-xl font-bold text-[var(--text-primary)]">{t('decisionGuide')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                { condition: t('decisions.0.condition'), pick: t('decisions.0.pick'), label: 'OC', color: 'text-[var(--color-accent)]' },
                { condition: t('decisions.1.condition'), pick: t('decisions.1.pick'), label: 'HM', color: 'text-[#a78bfa]' },
                { condition: t('decisions.2.condition'), pick: t('decisions.2.pick'), label: 'OC', color: 'text-[var(--color-accent)]' },
                { condition: t('decisions.3.condition'), pick: t('decisions.3.pick'), label: 'HM', color: 'text-[#a78bfa]' },
              ] as Array<{ condition: string; pick: string; label: string; color: string }>).map((item) => (
                <div
                  key={item.condition}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
                >
                  <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-accent)]" />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">{item.condition}</p>
                    <p className={cn('mt-1 text-sm font-bold', item.color)}>
                      {item.label} · {item.pick}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="text-center">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-10">
            <Bot className="mx-auto mb-4 h-10 w-10 text-[var(--text-muted)]" />
            <h2 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">{t('readyCta')}</h2>
            <p className="mx-auto mb-8 max-w-md text-[var(--text-secondary)]">
              {t('readySubheading')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/create"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition-all duration-200 hover:bg-[#0891b2]"
              >
                <Rocket className="h-4 w-4" />
                {t('deployFirstAgent')}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              >
                {t('viewPricing')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </MarketingShell>
  );
}
