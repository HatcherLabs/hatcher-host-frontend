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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#05070a]/72 backdrop-blur-md">
      <div className="mx-4 max-w-md rounded-2xl border border-cyan-200/18 bg-[#10161d]/92 p-6 text-center text-[#f6fbff] shadow-[0_24px_80px_rgba(0,0,0,0.48)]">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#d6b177]/35 bg-[#d6b177]/12 text-sm font-bold tracking-[0.18em] text-[#ffe4ad]">
          H
        </div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
          Agent control room
        </p>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">Your room is ready.</h2>
        <p className="mx-auto mb-5 max-w-xs text-sm leading-6 text-slate-300">
          Inspect the agent workspace, open operational panels, and steer runtime activity from one private room.
        </p>
        <button
          onClick={dismiss}
          className="w-full rounded-lg bg-[#f4ead8] px-4 py-2.5 text-sm font-semibold text-[#15110b] transition hover:bg-white"
        >
          Enter room
        </button>
      </div>
    </div>
  );
}
