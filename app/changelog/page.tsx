import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog — Hatcher',
  description: 'Live updates from the Hatcher team. We ship improvements every day.',
};

export const revalidate = 300; // refresh every 5 min

type Tag = 'frontend' | 'backend' | 'shared' | 'infrastructure';

interface Commit {
  sha: string;
  message: string;
  date: string;
  tag: Tag;
}

const TAG_CONFIG: Record<Tag, { label: string; className: string }> = {
  frontend:       { label: 'Frontend',       className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  backend:        { label: 'Backend',        className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  shared:         { label: 'Shared',         className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  infrastructure: { label: 'Infrastructure', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

async function fetchCommits(): Promise<Commit[]> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hatcher.host';
    const res = await fetch(`${API}/changelog`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.commits ?? [];
  } catch {
    return [];
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDay(commits: Commit[]): Array<{ label: string; commits: Commit[] }> {
  const groups = new Map<string, Commit[]>();
  for (const c of commits) {
    const d = new Date(c.date);
    const key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return [...groups.entries()].map(([label, commits]) => ({ label, commits }));
}

export default async function ChangelogPage() {
  const commits = await fetchCommits();
  const groups = groupByDay(commits);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-20">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              BETA
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            Changelog
          </h1>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed">
            We ship improvements every day. Here's what's changed.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-10">
          {(Object.entries(TAG_CONFIG) as [Tag, typeof TAG_CONFIG[Tag]][]).map(([, cfg]) => (
            <span key={cfg.label} className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${cfg.className}`}>
              {cfg.label}
            </span>
          ))}
        </div>

        {/* Commits */}
        {groups.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)] text-sm">
            No commits found.
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map(({ label, commits: dayCommits }) => (
              <div key={label}>
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
                  {label}
                </p>
                <ul className="space-y-3">
                  {dayCommits.map(c => {
                    const tag = TAG_CONFIG[c.tag];
                    return (
                      <li key={c.sha} className="flex items-start gap-3">
                        <span className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${tag.className}`}>
                          {tag.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text-primary)] leading-snug">
                            {c.message}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-[var(--text-muted)] mt-0.5">
                          {timeAgo(c.date)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
