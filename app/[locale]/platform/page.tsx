import type { Metadata } from "next";
import { LandingV3 } from "@/components/landing/v3/LandingV3";
import { Link } from "@/i18n/routing";
import { buildLanguagesMap } from "@/lib/seo";
export const metadata: Metadata = {
  title: "The Hatcher platform",
  description:
    "Explore Hatcher agents, integrations, hosting, plans and token utility.",
  alternates: {
    canonical: "/platform",
    languages: buildLanguagesMap("/platform"),
  },
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
    </>
  );
}
