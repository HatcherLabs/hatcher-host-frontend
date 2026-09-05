'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Clock3, ExternalLink, Play, PlayCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { HATCHER_TUTORIALS } from '@/lib/tutorials';
import styles from './page.module.css';

export function TutorialsPlayer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = HATCHER_TUTORIALS[activeIndex];

  useEffect(() => {
    const slug = window.location.hash.slice(1);
    const index = HATCHER_TUTORIALS.findIndex((tutorial) => tutorial.slug === slug);
    if (index >= 0) setActiveIndex(index);
  }, []);

  const selectTutorial = (index: number) => {
    const tutorial = HATCHER_TUTORIALS[index];
    setActiveIndex(index);
    window.history.replaceState(null, '', `#${tutorial.slug}`);
    window.requestAnimationFrame(() => {
      document.getElementById('tutorial-player')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero} aria-labelledby="tutorials-title">
          <h1 id="tutorials-title">Learn Hatcher by doing.</h1>
          <p>
            Step-by-step video guides for building, operating, and connecting
            autonomous agents.
          </p>
        </section>

        <section
          id="tutorial-player"
          className={styles.featured}
          aria-labelledby="active-tutorial-title"
        >
          <div className={styles.playerFrame}>
            <video
              key={active.videoSrc}
              ref={videoRef}
              className={styles.video}
              controls
              playsInline
              preload="metadata"
              poster={active.posterSrc}
            >
              <source src={active.videoSrc} type="video/mp4" />
              Your browser does not support HTML video.
            </video>
          </div>

          <div className={styles.featuredCopy}>
            <p className={styles.topic}>{active.topic}</p>
            <h2 id="active-tutorial-title">{active.title}</h2>
            <p className={styles.meta}>
              <Clock3 aria-hidden="true" />
              {active.duration}
            </p>
            <p className={styles.description}>{active.description}</p>
            <div className={styles.featuredActions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => void videoRef.current?.play()}
              >
                <Play aria-hidden="true" />
                Watch now
              </button>
              <Link href={active.featureHref} className={styles.secondaryAction}>
                {active.featureLabel}
                <ExternalLink aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.library} aria-labelledby="tutorial-library-title">
          <div className={styles.sectionHeading}>
            <h2 id="tutorial-library-title">Tutorial library</h2>
            <p>{HATCHER_TUTORIALS.length} practical walkthroughs, with more on the way.</p>
          </div>

          <ol className={styles.tutorialList}>
            {HATCHER_TUTORIALS.map((tutorial, index) => (
              <li
                key={tutorial.slug}
                id={tutorial.slug}
                className={styles.tutorialRow}
                data-active={index === activeIndex ? 'true' : undefined}
              >
                <button
                  type="button"
                  className={styles.rowButton}
                  aria-pressed={index === activeIndex}
                  onClick={() => selectTutorial(index)}
                >
                  <span className={styles.sequence} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.posterFrame}>
                    <Image
                      src={tutorial.posterSrc}
                      alt=""
                      width={1280}
                      height={720}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                    <span className={styles.posterDuration}>
                      <Play aria-hidden="true" />
                      {tutorial.duration}
                    </span>
                  </span>
                  <span className={styles.rowCopy}>
                    <span className={styles.rowTitle}>{tutorial.title}</span>
                    <span className={styles.rowMeta}>
                      <Clock3 aria-hidden="true" />
                      {tutorial.duration}
                      <span aria-hidden="true">·</span>
                      {tutorial.topic}
                    </span>
                    <span className={styles.rowDescription}>{tutorial.description}</span>
                  </span>
                  <span className={styles.watchAction}>
                    Watch tutorial
                    <PlayCircle aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.cta} aria-labelledby="tutorials-cta-title">
          <div>
            <h2 id="tutorials-cta-title">Ready to build your agent?</h2>
            <p>Create an agent and start putting these workflows into practice.</p>
          </div>
          <Link href="/create" className={styles.primaryAction}>
            Create your first agent
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
