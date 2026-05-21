'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/i18n/routing';
import { API_URL } from '@/lib/config';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, GitBranch, X } from 'lucide-react';

type ChangelogTag = 'frontend' | 'backend' | 'shared' | 'infrastructure' | 'docs';

type ChangelogCommit = {
  id: string;
  message: string;
  date: string;
  tag: ChangelogTag;
};

type ReleaseGroup = {
  label: string;
  date: string;
  commits: ChangelogCommit[];
};

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.7.x';

const TAG_CLASS: Record<ChangelogTag, string> = {
  frontend: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  backend: 'border-purple-500/20 bg-purple-500/10 text-purple-300',
  shared: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  infrastructure: 'border-slate-500/25 bg-slate-500/10 text-slate-300',
  docs: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
};

function formatShipDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function releaseLabel(index: number): string {
  if (index === 0) return `v${APP_VERSION}`;
  const numeric = APP_VERSION.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (numeric) {
    const [, major, minor, patch] = numeric;
    return `v${major}.${minor}.${Math.max(0, Number(patch) - index)}`;
  }
  return index === 1 ? 'Previous release' : 'Earlier release';
}

function groupReleases(commits: ChangelogCommit[]): ReleaseGroup[] {
  const byDay = new Map<string, ChangelogCommit[]>();
  for (const commit of commits) {
    const key = commit.date.slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(commit);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3)
    .map(([date, items], index) => ({
      label: releaseLabel(index),
      date,
      commits: items
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6),
    }));
}

export function VersionBadge() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commits, setCommits] = useState<ChangelogCommit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const releases = useMemo(() => groupReleases(commits), [commits]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadChangelog = async () => {
    if (commits.length > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/changelog`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Unable to load changelog');
      const data = await res.json();
      setCommits(Array.isArray(data.commits) ? data.commits : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load changelog');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2147483647] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-16 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Latest Hatcher changelog"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                  <GitBranch size={12} />
                  Latest ships
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Hatcher v{APP_VERSION}</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Recent updates from the last three shipping dates.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[var(--border-default)] p-2 text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                aria-label="Close changelog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="mb-4">
                <Link
                  href="/changelog"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Full changelog
                  <ExternalLink size={13} />
                </Link>
              </div>

              {loading && (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-24 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/60 animate-pulse" />
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {!loading && !error && releases.length === 0 && (
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                  No changelog entries found.
                </div>
              )}

              {!loading && !error && releases.length > 0 && (
                <div className="space-y-4">
                  {releases.map((release) => (
                    <section key={release.date} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">{release.label}</h3>
                        <time className="text-xs text-[var(--text-muted)]">{formatShipDate(release.date)}</time>
                      </div>
                      <ul className="space-y-2">
                        {release.commits.map((commit) => (
                          <li key={commit.id} className="flex items-start gap-2 text-sm">
                            <span className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] uppercase ${TAG_CLASS[commit.tag] ?? TAG_CLASS.frontend}`}>
                              {commit.tag}
                            </span>
                            <span className="min-w-0 flex-1 leading-snug text-[var(--text-secondary)]">{commit.message}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void loadChangelog();
        }}
        className="inline-flex rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-emerald-300 transition-colors hover:border-emerald-400/50 hover:bg-emerald-500/15"
        style={{ fontFamily: 'var(--font-mono)' }}
        aria-label="Open latest changelog"
      >
        v{APP_VERSION}
      </button>
      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
