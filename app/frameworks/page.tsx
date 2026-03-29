'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    tagline: 'Autonomous powerhouse',
    emoji: '🦞',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    border: 'border-[#f59e0b]/30',
    bg: 'bg-[#f59e0b]/10',
    text: 'text-[#f59e0b]',
    complexity: 'Advanced',
    complexityColor: 'text-red-400 bg-red-400/10 border-red-400/20',
    bestFor: 'Power users who need maximum capability — autonomous task execution, complex tool chains, and enterprise integrations.',
    useCases: ['Enterprise automation', 'Multi-step research', 'Code generation pipelines', 'Data processing agents'],
    features: [
      { name: '3,200+ community skills', supported: true },
      { name: 'Browser automation', supported: true },
      { name: 'Cron jobs & triggers', supported: true },
      { name: 'Multi-channel gateway', supported: true },
      { name: 'Persistent memory', supported: true },
      { name: 'Character personas', supported: false },
      { name: 'Plugin ecosystem', supported: true },
      { name: 'Social media native', supported: false },
      { name: 'Lightweight deploy', supported: false },
    ],
    integrations: ['Telegram', 'Discord', 'Slack', 'WhatsApp', 'X (Twitter)', 'Signal'],
    llmSupport: ['Groq', 'OpenAI', 'Anthropic', 'Google', 'xAI', 'OpenRouter'],
    startupMs: 3200,
    memoryMb: 400,
    docsUrl: 'https://docs.openclaw.ai',
    configExample: `# openclaw/config.yaml
model: meta-llama/llama-4-scout-17b-16e-instruct
provider: groq

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
    emoji: '🪽',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
    border: 'border-[#a855f7]/30',
    bg: 'bg-[#a855f7]/10',
    text: 'text-[#a855f7]',
    complexity: 'Intermediate',
    complexityColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    bestFor: 'Agents that learn and adapt over time — persistent memory, research tasks, and multi-provider LLM flexibility.',
    useCases: ['Research assistants', 'Knowledge base bots', 'Learning companions', 'Multi-provider routing'],
    features: [
      { name: '3,200+ community skills', supported: false },
      { name: 'Browser automation', supported: true },
      { name: 'Cron jobs & triggers', supported: true },
      { name: 'Multi-channel gateway', supported: true },
      { name: 'Persistent memory', supported: true },
      { name: 'Character personas', supported: false },
      { name: 'Plugin ecosystem', supported: true },
      { name: 'Social media native', supported: false },
      { name: 'Lightweight deploy', supported: false },
    ],
    integrations: ['Telegram', 'Discord', 'Slack', 'WhatsApp', 'X (Twitter)', 'Signal'],
    llmSupport: ['Groq', 'OpenAI', 'Anthropic', 'Google', 'xAI', 'OpenRouter'],
    startupMs: 2800,
    memoryMb: 350,
    docsUrl: 'https://hermes-agent.nousresearch.com',
    configExample: `# hermes/config.toml
