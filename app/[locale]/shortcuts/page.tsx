'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Keyboard, ArrowLeft, Command } from 'lucide-react';

// ─── Shortcut Data ──────────────────────────────────────────

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Escape'], description: 'Close modals and overlays' },
      { keys: ['?'], description: 'Show shortcut help modal (when not in a text field)' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['N'], description: 'New agent' },
      { keys: ['T'], description: 'Templates' },
      { keys: ['/'], description: 'Focus search' },
    ],
  },
  {
    title: 'Agents',
    shortcuts: [
      { keys: ['1'], description: 'Select first agent' },
      { keys: ['2'], description: 'Select second agent' },
      { keys: ['1', '-', '9'], description: 'Select agent by position' },
    ],
  },
  {
    title: 'Command Palette',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate through results' },
      { keys: ['↵'], description: 'Execute selected command' },
      { keys: ['Escape'], description: 'Close palette' },
    ],
  },
];

// ─── Animation Variants ─────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ─── Kbd Component ──────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-mono font-medium rounded-lg border transition-colors"
      style={{
        color: 'var(--text-primary)',
        background: 'var(--bg-card)',
        borderColor: 'var(--border-default)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </kbd>
  );
}

// ─── Page ───────────────────────────────────────────────────

export default function ShortcutsPage() {
  const t = useTranslations('shortcuts');

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <motion.div
        className="max-w-2xl mx-auto space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back link */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            <ArrowLeft size={14} />
            {t('backToDashboard')}
          </Link>
        </motion.div>

        {/* Page Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.12)' }}
            >
              <Keyboard size={20} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                {t('heading')}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {t('subheading')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tip card */}
        <motion.div variants={itemVariants}>
          <div
            className="rounded-2xl border p-4 flex items-start gap-3"
            style={{
              background: 'rgba(6,182,212,0.04)',
              borderColor: 'rgba(6,182,212,0.15)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(6,182,212,0.1)' }}
            >
              <Command size={14} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t('quickTipLabel')}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {t('quickTipBody')}{' '}
                <Kbd>Ctrl</Kbd>
                <span className="mx-1 text-[var(--text-muted)]">+</span>
                <Kbd>K</Kbd>
                {' '}anywhere to open the command palette. Search for pages, agents, or actions instantly.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Shortcut groups */}
        {SHORTCUT_GROUPS.map((group) => (
          <motion.div key={group.title} variants={itemVariants}>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl overflow-hidden">
              {/* Group header */}
              <div className="px-6 pt-5 pb-3">
                <h2
                  className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                >
                  {group.title}
                </h2>
              </div>

              {/* Shortcut rows */}
              <div className="px-6 pb-4 space-y-0">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 border-b border-[var(--border-default)] last:border-b-0"
                  >
                    <span className="text-sm text-[var(--text-secondary)]">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                      {shortcut.keys.map((key, ki) => (
                        key === '+' || key === '-' ? (
                          <span key={ki} className="text-xs text-[var(--text-muted)]">{key}</span>
                        ) : (
                          <Kbd key={ki}>{key}</Kbd>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Footer note */}
        <motion.div variants={itemVariants}>
          <p className="text-center text-xs text-[var(--text-muted)] pb-8">
            {t('footerNote')}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
