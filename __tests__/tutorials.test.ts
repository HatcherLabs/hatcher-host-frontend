import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HATCHER_TUTORIALS } from '@/lib/tutorials';

describe('tutorial library', () => {
  it('publishes every tutorial with a local video and poster', () => {
    expect(HATCHER_TUTORIALS).toHaveLength(7);

    for (const tutorial of HATCHER_TUTORIALS) {
      expect(tutorial.durationIso).toMatch(/^PT/);
      expect(tutorial.featureHref).toMatch(/^\//);
      expect(existsSync(resolve(process.cwd(), 'public', tutorial.videoSrc.slice(1)))).toBe(true);
      expect(existsSync(resolve(process.cwd(), 'public', tutorial.posterSrc.slice(1)))).toBe(true);
    }
  });

  it('keeps tutorial slugs unique for stable deep links', () => {
    const slugs = HATCHER_TUTORIALS.map((tutorial) => tutorial.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
