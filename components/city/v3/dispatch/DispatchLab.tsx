'use client';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import { UPGRADES, upgradeCost } from '@/lib/agent-dispatch/config';

export function DispatchLab({ onClose }: { onClose: () => void }) {
  const data = useDispatchStore((s) => s.data);
  const upgrades = useDispatchStore((s) => s.upgrades);
  const buyUpgrade = useDispatchStore((s) => s.buyUpgrade);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur sm:items-center" onClick={onClose}>
      <div
        className="relative max-h-[88vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl border border-[#9ed5e7]/30 bg-[rgba(8,12,10,0.97)] p-5 text-[#e8f7fb] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-md px-2 py-1 text-[#9fc1c7] hover:bg-white/5 hover:text-white">
          ✕
        </button>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-[#9ed5e7]">
          <span aria-hidden>⚗</span> Dispatch Lab
        </h2>
        <p className="mb-4 text-xs text-[#9fc1c7]">◆ {Math.round(data).toLocaleString()} Data · permanent upgrades.</p>

        <div className="flex flex-col gap-2">
          {UPGRADES.map((def) => {
            const level = upgrades[def.id] ?? 0;
            const maxed = level >= def.maxLevel;
            const cost = upgradeCost(def, level);
            const canAfford = data >= cost;
            return (
              <div key={def.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <span className="text-xl" style={{ color: '#9ed5e7' }} aria-hidden>
                  {def.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {def.name}
                    <span className="text-[10px] font-normal text-[#7f98a3]">
                      Lv {level}/{def.maxLevel}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-[#9fc1c7]">{def.desc}</p>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: def.maxLevel }, (_, i) => (
                      <span
                        key={i}
                        className="h-1 flex-1 rounded-full"
                        style={{ background: i < level ? '#9ed5e7' : 'rgba(255,255,255,0.12)' }}
                      />
                    ))}
                  </div>
                </div>
                {maxed ? (
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold">MAX</span>
                ) : (
                  <button
                    onClick={() => buyUpgrade(def)}
                    disabled={!canAfford}
                    className="rounded-lg bg-[#9ed5e7] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#d7eff5] disabled:bg-white/10 disabled:text-[#7f98a3]"
                  >
                    ◆ {cost.toLocaleString()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
