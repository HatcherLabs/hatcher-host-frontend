export const MESSAGES_WINDOW = 50;

/* ── Framework accent colors for assistant bubbles ──────────── */
export const FRAMEWORK_BUBBLE: Record<string, { bg: string; border: string }> = {
  openclaw: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(217,119,6,0.06) 100%)', border: 'rgba(245,158,11,0.18)' },
  hermes:   { bg: 'linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(139,92,246,0.06) 100%)', border: 'rgba(168,85,247,0.18)' },
  elizaos:  { bg: 'linear-gradient(135deg, rgba(6,182,212,0.10) 0%, rgba(8,145,178,0.06) 100%)', border: 'rgba(6,182,212,0.18)' },
  milady:   { bg: 'linear-gradient(135deg, rgba(244,63,94,0.10) 0%, rgba(225,29,72,0.06) 100%)', border: 'rgba(244,63,94,0.18)' },
};

export const FRAMEWORK_DOT_COLOR: Record<string, string> = {
  openclaw: 'bg-amber-400',
  hermes: 'bg-purple-400',
  elizaos: 'bg-cyan-400',
  milady: 'bg-rose-400',
};
