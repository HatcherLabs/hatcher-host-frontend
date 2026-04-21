'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Tiny sound engine for the city. We intentionally don't ship audio
// files — the ambient pad and the UI chirps are synthesised at runtime
// via the Web Audio API so the page stays under budget. Everything is
// gated behind a user click (autoplay policies) and a single mute
// toggle stored in localStorage.

const LS_KEY = 'hatcher-city:sound';

export interface CitySoundControls {
  chirp: (variant?: 'hover' | 'click' | 'tour') => void;
}

interface Props {
  onReady?: (api: CitySoundControls) => void;
}

export function CitySound({ onReady }: Props) {
  const ctxRef = useRef<AudioContext | null>(null);
  const padGainRef = useRef<GainNode | null>(null);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(LS_KEY);
    // default muted — users who want ambience enable it; avoids tab-hijack sound.
    return stored !== 'on';
  });

  // Start ambient pad after the first user click anywhere in the
  // window (Web Audio autoplay guard). Nothing to unmute if the user
  // already opted out — state flips back to muted on the toggle click.
  useEffect(() => {
    if (muted) return;
    const AudioCtx =
      typeof window === 'undefined'
        ? null
        : window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const ctx = ctxRef.current ?? new AudioCtx();
      ctxRef.current = ctx;
      // Layered drone: two slightly detuned sines + lowpass for a
      // "city at night" hum. Zero sample assets, ~60 loc of code.
      const master = ctx.createGain();
      master.gain.value = 0.0;
      master.connect(ctx.destination);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      lp.Q.value = 0.6;
      lp.connect(master);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 110;
      const g1 = ctx.createGain();
      g1.gain.value = 0.18;
      osc1.connect(g1).connect(lp);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 110 * 1.003;
      const g2 = ctx.createGain();
      g2.gain.value = 0.12;
      osc2.connect(g2).connect(lp);

      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.value = 55;
      const g3 = ctx.createGain();
      g3.gain.value = 0.08;
      osc3.connect(g3).connect(lp);

      osc1.start();
      osc2.start();
      osc3.start();

      // Slow fade-in over 1.2s so it doesn't punch on.
      master.gain.linearRampToValueAtTime(0.085, ctx.currentTime + 1.2);
      padGainRef.current = master;
    };
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [muted]);

  // Route mute toggle to the active pad without tearing the context
  // down — resuming fresh is slow and dumps the drone.
  useEffect(() => {
    const gain = padGainRef.current;
    if (!gain || !ctxRef.current) return;
    gain.gain.cancelScheduledValues(ctxRef.current.currentTime);
    gain.gain.linearRampToValueAtTime(muted ? 0 : 0.085, ctxRef.current.currentTime + 0.25);
  }, [muted]);

  const chirp = useCallback(
    (variant: 'hover' | 'click' | 'tour' = 'click') => {
      if (muted) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = variant === 'hover' ? 620 : variant === 'tour' ? 880 : 740;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    },
    [muted],
  );

  // Publish the imperative API so the rest of the city can play
  // chirps on hover/click/tour steps.
  useEffect(() => {
    onReady?.({ chirp });
  }, [onReady, chirp]);

  const toggle = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LS_KEY, next ? 'off' : 'on');
      }
      return next;
    });
  }, []);

  return (
    <button
      onClick={toggle}
      className="pointer-events-auto absolute right-2 bottom-16 z-20 border border-slate-800 bg-[#050814]/85 p-2 font-['Press_Start_2P',monospace] text-[9px] tracking-[1px] text-slate-300 hover:border-amber-400 hover:text-amber-400 sm:right-4 sm:bottom-4"
      aria-label={muted ? 'Enable sound' : 'Mute sound'}
      title={muted ? 'Enable city sound' : 'Mute city sound'}
    >
      {muted ? '🔇' : '🔈'}
    </button>
  );
}
