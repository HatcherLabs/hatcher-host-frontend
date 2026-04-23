'use client';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'cityV2AudioOn';

/**
 * Procedural cyber city hum — two low oscillators + filtered white
 * noise for the background rumble. Zero asset download; generated
 * entirely via Web Audio. Toggle button stays top-right under the
 * WalkSurvey toggle; state persists in localStorage.
 *
 * Starts muted by default because browsers block autoplay audio until
 * a user gesture anyway, and we don't want to surprise someone who
 * lands on /city during a call.
 */
export function AmbientAudio() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setOn(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!on) {
      nodesRef.current?.stop();
      nodesRef.current = null;
      return;
    }
    const AudioCtor: typeof AudioContext | undefined =
      typeof window !== 'undefined'
        ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AudioCtor) return;
    const ctx = ctxRef.current ?? new AudioCtor();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') void ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.setTargetAtTime(0.08, ctx.currentTime, 0.8);

    // Two sine-wave drones an octave apart for the low hum
    const droneA = ctx.createOscillator();
    droneA.type = 'sine';
    droneA.frequency.value = 55;
    const droneAG = ctx.createGain();
    droneAG.gain.value = 0.55;
    droneA.connect(droneAG).connect(master);
    droneA.start();

    const droneB = ctx.createOscillator();
    droneB.type = 'sine';
    droneB.frequency.value = 82;
    const droneBG = ctx.createGain();
    droneBG.gain.value = 0.28;
    droneB.connect(droneBG).connect(master);
    droneB.start();

    // Low-pass filtered white noise for the breathy city texture
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.35;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 350;
    lp.Q.value = 0.7;
    const noiseG = ctx.createGain();
    noiseG.gain.value = 0.25;
    noise.connect(lp).connect(noiseG).connect(master);
    noise.start();

    nodesRef.current = {
      stop() {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        setTimeout(() => {
          droneA.stop();
          droneB.stop();
          noise.stop();
          master.disconnect();
        }, 500);
      },
    };

    return () => {
      nodesRef.current?.stop();
      nodesRef.current = null;
    };
  }, [on]);

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={on ? 'Mute ambient audio' : 'Play ambient audio'}
      style={{
        position: 'absolute',
        top: 92,
        right: 12,
        zIndex: 10,
        background: 'rgba(5,8,20,0.75)',
        color: on ? '#fbbf24' : '#6b7280',
        border: '1px solid ' + (on ? '#fbbf24' : '#4b5563'),
        borderRadius: 6,
        padding: '6px 12px',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 11,
        cursor: 'pointer',
        letterSpacing: 1,
      }}
    >
      {on ? '🔊 SOUND' : '🔇 SOUND'}
    </button>
  );
}