[model]
provider = "groq"
model = "meta-llama/llama-4-scout-17b-16e-instruct"

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
  {
    key: 'elizaos',
    name: 'ElizaOS',
    tagline: 'Character-driven',
    emoji: '🎭',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.15)',
    border: 'border-[#06b6d4]/30',
    bg: 'bg-[#06b6d4]/10',
    text: 'text-[#06b6d4]',
    complexity: 'Intermediate',
    complexityColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    bestFor: 'Social media bots and community agents — deep character customization, platform-native behavior, plugin ecosystem.',
    useCases: ['Social media bots', 'Community moderators', 'Brand personas', 'NFT project agents'],
    features: [
      { name: '3,200+ community skills', supported: false },
      { name: 'Browser automation', supported: false },
      { name: 'Cron jobs & triggers', supported: true },
      { name: 'Multi-channel gateway', supported: true },
      { name: 'Persistent memory', supported: true },
      { name: 'Character personas', supported: true },
      { name: 'Plugin ecosystem', supported: true },
      { name: 'Social media native', supported: true },
      { name: 'Lightweight deploy', supported: false },
    ],
    integrations: ['Telegram', 'Discord', 'Slack', 'X (Twitter)', 'Farcaster'],
    llmSupport: ['Groq', 'OpenAI', 'Anthropic', 'Google', 'xAI', 'OpenRouter'],
    startupMs: 2400,
    memoryMb: 300,
    docsUrl: 'https://elizaos.github.io/eliza/',
    configExample: `// elizaos/character.json
{
  "name": "Aria",
  "bio": [
    "Aria is a crypto-native community manager.",
    "She's been in DeFi since 2020 and loves memes."
  ],
  "style": {
    "all": ["casual", "knowledgeable", "friendly"],
    "twitter": ["concise", "sharp", "playful"]
  },
  "plugins": [
    "@elizaos/plugin-twitter",
    "@elizaos/plugin-telegram",
    "@elizaos/plugin-web3"
  ],
  "modelProvider": "groq",
  "model": "llama-4-scout"
}`,
  },
  {
    key: 'milady',
    name: 'Milady',
    tagline: 'Featherweight',
    emoji: '🌸',
    color: '#f43f5e',
    glow: 'rgba(244,63,94,0.15)',
    border: 'border-[#f43f5e]/30',
    bg: 'bg-[#f43f5e]/10',
    text: 'text-[#f43f5e]',
    complexity: 'Beginner',
    complexityColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    bestFor: 'Quick deploys with strong personality — minimum setup, maximum character. Great for first-time deployers.',
    useCases: ['Personality chatbots', 'Community bots', 'Fan engagement', 'Cultural agents'],
    features: [
      { name: '3,200+ community skills', supported: false },
      { name: 'Browser automation', supported: false },
      { name: 'Cron jobs & triggers', supported: false },
      { name: 'Multi-channel gateway', supported: true },
      { name: 'Persistent memory', supported: false },
      { name: 'Character personas', supported: true },
      { name: 'Plugin ecosystem', supported: false },
      { name: 'Social media native', supported: true },
      { name: 'Lightweight deploy', supported: true },
    ],
    integrations: ['Telegram', 'Discord', 'WhatsApp', 'X (Twitter)'],
    llmSupport: ['Groq', 'OpenAI', 'Anthropic'],
    startupMs: 800,
    memoryMb: 120,
    docsUrl: 'https://docs.milady.gg',
    configExample: `# milady/persona.yaml
name: "Sakura"
personality: |
  Sakura is a vibrant, culturally-aware AI with a love for
  anime, memes, and wholesome community building. She speaks
  casually, uses emojis naturally, and never breaks character.

model:
  provider: groq
  id: meta-llama/llama-4-scout-17b-16e-instruct

platforms:
  telegram:
    token: "\${TELEGRAM_BOT_TOKEN}"
  discord:
    token: "\${DISCORD_BOT_TOKEN}"`,
  },
];

const ALL_FEATURES = [
  '3,200+ community skills',
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
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[#06b6d4] to-[#a78bfa]"
        />
      </div>
      <span className="text-xs font-mono text-[#A5A1C2] w-14 text-right">{(ms / 1000).toFixed(1)}s</span>
    </div>
  );
}

