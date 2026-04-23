'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Called on every touch-move with normalised deltas in [-1, 1]. */
  onVector: (dx: number, dy: number) => void;
}

const SIZE = 120;
const KNOB_SIZE = 48;

/**
 * Touch-only virtual joystick in the bottom-left corner. Writes a
 * normalised vector into the `onVector` callback, which the
 * CharacterController consumes as analog WASD. Hidden on devices
 * without a coarse (touch) pointer.
 */
export function MobileJoystick({ onVector }: Props) {
  const [isTouch, setIsTouch] = useState(false);
  const [knob, setKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const active = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  if (!isTouch) return null;

  function clamp(x: number, y: number) {
    const r = Math.sqrt(x * x + y * y);
    const max = SIZE / 2 - KNOB_SIZE / 4;
    if (r <= max) return { x, y };
    return { x: (x / r) * max, y: (y / r) * max };
  }

  function onStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    origin.current = { x: t.clientX, y: t.clientY };
    active.current = true;
  }
  function onMove(e: React.TouchEvent) {
    if (!active.current || !origin.current) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - origin.current.x;
    const dy = t.clientY - origin.current.y;
    const clamped = clamp(dx, dy);
    setKnob(clamped);
    const max = SIZE / 2 - KNOB_SIZE / 4;
    onVector(clamped.x / max, clamped.y / max);
  }
  function onEnd() {
    active.current = false;
    origin.current = null;
    setKnob({ x: 0, y: 0 });
    onVector(0, 0);
  }

  return (
    <div
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      onTouchCancel={onEnd}
      style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        background: 'rgba(5,8,20,0.55)',
        border: '1px solid rgba(124,216,255,0.6)',
        boxShadow: '0 0 24px rgba(124,216,255,0.35)',
        zIndex: 25,
        touchAction: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: SIZE / 2 - KNOB_SIZE / 2 + knob.x,
          top: SIZE / 2 - KNOB_SIZE / 2 + knob.y,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: 'rgba(124,216,255,0.85)',
          transition: active.current ? 'none' : 'transform 0.15s, left 0.15s, top 0.15s',
        }}
      />
    </div>
  );
}
