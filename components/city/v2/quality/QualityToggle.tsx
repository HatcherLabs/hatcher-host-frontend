'use client';
import { useQualityControl } from './QualityContext';

/**
 * Top-right HUD dropdown for manually overriding quality preset.
 * Auto lets detectQuality() decide; High/Low force the preset and
 * persist in localStorage.
 */
export function QualityToggle() {
  const { override, setQuality } = useQualityControl();
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        background: 'rgba(5,8,20,0.75)',
        border: '1px solid rgba(251,191,36,0.4)',
        borderRadius: 6,
        padding: '5px 7px',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 'clamp(7px, 0.75vw, 10px)',
        color: '#fbbf24',
        display: 'flex',
        gap: 5,
        alignItems: 'center',
        maxWidth: 'calc(100vw - 176px)',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      <span>QUALITY</span>
      {(['auto', 'high', 'low'] as const).map((q) => (
        <button
          key={q}
          onClick={() => setQuality(q)}
          style={{
            background: override === q ? '#fbbf24' : 'transparent',
            color: override === q ? '#000' : '#fbbf24',
            border: '1px solid #fbbf24',
            borderRadius: 3,
            padding: '3px 5px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        >
          {q.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
