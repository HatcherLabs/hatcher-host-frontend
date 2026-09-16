import { BarChart3, Check, MessageSquareText } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { CHAT_PLAN_DETAILS, CHAT_PLAN_FEATURES } from '@/lib/chat-plan-details';

export function ChatPlansOverview({ billing = false }: { billing?: boolean }) {
  return <section className="mb-20 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/45 p-5 sm:p-8">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="mb-2 text-xs font-semibold text-[var(--color-accent)]">Hatcher Chat</p><h2 className="text-2xl font-bold text-[var(--text-primary)]">Dedicated chat plans</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Each plan lasts 30 days and resets its allowance every 7 days. Five weekly allocations are included, so the monthly total below is the maximum available across the full period.</p></div>
      <Link href="/dashboard/chat" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--text-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-base)]"><MessageSquareText size={16} />{billing ? 'Open Chat billing' : 'Open Hatcher Chat'}</Link>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">{CHAT_PLAN_DETAILS.map(plan => <article key={plan.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)]/50 p-5">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--text-primary)]">{plan.name}</h3><p className="mt-1 text-xs font-medium text-[var(--color-accent)]">{plan.comparison}</p></div><BarChart3 size={18} className="text-[var(--text-muted)]" /></div>
      <div className="mt-5 text-3xl font-bold text-[var(--text-primary)]">${(plan.priceCents / 100).toFixed(2)} <span className="text-xs font-normal text-[var(--text-muted)]">/ 30 days</span></div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-[var(--border-default)] p-3"><div><strong className="block text-lg text-[var(--text-primary)]">{plan.weeklyCredits.toLocaleString()}</strong><span className="text-[11px] text-[var(--text-muted)]">credits / week</span></div><div><strong className="block text-lg text-[var(--text-primary)]">{plan.monthlyCredits.toLocaleString()}</strong><span className="text-[11px] text-[var(--text-muted)]">credits / 30 days</span></div></div>
      <ul className="mt-5 space-y-2">{CHAT_PLAN_FEATURES.map(feature => <li key={feature} className="flex gap-2 text-xs leading-5 text-[var(--text-secondary)]"><Check size={14} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />{feature}</li>)}</ul>
    </article>)}</div>
    <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">Image, video, and audio generation use account AI Credits and show an estimate before generation. Chat plans do not auto-renew; another purchase queues after current access.</p>
  </section>;
}
