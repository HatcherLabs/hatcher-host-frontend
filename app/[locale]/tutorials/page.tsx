import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { HATCHER_TUTORIALS } from '@/lib/tutorials';
import { TutorialsPlayer } from './TutorialsPlayer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';

export default function TutorialsPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hatcher video tutorials',
    itemListElement: HATCHER_TUTORIALS.map((tutorial, index) => ({
      '@type': 'ListItem', position: index + 1, name: tutorial.title,
      url: `${SITE_URL}/tutorials/${tutorial.slug}`,
    })),
  };
  return (
    <MarketingShell contentLanguage="en">
      <TutorialsPlayer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    </MarketingShell>
  );
}
