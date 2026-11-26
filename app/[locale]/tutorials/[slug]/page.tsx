import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { HATCHER_TUTORIALS } from '@/lib/tutorials';
import { TUTORIAL_GUIDES } from '@/lib/tutorial-guides';
import { TUTORIAL_TRANSCRIPTS } from '@/lib/tutorial-transcripts';
import { buildPageAlternates } from '@/lib/seo';
import styles from '../page.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';
type Props = { params: Promise<{ slug: string; locale: string }> };

function getTutorial(slug: string) {
  const tutorial = HATCHER_TUTORIALS.find((item) => item.slug === slug);
  if (!tutorial) notFound();
  return tutorial;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tutorial = getTutorial((await params).slug);
  const url = `${SITE_URL}/tutorials/${tutorial.slug}`;
  return {
    title: `${tutorial.title} — Hatcher video tutorial`,
    description: tutorial.description,
    alternates: buildPageAlternates(`/tutorials/${tutorial.slug}`),
    openGraph: { title: tutorial.title, description: tutorial.description, url,
      type: 'video.other', images: [{ url: `${SITE_URL}${tutorial.posterSrc}`, width: 1280, height: 720, alt: tutorial.title }] },
    twitter: { card: 'summary_large_image', title: tutorial.title, description: tutorial.description, images: [`${SITE_URL}${tutorial.posterSrc}`] },
  };
}

export default async function TutorialPage({ params }: Props) {
  const { slug, locale } = await params;
  const tutorial = getTutorial(slug);
  const guide = TUTORIAL_GUIDES[tutorial.slug];
  const transcript = TUTORIAL_TRANSCRIPTS[tutorial.slug];
  const url = `${SITE_URL}/tutorials/${tutorial.slug}`;
  const index = HATCHER_TUTORIALS.indexOf(tutorial);
  const related = [HATCHER_TUTORIALS[(index + 1) % HATCHER_TUTORIALS.length], HATCHER_TUTORIALS[(index + 2) % HATCHER_TUTORIALS.length]];
  const schema = {
    '@context': 'https://schema.org', '@graph': [{
      '@type': 'VideoObject', '@id': `${url}#video`, url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      name: tutorial.title, description: tutorial.description,
      thumbnailUrl: `${SITE_URL}${tutorial.posterSrc}`, contentUrl: `${SITE_URL}${tutorial.videoSrc}`,
      duration: tutorial.durationIso, uploadDate: tutorial.uploadDate, inLanguage: 'en',
      creator: { '@type': 'Organization', name: 'Hatcher', url: SITE_URL },
      ...(transcript ? { transcript } : {}),
    }, {
      '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Hatcher', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Tutorials', item: `${SITE_URL}/tutorials` },
        { '@type': 'ListItem', position: 3, name: tutorial.title, item: url },
      ],
    }],
  };
  return (
    <MarketingShell contentLanguage="en">
      <article className={styles.container}>
        <header className={styles.watchHeader}>
          <nav aria-label="Breadcrumb"><Link href="/tutorials" locale={locale === 'en' ? undefined : 'en'}>Tutorials</Link><span aria-hidden="true"> / </span><span>{tutorial.topic}</span></nav>
          <h1>{tutorial.title}</h1>
          <p>{tutorial.description}</p>
          <p className={styles.meta}>{tutorial.duration} · English · Published <time dateTime={tutorial.uploadDate}>{new Date(tutorial.uploadDate).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</time></p>
        </header>
        <video className={styles.watchVideo} controls playsInline preload="metadata" poster={tutorial.posterSrc} aria-label={tutorial.title}>
          <source src={tutorial.videoSrc} type="video/mp4" />
          {transcript && <track kind="captions" src={`/tutorials/${tutorial.slug}.vtt`} srcLang="en" label="English" />}
          <a href={tutorial.videoSrc}>Download the video</a>
        </video>
        <div className={styles.writtenGuide}>
          <section aria-labelledby="before-you-start"><h2 id="before-you-start">Before you start</h2><p>{guide.before}</p></section>
          <section aria-labelledby="written-guide"><h2 id="written-guide">Written guide</h2>
            <ol>{guide.steps.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ol>
            <p className={styles.guideNote}>{guide.note}</p>
          </section>
          {transcript && <section aria-labelledby="transcript"><h2 id="transcript">Video transcript</h2><p>{transcript}</p></section>}
          <Link href={tutorial.featureHref} className={styles.primaryAction}>{tutorial.featureLabel}</Link>
          <section aria-labelledby="related-tutorials"><h2 id="related-tutorials">Continue learning</h2>
            <ul>{related.map((item) => <li key={item.slug}><Link href={`/tutorials/${item.slug}`} locale={locale === 'en' ? undefined : 'en'}>{item.title}</Link></li>)}</ul>
          </section>
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    </MarketingShell>
  );
}
