import type { Metadata } from 'next';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpenText,
  Bot,
  Building2,
  Check,
  CircleGauge,
  Coins,
  Landmark,
  ListChecks,
  Network,
  PackageCheck,
  Repeat2,
  Route,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { Link } from '@/i18n/routing';
import { buildLanguagesMap } from '@/lib/seo';
import {
  buildingNext,
  exploring,
  latestReleases,
  liveTracks,
  roadmapUpdatedAt,
  type RoadmapIcon,
} from './roadmap-data';
import styles from './page.module.css';

export function generateMetadata(): Metadata {
  return {
    title: 'Roadmap — Hatcher',
    description:
      'What is live on Hatcher, what we are building next, and the longer-term bets behind the agent operating system.',
    alternates: {
      canonical: '/roadmap',
      languages: buildLanguagesMap('/roadmap'),
    },
  };
}

const ICONS: Record<RoadmapIcon, LucideIcon> = {
  mission: ListChecks,
  packs: PackageCheck,
  lift: Upload,
  models: Network,
  operate: CircleGauge,
  run: Bot,
  route: Route,
  own: Landmark,
  metering: CircleGauge,
  approvals: ShieldCheck,
  recurring: Repeat2,
  earn: Coins,
  city: Building2,
  verified: BadgeCheck,
};

const PROOF_ICONS: Record<(typeof buildingNext)[number]['id'], readonly LucideIcon[]> = {
  'outcome-packs-v2': [PackageCheck, Repeat2, ShieldCheck],
};

function SectionHeading({
  title,
  description,
  id,
}: {
  title: string;
  description: string;
  id: string;
}) {
  return (
    <header className={styles.sectionHeading}>
      <span className={styles.headingRail} aria-hidden="true">
        <span />
      </span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
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
                const Icon = ICONS[release.icon];

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

        <section className={styles.liveSection} aria-labelledby="live-now-title">
          <div className={styles.sectionInner}>
            <SectionHeading
              id="live-now-title"
              title="Live now"
              description="A current view of the product—not a list of promises from launch week."
            />

            <div className={styles.liveTimeline}>
              {liveTracks.map((track, index) => {
                const Icon = ICONS[track.icon];

                return (
                  <article className={styles.liveRow} key={track.id}>
                    <div className={styles.liveMarker} aria-hidden="true">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <i />
                    </div>

                    <div className={styles.liveCopy}>
                      <div className={styles.trackLabel}>
                        <Icon aria-hidden="true" />
                        <span>{track.label}</span>
                      </div>
                      <h3>{track.title}</h3>
                      <p>{track.summary}</p>
                      <Link href={track.href} className={styles.inlineLink}>
                        {track.linkLabel}
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    </div>

                    <ul className={styles.evidenceList}>
                      {track.evidence.map((item) => (
                        <li key={item}>
                          <Check aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.buildSection} aria-labelledby="building-next-title">
          <div className={styles.sectionInner}>
            <SectionHeading
              id="building-next-title"
              title="Building next"
              description="Directional targets, shipped when the product evidence is ready—not on arbitrary dates."
            />

            <div className={styles.targetTimeline}>
              {buildingNext.map((target, index) => {
                const Icon = ICONS[target.icon];

                return (
                  <article className={styles.targetRow} key={target.id}>
                    <div className={styles.targetMarker} aria-hidden="true">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </div>

                    <div className={styles.targetCopy}>
                      <Icon aria-hidden="true" />
                      <div>
                        <h3>{target.title}</h3>
                        <p>{target.description}</p>
                      </div>
                    </div>

                    <div className={styles.proofColumn}>
                      <p className={styles.proofLabel}>Proof targets</p>
                      <ul>
                        {target.proofTargets.map((proof, proofIndex) => {
                          const ProofIcon = PROOF_ICONS[target.id][proofIndex] ?? Check;

                          return (
                            <li key={proof}>
                              <ProofIcon aria-hidden="true" />
                              <span>{proof}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className={styles.exploringBand}>
              <div className={styles.exploringTitle}>
                <h2>Exploring</h2>
                <span aria-hidden="true" />
              </div>
              <div className={styles.exploringGrid}>
                {exploring.map((item) => {
                  const Icon = ICONS[item.icon];

                  return (
                    <article key={item.id}>
                      <Icon aria-hidden="true" />
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

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
