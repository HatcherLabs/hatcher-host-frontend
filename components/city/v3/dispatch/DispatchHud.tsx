'use client';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import { levelInfo } from '@/lib/agent-dispatch/config';
import { buildDispatchRoute, pathLength, spawnPackets } from '@/lib/agent-dispatch/route';
import type { LiveCityGrid } from '../liveCityHandoff';
import type { LiveAgentPose } from '../liveAgentMotion';
import type { CityAgent } from '../../types';
import { SkinShop } from './SkinShop';

interface Dest {
  name: string;
  x: number;
  z: number;
}

function dispatchDestinations(grid: LiveCityGrid): Dest[] {
  const h = grid.half;
  return [
    { name: 'Data Core', x: 0, z: 0 },
    { name: 'North Relay', x: 0, z: -h * 0.72 },
    { name: 'South Docks', x: 0, z: h * 0.72 },
    { name: 'East Spire', x: h * 0.72, z: 0 },
    { name: 'West Gate', x: -h * 0.72, z: 0 },
    { name: 'NE Foundry', x: h * 0.55, z: -h * 0.55 },
    { name: 'SW Yards', x: -h * 0.55, z: h * 0.55 },
    { name: 'NW Archive', x: -h * 0.55, z: -h * 0.55 },
  ];
}

let dispatchSeq = 0;

