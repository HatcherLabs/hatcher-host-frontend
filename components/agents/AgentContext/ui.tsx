import React from 'react';

// ─── Shared UI components ────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-[#71717a]/20 ${className}`} />
  );
}

export function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card glass-noise p-5 ${className}`}>
      {children}
    </div>
  );
}
