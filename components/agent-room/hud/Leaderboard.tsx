'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { API_URL } from '@/lib/config';

const FW_META: Record<string, { icon: string; primary: string; label: string }> = {
  openclaw: { icon: '🦞', primary: '#FACC15', label: 'OpenClaw' },
  hermes: { icon: '🪶', primary: '#A855F7', label: 'Hermes' },
  elizaos: { icon: '🐙', primary: '#3B82F6', label: 'ElizaOS' },
  milady: { icon: '🎨', primary: '#EC4899', label: 'Milady' },
};

interface PublicAgent {
  id: string;
  slug?: string | null;
  name: string;
  framework: string;
  status: string;
  messageCount?: number;
  createdAt?: string;
}

interface Props {
  currentAgentId: string;
  framework: string;
  onOpen?: () => void;
}

export function Leaderboard({ currentAgentId, framework, onOpen }: Props) {
  const t = useTranslations('agentRoom.leaderboard');
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeFw, setActiveFw] = useState(framework);

  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/city`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: { agents?: PublicAgent[] } };
        setAgents(json.data?.agents ?? []);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const ranked = agents
    .filter((a) => a.framework === activeFw)
    .sort((a, b) => (b.messageCount ?? 0) - (a.messageCount ?? 0))
    .slice(0, 10);
  const currentRank = agents
    .filter((a) => a.framework === framework)
    .sort((a, b) => (b.messageCount ?? 0) - (a.messageCount ?? 0))
    .findIndex((a) => a.id === currentAgentId);

  const meta = FW_META[activeFw] ?? FW_META.openclaw!;

  return (
    <>
      <button
        onClick={() => { setOpen(true); onOpen?.(); }}
        className="pointer-events-auto absolute top-3 right-[120px] z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] backdrop-blur-xl transition-all hover:scale-105 md:top-5 md:right-[430px] md:gap-2 md:px-3.5 md:py-2 md:text-[11px] md:tracking-[2px]"
        style={{
          background: 'rgba(12, 14, 22, 0.82)',
          borderColor: 'var(--room-primary)',
          color: 'var(--room-bright)',
          boxShadow: '0 0 18px color-mix(in srgb, var(--room-primary) 22%, transparent)',
        }}
        title={t('title')}
      >
        <span aria-hidden>🏆</span>
        <span className="hidden sm:inline">
          {currentRank >= 0 && currentRank < 10
            ? t('buttonWithRank', { rank: currentRank + 1 })
            : t('button')}
        </span>
      </button>
      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm md:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl border backdrop-blur-xl"
            style={{
              background: 'rgba(12, 14, 22, 0.94)',
              borderColor: meta.primary,
              boxShadow: `0 0 60px ${meta.primary}55`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <div className="text-[10px] uppercase tracking-[3px]" style={{ color: meta.primary }}>
                  {t('heading')}
                </div>
                <div className="mt-1 text-xl font-bold text-gray-100">
                  {meta.icon} {meta.label}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-xs uppercase tracking-wider text-gray-400 hover:text-gray-200"
              >
                ESC
              </button>
            </div>
            <div className="flex gap-1 border-b border-white/5 px-3 py-2">
              {(Object.keys(FW_META) as Array<keyof typeof FW_META>).map((fw) => {
                const f = FW_META[fw]!;
                const active = activeFw === fw;
                return (
                  <button
                    key={fw}
                    onClick={() => setActiveFw(fw)}
                    className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
                    style={{
                      background: active ? `${f.primary}22` : 'transparent',
                      color: active ? f.primary : '#9ca3af',
                      border: active ? `1px solid ${f.primary}55` : '1px solid transparent',
                    }}
                  >
                    {f.icon} {f.label}
                  </button>
                );
              })}
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-2 py-3">
              {!loaded && (
                <div className="py-8 text-center text-sm text-gray-400">{t('loading')}</div>
              )}
              {loaded && ranked.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">
                  {t('empty', { framework: meta.label })}
                </div>
              )}
              {ranked.map((a, i) => {
                const me = a.id === currentAgentId;
                return (
                  <Link
                    key={a.id}
                    href={`/agent/${a.id}/room`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-white/[0.04]"
                    style={me ? { background: `${meta.primary}18`, borderLeft: `2px solid ${meta.primary}` } : {}}
                  >
                    <span
                      className="w-6 text-center text-sm font-bold"
                      style={{ color: i < 3 ? meta.primary : '#6b7280' }}
                    >
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-gray-100">
                      {a.name}
                      {me && <span className="ml-1.5 text-[9px] font-normal text-gray-400">{t('you')}</span>}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: meta.primary }}>
                      {(a.messageCount ?? 0).toLocaleString()}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-white/5 px-5 py-3 text-[10px] uppercase tracking-wider text-gray-500">
              {t('footer')}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
