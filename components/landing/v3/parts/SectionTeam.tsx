// components/landing/v3/parts/SectionTeam.tsx
'use client';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionTeam.module.css';

const MEMBERS = [
  {
    key: 'cristian',
    nameKey: 'cristianName',
    roleKey: 'cristianRole',
    tagKey: 'founderTag',
    avatar: 'C',
    imageSrc: '/landing-v3/team-cristian.jpg',
    socialHref: 'https://x.com/CristianG1296',
    accent: '#39FF88',
  },
  {
    key: 'ioana',
    nameKey: 'ioanaName',
    roleKey: 'ioanaRole',
    tagKey: 'growthTag',
    avatar: 'I',
    socialHref: 'https://x.com/IoanaG663',
    accent: '#F472B6',
  },
  {
    key: 'john',
    nameKey: 'johnName',
    roleKey: 'johnRole',
    tagKey: 'builderTag',
    avatar: 'J',
    accent: '#38BDF8',
  },
  {
    key: 'anonymous-one',
    nameKey: 'anonymousOneName',
    roleKey: 'anonymousOneRole',
    tagKey: 'anonymousTag',
    avatar: 'A1',
    accent: '#FACC15',
  },
  {
    key: 'anonymous-two',
    nameKey: 'anonymousTwoName',
    roleKey: 'anonymousTwoRole',
    tagKey: 'anonymousTag',
    avatar: 'A2',
    accent: '#A78BFA',
  },
] as const;

export function SectionTeam() {
  const t = useTranslations('landingV3.team');

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>{t('boxLabel')}</BoxLabel>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.sub}>{t('sub')}</p>
        </header>

        <div className={styles.grid}>
          {MEMBERS.map((member) => (
            <article key={member.key} className={styles.card}>
              <div className={styles.topRow}>
                <div
                  className={styles.avatarWrap}
                  style={{ '--team-accent': member.accent } as CSSProperties}
                >
                  {'imageSrc' in member ? (
                    <Image
                      src={member.imageSrc}
                      alt={t(member.nameKey)}
                      width={112}
                      height={112}
                      className={styles.photo}
                    />
                  ) : (
                    <span className={styles.avatar} aria-hidden>
                      {member.avatar}
                    </span>
                  )}
                </div>
                {'socialHref' in member && (
                  <a
                    href={member.socialHref}
                    className={styles.socialLink}
                    aria-label={`X profile: ${t(member.nameKey)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <XIcon />
                  </a>
                )}
              </div>
              <div className={styles.copy}>
                <h3 className={styles.name}>{t(member.nameKey)}</h3>
                <p className={styles.role}>{t(member.roleKey)}</p>
              </div>
              <span className={styles.tag}>{t(member.tagKey)}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
