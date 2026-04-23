'use client';
import type { CityAgent } from '@/components/city/types';
import { FRAMEWORK_COLORS, CATEGORY_LABELS } from '@/components/city/types';

interface Props {
  agent: CityAgent | null;
  onClose: () => void;
  onOpen?: (id: string) => void;
}

/**
 * HTML popup that appears when the user clicks a building in the 3D
 * scene. Shows the agent's identity, framework, district, tier, and
 * a button that deep-links to the agent's full page. Deliberately
 * simple — it's a preview, not a replacement for the CityHud card
 * from the legacy scene.
 */
export function AgentPopup({ agent, onClose, onOpen }: Props) {
  if (!agent) return null;
  const color = '#' + FRAMEWORK_COLORS[agent.framework].toString(16).padStart(6, '0');
  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        zIndex: 20,
        background: 'rgba(5,8,20,0.94)',
        border: `1px solid ${color}`,
        borderRadius: 8,
        padding: '14px 18px',
        minWidth: 280,
        maxWidth: 360,
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 11,
        lineHeight: 1.6,
        color: '#e3e8ff',
        boxShadow: `0 0 20px ${color}55`,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'transparent',
          color: '#7ad8ff',
          border: 'none',
          fontFamily: 'inherit',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
      <div style={{ color, fontSize: 14, marginBottom: 6 }}>{agent.name}</div>
      <div style={{ opacity: 0.7, fontSize: 9, marginBottom: 10 }}>
        {agent.framework.toUpperCase()} · {CATEGORY_LABELS[agent.category]}
      </div>
      <div style={{ fontSize: 10, marginBottom: 4 }}>
        Tier {agent.tier} · Status {agent.status}
      </div>
      <div style={{ fontSize: 10, marginBottom: 12, opacity: 0.75 }}>
        Messages: {agent.messageCount}
      </div>
      {onOpen && (
        <button
          onClick={() => onOpen(agent.id)}
          style={{
            background: color,
            color: '#050814',
            border: 'none',
            borderRadius: 4,
            padding: '6px 12px',
            fontFamily: 'inherit',
            fontSize: 10,
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          OPEN AGENT →
        </button>
      )}
    </div>
  );
}