function MemoryBar({ mb, max }: { mb: number; max: number }) {
  const pct = Math.round((mb / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#f472b6]"
        />
      </div>
      <span className="text-xs font-mono text-[#A5A1C2] w-14 text-right">{mb} MB</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function FrameworksPage() {
  const [activeCode, setActiveCode] = useState<string>('openclaw');
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);

  const maxStartup = Math.max(...FRAMEWORKS.map((f) => f.startupMs));
  const maxMemory = Math.max(...FRAMEWORKS.map((f) => f.memoryMb));

  const activeFramework = FRAMEWORKS.find((f) => f.key === activeCode)!;

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-20">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#06b6d4]/20 bg-[#06b6d4]/5 px-4 py-1.5 text-sm font-medium text-[#06b6d4]">
            <Layers className="h-4 w-4" />
            Framework Comparison
          </div>
          <h1 className="font-[var(--font-display)] text-4xl font-extrabold tracking-tight text-[#F0EEFC] sm:text-5xl">
            Pick the right framework
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#A5A1C2]">
            Hatcher supports 4 battle-tested agent frameworks. Each has unique strengths — here&apos;s how to choose.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-xl bg-[#06b6d4] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#06b6d4]/20 transition-all duration-200 hover:bg-[#0891b2]"
            >
              <Rocket className="h-4 w-4" />
              Deploy an agent
            </Link>
            <a
              href="https://docs.hatcher.host/frameworks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-[#A5A1C2] transition-all duration-200 hover:border-white/[0.12] hover:text-[#F0EEFC]"
            >
              <ExternalLink className="h-4 w-4" />
              Full docs
            </a>
          </div>
        </motion.div>

        {/* ── Framework cards overview ───────────────────────── */}
        <section>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="mb-6 text-xl font-bold text-[#F0EEFC]"
          >
            At a glance
          </motion.h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FRAMEWORKS.map((fw) => (
              <motion.div
                key={fw.key}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'group relative flex flex-col rounded-2xl border bg-[rgba(14,14,20,0.8)] p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg cursor-default',
                  fw.border
                )}
                style={{ '--glow': fw.glow } as React.CSSProperties}
              >
                {/* Glow on hover */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ boxShadow: `0 0 40px ${fw.glow}` }}
                />

                <div className="relative">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-3xl">{fw.emoji}</span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', fw.complexityColor)}>
                      {fw.complexity}
                    </span>
                  </div>

                  <h3 className={cn('mb-1 text-lg font-bold', fw.text)}>{fw.name}</h3>
                  <p className="mb-3 text-xs text-[#6B6890]">{fw.tagline}</p>

                  <p className="mb-4 text-xs leading-relaxed text-[#A5A1C2]">
                    {fw.bestFor}
                  </p>

                  <div className="mb-4 space-y-1">
                    {fw.features.filter(f => f.supported).slice(0, 3).map((feat) => (
                      <div key={feat.name} className="flex items-center gap-1.5 text-xs text-[#A5A1C2]">
                        <Check className={cn('h-3 w-3 flex-shrink-0', fw.text)} />
                        {feat.name}
                      </div>
                    ))}
                  </div>

                  <a
                    href={fw.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80', fw.text)}
                  >
                    Docs
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
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
            className="mb-6 text-xl font-bold text-[#F0EEFC]"
          >
            Feature matrix
          </motion.h2>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-5 py-4 text-left font-semibold text-[#A5A1C2]">Feature</th>
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
                      'border-b border-white/[0.04] transition-colors duration-150 hover:bg-white/[0.02]',
                      i === ALL_FEATURES.length - 1 && 'border-none'
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-[#F0EEFC]">{feat}</td>
                    {FRAMEWORKS.map((fw) => {
                      const supported = fw.features.find((f) => f.name === feat)?.supported ?? false;
                      return (
                        <td key={fw.key} className="px-4 py-3.5 text-center">
                          {supported ? (
                            <Check className={cn('mx-auto h-4 w-4', fw.text)} />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-white/[0.15]" />
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
            className="mb-2 text-xl font-bold text-[#F0EEFC]"
          >
            Best for...
          </motion.h2>
          <p className="mb-6 text-sm text-[#A5A1C2]">
            Not sure which framework to pick? Match your use case.
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

                <p className="mb-3 text-sm text-[#A5A1C2]">{fw.bestFor}</p>

                <div className="space-y-1.5">
                  {fw.useCases.map((uc) => (
                    <div key={uc} className="flex items-center gap-2 text-xs text-[#F0EEFC]/80">
                      <Sparkles className={cn('h-3 w-3 flex-shrink-0', fw.text)} />
                      {uc}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {fw.integrations.map((p) => (
                    <span
                      key={p}
                      className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#A5A1C2]"
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
            className="mb-2 text-xl font-bold text-[#F0EEFC]"
          >
            Performance benchmarks
          </motion.h2>
          <p className="mb-6 text-sm text-[#A5A1C2]">
            Cold-start time and baseline memory usage on Hatcher shared infrastructure. Actual values vary by config.
          </p>
          <div className="rounded-2xl border border-white/[0.06] bg-[rgba(14,14,20,0.7)] p-6">
            <div className="grid gap-8 sm:grid-cols-2">
              {/* Startup time */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#06b6d4]" />
                  <h3 className="font-semibold text-[#F0EEFC]">Cold-start time</h3>
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
                <p className="mt-3 text-xs text-[#6B6890]">Lower is faster</p>
              </div>

              {/* Memory */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[#a78bfa]" />
                  <h3 className="font-semibold text-[#F0EEFC]">Baseline memory usage</h3>
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
                <p className="mt-3 text-xs text-[#6B6890]">Lower is leaner</p>
              </div>
            </div>

            {/* Summary callout */}
            <div className="mt-6 rounded-xl border border-[#f472b6]/20 bg-[#f472b6]/5 px-4 py-3 text-sm text-[#A5A1C2]">
              <span className="font-semibold text-[#f472b6]">🌸 Milady</span> is the fastest and lightest — ideal for free-tier deployments.
              {' '}<span className="font-semibold text-[#06b6d4]">🦞 OpenClaw</span> packs the most tools but needs more resources.
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
            className="mb-2 text-xl font-bold text-[#F0EEFC]"
          >
            Configuration examples
          </motion.h2>
          <p className="mb-6 text-sm text-[#A5A1C2]">
            Each framework has its own config format. Here&apos;s what a typical setup looks like.
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
                    ? cn('border-white/[0.1] bg-[rgba(14,14,20,0.9)]', fw.text)
                    : 'border-transparent text-[#6B6890] hover:text-[#A5A1C2]'
                )}
              >
                {fw.emoji} {fw.name}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="rounded-b-2xl rounded-tr-2xl border border-white/[0.1] bg-[rgba(8,8,14,0.95)] p-5">
            <AnimatePresence mode="wait">
              <motion.pre
                key={activeCode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="overflow-x-auto font-mono text-xs leading-relaxed text-[#A5A1C2]"
              >
                <code>{activeFramework.configExample}</code>
              </motion.pre>
            </AnimatePresence>

            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <span className="text-xs text-[#6B6890]">
                Full configuration reference →
              </span>
              <a
                href={activeFramework.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('inline-flex items-center gap-1 text-xs font-medium', activeFramework.text)}
              >
                {activeFramework.name} docs
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
            className="mb-2 text-xl font-bold text-[#F0EEFC]"
          >
            LLM support
          </motion.h2>
          <p className="mb-6 text-sm text-[#A5A1C2]">
            All frameworks support BYOK (Bring Your Own Key) for unlimited messages. Free-tier agents use our hosted Groq key.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FRAMEWORKS.map((fw) => (
              <div
                key={fw.key}
                className={cn('rounded-2xl border p-4', fw.border, 'bg-[rgba(14,14,20,0.7)]')}
              >
                <h3 className={cn('mb-3 font-semibold', fw.text)}>
                  {fw.emoji} {fw.name}
                </h3>
                <div className="space-y-1.5">
                  {fw.llmSupport.map((llm) => (
                    <div key={llm} className="flex items-center gap-2 text-xs text-[#A5A1C2]">
                      <Check className={cn('h-3 w-3 flex-shrink-0', fw.text)} />
                      {llm}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#6B6890]">
            * BYOK always free — unlimited messages on any framework.{' '}
            <Link href="/docs/api" className="text-[#06b6d4] underline-offset-2 hover:underline">
              View BYOK setup guide →
            </Link>
          </p>
        </section>

        {/* ── Decision guide ────────────────────────────────── */}
        <section>
          <div className="rounded-2xl border border-[#06b6d4]/20 bg-gradient-to-br from-[#06b6d4]/5 to-[#a78bfa]/5 p-8">
            <h2 className="mb-6 text-xl font-bold text-[#F0EEFC]">Quick decision guide</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  condition: 'I want maximum tools and automation',
                  pick: 'OpenClaw',
                  emoji: '🦞',
                  color: 'text-[#06b6d4]',
                },
                {
                  condition: 'I want an agent that learns over time',
                  pick: 'Hermes',
                  emoji: '🪽',
                  color: 'text-[#a78bfa]',
                },
                {
                  condition: 'I want a social media or community bot',
                  pick: 'ElizaOS',
                  emoji: '🎭',
                  color: 'text-[#4ade80]',
                },
                {
                  condition: "I'm just getting started and want simple",
                  pick: 'Milady',
                  emoji: '🌸',
                  color: 'text-[#f472b6]',
                },
                {
                  condition: 'I need multi-channel messaging (Telegram + Discord + WhatsApp)',
                  pick: 'OpenClaw or Hermes',
                  emoji: '🦞🪽',
                  color: 'text-[#06b6d4]',
                },
                {
                  condition: 'I want a character-driven persona bot',
                  pick: 'ElizaOS or Milady',
                  emoji: '🎭🌸',
                  color: 'text-[#4ade80]',
                },
              ].map((item) => (
                <div
                  key={item.condition}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#06b6d4]" />
                  <div>
                    <p className="text-sm text-[#A5A1C2]">{item.condition}</p>
                    <p className={cn('mt-1 text-sm font-bold', item.color)}>
                      {item.emoji} {item.pick}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-[rgba(14,14,20,0.7)] p-10">
            <Bot className="mx-auto mb-4 h-10 w-10 text-[#6B6890]" />
            <h2 className="mb-2 text-2xl font-bold text-[#F0EEFC]">Ready to deploy?</h2>
            <p className="mx-auto mb-8 max-w-md text-[#A5A1C2]">
              Pick a framework, configure your agent, and go live in under 60 seconds. Free tier included.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/create"
                className="inline-flex items-center gap-2 rounded-xl bg-[#06b6d4] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#06b6d4]/20 transition-all duration-200 hover:bg-[#0891b2]"
              >
                <Rocket className="h-4 w-4" />
                Deploy your first agent
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#A5A1C2] transition-all duration-200 hover:border-white/[0.12] hover:text-[#F0EEFC]"
              >
                View pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
