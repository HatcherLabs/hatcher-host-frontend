'use client';

import { ArrowUpRight, CalendarCheck, ChartNoAxesCombined, Code2, Mail, MessagesSquare, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AGENT_EXAMPLE_IDS, agentExampleHref } from '@/lib/agent-examples';
import styles from './SectionExamples.module.css';

const ICONS = {
  personal: CalendarCheck,
  trader: ChartNoAxesCombined,
  email: Mail,
  messages: MessagesSquare,
  coding: Code2,
  research: Search,
};

export function SectionExamples() {
  const t = useTranslations('landingV3.examples');

  return (
    <section id="examples" className={styles.section} aria-labelledby="examples-heading">
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 id="examples-heading" className={styles.title}>{t('title')}</h2>
          <p className={styles.body}>{t('body')}</p>
        </header>
        <ul className={styles.examples}>
          {AGENT_EXAMPLE_IDS.map((id) => {
            const Icon = ICONS[id];
            return (
              <li key={id} className={styles.example}>
                <div className={styles.exampleHeading}>
                  <Icon size={22} strokeWidth={1.6} aria-hidden />
                  <h3>{t(`items.${id}.title`)}</h3>
                </div>
                <p className={styles.description}>{t(`items.${id}.body`)}</p>
                <blockquote className={styles.prompt}>{t(`items.${id}.prompt`)}</blockquote>
                <Link
                  href={agentExampleHref(id)}
                  className={styles.link}
                  aria-label={t('ctaLabel', { name: t(`items.${id}.title`) })}
                >
                  {t('cta')} <ArrowUpRight size={16} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
        <p className={styles.note}>{t('note')}</p>
      </div>
    </section>
  );
}
