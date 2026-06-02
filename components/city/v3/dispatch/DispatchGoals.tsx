'use client';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import { ACHIEVEMENTS } from '@/lib/agent-dispatch/config';

export function DispatchGoals({ onClose }: { onClose: () => void }) {
  const achieved = useDispatchStore((s) => s.achieved);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur sm:items-center" onClick={onClose}>
      <div
        className="relative max-h-[88vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl border border-[#39ff88]/30 bg-[rgba(8,12,10,0.97)] p-5 text-[#dffbe9] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-md px-2 py-1 text-[#9fceb4] hover:bg-white/5 hover:text-white">
          ✕
        </button>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-[#39ff88]">
          <span aria-hidden>✔</span> Goals
        </h2>
        <p className="mb-4 text-xs text-[#9fceb4]">
          {achieved.length} / {ACHIEVEMENTS.length} unlocked
        </p>

        <div className="flex flex-col gap-2">
          {ACHIEVEMENTS.map((a) => {
            const done = achieved.includes(a.id);
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{ borderColor: done ? 'rgba(57,255,136,0.4)' : 'rgba(255,255,255,0.08)', background: done ? 'rgba(57,255,136,0.06)' : 'rgba(0,0,0,0.25)' }}
              >
                <span className="text-lg" aria-hidden style={{ color: done ? '#39ff88' : '#3a4a40' }}>
                  {done ? '✔' : '○'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold" style={{ color: done ? '#dffbe9' : '#9fceb4' }}>
                    {a.name}
                  </div>
                  <p className="truncate text-[11px] text-[#7faE96]">{a.desc}</p>
                </div>
                <span className="text-xs font-mono" style={{ color: done ? '#39ff88' : '#5f8a76' }}>
                  ◆ {a.reward}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
