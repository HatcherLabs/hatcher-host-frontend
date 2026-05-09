'use client';

import type { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

interface MobileSceneMenuProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  tone?: 'cool' | 'warm';
}

interface MobileSceneActionButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

const toneStyles = {
  cool: {
    panel: 'border-cyan-200/20 bg-[#07101b]/92 text-white',
    accent: 'text-cyan-200',
    button: 'border-cyan-200/25 bg-[#07101b]/84 text-cyan-100',
  },
  warm: {
    panel: 'border-[#d6b177]/28 bg-[#1c130c]/92 text-[#f6ead8]',
    accent: 'text-[#d6b177]',
    button: 'border-[#d6b177]/32 bg-[#1c130c]/86 text-[#f6ead8]',
  },
} as const;

export function MobileSceneMenu({
  title,
  subtitle,
  children,
  tone = 'cool',
}: MobileSceneMenuProps) {
  const [open, setOpen] = useState(false);
  const styles = toneStyles[tone];

  return (
    <div className="pointer-events-none absolute inset-0 z-50 md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`pointer-events-auto absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-[7px] border shadow-2xl backdrop-blur-xl ${styles.button}`}
        style={{
          right: 'max(0.75rem, calc(env(safe-area-inset-right) + 0.75rem))',
          top: 'max(0.75rem, calc(env(safe-area-inset-top) + 0.75rem))',
        }}
        aria-label={open ? 'Close scene menu' : 'Open scene menu'}
        aria-expanded={open}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div
          className={`pointer-events-auto absolute left-3 right-3 top-16 max-h-[calc(100%-5.5rem)] overflow-y-auto rounded-[10px] border p-4 shadow-2xl backdrop-blur-xl ${styles.panel}`}
          style={{
            left: 'max(0.75rem, calc(env(safe-area-inset-left) + 0.75rem))',
            right: 'max(0.75rem, calc(env(safe-area-inset-right) + 0.75rem))',
            top: 'max(4rem, calc(env(safe-area-inset-top) + 4rem))',
          }}
        >
          <div className="mb-3">
            <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${styles.accent}`}>
              Hatcher
            </div>
            <h2 className="mt-1 text-lg font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-xs opacity-65">{subtitle}</p>}
          </div>
          <div className="space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
}

export function MobileSceneActionButton({
  label,
  disabled = false,
  onClick,
}: MobileSceneActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto absolute bottom-5 right-4 z-40 inline-flex min-h-14 min-w-24 items-center justify-center rounded-full border border-emerald-200/35 bg-emerald-300 px-4 text-sm font-semibold text-black shadow-[0_14px_38px_rgba(0,0,0,0.35)] transition hover:bg-emerald-200 disabled:pointer-events-none disabled:border-white/12 disabled:bg-white/18 disabled:text-white/45 md:hidden"
      style={{
        bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 1rem))',
        right: 'max(1rem, calc(env(safe-area-inset-right) + 1rem))',
      }}
    >
      {label}
    </button>
  );
}
