import { TIERS } from '@hatcher/shared';
import { localizedMetadata } from '@/lib/seo';
import type { Metadata } from "next";
import { LandingV3 } from "@/components/landing/v3/LandingV3";
import { Link } from "@/i18n/routing";
const pageMetadata: Metadata = {
  title: "The Hatcher platform",
  description:
    "Explore Hatcher agents, integrations, hosting, plans and token utility.",
};
export default function PlatformPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-3 text-xs text-[var(--text-secondary)]">
        <span>Explore the Hatcher platform</span>
        <Link
          href={
            process.env.HATCHER_CHAT_ENTRY_ENABLED === "true"
              ? "/"
              : "/dashboard/chat"
          }
          className="font-semibold text-[var(--text-primary)] underline underline-offset-4"
        >
          Back to chat
        </Link>
      </div>
      <LandingV3 />
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
