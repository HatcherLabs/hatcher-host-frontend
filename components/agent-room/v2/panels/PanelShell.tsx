'use client';
import type { ReactNode } from 'react';
import { paletteFor } from '../colors';

interface Props {
  title: string;
  framework: string;
  onClose: () => void;
  children: ReactNode;
}

export function PanelShell({ title, framework, onClose, children }: Props) {
  const palette = paletteFor(framework);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-t-2xl border bg-neutral-900 p-6 text-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
        style={{ borderColor: palette.primary, boxShadow: `0 0 40px ${palette.primary}33` }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md px-2 py-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
          ✕
        </button>
        <h2 className="mb-4 text-xl font-semibold" style={{ color: palette.primary }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
