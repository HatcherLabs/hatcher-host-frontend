import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/v3/MarketingShell";
import { PublicTradersExplorer } from "@/components/traders/PublicTradersExplorer";
import type { PublicTraderDirectoryData } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { buildLanguagesMap } from "@/lib/seo";
import { shouldSkipStaticApiFetch } from "@/lib/static-api-fetch";

type PublicTradersEnvelope = {
  success?: boolean;
  data?: PublicTraderDirectoryData;
};

export const metadata: Metadata = {
  title: "Explore Public AI Traders",
  description:
    "Discover tokenized Hatcher agents and follow their public Robinhood Chain activity.",
  alternates: {
    canonical: "/traders",
    languages: buildLanguagesMap("/traders"),
  },
  openGraph: {
    title: "Explore Public AI Traders · Hatcher",
    description:
      "Discover tokenized Hatcher agents and follow their public Robinhood Chain activity.",
    url: "https://hatcher.host/traders",
    siteName: "Hatcher",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Public AI Traders · Hatcher",
    description:
      "Discover tokenized Hatcher agents and follow their public Robinhood Chain activity.",
  },
};

async function fetchPublicTraders(): Promise<PublicTraderDirectoryData | null> {
  if (shouldSkipStaticApiFetch(API_URL)) return null;

  try {
    const response = await fetch(
      `${API_URL}/agents/public-traders?sort=marketCap&page=1&limit=24`,
      { next: { revalidate: 15 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as PublicTradersEnvelope;
    return body.success ? (body.data ?? null) : null;
  } catch {
    return null;
  }
}

export default async function PublicTradersPage() {
  const initialData = await fetchPublicTraders();

  return (
    <MarketingShell>
      <PublicTradersExplorer initialData={initialData} />
    </MarketingShell>
  );
}
