import { TIERS } from '@hatcher/shared';
import { localizedMetadata } from '@/lib/seo';
import type { Metadata } from "next";
import { PlatformOverview } from "@/components/workspace/PlatformOverview";
const pageMetadata: Metadata = {
  title: "The Hatcher platform",
  description:
    "Explore Hatcher agents, integrations, hosting, plans and token utility.",
};
export default async function PlatformPage() {
  return (
    <>
      <PlatformOverview />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'SoftwareApplication',
        name: 'Hatcher', url: 'https://hatcher.host/platform',
        applicationCategory: 'DeveloperApplication', operatingSystem: 'Web',
        description: 'Managed AI agent hosting with workspace controls, models, tools, and integrations.',
        offers: Object.values(TIERS).map((tier) => ({
          '@type': 'Offer', name: tier.name, price: tier.usdPrice,
          priceCurrency: 'USD', url: 'https://hatcher.host/pricing',
        })),
      }).replace(/</g, '\\u003c') }} />
    </>
  );
}

export const generateMetadata = localizedMetadata('/platform', pageMetadata);
