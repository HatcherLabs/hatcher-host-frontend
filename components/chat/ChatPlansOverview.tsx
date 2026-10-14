import { Bot, ImageIcon, MessageSquareText } from 'lucide-react';

export function ChatPlansOverview({ billing = false }: { billing?: boolean }) {
  return <section className="mb-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 sm:p-8">
    <p className="mb-2 text-xs font-semibold text-[var(--color-accent)]">ONE HATCHER WORKSPACE</p>
    <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Chat. Agents. Canvas.</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Every paid Hatcher plan brings together Web Chat, hosted agents and Canvas. Your included AI Credits cover model and media usage across all three. Choose the agent capacity you need, and top up credits at any time.</p>
    <div className="mt-5 flex flex-wrap gap-5 text-xs text-[var(--text-secondary)]"><span className="flex items-center gap-2"><MessageSquareText size={16} />Simple chat</span><span className="flex items-center gap-2"><Bot size={16} />Your agents</span><span className="flex items-center gap-2"><ImageIcon size={16} />Images, video & music</span></div>
    {billing && <p className="mt-5 text-xs text-[var(--text-muted)]">Previously purchased Web Chat allowances remain available until their expiry. They are shown separately from your shared AI Credit balance.</p>}
  </section>;
}
