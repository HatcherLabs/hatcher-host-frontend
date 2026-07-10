'use client';
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  fetchLeaderboard,
  fetchSeason,
  fetchReceipts,
  fetchTrophies,
  claimTrophy,
  type LeaderboardData,
  type LeaderRow,
  type SeasonData,
  type ReceiptsData,
  type TrophiesData,
} from '@/lib/agent-dispatch/leaderboard';

const RANK_MEDAL = ['🥇', '🥈', '🥉', '🏅', '🏅'];

const TABS = [
  { id: 'prizes', label: '🏆 Prizes' },
  { id: 'overall', label: 'All-time' },
  { id: 'wars', label: '⚔ Wars' },
  { id: 'hof', label: '👑 Legends' },
  { id: 'openclaw', label: 'OpenClaw' },
  { id: 'hermes', label: 'Hermes' },
  { id: 'onchain', label: '⛓ On-chain' },
];

const FW_WAR = {
  openclaw: { label: 'OpenClaw', color: '#9ed5e7' },
  hermes: { label: 'Hermes', color: '#62b8ff' },
} as const;

// Compose a tweet and open the X intent in a new tab.
function shareToX(text: string) {
  const url = 'https://hatcher.host/city';
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  if (typeof window !== 'undefined') window.open(intent, '_blank', 'noopener,noreferrer');
}

const RANK_COLOR = ['#ffd24a', '#cfd6e0', '#cd7f32'];

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ending…';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export function DispatchLeaderboard({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [receipts, setReceipts] = useState<ReceiptsData | null>(null);
  const [trophies, setTrophies] = useState<TrophiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('prizes');

  const reloadTrophies = () => void fetchTrophies().then((t) => setTrophies(t));

  useEffect(() => {
    let alive = true;
    const load = () =>
      Promise.all([fetchLeaderboard(), fetchSeason(), fetchReceipts(), fetchTrophies()]).then(([lb, s, r, t]) => {
        if (!alive) return;
        setData(lb);
        setSeason(s);
        setReceipts(r);
        setTrophies(t);
        setLoading(false);
      });
    void load();
    // Refresh while the panel stays open so standings don't look frozen as the
    // player keeps completing dispatches.
    const poll = window.setInterval(() => void load(), 15_000);
    return () => {
      alive = false;
      window.clearInterval(poll);
    };
  }, []);

  const allTimeRows: LeaderRow[] =
    tab === 'overall' ? data?.overall ?? [] : tab === 'prizes' ? [] : data?.byFramework?.[tab] ?? [];
  const countdown = useMemo(() => (season ? timeLeft(season.monthEnd) : ''), [season]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur sm:items-center" onClick={onClose}>
      <div
        className="relative max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl border border-[#9ed5e7]/30 bg-[rgba(8,12,10,0.97)] p-5 text-[#e8f7fb] shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-md px-2 py-1 text-[#9fc1c7] hover:bg-white/5 hover:text-white">
          ✕
        </button>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#9ed5e7]">
          <span aria-hidden>☷</span> Leaderboard
        </h2>

        <div className="mb-3 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                tab === t.id ? 'bg-[#9ed5e7] text-black' : 'bg-white/5 text-[#9fc1c7] hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[#9fc1c7]">Loading…</p>
        ) : tab === 'prizes' ? (
          <SeasonView season={season} countdown={countdown} />
        ) : tab === 'wars' ? (
          <WarsView data={data} />
        ) : tab === 'hof' ? (
          <HallOfFameView season={season} />
        ) : tab === 'onchain' ? (
          <OnchainView season={season} receipts={receipts} trophies={trophies} onClaimed={reloadTrophies} />
        ) : allTimeRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#9fc1c7]">No scores yet — be the first to dispatch!</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {allTimeRows.map((r, i) => (
              <li key={`${r.username}-${i}`} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm">
                <span className="w-6 text-center font-bold" style={{ color: RANK_COLOR[i] ?? '#7f98a3' }}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {r.username}
                  {r.prestige > 0 && <span className="ml-1 text-xs text-[#ffd24a]">★{r.prestige}</span>}
                </span>
                <span className="text-xs text-[#9fc1c7]">Lv {r.level}</span>
                <span className="w-20 text-right font-mono text-[#9ed5e7]">◆ {r.value.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-center text-[10px] text-[#5f8a76]">Scores upload a few seconds after you play. Sign in to compete.</p>
      </div>
    </div>
  );
}

