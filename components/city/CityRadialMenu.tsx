'use client';

import { useEffect } from 'react';
import type { CityAgent } from './types';

export interface RadialMenuState {
  agent: CityAgent;
  screenX: number;
  screenY: number;
}

interface Props {
  state: RadialMenuState | null;
  onClose: () => void;
  onOpen: (agent: CityAgent) => void;
  onFocus: (agent: CityAgent) => void;
  onShare: (agent: CityAgent) => void;
  onPin: (agent: CityAgent) => void;
  isPinned: boolean;
}

const RADIUS = 60;

interface Action {
  label: string;
  icon: string;
  run: () => void;
}

export function CityRadialMenu({
  state,
  onClose,
  onOpen,
  onFocus,
  onShare,
  onPin,
  isPinned,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!state) return null;

  const actions: Action[] = [
    { label: 'Open', icon: '↗', run: () => onOpen(state.agent) },
    { label: 'Focus', icon: '◎', run: () => onFocus(state.agent) },
    { label: 'Share', icon: '⤴', run: () => onShare(state.agent) },
    { label: isPinned ? 'Unpin' : 'Pin', icon: '★', run: () => onPin(state.agent) },
  ];

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          left: state.screenX,
          top: state.screenY,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Centre label with agent name */}
        <div className="pointer-events-auto min-w-[120px] -translate-x-1/2 -translate-y-1/2 border-2 border-amber-400 bg-[#0a0e1a]/95 px-3 py-1.5 text-center font-['Press_Start_2P',monospace] text-[9px] tracking-[1px] text-amber-400 shadow-[3px_3px_0_#000]">
          {state.agent.name.toUpperCase()}
        </div>
        {actions.map((a, i) => {
          // Evenly distribute on a circle starting from top.
          const angle = (-Math.PI / 2) + (i * (2 * Math.PI)) / actions.length;
          const x = Math.cos(angle) * RADIUS;
          const y = Math.sin(angle) * RADIUS;
          return (
            <button
              key={a.label}
              onClick={(e) => {
                e.stopPropagation();
                a.run();
                onClose();
              }}
              className="pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border-2 border-slate-600 bg-[#0a0e1a]/95 font-mono text-[10px] text-slate-200 shadow-[2px_2px_0_#000] hover:border-amber-400 hover:text-amber-300"
              style={{ left: x, top: y }}
            >
              <span className="text-base leading-none">{a.icon}</span>
              <span className="mt-0.5 text-[9px]">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
