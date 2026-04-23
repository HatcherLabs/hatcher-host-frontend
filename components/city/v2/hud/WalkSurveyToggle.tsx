'use client';

export type CityMode = 'survey' | 'walk';

interface Props {
  mode: CityMode;
  onChange: (m: CityMode) => void;
}

/**
 * HUD button in the top-right corner under the QualityToggle. Flips
 * between aerial Survey mode (OrbitControls) and first-person Walk
 * mode (WASD + FollowCamera).
 */
export function WalkSurveyToggle({ mode, onChange }: Props) {
  const next: CityMode = mode === 'survey' ? 'walk' : 'survey';
  const label = mode === 'survey' ? '🚶 WALK' : '🗺️ SURVEY';
  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        right: 12,
        zIndex: 10,
      }}
    >
      <button
        onClick={() => onChange(next)}
        style={{
          background: 'rgba(5,8,20,0.75)',
          color: '#fbbf24',
          border: '1px solid #fbbf24',
          borderRadius: 6,
          padding: '6px 14px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: 11,
          cursor: 'pointer',
          letterSpacing: 1,
        }}
      >
        {label}
      </button>
    </div>
  );
}
