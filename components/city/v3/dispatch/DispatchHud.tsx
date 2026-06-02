'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import {
  levelInfo,
  prestigeMultiplier,
  upgradeEffects,
  JOB_TYPES,
  ACHIEVEMENTS,
  PRESTIGE_LEVEL,
  type JobType,
  type AchStats,
} from '@/lib/agent-dispatch/config';
import { buildDispatchRoute, pathLength, spawnPackets } from '@/lib/agent-dispatch/route';
import type { LiveCityGrid } from '../liveCityHandoff';
import type { LiveAgentPose } from '../liveAgentMotion';
import type { CityAgent } from '../../types';
import { SkinShop } from './SkinShop';
import { DispatchLeaderboard } from './DispatchLeaderboard';
import { DispatchLab } from './DispatchLab';
import { DispatchGoals } from './DispatchGoals';
import { useDispatchScoreSync } from '@/lib/agent-dispatch/useScoreSync';
import { useDispatchStateSync } from '@/lib/agent-dispatch/state-sync';
import { fetchSurge } from '@/lib/agent-dispatch/leaderboard';

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
  const prestige = useDispatchStore((s) => s.prestige);
  const dispatches = useDispatchStore((s) => s.dispatches);
  const panelOpen = useDispatchStore((s) => s.panelOpen);
  const shopOpen = useDispatchStore((s) => s.shopOpen);
  const leaderboardOpen = useDispatchStore((s) => s.leaderboardOpen);
  const labOpen = useDispatchStore((s) => s.labOpen);
  const goalsOpen = useDispatchStore((s) => s.goalsOpen);
  const upgrades = useDispatchStore((s) => s.upgrades);
  const stats = useDispatchStore((s) => s.stats);
  const achieved = useDispatchStore((s) => s.achieved);
  const autoDispatch = useDispatchStore((s) => s.autoDispatch);
  const achievementToast = useDispatchStore((s) => s.achievementToast);
  const offlineToast = useDispatchStore((s) => s.offlineToast);
  const streak = useDispatchStore((s) => s.streak);
  const streakToast = useDispatchStore((s) => s.streakToast);
  const lastResult = useDispatchStore((s) => s.lastResult);
  const setPanelOpen = useDispatchStore((s) => s.setPanelOpen);
  const setShopOpen = useDispatchStore((s) => s.setShopOpen);
  const setLeaderboardOpen = useDispatchStore((s) => s.setLeaderboardOpen);
  const setLabOpen = useDispatchStore((s) => s.setLabOpen);
  const setGoalsOpen = useDispatchStore((s) => s.setGoalsOpen);
  const setAuto = useDispatchStore((s) => s.setAuto);
  const manualControl = useDispatchStore((s) => s.manualControl);
  const setManual = useDispatchStore((s) => s.setManual);
  const startDispatch = useDispatchStore((s) => s.startDispatch);
  const doPrestige = useDispatchStore((s) => s.doPrestige);
  const unlockAchievement = useDispatchStore((s) => s.unlockAchievement);
  const applyOffline = useDispatchStore((s) => s.applyOffline);
  const claimDaily = useDispatchStore((s) => s.claimDaily);
  const clearResult = useDispatchStore((s) => s.clearResult);
  const clearAchievementToast = useDispatchStore((s) => s.clearAchievementToast);
  const clearOfflineToast = useDispatchStore((s) => s.clearOfflineToast);
  const clearStreakToast = useDispatchStore((s) => s.clearStreakToast);

  useDispatchStateSync();
  useDispatchScoreSync();
  const hydrated = useDispatchStore((s) => s.hydrated);

  const lvl = useMemo(() => levelInfo(xp), [xp]);
  const dests = useMemo(() => dispatchDestinations(grid), [grid]);

  const runningAgents = useMemo(
    () => ownedAgents.filter((a) => a.status === 'running'),
    [ownedAgents],
  );

  const [agentId, setAgentId] = useState('');
  const [destIdx, setDestIdx] = useState(0);
  const [jobIdx, setJobIdx] = useState(0);

  // Data Surge: synchronized bonus window from the backend (clock-derived).
  const setSurge = useDispatchStore((s) => s.setSurge);
  const [surge, setSurgeBanner] = useState<{ active: boolean; mult: number; remaining: number } | null>(null);
  useEffect(() => {
    let offset = 0;
    let data: Awaited<ReturnType<typeof fetchSurge>> = null;
    let alive = true;
    const load = async () => {
      const d = await fetchSurge();
      if (d && alive) {
        data = d;
        offset = d.serverNow - Date.now();
      }
    };
    void load();
    const refetch = window.setInterval(() => void load(), 30_000);
    const tick = window.setInterval(() => {
      if (!data) return;
      const now = Date.now() + offset;
      let active = false;
      let remaining = 0;
      if (data.endsAt && now < data.endsAt) {
        active = true;
        remaining = Math.ceil((data.endsAt - now) / 1000);
      } else if (now >= data.nextStartsAt) {
        void load();
      }
      setSurge(active, data.multiplier);
      setSurgeBanner({ active, mult: data.multiplier, remaining });
    }, 1000);
    return () => {
      alive = false;
      window.clearInterval(refetch);
      window.clearInterval(tick);
      setSurge(false, 1);
    };
  }, [setSurge]);
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

  const createDispatch = useCallback(
    (agent: CityAgent, dest: Dest, job: JobType) => {
      const fx = upgradeEffects(upgrades);
      const pose = agentPosesRef.current.get(agent.id);
      const start = pose ? { x: pose.x, z: pose.z } : { x: 0, z: 0 };
      const route = buildDispatchRoute(start, dest);
      const totalLength = pathLength(route);
      // Roughly constant count (not scaled up by the now-longer routes) so the
      // orbs end up more spaced out along the path.
      const basePackets = Math.min(8, Math.max(5, Math.round(totalLength / 110)));
      const packetCount = Math.max(3, Math.round(basePackets * job.packetMult) + fx.extraPackets);
      const durationMs = Math.min(
        90000,
        Math.max(12000, (totalLength / 5) * 1000 * fx.durationMult * job.durationMult),
      );
      dispatchSeq += 1;
      return startDispatch({
        id: `dsp-${dispatchSeq}-${agent.id}`,
        agentId: agent.id,
        agentName: agent.name,
        framework: agent.framework,
        destName: dest.name,
        destX: dest.x,
        destZ: dest.z,
        route,
        totalLength,
        startedAt: Date.now(),
        durationMs,
        packets: spawnPackets(route, totalLength, packetCount, job.rarePackets),
        collected: 0,
        baseReward: Math.round((4 + totalLength / 55) * job.rewardMult),
        startLevel: lvl.level,
        xpMult: job.xpMult,
        jobName: job.name,
      });
    },
    [upgrades, agentPosesRef, startDispatch, lvl.level],
  );

  const send = () => {
    const agent = available.find((a) => a.id === selected);
    if (agent) createDispatch(agent, dests[destIdx]!, JOB_TYPES[jobIdx]!);
  };

  // Auto-dispatch: keep idle agents busy, filling free slots on a timer.
  const autoDestRef = useRef(0);
  useEffect(() => {
    if (!autoDispatch || runningAgents.length === 0 || dests.length === 0) return;
    const tick = () => {
      const st = useDispatchStore.getState();
      const free = upgradeEffects(st.upgrades).maxSlots - st.dispatches.length;
      if (free <= 0) return;
      const busy = new Set(st.dispatches.map((d) => d.agentId));
      const idle = runningAgents.filter((a) => !busy.has(a.id));
      for (let i = 0; i < Math.min(free, idle.length); i++) {
        autoDestRef.current = (autoDestRef.current + 1) % dests.length;
        createDispatch(idle[i]!, dests[autoDestRef.current]!, JOB_TYPES[0]!);
      }
    };
    tick();
    const t = window.setInterval(tick, 2500);
    return () => window.clearInterval(t);
  }, [autoDispatch, runningAgents, dests, createDispatch]);

  // Unlock achievements as their conditions are met.
  useEffect(() => {
    if (!hydrated) return;
    const upgradeLevels = Object.values(upgrades).reduce<number>((a, b) => a + (b ?? 0), 0);
    const snap: AchStats = {
      dispatches: stats.dispatches,
      packets: stats.packets,
      level: lvl.level,
      prestige,
      upgradeLevels,
    };
    for (const a of ACHIEVEMENTS) {
      if (!achieved.includes(a.id) && a.met(snap)) unlockAchievement(a);
    }
  }, [hydrated, stats, achieved, upgrades, prestige, lvl.level, unlockAchievement]);

  // Offline accrual (once, after hydration + agents load) + keep lastSeen fresh.
  const offlineAppliedRef = useRef(false);
  useEffect(() => {
    if (offlineAppliedRef.current || !hydrated || runningAgents.length === 0) return;
    offlineAppliedRef.current = true;
    applyOffline(runningAgents.length);
  }, [hydrated, runningAgents.length, applyOffline]);
  useEffect(() => {
    const t = window.setInterval(() => useDispatchStore.getState().touchSeen(), 30000);
    return () => {
      useDispatchStore.getState().touchSeen();
      window.clearInterval(t);
    };
  }, []);

  // Daily login streak — claim once, after hydration.
  useEffect(() => {
    if (hydrated) claimDaily();
  }, [hydrated, claimDaily]);
  useEffect(() => {
    if (!streakToast) return;
    const t = window.setTimeout(() => clearStreakToast(), 6000);
    return () => window.clearTimeout(t);
  }, [streakToast, clearStreakToast]);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!achievementToast) return;
    const t = window.setTimeout(() => clearAchievementToast(), 5000);
    return () => window.clearTimeout(t);
  }, [achievementToast, clearAchievementToast]);
  useEffect(() => {
    if (offlineToast == null) return;
    const t = window.setTimeout(() => clearOfflineToast(), 7000);
    return () => window.clearTimeout(t);
  }, [offlineToast, clearOfflineToast]);

  return (
    <>
      {/* Data Surge banner — synchronized bonus window. */}
      {surge?.active && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-40 -translate-x-1/2">
          <div
            className="flex items-center gap-2 rounded-full border border-[#ffd24a]/60 bg-[rgba(20,14,4,0.92)] px-4 py-2 text-sm font-bold text-[#ffd24a] shadow-xl backdrop-blur"
            style={{ boxShadow: '0 0 28px rgba(255,210,74,0.4)', animation: 'dispatch-float 0.4s ease-out' }}
          >
            <span aria-hidden className="animate-pulse">⚡</span>
            DATA SURGE · {surge.mult}× packets
            <span className="font-mono text-[#fff0c0]">
              {Math.floor(surge.remaining / 60)}:{String(surge.remaining % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

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
              <span className="font-bold text-[#39ff88]">
                Level {lvl.level}
                {prestige > 0 && (
                  <span className="ml-1 text-[#ffd24a]" title={`Prestige ${prestige} · +${Math.round(prestige * 25)}% earnings`}>
                    ★{prestige}
                  </span>
                )}
              </span>
              <span className="text-[#9fceb4]">
                {streak.count > 0 && (
                  <span className="mr-2 text-[#ff8a3a]" title={`${streak.count}-day streak`}>🔥{streak.count}</span>
                )}
                ◆ {Math.round(data).toLocaleString()} Data
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#39ff88] transition-all" style={{ width: `${Math.round(lvl.pct * 100)}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#7faE96]">
              <span>{prestige > 0 ? `×${prestigeMultiplier(prestige).toFixed(2)} earnings` : ''}</span>
              <span>{lvl.intoLevel} / {lvl.forNext} XP</span>
            </div>
            {lvl.level >= PRESTIGE_LEVEL && (
              <button
                onClick={() => {
                  if (window.confirm(`Prestige now? Your level resets to 1, but you keep your Data + skins and gain a permanent +25% earnings boost (Prestige ${prestige + 1}).`)) {
                    doPrestige();
                  }
                }}
                className="mt-2 w-full rounded-lg border border-[#ffd24a]/50 bg-[#ffd24a]/10 py-1.5 text-xs font-bold text-[#ffd24a] transition hover:bg-[#ffd24a]/20"
              >
                ★ Prestige → +25% forever
              </button>
            )}
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
              <div className="flex gap-1">
                {JOB_TYPES.map((j, i) => (
                  <button
                    key={j.id}
                    onClick={() => setJobIdx(i)}
                    title={j.desc}
                    className={`flex-1 rounded-md px-1 py-1 text-[10px] font-semibold transition ${
                      jobIdx === i ? 'bg-[#39ff88] text-black' : 'bg-white/5 text-[#9fceb4] hover:bg-white/10'
                    }`}
                  >
                    {j.name}
                  </button>
                ))}
              </div>
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
            onClick={() => setAuto(!autoDispatch)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              autoDispatch
                ? 'border-[#39ff88] bg-[#39ff88]/15 text-[#39ff88]'
                : 'border-white/10 bg-black/30 text-[#9fceb4] hover:bg-white/5'
            }`}
            title="Automatically keep your agents on dispatch runs"
          >
            <span>⟳ Auto-dispatch</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${autoDispatch ? 'bg-[#39ff88] text-black' : 'bg-white/10'}`}>
              {autoDispatch ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => setManual(!manualControl)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              manualControl
                ? 'border-[#62b8ff] bg-[#62b8ff]/15 text-[#62b8ff]'
                : 'border-white/10 bg-black/30 text-[#9fceb4] hover:bg-white/5'
            }`}
            title="Steer your active courier yourself with WASD / arrow keys to sweep packets"
          >
            <span>🎮 Manual steer</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${manualControl ? 'bg-[#62b8ff] text-black' : 'bg-white/10'}`}>
              {manualControl ? 'WASD' : 'OFF'}
            </span>
          </button>
          {manualControl && (
            <div className="rounded-lg border border-[#62b8ff]/25 bg-[#62b8ff]/5 px-3 py-1.5 text-[11px] text-[#9fceb4]">
              <span className="font-mono text-[#62b8ff]">WASD</span> to move (relative to the camera),{' '}
              <span className="font-mono text-[#62b8ff]">drag</span> to look around — like walk mode. Reach the marked
              destination to deliver; sweep packets for combos.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setLabOpen(true)} className="rounded-lg border border-[#39ff88]/30 bg-black/30 px-2 py-2 text-sm font-semibold text-[#39ff88] transition hover:bg-[#39ff88]/10">
              ⚗ Lab
            </button>
            <button onClick={() => setShopOpen(true)} className="rounded-lg border border-[#39ff88]/30 bg-black/30 px-2 py-2 text-sm font-semibold text-[#39ff88] transition hover:bg-[#39ff88]/10">
              ✦ Skins
            </button>
            <button onClick={() => setLeaderboardOpen(true)} className="rounded-lg border border-[#39ff88]/30 bg-black/30 px-2 py-2 text-sm font-semibold text-[#39ff88] transition hover:bg-[#39ff88]/10">
              ☷ Ranks
            </button>
            <button onClick={() => setGoalsOpen(true)} className="rounded-lg border border-[#39ff88]/30 bg-black/30 px-2 py-2 text-sm font-semibold text-[#39ff88] transition hover:bg-[#39ff88]/10">
              ✔ Goals <span className="text-[10px] text-[#7faE96]">{achieved.length}/{ACHIEVEMENTS.length}</span>
            </button>
          </div>
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

      {/* Achievement toast */}
      {achievementToast && (
        <div className="fixed bottom-40 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-[#ffd24a]/50 bg-[rgba(8,12,10,0.96)] px-5 py-3 text-center text-sm shadow-2xl backdrop-blur">
          <div className="font-bold text-[#ffd24a]">✔ {achievementToast.name}</div>
          <div className="mt-0.5 text-xs text-[#dffbe9]">Achievement unlocked · +{achievementToast.reward} Data</div>
        </div>
      )}

      {/* Daily streak toast */}
      {streakToast && (
        <div className="fixed top-32 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-[#ff8a3a]/50 bg-[rgba(8,12,10,0.96)] px-5 py-3 text-center text-sm shadow-2xl backdrop-blur">
          <div className="font-bold text-[#ff8a3a]">🔥 {streakToast.count}-day streak!</div>
          <div className="mt-0.5 text-xs text-[#dffbe9]">Daily bonus · +{streakToast.bonus} Data</div>
        </div>
      )}

      {/* Offline / welcome-back toast */}
      {offlineToast != null && (
        <div className="fixed top-20 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-[#39ff88]/50 bg-[rgba(8,12,10,0.96)] px-5 py-3 text-center text-sm shadow-2xl backdrop-blur">
          <div className="font-bold text-[#39ff88]">Welcome back!</div>
          <div className="mt-0.5 text-xs text-[#dffbe9]">Your agents collected +{offlineToast.toLocaleString()} Data while you were away.</div>
        </div>
      )}

      {shopOpen && <SkinShop onClose={() => setShopOpen(false)} />}
      {leaderboardOpen && <DispatchLeaderboard onClose={() => setLeaderboardOpen(false)} />}
      {labOpen && <DispatchLab onClose={() => setLabOpen(false)} />}
      {goalsOpen && <DispatchGoals onClose={() => setGoalsOpen(false)} />}
    </>
  );
}
