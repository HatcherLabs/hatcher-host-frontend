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
    linkedInHref: 'https://www.linkedin.com/in/cristian-ghiorma-706933187',
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
                {('socialHref' in member || 'linkedInHref' in member) && (
                  <div className={styles.socialActions}>
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
                    {'linkedInHref' in member && (
                      <a
                        href={member.linkedInHref as string}
                        className={styles.socialLink}
                        aria-label={`LinkedIn profile: ${t(member.nameKey)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LinkedInIcon />
                      </a>
                    )}
                  </div>
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

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.32 8.08h4.34V23H.32V8.08Zm7.26 0h4.16v2.04h.06c.58-1.1 2-2.26 4.12-2.26 4.4 0 5.22 2.9 5.22 6.68V23h-4.34v-7.5c0-1.78-.03-4.08-2.48-4.08-2.49 0-2.87 1.94-2.87 3.95V23H7.58V8.08Z" />
    </svg>
  );
}
