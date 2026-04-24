'use client';
import { useEffect, useState } from 'react';

const KEY = 'agent-room-v2:onboarded';

export function WalkOnboarding() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);
  if (!show) return null;
  const dismiss = () => {
    localStorage.setItem(KEY, '1');
    setShow(false);
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className="max-w-sm rounded-xl border border-white/10 bg-neutral-900 p-6 text-center text-white">
        <h2 className="mb-2 text-xl font-semibold">Welcome to the Room</h2>
        <p className="mb-4 text-sm text-neutral-300">
          Use <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">W</kbd>{' '}
          <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">A</kbd>{' '}
          <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">S</kbd>{' '}
          <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">D</kbd> to walk, mouse to look.
          Walk up to any station and press{' '}
          <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">E</kbd> to interact.
        </p>
        <button
          onClick={dismiss}
          className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