export function DispatchHud({
  grid,
  ownedAgents,
  agentPosesRef,
}: {
  grid: LiveCityGrid;
  ownedAgents: CityAgent[];
  agentPosesRef: MutableRefObject<Map<string, LiveAgentPose>>;
}) {
  const data = useDispatchStore((s) => s.data);
  const xp = useDispatchStore((s) => s.xp);
  const dispatches = useDispatchStore((s) => s.dispatches);
  const panelOpen = useDispatchStore((s) => s.panelOpen);
  const shopOpen = useDispatchStore((s) => s.shopOpen);
  const lastResult = useDispatchStore((s) => s.lastResult);
  const setPanelOpen = useDispatchStore((s) => s.setPanelOpen);
  const setShopOpen = useDispatchStore((s) => s.setShopOpen);
  const startDispatch = useDispatchStore((s) => s.startDispatch);
  const clearResult = useDispatchStore((s) => s.clearResult);

  const lvl = useMemo(() => levelInfo(xp), [xp]);
  const dests = useMemo(() => dispatchDestinations(grid), [grid]);

  const runningAgents = useMemo(
    () => ownedAgents.filter((a) => a.status === 'running'),
    [ownedAgents],
  );

  const [agentId, setAgentId] = useState('');
  const [destIdx, setDestIdx] = useState(0);
  // Re-render every second so countdowns tick.
  const [, force] = useState(0);
  useEffect(() => {
    if (dispatches.length === 0) return;
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [dispatches.length]);

  // Auto-dismiss the result toast.
  useEffect(() => {
    if (!lastResult) return;
    const t = window.setTimeout(() => clearResult(), 6000);
    return () => window.clearTimeout(t);
  }, [lastResult, clearResult]);

  const busy = new Set(dispatches.map((d) => d.agentId));
  const available = runningAgents.filter((a) => !busy.has(a.id));
  const selected = agentId && available.some((a) => a.id === agentId) ? agentId : available[0]?.id ?? '';

  const send = () => {
    const agent = available.find((a) => a.id === selected);
    if (!agent) return;
    const dest = dests[destIdx]!;
    const pose = agentPosesRef.current.get(agent.id);
    const start = pose ? { x: pose.x, z: pose.z } : { x: 0, z: 0 };
    const route = buildDispatchRoute(start, dest);
    const totalLength = pathLength(route);
    const packetCount = Math.min(10, Math.max(5, Math.round(totalLength / 40)));
    const durationMs = Math.min(90000, Math.max(20000, (totalLength / 5) * 1000));
    dispatchSeq += 1;
    startDispatch({
      id: `dsp-${dispatchSeq}-${agent.id}`,
      agentId: agent.id,
      agentName: agent.name,
      framework: agent.framework,
      destName: dest.name,
      route,
      totalLength,
      startedAt: Date.now(),
      durationMs,
      packets: spawnPackets(route, totalLength, packetCount),
      collected: 0,
      baseReward: 15 + Math.round(totalLength / 20),
      startLevel: lvl.level,
    });
  };

  return (
    <>
      {/* Launcher */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-full border border-[#39ff88]/50 bg-[rgba(8,12,10,0.92)] px-4 py-3 text-sm font-semibold text-[#dffbe9] shadow-xl backdrop-blur transition hover:scale-105 md:flex"
          style={{ boxShadow: '0 10px 30px rgba(57,255,136,0.25)' }}
        >
          <span aria-hidden>🚀</span>
          <span>Dispatch</span>
          <span className="rounded-full bg-[#39ff88]/20 px-2 text-xs">Lv {lvl.level}</span>
          {dispatches.length > 0 && (
            <span className="rounded-full bg-[#39ff88] px-2 text-xs font-bold text-black">{dispatches.length}</span>
          )}
        </button>
      )}

      {/* Panel */}
      {panelOpen && (
        <div className="fixed bottom-4 right-4 z-30 hidden w-[min(360px,calc(100vw-1.5rem))] flex-col gap-3 rounded-2xl border border-[#39ff88]/30 bg-[rgba(8,12,10,0.95)] p-4 text-[#dffbe9] shadow-2xl backdrop-blur md:flex">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#39ff88]">
              <span aria-hidden>🚀</span> Agent Dispatch
            </h2>
            <button onClick={() => setPanelOpen(false)} aria-label="Close" className="rounded-md px-2 py-1 text-[#9fceb4] hover:bg-white/5 hover:text-white">
              ▾
            </button>
          </div>

          {/* Progression */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-bold text-[#39ff88]">Level {lvl.level}</span>
              <span className="text-[#9fceb4]">◆ {Math.round(data).toLocaleString()} Data</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#39ff88] transition-all" style={{ width: `${Math.round(lvl.pct * 100)}%` }} />
            </div>
            <div className="mt-1 text-right text-[10px] text-[#7faE96]">
              {lvl.intoLevel} / {lvl.forNext} XP
            </div>
          </div>

          {/* Dispatch form */}
          {available.length > 0 ? (
            <div className="flex flex-col gap-2">
              <select
                value={selected}
                onChange={(e) => setAgentId(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm outline-none"
              >
                {available.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.framework})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <select
                  value={destIdx}
                  onChange={(e) => setDestIdx(Number(e.target.value))}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm outline-none"
                >
                  {dests.map((d, i) => (
                    <option key={d.name} value={i}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={send}
                  className="rounded-lg bg-[#39ff88] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#5fffa0]"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9fceb4]">
              {runningAgents.length === 0
                ? 'No running agents — start one to dispatch it.'
                : 'All your agents are out on a run.'}
            </p>
          )}

          {/* Active dispatches */}
          {dispatches.length > 0 && (
            <div className="flex flex-col gap-2">
              {dispatches.map((d) => {
                const progress = Math.min(1, (Date.now() - d.startedAt) / d.durationMs);
                const etaSec = Math.max(0, Math.round((d.durationMs * (1 - progress)) / 1000));
                return (
                  <div key={d.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-semibold">{d.agentName}</span>
                      <span className="text-[#9fceb4]">→ {d.destName}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-[#39ff88]" style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-[#7faE96]">
                      <span>◆ {d.collected}/{d.packets.length}</span>
                      <span>{etaSec}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setShopOpen(true)}
            className="rounded-lg border border-[#39ff88]/30 bg-black/30 px-3 py-2 text-sm font-semibold text-[#39ff88] transition hover:bg-[#39ff88]/10"
          >
            ✦ Skin Shop
          </button>
        </div>
      )}

      {/* Result toast */}
      {lastResult && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-[#39ff88]/50 bg-[rgba(8,12,10,0.96)] px-5 py-3 text-center text-sm text-[#dffbe9] shadow-2xl backdrop-blur">
          <div className="font-bold text-[#39ff88]">
            {lastResult.agentName} returned from {lastResult.destName}
          </div>
          <div className="mt-0.5 text-xs">
            +{lastResult.dataEarned} Data · +{lastResult.xpEarned} XP
            {lastResult.leveledTo != null && (
              <span className="ml-1 font-bold text-[#ffd24a]">· Level {lastResult.leveledTo}! 🎉</span>
            )}
          </div>
        </div>
      )}

      {shopOpen && <SkinShop onClose={() => setShopOpen(false)} />}
    </>
  );
}
