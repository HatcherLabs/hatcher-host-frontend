import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react';
import { HatchDemoActions } from './HatchDemoActions';
import styles from './hatch-demo.module.css';

const HATCH_AGENT_ID = 'cmp2dohkb00jtlsvsq1m5hriq';
const INSTALL_SNIPPET =
  '<script src="https://hatcher.host/embed/widget.js" data-agent="cmp2dohkb00jtlsvsq1m5hriq" data-theme="dark" data-accent="green" defer></script>';

export const metadata: Metadata = {
  title: 'Hatch live embed demo',
  description: 'Try Hatch, the official Hatcher assistant, embedded in a real webpage.',
  alternates: { canonical: '/demo/hatch' },
  openGraph: {
    title: 'Hatch live embed demo',
    description: 'See how a live Hatcher agent looks and works on any website.',
    url: 'https://hatcher.host/demo/hatch',
    siteName: 'Hatcher',
    type: 'website',
  },
};

const benefits = [
  {
    title: 'Lazy-loaded',
    body: 'The chat runtime loads only when a visitor opens it.',
    icon: Zap,
  },
  {
    title: 'Public credit cap',
    body: 'Built-in usage limits keep public access controlled.',
    icon: ShieldCheck,
  },
  {
    title: 'Theme controls',
    body: 'Match the launcher to your site in a few attributes.',
    icon: SlidersHorizontal,
  },
] as const;

export default function HatchEmbedDemoPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Hatcher home">
          <span>HATCH</span>
          <i aria-hidden="true">/</i>
          <small>LIVE DEMO</small>
        </Link>
        <nav className={styles.nav} aria-label="Demo navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/dashboard/agents">Embed your agent</Link>
        </nav>
        <Link href="/dashboard/agents" className={styles.headerAction}>
          Build on Hatcher
          <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.orbits} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.heroContent}>
            <h1>Your AI agent, one click away.</h1>
            <p>
              Meet Hatch — Hatcher&apos;s official product and support assistant. This page uses
              the same one-line embed you can add to any website.
            </p>
            <div className={styles.heroActions}>
              <HatchDemoActions agent={HATCH_AGENT_ID} label="Open Hatch" />
              <a href="#install-code" className={styles.textAction}>
                View install code
                <ArrowRight aria-hidden="true" />
              </a>
            </div>
            <div className={styles.liveHint}>
              <span aria-hidden="true" />
              Try the live chat in the bottom-right corner.
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.details}>
          <div className={styles.detailsInner}>
            <div className={styles.detailsIntro}>
              <h2>One script. Your agent. Any site.</h2>
              <p>Add Hatcher to your site with a single, lazy-loaded script tag.</p>
            </div>
            <pre id="install-code" className={styles.codeBlock} tabIndex={0}>
              <code>{INSTALL_SNIPPET}</code>
            </pre>
            <div className={styles.benefits}>
              {benefits.map(({ title, body, icon: Icon }) => (
                <article key={title}>
                  <Icon aria-hidden="true" />
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        Powered by <Link href="/">Hatcher</Link>
      </footer>

      <Script
        src="/embed/widget.js"
        data-agent={HATCH_AGENT_ID}
        data-theme="dark"
        data-accent="green"
        data-position="right"
        data-label="Chat with Hatch"
        data-open="true"
        strategy="afterInteractive"
      />
    </div>
  );
}
