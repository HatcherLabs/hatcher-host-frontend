'use client';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Low tonal drone, 4s loop. All partials complete an integer number of cycles
// in the buffer (and the LFO does one full cycle) so it loops seamlessly.
function makeDroneBuffer(ctx: BaseAudioContext): AudioBuffer {
  const dur = 4;
  const sr = ctx.sampleRate;
  const n = Math.floor(dur * sr);
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const lfo = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.25 * t);
    const s =
      Math.sin(2 * Math.PI * 68 * t) * 0.5 +
      Math.sin(2 * Math.PI * 102 * t) * 0.3 +
      Math.sin(2 * Math.PI * 136 * t) * 0.16;
    d[i] = s * lfo * 0.5;
  }
  return buf;
}

// Two-tone decaying chime for "new message".
function makeChimeBuffer(ctx: BaseAudioContext): AudioBuffer {
  const dur = 0.6;
  const sr = ctx.sampleRate;
  const n = Math.floor(dur * sr);
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 6);
    d[i] = (Math.sin(2 * Math.PI * 880 * t) * 0.6 + Math.sin(2 * Math.PI * 1320 * t) * 0.4) * env * 0.5;
  }
  return buf;
}

/**
 * Spatial room audio: an ambient drone positioned at the agent (so it fades as
 * you walk away) plus a chime when a new message lands. Browsers block audio
 * until a user gesture, so the context resumes on the first pointerdown. A
 * `muted` prop kills it instantly.
 */
export function RoomAudio({
  agentPosition,
  muted,
  messageCount,
}: {
  agentPosition: [number, number, number];
  muted: boolean;
  messageCount: number;
}) {
  const { camera } = useThree();

  const audio = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const listener = new THREE.AudioListener();
    const ctx = listener.context;
    const drone = new THREE.PositionalAudio(listener);
    drone.setBuffer(makeDroneBuffer(ctx));
    drone.setLoop(true);
    drone.setRefDistance(3);
    drone.setVolume(0);
    const chime = new THREE.PositionalAudio(listener);
    chime.setRefDistance(4.5);
    return { listener, ctx, drone, chime, chimeBuf: makeChimeBuffer(ctx) };
  }, []);

  useEffect(() => {
    if (!audio) return;
    camera.add(audio.listener);
    const resume = () => {
      void audio.ctx.resume();
      if (!audio.drone.isPlaying) {
        try {
          audio.drone.play();
        } catch {
          /* not ready yet */
        }
      }
      window.removeEventListener('pointerdown', resume);
    };
    window.addEventListener('pointerdown', resume);
    return () => {
      window.removeEventListener('pointerdown', resume);
      try {
        audio.drone.stop();
      } catch {
        /* noop */
      }
      camera.remove(audio.listener);
      void (audio.ctx as AudioContext).close?.();
    };
  }, [audio, camera]);

  // Mute / volume.
  useEffect(() => {
    if (!audio) return;
    audio.drone.setVolume(muted ? 0 : 0.11);
  }, [audio, muted]);

  // Chime on a newly arrived message (skip the initial history load).
  const prevCountRef = useRef(messageCount);
  useEffect(() => {
    if (!audio) {
      prevCountRef.current = messageCount;
      return;
    }
    const grew = messageCount > prevCountRef.current;
    prevCountRef.current = messageCount;
    if (!grew || muted || audio.ctx.state !== 'running') return;
    try {
      if (audio.chime.isPlaying) audio.chime.stop();
      audio.chime.setBuffer(audio.chimeBuf);
      audio.chime.setVolume(0.22);
      audio.chime.play();
    } catch {
      /* noop */
    }
  }, [audio, messageCount, muted]);

  if (!audio) return null;
  return (
    <group position={agentPosition}>
      <primitive object={audio.drone} />
      <primitive object={audio.chime} />
    </group>
  );
}
