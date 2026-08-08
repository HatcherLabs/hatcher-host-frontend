import type { Metadata } from 'next';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  BookOpenText,
  Bot,
  CircleGauge,
  Landmark,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { Link } from '@/i18n/routing';
import { buildLanguagesMap } from '@/lib/seo';
import {
  latestReleases,
  phases,
  roadmapUpdatedAt,
  type RoadmapIcon,
  type RoadmapTag,
} from './roadmap-data';
import styles from './page.module.css';

export function generateMetadata(): Metadata {
  return {
    title: 'Roadmap — Hatcher',
    description:
      'What is live on Hatcher, what ships next, and the longer-term bets — from the public inference API to the EquiFold agent economy.',
    alternates: {
      canonical: '/roadmap',
      languages: buildLanguagesMap('/roadmap'),
    },
  };
}

const ICONS: Partial<Record<RoadmapIcon, LucideIcon>> = {
  operate: CircleGauge,
  metering: CircleGauge,
  own: Landmark,
  run: Bot,
};

const TAG_LABEL: Record<RoadmapTag, string> = {
  hatcher: 'HATCHER',
  equifold: '× EQUIFOLD',
};

const STATUS_CLASS = {
  shipped: 'statusShipped',
  now: 'statusNow',
  next: 'statusNext',
  later: 'statusLater',
} as const;

function TagChips({ tags }: { tags?: readonly RoadmapTag[] }) {
  if (!tags?.length) return null;

  return (
    <span className={styles.tagRow}>
      {tags.map((tag) => (
        <span key={tag} className={`${styles.tag} ${styles[`tag_${tag}`]}`}>
          {TAG_LABEL[tag]}
        </span>
      ))}
    </span>
  );
}

export default async function RoadmapPage() {
  const t = await getTranslations('roadmap');

  return (
    <MarketingShell>
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="roadmap-title">
          <div className={styles.heroCopy}>
            <h1 id="roadmap-title">{t('heading')}</h1>
            <p className={styles.heroText}>
              {t('subheading')}{' '}
              <Link
                href="https://x.com/hatcherlabs"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.heroInlineLink}
              >
                {t('followHandle')}
              </Link>
              .
            </p>

            <div className={styles.heroActions}>
              <Link href="/changelog" className={styles.primaryAction}>
                <BookOpenText aria-hidden="true" />
                View changelog
              </Link>
              <Link href="/dashboard/missions" className={styles.secondaryAction}>
                Open Mission Control
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>

            <p className={styles.updateLine}>
              <span className={styles.liveDot} aria-hidden="true" />
              Updated <time dateTime={roadmapUpdatedAt.dateTime}>{roadmapUpdatedAt.label}</time>
              <span aria-hidden="true">·</span>
              Shipping continuously
            </p>
          </div>

          <aside className={styles.releasePanel} aria-labelledby="latest-releases-title">
            <div className={styles.releaseHeader}>
              <h2 id="latest-releases-title">Latest releases</h2>
              <span>{t('liveLabel')}</span>
            </div>
            <ol className={styles.releaseRail}>
              {latestReleases.map((release) => {
                const Icon = ICONS[release.icon] ?? CircleGauge;

                return (
                  <li key={release.id}>
                    <span className={styles.releaseNode} aria-hidden="true">
                      <Icon />
                    </span>
                    <div>
                      <h3>{release.title}</h3>
                      <p>{release.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        </section>

        <section className={styles.railsNote} aria-label="Token rails">
          <div className={styles.sectionInner}>
            <p>
              <span className={`${styles.tag} ${styles.tag_hatcher}`}>HATCHER</span>
              marks features that add utility to the HATCHER token — staking, burns,
              and AI Credit top-ups.
              <span className={`${styles.tag} ${styles.tag_equifold}`}>× EQUIFOLD</span>
              marks the growing bridge to our EquiFold launchpad, where launchpad
              services run on EQUI.
            </p>
          </div>
        </section>

        {phases.map((phase) => (
          <section
            key={phase.id}
            className={styles.phaseSection}
            aria-labelledby={`phase-${phase.id}-title`}
          >
            <div className={styles.sectionInner}>
              <div className={styles.phaseLayout}>
                <span className={styles.phaseNode} data-status={phase.status} aria-hidden="true" />
                <header className={styles.phaseHead}>
                  <p className={styles.phaseMeta}>
                    <span className={`${styles.statusChip} ${styles[STATUS_CLASS[phase.status]]}`}>
                      {phase.statusLabel}
                    </span>
                    <span className={styles.phaseTimeframe}>{phase.timeframe}</span>
                  </p>
                  <h2 id={`phase-${phase.id}-title`}>{phase.title}</h2>
                  <p className={styles.phaseBlurb}>{phase.blurb}</p>
                </header>

                {phase.status === 'shipped' ? (
                  <div className={styles.shippedGrid}>
                    {phase.items.map((item) => (
                      <article key={item.id}>
                        <h3>
                          {item.title}
                          <TagChips tags={item.tags} />
                        </h3>
                        <p>{item.note}</p>
                        {item.href ? (
                          <Link href={item.href} className={styles.inlineLink}>
                            {item.linkLabel ?? 'Open'}
                            <ArrowUpRight aria-hidden="true" />
                          </Link>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <ul className={styles.phaseItems}>
                    {phase.items.map((item) => (
                      <li key={item.id}>
                        <h3>
                          {item.title}
                          <TagChips tags={item.tags} />
                        </h3>
                        <p>{item.note}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        ))}

        <section className={styles.cta} aria-labelledby="roadmap-cta-title">
          <div>
            <h2 id="roadmap-cta-title">Help shape what ships next.</h2>
            <p>{t('featureRequest')}</p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/support" className={styles.primaryAction}>
              {t('submitRequest')}
              <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link
              href="https://x.com/hatcherlabs"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryAction}
            >
              {t('followOnX')}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.disclaimer}>
            Roadmap items are directional and may change with user demand, technical
            constraints, partner readiness, and legal review.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
