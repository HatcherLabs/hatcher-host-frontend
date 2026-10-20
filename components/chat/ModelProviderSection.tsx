import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Native disclosure keeps provider browsing keyboard accessible without extra dialog state. */
export function ModelProviderSection({ name, count, expanded, children }: {
  name: string;
  count: number;
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <details open={expanded || undefined} className="group/provider border-b border-[var(--border-subtle)] last:border-b-0" data-model-provider-group>
      <summary className="flex cursor-pointer list-none items-center gap-2 bg-[var(--bg-muted)] px-3 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
        <ChevronDown size={15} className="shrink-0 -rotate-90 transition-transform group-open/provider:rotate-0" />
        <span className="min-w-0 flex-1 break-words">{name}</span>
        <span className="shrink-0 rounded-full bg-[var(--bg-panel)] px-2 py-0.5 text-xs font-normal text-[var(--text-secondary)]">{count}</span>
      </summary>
      <div className="py-1">{children}</div>
    </details>
  );
}
