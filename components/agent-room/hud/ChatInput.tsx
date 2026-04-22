'use client';
import { useState } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  function handle() {
    const t = value.trim();
    if (!t) return;
    onSend(t);
    setValue('');
  }

  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-1/2 z-10 flex w-[min(640px,calc(100vw-16px))] -translate-x-1/2 items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur-xl md:bottom-5 md:gap-2.5 md:px-3.5 md:py-2.5"
      style={{
        background: 'rgba(12, 14, 22, 0.72)',
        borderColor: 'var(--room-border)',
      }}
    >
      <input
        type="text"
        placeholder="Message your agent..."
        disabled={disabled}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handle();
        }}
        className="flex-1 rounded-lg border px-3.5 py-2.5 text-[13px] text-gray-100 outline-none"
        style={{
          background: 'color-mix(in srgb, var(--room-primary) 6%, transparent)',
          borderColor: 'color-mix(in srgb, var(--room-primary) 18%, transparent)',
        }}
      />
      <button
        onClick={handle}
        disabled={disabled}
        className="shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-opacity disabled:opacity-50 md:px-5 md:py-2.5 md:text-[11px]"
        style={{ background: 'var(--room-primary)', color: '#1a1400' }}
      >
        SEND
      </button>
    </div>
  );
}
