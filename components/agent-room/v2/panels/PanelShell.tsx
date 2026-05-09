'use client';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  framework: string;
  onClose: () => void;
  children: ReactNode;
}

export function PanelShell({ title, framework, onClose, children }: Props) {
  const accent = framework === 'openclaw' ? '#d6b177' : '#9fc1c7';
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#100b07]/70 backdrop-blur sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-t-2xl border bg-[#2b1d12] p-6 text-[#f6ead8] shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
        style={{ borderColor: `${accent}99`, boxShadow: '0 24px 70px rgba(0,0,0,0.52)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md px-2 py-1 text-[#d8c3a3] hover:bg-[#3a281a] hover:text-white"
        >
          ✕
        </button>
        <h2 className="mb-4 text-xl font-semibold" style={{ color: accent }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
