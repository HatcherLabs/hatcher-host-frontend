export const MESSAGES_WINDOW = 50;

/* ── Framework accent colors for assistant bubbles ──────────── */
export const FRAMEWORK_BUBBLE: Record<string, { bg: string; border: string }> = {
  openclaw: { bg: 'linear-gradient(135deg, var(--color-info-bg) 0%, transparent 100%)', border: 'var(--color-info-border)' },
  hermes:   { bg: 'linear-gradient(135deg, var(--tech-accent-soft) 0%, transparent 100%)', border: 'var(--border-hover)' },
};

export const FRAMEWORK_DOT_COLOR: Record<string, string> = {
  openclaw: 'bg-[var(--color-info)]',
  hermes: 'bg-[var(--accent)]',
};
