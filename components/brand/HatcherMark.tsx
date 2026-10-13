/** Shared Hatcher mark used by the public navigation and the chat entry point. */
export function HatcherMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" className={className} aria-hidden>
      <rect width="26" height="26" rx="7" fill="var(--ink)" />
      <path
        d="M13 4.5c-4 0-7.2 3.9-7.2 8.7 0 5 3.1 8.9 7.2 8.9s7.2-3.9 7.2-8.9c0-4.8-3.2-8.7-7.2-8.7Z"
        fill="var(--bg-card)"
        stroke="var(--tech-accent)"
        strokeWidth="1.1"
      />
      <path
        d="M8.6 13.6c1.4-2.3 2.9-3.3 4.4-3.3s3 1 4.4 3.3c-1.4 2.3-2.9 3.3-4.4 3.3s-3-1-4.4-3.3Z"
        fill="var(--ink)"
      />
      <circle cx="13" cy="13.6" r="1.7" fill="var(--tech-accent)" />
    </svg>
  );
}
