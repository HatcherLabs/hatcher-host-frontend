import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { HATCHER_TUTORIALS } from '@/lib/tutorials';
import { TutorialsPlayer } from './TutorialsPlayer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';

export default function TutorialsPage() {
  const videoSchema = {
    '@context': 'https://schema.org',
    '@graph': HATCHER_TUTORIALS.map((tutorial) => ({
      '@type': 'VideoObject',
      name: tutorial.title,
      description: tutorial.description,
      thumbnailUrl: `${SITE_URL}${tutorial.posterSrc}`,
      contentUrl: `${SITE_URL}${tutorial.videoSrc}`,
      duration: tutorial.durationIso,
      isFamilyFriendly: true,
      inLanguage: 'en',
    })),
  };

  return (
    <MarketingShell>
      <TutorialsPlayer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoSchema).replace(/</g, '\\u003c'),
        }}
      />
    </MarketingShell>
  );
}
