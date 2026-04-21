import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { API_URL } from '@/lib/config';
import { CATEGORY_LABELS } from '@/components/city/types';
import type { CityAgent, CityResponse } from '@/components/city/types';

const PerAgentScene = dynamic(
  () => import('@/components/city/PerAgentScene').then((m) => m.PerAgentScene),
  { ssr: false },
);

async function fetchAgent(id: string): Promise<CityAgent | null> {
  try {
    const res = await fetch(`${API_URL}/public/city`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: CityResponse };
    if (!json.success || !json.data) return null;
    return json.data.agents.find((a) => a.id === id || a.slug === id) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const agent = await fetchAgent(id);
  if (!agent) return { title: 'Agent · Hatcher City' };

  const title = `${agent.name} · Hatcher City`;
  const description = `${agent.name} lives in the ${CATEGORY_LABELS[agent.category]} district of Hatcher City — running on ${agent.framework}.`;

  return {
    title,
    description,
    alternates: { canonical: `/agent/${agent.id}/city` },
    openGraph: {
      title,
      description,
      url: `https://hatcher.host/agent/${agent.id}/city`,
      images: [{ url: '/city-preview.png', width: 1920, height: 1080 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/city-preview.png'],
    },
  };
}

export default async function AgentCityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await fetchAgent(id);
  if (!agent) notFound();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#050814]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href="/city" className="hover:text-[var(--text-primary)]">Hatcher City</Link>
          <span>›</span>
          <Link href={`/city/${agent.category}`} className="hover:text-[var(--text-primary)]">
            {CATEGORY_LABELS[agent.category]}
          </Link>
          <span>›</span>
          <span className="text-[var(--text-secondary)]">{agent.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="relative aspect-video overflow-hidden border border-[var(--border-default)] bg-[#050814] shadow-[6px_6px_0_#000]">
            <PerAgentScene agent={agent} />
          </div>
          <aside className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500">
                {CATEGORY_LABELS[agent.category]}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                {agent.name}
              </h1>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
              <Kv k="framework" v={agent.framework} />
              <Kv k="tier" v={tierLabel(agent.tier)} />
              <Kv k="status" v={agent.status} />
              <Kv k="messages" v={agent.messageCount.toLocaleString()} />
            </dl>
            <div className="flex gap-2">
              <Link
                href={`/agent/${agent.id}`}
                className="inline-flex items-center rounded-full border border-amber-400 bg-amber-400 px-4 py-2 font-mono text-xs uppercase tracking-widest text-black hover:bg-transparent hover:text-amber-400"
              >
                Open agent →
              </Link>
              <Link
                href={`/city?agent=${agent.id}`}
                className="inline-flex items-center rounded-full border border-[var(--border-default)] px-4 py-2 font-mono text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:border-amber-400 hover:text-amber-400"
              >
                See in full city
              </Link>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Shareable link: <code className="text-[var(--text-secondary)]">hatcher.host/agent/{agent.id}/city</code>
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{k}</dt>
      <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">{v}</dd>
    </div>
  );
}

function tierLabel(t: number): string {
  return ['free', 'starter', 'pro', 'business', 'founding'][t] ?? 'free';
}
