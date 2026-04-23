'use client';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cityV2WalkOnboarded';

interface Props {
  visible: boolean;
}

/**
 * Toast that shows once on the first walk-mode entry. Persists
 * dismissal via localStorage so returning users don't see it again.
 */
export function WalkOnboarding({ visible }: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // localStorage unavailable → keep behaviour the same (show once
      // per page load instead of once per user).
    }
    setShown(true);
  }, [visible]);

  function dismiss() {
    setShown(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }

  if (!shown) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        background: 'rgba(5,8,20,0.88)',
        color: '#fbbf24',
        border: '1px solid rgba(124, 216, 255, 0.55)',
        borderRadius: 10,
        padding: '14px 20px',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 11,
        lineHeight: 1.75,
        maxWidth: 520,
        boxShadow: '0 0 30px rgba(124, 216, 255, 0.25)',
      }}
    >
      <div style={{ color: '#7ad8ff', marginBottom: 8 }}>WALK MODE</div>
      <div>WASD or Arrows — move · Shift — run</div>
      <div>Drag mouse — look around</div>
      <div>Click a district on the minimap — fast travel</div>
      <div>Escape — back to survey</div>
      <button
        onClick={dismiss}
        style={{
          marginTop: 10,
          background: 'transparent',
          color: '#7ad8ff',
          border: '1px solid #7ad8ff',
          padding: '4px 12px',
          fontFamily: 'inherit',
          fontSize: 10,
          cursor: 'pointer',
        }}
      >
        GOT IT
      </button>
    </div>
  );
}
