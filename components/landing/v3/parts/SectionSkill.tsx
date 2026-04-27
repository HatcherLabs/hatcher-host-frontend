// components/landing/v3/parts/SectionSkill.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionSkill.module.css';

const SKILL_URL = 'https://hatcher.host/skill.md';
const GITHUB_URL = 'https://github.com/HatcherLabs/hatcher-skill';
const PROMPT = `Read ${SKILL_URL} and follow the instructions to deploy AI agents on Hatcher.`;

/**
 * The "let your coding agent deploy Hatcher agents" pitch — paste a
 * single prompt into Claude Code / Cursor / any URL-fetching coding
 * agent and it registers an account + spins up subagents on the
 * platform.
 *
 * Restored from the v2 landing's `AgentDiscoverySection`. Same i18n
 * namespace (`landing.agentDiscovery`) and same external links so
 * existing translations + skill.md route keep working.
 */
export function SectionSkill() {
  const t = useTranslations('landing.agentDiscovery');
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked (insecure context, permissions);
      // silently no-op so the user can select-copy manually instead.
    }
  }

  const steps = [
    { num: '01', text: t('step01') },
    { num: '02', text: t('step02') },
    { num: '03', text: t('step03') },
  ];

  return (
    <section id="for-ai-agents" className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>{t('eyebrow')}</BoxLabel>
          <h2 className={styles.title}>{t('heading')}</h2>
          <p className={styles.body}>{t('body')}</p>
        </header>

        <div className={styles.layout}>
          {/* ── Left: prompt terminal ── */}
          <div className={styles.terminal}>
            <div className={styles.terminalHead}>
              <span className={styles.terminalLabel}>{t('promptLabel')}</span>
              <button
                type="button"
                onClick={copyPrompt}
                className={styles.copyBtn}
                aria-label={copied ? t('copiedAriaLabel') : t('copyAriaLabel')}
              >
                {copied ? `✓ ${t('copiedLabel')}` : `▎ ${t('copyLabel')}`}
              </button>
            </div>
            <pre className={styles.prompt}>
              <span className={styles.promptCursor} aria-hidden>$ </span>
              Read{' '}
              <a
                href={SKILL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.promptUrl}
              >
                {SKILL_URL}
              </a>{' '}
              and follow the instructions to deploy AI agents on Hatcher.
            </pre>
            <div className={styles.terminalFoot}>
              <a
                href={SKILL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footLink}
              >
                ▎ {t('viewSkillMd')} →
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footLink}
              >
                ▎ {t('githubSource')} →
              </a>
            </div>
          </div>

          {/* ── Right: numbered steps ── */}
          <ol className={styles.steps}>
            {steps.map((step) => (
              <li key={step.num} className={styles.step}>
                <span className={styles.stepNum} aria-hidden>{step.num}</span>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