function SeasonView({ season, countdown }: { season: SeasonData | null; countdown: string }) {
  if (!season) return <p className="py-8 text-center text-sm text-[#9fc1c7]">Season unavailable.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-[#ffd24a]/30 bg-[#ffd24a]/5 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-[#ffd24a]">Monthly Season</span>
          <span className="text-xs text-[#9fc1c7]">{countdown}</span>
        </div>
        <p className="mt-1 text-[11px] text-[#9fc1c7]">
          Top 5 each month win AI Credits. Earn the most Data before the month ends.
        </p>
        {season.you && (
          <div className="mt-2 rounded-lg bg-black/30 px-3 py-2 text-xs">
            <div>
              You&apos;re <span className="font-bold text-[#ffd24a]">#{season.you.rank}</span> with ◆{' '}
              {season.you.value.toLocaleString()}
              {season.you.prizeCredits > 0 ? (
                <span className="text-[#9ed5e7]"> · on track for {season.you.prizeCredits.toLocaleString()} AI Credits</span>
              ) : (
                <span className="text-[#7f98a3]"> · reach the top 5 for a prize</span>
              )}
            </div>
            <button
              onClick={() =>
                shareToX(
                  `I'm ranked #${season.you!.rank} in Hatcher Agent Dispatch ⚔ with ${season.you!.value.toLocaleString()} pts. Deploy an AI agent, race the city for AI Credits 🤖`,
                )
              }
              className="mt-2 flex items-center gap-1.5 rounded-md border border-[#1d9bf0]/50 bg-[#1d9bf0]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1d9bf0] transition hover:bg-[#1d9bf0]/20"
            >
              𝕏 Share my rank
            </button>
          </div>
        )}
      </div>

      {/* Prize table */}
      <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
        {season.prizeTable.map((p) => (
          <div key={p.label} className="rounded-md border border-white/10 bg-black/20 py-1.5" title={p.note}>
            <div className="font-bold text-[#9ed5e7]">{p.credits.toLocaleString()}</div>
            <div className="text-[#7f98a3]">{p.label}</div>
          </div>
        ))}
      </div>
      <p className="text-center text-[9px] text-[#5f8a76]">prizes paid in AI Credits</p>

      {/* This month's board */}
      {season.board.length === 0 ? (
        <p className="py-4 text-center text-xs text-[#9fc1c7]">No entries yet this month — be first!</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {season.board.map((r) => (
            <li key={r.rank} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm">
              <span className="w-6 text-center font-bold" style={{ color: RANK_COLOR[r.rank - 1] ?? '#7f98a3' }}>{r.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.username}</span>
              {r.prizeCredits > 0 && <span className="text-xs font-bold text-[#9ed5e7]">🏆 {r.prizeCredits.toLocaleString()}</span>}
              <span className="w-20 text-right font-mono text-[#9ed5e7]">◆ {r.value.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Past winners */}
      {season.past.some((p) => p.winners.length > 0) && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-1 text-xs font-bold text-[#9fc1c7]">Past winners</div>
          {season.past
            .filter((p) => p.winners.length > 0)
            .map((p) => (
              <div key={p.month} className="mb-1 text-[11px]">
                <span className="text-[#7f98a3]">{p.month}:</span>{' '}
                {p.winners.slice(0, 3).map((w, i) => (
                  <span key={w.rank}>
                    {i > 0 && ', '}
                    <span style={{ color: RANK_COLOR[w.rank - 1] ?? '#e8f7fb' }}>{w.username}</span>
                  </span>
                ))}
                {p.paidAt ? <span className="ml-1 text-[#9ed5e7]">✓ paid</span> : <span className="ml-1 text-[#7f98a3]">· pending</span>}
                {p.solscan && (
                  <a href={p.solscan} target="_blank" rel="noreferrer" className="ml-1 text-[#62b8ff] hover:underline" title="Verify the final ranking anchored on Solana">
                    ⛓ on-chain
                  </a>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function WarsView({ data }: { data: LeaderboardData | null }) {
  const wars = data?.frameworkWars ?? {};
  const oc = Math.max(0, Math.round(wars.openclaw ?? 0));
  const hm = Math.max(0, Math.round(wars.hermes ?? 0));
  const total = oc + hm;
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-[#9fc1c7]">No scores yet — pick a side and dispatch!</p>;
  }
  const ocPct = Math.round((oc / total) * 100);
  const leader = oc === hm ? 'tied' : oc > hm ? 'openclaw' : 'hermes';
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-xs text-[#9fc1c7]">
        Every dispatch you complete adds to your framework&apos;s total. Which side runs the city?
      </p>
      <div className="flex items-center justify-between text-sm font-bold">
        <span style={{ color: FW_WAR.openclaw.color }}>{FW_WAR.openclaw.label}</span>
        <span style={{ color: FW_WAR.hermes.color }}>{FW_WAR.hermes.label}</span>
      </div>
      {/* Tug-of-war bar */}
      <div className="flex h-6 overflow-hidden rounded-full border border-white/10">
        <div className="flex items-center justify-start pl-2 text-[10px] font-bold text-black" style={{ width: `${ocPct}%`, background: FW_WAR.openclaw.color }}>
          {ocPct >= 12 && `${ocPct}%`}
        </div>
        <div className="flex flex-1 items-center justify-end pr-2 text-[10px] font-bold text-black" style={{ background: FW_WAR.hermes.color }}>
          {100 - ocPct >= 12 && `${100 - ocPct}%`}
        </div>
      </div>
      <div className="flex items-center justify-between font-mono text-xs">
        <span style={{ color: FW_WAR.openclaw.color }}>◆ {oc.toLocaleString()}</span>
        <span style={{ color: FW_WAR.hermes.color }}>◆ {hm.toLocaleString()}</span>
      </div>
      <div className="rounded-lg bg-black/30 px-3 py-2 text-center text-xs">
        {leader === 'tied' ? (
          <span className="font-bold text-[#e8f7fb]">Dead heat — both frameworks tied!</span>
        ) : (
          <span>
            <span className="font-bold" style={{ color: FW_WAR[leader].color }}>{FW_WAR[leader].label}</span> leads by{' '}
            <span className="font-mono">◆ {Math.abs(oc - hm).toLocaleString()}</span>
          </span>
        )}
      </div>
      <button
        onClick={() =>
          shareToX(
            `${FW_WAR[leader === 'tied' ? 'openclaw' : leader].label} is ${leader === 'tied' ? 'tied' : 'leading'} the Framework Wars in Hatcher Agent Dispatch ⚔ — OpenClaw ${oc.toLocaleString()} vs Hermes ${hm.toLocaleString()}. Pick a side 🤖`,
          )
        }
        className="flex items-center justify-center gap-1.5 rounded-md border border-[#1d9bf0]/50 bg-[#1d9bf0]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#1d9bf0] transition hover:bg-[#1d9bf0]/20"
      >
        𝕏 Share the war
      </button>
    </div>
  );
}

function HallOfFameView({ season }: { season: SeasonData | null }) {
  const months = (season?.past ?? []).filter((p) => p.winners.length > 0);
  if (months.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#9fc1c7]">
        No champions crowned yet — win a monthly season to enter the hall.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-xs text-[#9fc1c7]">Monthly season champions, immortalized.</p>
      {months.map((p) => {
        const champ = p.winners.find((w) => w.rank === 1) ?? p.winners[0]!;
        const rest = p.winners.filter((w) => w.rank > 1).slice(0, 2);
        return (
          <div key={p.month} className="rounded-xl border border-[#ffd24a]/30 bg-[#ffd24a]/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9fc1c7]">{p.month}</span>
              {p.solscan && (
                <a href={p.solscan} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#9ed5e7] hover:underline">
                  ⛓ on-chain
                </a>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl">👑</span>
              <span className="min-w-0 flex-1 truncate text-base font-bold text-[#ffd24a]">{champ.username}</span>
              {champ.prizeCredits > 0 && (
                <span className="text-xs font-bold text-[#9ed5e7]">{champ.prizeCredits.toLocaleString()} AI Cr</span>
              )}
            </div>
            {rest.length > 0 && (
              <div className="mt-1 text-[11px] text-[#9fc1c7]">
                {rest.map((w, i) => (
                  <span key={w.rank}>
                    {i > 0 && ' · '}
                    {RANK_MEDAL[w.rank - 1] ?? '🏅'} <span style={{ color: RANK_COLOR[w.rank - 1] ?? '#e8f7fb' }}>{w.username}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

function OnchainView({
  season,
  receipts,
  trophies,
  onClaimed,
}: {
  season: SeasonData | null;
  receipts: ReceiptsData | null;
  trophies: TrophiesData | null;
  onClaimed: () => void;
}) {
  const enabled = !!(season?.onchain?.enabled || receipts?.enabled);
  const payer = season?.onchain?.payer ?? receipts?.payer ?? null;
  const rows = receipts?.receipts ?? [];

  return (
    <div className="flex flex-col gap-3">
      <TrophiesSection trophies={trophies} onClaimed={onClaimed} />

      {!enabled ? (
        <div className="rounded-xl border border-[#62b8ff]/25 bg-[#62b8ff]/5 p-3 text-xs text-[#9fc1c7]">
          <div className="mb-1 font-bold text-[#62b8ff]">⛓ On-chain anchoring</div>
          Each completed dispatch and the final monthly ranking get anchored on{' '}
          <span className="text-[#e8f7fb]">Solana</span> — tamper-evident and publicly verifiable, paid by Hatcher.
          <div className="mt-2 text-[#7f98a3]">Anchoring is currently off for this environment.</div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[#62b8ff]/25 bg-[#62b8ff]/5 p-3 text-xs">
            <div className="mb-1 font-bold text-[#62b8ff]">⛓ On-chain anchoring · live</div>
            <p className="text-[#9fc1c7]">
              Dispatches batch into a Solana memo proof; the monthly ranking is committed as a merkle root. Hatcher pays every transaction.
            </p>
            {payer && <div className="mt-2 font-mono text-[10px] text-[#62b8ff]">payer {shortAddr(payer)}</div>}
            <p className="mt-1 text-[9px] text-[#5f8a76]">
              Platform-attested, not trustless — scores are reported by the client. The chain gives auditability, not anti-cheat.
            </p>
          </div>

          <div className="text-xs font-bold text-[#9fc1c7]">Your recent dispatches</div>
          {rows.length === 0 ? (
            <p className="py-3 text-center text-xs text-[#9fc1c7]">No anchored dispatches yet — send an agent out.</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      r.status === 'anchored' ? 'bg-[#9ed5e7]' : r.status === 'failed' ? 'bg-[#ff6b6b]' : 'bg-[#ffd24a]'
                    }`}
                    title={r.status}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-[#e8f7fb]">→ {r.destName || 'dispatch'}</span>
                    <span className="ml-1 text-[#7f98a3]">{r.framework}</span>
                  </span>
                  <span className="font-mono text-[#9ed5e7]">◆ {r.dataEarned.toLocaleString()}</span>
                  {r.solscan ? (
                    <a href={r.solscan} target="_blank" rel="noreferrer" className="text-[#62b8ff] hover:underline" title="View the anchor transaction on Solscan">
                      ↗
                    </a>
                  ) : (
                    <span className="text-[#7f98a3]" title="Waiting for the next batch anchor">⏳</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

/** Your monthly trophies + claim-as-cNFT (connect a wallet OR paste an address). */
function TrophiesSection({ trophies, onClaimed }: { trophies: TrophiesData | null; onClaimed: () => void }) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [addr, setAddr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ month: string; text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (publicKey) setAddr(publicKey.toBase58());
  }, [publicKey]);

  const list = trophies?.trophies ?? [];
  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-[#ffd24a]/25 bg-[#ffd24a]/5 p-3 text-xs text-[#9fc1c7]">
        <div className="mb-1 font-bold text-[#ffd24a]">🏆 Trophies</div>
        Finish in the monthly top 5 to earn a trophy. You can claim it as a real NFT to any Solana wallet — no wallet needed to win.
      </div>
    );
  }

  const doClaim = async (month: string) => {
    const address = addr.trim();
    if (!address) {
      setMsg({ month, text: 'Connect a wallet or paste a Solana address first', ok: false });
      return;
    }
    setBusy(month);
    const r = await claimTrophy(month, address);
    setBusy(null);
    setMsg({
      month,
      text: r.ok
        ? r.pending
          ? 'Mint submitted. On-chain confirmation is pending.'
          : 'Claimed! NFT sent to your wallet.'
        : r.error ?? 'Claim failed',
      ok: r.ok,
    });
    if (r.ok) onClaimed();
  };

  return (
    <div className="rounded-xl border border-[#ffd24a]/25 bg-[#ffd24a]/5 p-3">
      <div className="mb-2 text-xs font-bold text-[#ffd24a]">🏆 Your trophies</div>
      <ol className="flex flex-col gap-2">
        {list.map((t) => (
          <li key={t.month} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span>{RANK_MEDAL[t.rank - 1] ?? '🏅'}</span>
              <span className="flex-1 font-semibold text-[#e8f7fb]">
                {t.month} · Rank #{t.rank}
              </span>
              {t.status === 'claimed' ? (
                t.solscan ? (
                  <a href={t.solscan} target="_blank" rel="noreferrer" className="text-[#62b8ff] hover:underline">
                    ⛓ minted ↗
                  </a>
                ) : (
                  <span className="text-[#9ed5e7]">⛓ minted</span>
                )
              ) : t.status === 'minting' ? (
                <span className="text-[#9ed5e7]">mint pending</span>
              ) : (
                <span className="text-[#ffd24a]">claimable</span>
              )}
            </div>
            {t.status === 'claimable' && (
              <div className="mt-2 flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <input
                    value={addr}
                    onChange={(e) => setAddr(e.target.value)}
                    placeholder="Solana address (Phantom / Solflare / Backpack)"
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] text-[#e8f7fb] outline-none focus:border-[#ffd24a]/50"
                  />
                  <button
                    onClick={() => setVisible(true)}
                    className="shrink-0 rounded-md border border-[#62b8ff]/40 px-2 py-1 text-[10px] font-semibold text-[#62b8ff] hover:bg-[#62b8ff]/10"
                    title="Connect a wallet to fill the address"
                  >
                    connect
                  </button>
                  <button
                    onClick={() => void doClaim(t.month)}
                    disabled={busy === t.month}
                    className="shrink-0 rounded-md bg-[#ffd24a] px-2.5 py-1 text-[10px] font-bold text-black disabled:opacity-50"
                  >
                    {busy === t.month ? '…' : 'Claim'}
                  </button>
                </div>
                <p className="text-[9px] text-[#7f98a3]">
                  Mints to that exact address — irreversible. Use a wallet that supports compressed NFTs (Phantom / Solflare / Backpack), not an exchange address.
                </p>
                {msg?.month === t.month && (
                  <p className={`text-[10px] ${msg.ok ? 'text-[#9ed5e7]' : 'text-[#ff6b6b]'}`}>{msg.text}</p>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
