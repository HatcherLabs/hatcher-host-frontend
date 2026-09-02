import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/v3/MarketingShell";
import { API_URL } from "@/lib/config";
import { buildLanguagesMap } from "@/lib/seo";
import { ComputeExperience } from "./ComputeExperience";
import type { ComputeNetworkMetricValues } from "./compute-data";

interface ComputeStatsResponse {
  success: boolean;
  data?: {
    providers: { online: number };
    availableVramMb: number;
    jobs: { completed24h: number };
    settledUsdc: string;
  };
}

async function loadComputeMetrics(): Promise<ComputeNetworkMetricValues | null> {
  try {
    const response = await fetch(
      `${API_URL.replace(/\/+$/, "")}/compute/stats`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(2_500),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as ComputeStatsResponse;
    if (!payload.success || !payload.data) return null;
    const stats = payload.data;
    const settledUsdc = Number(stats.settledUsdc);
    return {
      "active-nodes": stats.providers.online,
      "available-vram": `${(stats.availableVramMb / 1024).toFixed(1)} GB`,
      "jobs-24h": stats.jobs.completed24h,
      "provider-payouts": `$${Number.isFinite(settledUsdc) ? settledUsdc.toFixed(2) : "0.00"}`,
    };
  } catch {
    return null;
  }
}

export function generateMetadata(): Metadata {
  return {
    title: "Hatcher Compute — Distributed inference network",
    description:
      "Contribute GPU capacity to Hatcher Compute, serve verified open-model inference, and receive USDC for accepted work.",
    alternates: {
      canonical: "/compute",
      languages: buildLanguagesMap("/compute"),
    },
  };
}

export default async function ComputePage() {
  const networkMetrics = await loadComputeMetrics();
  return (
    <MarketingShell>
      <ComputeExperience networkMetrics={networkMetrics} />
    </MarketingShell>
  );
}
