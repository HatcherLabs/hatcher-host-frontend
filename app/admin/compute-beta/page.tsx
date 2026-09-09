'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ComputeBetaApplication, ComputeBetaStatus } from '@/lib/api/types';

const STATUSES: Array<'all' | ComputeBetaStatus> = [
  'all',
  'new',
  'contacted',
  'accepted',
  'waitlisted',
  'rejected',
  'withdrawn',
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ComputeBetaAdminPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [applications, setApplications] = useState<ComputeBetaApplication[]>([]);
  const [filter, setFilter] = useState<'all' | ComputeBetaStatus>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user?.isAdmin) return;
    setLoading(true);
    setError(null);
    const result = await api.getComputeBetaApplications(filter === 'all' ? undefined : filter);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setApplications(result.data);
  }, [filter, isAuthenticated, user?.isAdmin]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  async function updateStatus(id: string, status: ComputeBetaStatus) {
    setUpdatingId(id);
    setError(null);
    const result = await api.updateComputeBetaApplicationStatus(id, status);
    setUpdatingId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setApplications((current) =>
      current
        .map((application) => application.id === id ? { ...application, status } : application)
        .filter((application) => filter === 'all' || application.status === filter),
    );
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const application of applications) result[application.participation] = (result[application.participation] ?? 0) + 1;
    return result;
  }, [applications]);

  if (authLoading) return <Centered icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Checking admin access…" />;
  if (!isAuthenticated) return <Centered icon={<AlertTriangle className="h-8 w-8" />} title="Sign in required" body="Sign in with an admin account to review beta applications." />;
  if (!user?.isAdmin) return <Centered icon={<AlertTriangle className="h-8 w-8 text-red-400" />} title="Access denied" body="This page is restricted to Hatcher administrators." />;

  return (
    <main className="min-h-screen bg-[var(--bg-base)] px-4 py-8 text-[var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <ArrowLeft className="h-4 w-4" /> Admin dashboard
            </Link>
            <h1 className="flex items-center gap-3 text-3xl font-bold"><Users className="h-7 w-7 text-[var(--color-accent)]" />Compute beta applications</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Encrypted-at-rest applicant data, visible only to admins.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Summary label="Shown" value={applications.length} />
          <Summary label="Providers" value={counts.provider ?? 0} />
          <Summary label="Builders" value={counts.builder ?? 0} />
          <Summary label="Both" value={counts.both ?? 0} />
        </section>

        <div className="mb-6 flex flex-wrap gap-2" aria-label="Filter applications by status">
          {STATUSES.map((status) => (
            <button key={status} type="button" onClick={() => setFilter(status)} aria-pressed={filter === status} className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${filter === status ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white' : 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
              {status}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="grid min-h-60 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" /></div>
        ) : applications.length === 0 ? (
          <div className="card grid min-h-60 place-items-center p-8 text-center text-sm text-[var(--text-secondary)]">No applications match this filter.</div>
        ) : (
          <div className="grid gap-4">
            {applications.map((application) => (
              <article key={application.id} className="card p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{application.name}</h2>
                      <span className="rounded-full border border-[var(--border-default)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--text-secondary)]">{application.participation}</span>
                      {application.updatesOptIn && <span title="Product updates opt-in" className="text-emerald-400"><CheckCircle2 className="h-4 w-4" /></span>}
                    </div>
                    <p className="mt-1 break-all text-sm text-[var(--color-accent)]">{application.email}</p>
                    {application.company && <p className="mt-1 text-sm text-[var(--text-secondary)]">{application.company}</p>}
                    <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
                      <Data label="Platforms" value={application.platforms.length ? application.platforms.join(', ') : 'N/A'} />
                      <Data label="GPU" value={application.gpuModel ?? 'Not specified'} />
                      <Data label="VRAM class" value={application.vramClass.replaceAll('_', ' ')} />
                      <Data label="Availability" value={application.availabilityHours ? `${application.availabilityHours}h/day` : 'N/A'} />
                      <Data label="Submitted" value={formatDate(application.createdAt)} />
                      <Data label="Consent" value={formatDate(application.consentAt)} />
                    </dl>
                    <p className="mt-5 whitespace-pre-wrap rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-sm leading-6 text-[var(--text-secondary)]">{application.useCase}</p>
                  </div>
                  <label className="flex min-w-44 flex-col gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                    Review status
                    <select value={application.status} disabled={updatingId === application.id} onChange={(event) => void updateStatus(application.id, event.target.value as ComputeBetaStatus)} className="h-11 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]">
                      {STATUSES.slice(1).map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="card p-4"><span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span><strong className="mt-1 block text-2xl">{value}</strong></div>;
}

function Data({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</dt><dd className="mt-1 break-words text-[var(--text-secondary)]">{value}</dd></div>;
}

function Centered({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return <main className="grid min-h-screen place-items-center bg-[var(--bg-base)] p-6 text-[var(--text-primary)]"><div className="max-w-md text-center"><div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--bg-card)] text-[var(--color-accent)]">{icon}</div><h1 className="text-2xl font-bold">{title}</h1>{body && <p className="mt-3 text-sm text-[var(--text-secondary)]">{body}</p>}</div></main>;
}
