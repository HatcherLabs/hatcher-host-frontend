import { Info } from 'lucide-react';

export function ChatContextNotice({ limited }: { limited: boolean }) {
  if (!limited) return null;
  return (
    <div role="status" className="flex shrink-0 items-start gap-2 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-xs text-[var(--text-secondary)]">
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p><strong>Long conversation:</strong> the agent receives only part of this chat as context. Saved messages remain available in your history. Before continuing older work, restate the key details or ask for a summary to carry into a new chat.</p>
    </div>
  );
}
