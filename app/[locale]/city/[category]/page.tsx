import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { API_URL } from '@/lib/config';
import type {
  Category,
  CityAgent,
  CityResponse,
  Framework,
} from '@/components/city/types';
import { CATEGORIES, CATEGORY_LABELS } from '@/components/city/types';

const CATEGORY_SET = new Set<string>(CATEGORIES);

const CATEGORY_TAGLINE: Record<Category, string> = {
  automation: 'Scrapers, schedulers, hands-off glue between tools.',
  business: 'CRM, meetings, lead nurture, deal forecasting.',
  compliance: 'GDPR, SOC 2, policy drafting, audit prep.',
  creative: 'Art, music, video, copy, memes and everything in between.',
  'customer-success': 'Help desks, ticket triage, churn prediction.',
  data: 'Dashboards, ETL, analytics, CSV wranglers.',
  development: 'Pair programmers, code reviewers, refactor bots.',
  devops: 'Deploys, monitoring, incident response.',
  ecommerce: 'Pricing, catalog ops, storefront automation.',
  education: 'Tutors, flashcard makers, study coaches.',
  finance: 'Quant bots, DeFi scouts, investment assistants.',
  freelance: 'Proposal writers, invoice trackers, portfolio copilots.',
  healthcare: 'Patient intake, health content, clinical helpers.',
  hr: 'Recruiting, interviews, employee ops, onboarding.',
  legal: 'Contract review, policy writing, compliance drafting.',
  marketing: 'SEO, outreach, ad campaigns, growth loops.',
  moltbook: 'Personalized knowledge and study agents.',
  ollama: 'Local-first agents tuned for self-hosted LLMs.',
  personal: 'Daily briefings, personal CRMs, assistants.',
  productivity: 'Task managers, schedulers, flow orchestrators.',
  'real-estate': 'Listing research, deal flow, tenant ops.',
  saas: 'Customer onboarding, ops, product analytics.',
  security: 'Threat detection, risk assessment, hardening.',
  'supply-chain': 'Logistics, inventory, vendor automation.',
  voice: 'Voice interfaces, speech pipelines, agents you can call.',
};

const FW_LABEL: Record<Framework, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  elizaos: 'ElizaOS',
  milady: 'Milady',
};

const FW_DOT: Record<Framework, string> = {
  openclaw: '#10b981',
  hermes: '#38bdf8',
  elizaos: '#a855f7',
  milady: '#ec4899',
};

function isCategory(s: string): s is Category {
  return CATEGORY_SET.has(s);
}

async function fetchCity(): Promise<CityResponse | null> {
  try {
    const res = await fetch(`${API_URL}/public/city`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: CityResponse };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategory(category)) return { title: 'Hatcher City' };

  const label = CATEGORY_LABELS[category];
  const tagline = CATEGORY_TAGLINE[category];
  const title = `${label} agents on Hatcher City`;
  const description = `${tagline} See every ${label} agent running on Hatcher, live.`;

  return {
    title,
    description,
    alternates: { canonical: `/city/${category}` },
    openGraph: {
      title,
      description,
      url: `https://hatcher.host/city/${category}`,
      type: 'website',
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategory(category)) notFound();

  const city = await fetchCity();
  const agents = (city?.agents ?? []).filter((a) => a.category === category);
  const counts = city?.counts;
  const label = CATEGORY_LABELS[category];

  // Sort: running first, then by messageCount desc.
  const sorted = [...agents].sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (b.status === 'running' && a.status !== 'running') return 1;
    return b.messageCount - a.messageCount;
  });

  return (
    <div className="bg-[var(--bg-base)] min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href="/city" className="hover:text-[var(--text-primary)]">Hatcher City</Link>
          <span>›</span>
          <span className="text-[var(--text-secondary)]">{label}</span>
        </nav>

        {/* Hero */}
        <div className="mb-10">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500">
            District
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
            {label} agents
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[var(--text-secondary)]">
            {CATEGORY_TAGLINE[category]}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
            <Stat label="agents" v={agents.length.toLocaleString()} />
            <Stat
              label="running"
              v={agents.filter((a) => a.status === 'running').length.toLocaleString()}
            />
            {counts && (
              <>
                <Stat
                  label="share of city"
                  v={counts.total ? `${Math.round((agents.length / counts.total) * 100)}%` : '—'}
                />
                <Link
                  href={`/city?focus=${category}`}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-400 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-black hover:bg-transparent hover:text-amber-400 transition"
                >
                  See it in 3D →
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Grid */}
        {sorted.length === 0 ? (
          <div className="rounded border border-[var(--border-default)] bg-[var(--bg-card)] p-10 text-center text-[var(--text-secondary)]">
            No agents in this district yet. <Link href="/create" className="text-[var(--color-accent)] hover:underline">Be the first to build one.</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((a) => (
              <AgentCard key={a.id} a={a} />
            ))}
          </div>
        )}

        {/* Other districts link row */}
        <div className="mt-14 border-t border-[var(--border-default)] pt-8">
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Other districts
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c !== category).map((c) => {
              const count = counts?.byCategory[c] ?? 0;
              if (!count) return null;
              return (
                <Link
                  key={c}
                  href={`/city/${c}`}
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-amber-400 hover:text-[var(--text-primary)]"
                >
                  {CATEGORY_LABELS[c]}
                  <span className="text-[var(--text-muted)]">{count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {label}
      </span>
      <b className="text-xl font-semibold text-[var(--text-primary)]">{v}</b>
    </div>
  );
}

function AgentCard({ a }: { a: CityAgent }) {
  return (
    <Link
      href={`/agent/${a.id}`}
      className="group flex items-start gap-3 rounded border border-[var(--border-default)] bg-[var(--bg-card)] p-4 hover:border-amber-400 transition"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black text-lg font-bold text-white"
        style={{ background: FW_DOT[a.framework] }}
      >
        {a.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          (a.name[0] ?? '?').toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-[var(--text-primary)] group-hover:text-amber-400">
            {a.name}
          </span>
          <StatusDot status={a.status} />
          {a.tier === 4 && <span title="Founding member">♛</span>}
        </div>
        <div className="mt-0.5 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5" style={{ background: FW_DOT[a.framework] }} />
            {FW_LABEL[a.framework]}
          </span>
          <span className="mx-1.5">·</span>
          {a.messageCount.toLocaleString()} msgs
        </div>
      </div>
    </Link>
  );
}

function StatusDot({ status }: { status: CityAgent['status'] }) {
  const bg =
    status === 'running'
      ? '#22c55e'
      : status === 'paused'
        ? '#fbbf24'
        : status === 'crashed'
          ? '#ef4444'
          : '#64748b';
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{
        background: bg,
        boxShadow: status === 'running' || status === 'crashed' ? `0 0 6px ${bg}` : undefined,
      }}
      title={status}
    />
  );
}
