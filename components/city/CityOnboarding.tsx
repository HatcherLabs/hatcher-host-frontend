'use client';

import { useEffect, useState } from 'react';

const LS_KEY = 'hatcher-city:onboarded:v1';

interface Step {
  title: string;
  body: string;
  align: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-center' | 'center';
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Hatcher City',
    body: 'Every public AI agent on hatcher.host is a building here. Districts by category, colors by framework.',
    align: 'center',
  },
  {
    title: 'Drag · scroll · click',
    body: 'Drag anywhere to orbit, scroll to zoom, click a building to open that agent. On mobile, pinch to zoom.',
    align: 'bottom-center',
  },
  {
    title: 'Find anything fast',
    body: 'Press ⌘K (Cmd+K / Ctrl+K) or the search button to jump to any agent or district instantly.',
    align: 'top-left',
  },
  {
    title: 'Pin your favourites',
    body: 'Hover a building, hit ★, and it stays one click away. Right-click for more — Open, Focus, Share, Pin.',
    align: 'top-right',
  },
];

export function CityOnboarding() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(LS_KEY);
    if (!seen) setStep(0);
  }, []);

  if (step === null) return null;
  const current = STEPS[step]!;

  function close() {
    if (typeof window !== 'undefined') window.localStorage.setItem(LS_KEY, '1');
    setStep(null);
  }

  function next() {
    if (step === null) return;
    if (step >= STEPS.length - 1) close();
    else setStep(step + 1);
  }

  const alignClass = (() => {
    switch (current.align) {
      case 'top-left':     return 'left-6 top-28 sm:left-12 sm:top-32';
      case 'top-right':    return 'right-6 top-28 sm:right-12 sm:top-32';
      case 'bottom-left':  return 'left-6 bottom-10 sm:left-12 sm:bottom-16';
      case 'bottom-center': return 'left-1/2 bottom-24 -translate-x-1/2';
      case 'center':
      default:             return 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  })();

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
      onClick={next}
    >
      <div
        className={`pointer-events-auto absolute max-w-sm border-2 border-amber-400 bg-[#0a0e1a] p-4 font-mono text-sm shadow-[6px_6px_0_#000] ${alignClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-['Press_Start_2P',monospace] text-[9px] tracking-[1.5px] text-amber-400">
            {step + 1} / {STEPS.length}
          </span>
          <button
            onClick={close}
            className="text-slate-400 hover:text-slate-100"
            aria-label="Skip tour"
          >
            ✕
          </button>
        </div>
        <h3 className="mb-1 text-base font-semibold text-slate-100">{current.title}</h3>
        <p className="mb-3 text-slate-300">{current.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={close}
            className="text-xs text-slate-500 hover:text-slate-200"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="border border-amber-400 bg-amber-400 px-3 py-1.5 font-['Press_Start_2P',monospace] text-[9px] tracking-[1.5px] text-black hover:bg-transparent hover:text-amber-400"
          >
            {step >= STEPS.length - 1 ? 'DONE' : 'NEXT →'}
          </button>
        </div>
      </div>
    </div>
  );
}
