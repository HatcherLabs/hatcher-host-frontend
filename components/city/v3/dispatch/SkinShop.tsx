'use client';
import { useEffect, useState } from 'react';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import { DISPATCH_SKINS, type DispatchSkin } from '@/lib/agent-dispatch/config';
import { usePaymentDrivers } from '@/lib/payment-drivers';
import {
  DispatchSkinClaimableError,
  clearPendingDispatchSkinSettlement,
  claimPaidSkinCnft,
  createSkinPaymentIntent,
  fetchDispatchSkinCnfts,
  getPendingDispatchSkinSettlement,
  purchaseSkinCnft,
  savePendingDispatchSkinSettlement,
  type DispatchSkinCnftRow,
} from '@/lib/agent-dispatch/leaderboard';
import { ConfirmPaymentModal } from '@/components/payments/ConfirmPaymentModal';

export function SkinShop({ onClose }: { onClose: () => void }) {
  const data = useDispatchStore((s) => s.data);
  const ownedSkins = useDispatchStore((s) => s.ownedSkins);
  const equippedSkin = useDispatchStore((s) => s.equippedSkin);
  const buyWithData = useDispatchStore((s) => s.buyWithData);
  const grantSkin = useDispatchStore((s) => s.grantSkin);
  const equipSkin = useDispatchStore((s) => s.equipSkin);

  const {
    driveHatch,
    ensurePaymentWallet,
    confirmState,
    closeConfirm,
    connected,
    openWalletModal,
  } = usePaymentDrivers();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cnft, setCnft] = useState<{ skin: string; minting: boolean; minted: boolean; solscan?: string | null } | null>(null);
  const [skinCnfts, setSkinCnfts] = useState<DispatchSkinCnftRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchDispatchSkinCnfts().then((rows) => {
      if (cancelled) return;
      setSkinCnfts(rows);
      for (const row of rows) {
        if (row.status === 'claimable' || row.status === 'minting' || row.status === 'minted') grantSkin(row.skinId);
      }
    });
    return () => { cancelled = true; };
  }, [grantSkin]);

  const handleBuy = async (skin: DispatchSkin) => {
    setError(null);
    if (skin.currency === 'data') {
      if (!buyWithData(skin)) setError('Not enough Data.');
      return;
    }
    // $HATCHER premium — real on-chain burn via the existing payment flow.
    if (!connected) {
      openWalletModal();
      return;
    }
    setBusyId(skin.id);
    try {
      const payerWallet = await ensurePaymentWallet();
      const applySettledSkin = (
        settled: Awaited<ReturnType<typeof purchaseSkinCnft>>,
      ) => {
        grantSkin(skin.id);
        equipSkin(skin.id);
        setSkinCnfts((rows) => [
          ...rows.filter((row) => row.skinId !== skin.id),
          {
            skinId: skin.id,
            status: settled.minted ? 'minted' : settled.status ?? 'minting',
            wallet: payerWallet,
            tx: null,
            solscan: settled.solscan ?? null,
          },
        ]);
        setCnft({ skin: skin.name, minting: false, minted: settled.minted, solscan: settled.solscan });
      };
      const recoverPaidSkin = async () => {
        setCnft({ skin: skin.name, minting: true, minted: false });
        const recovered = await claimPaidSkinCnft(skin.id, payerWallet);
        grantSkin(skin.id);
        equipSkin(skin.id);
        setSkinCnfts((rows) => [
          ...rows.filter((row) => row.skinId !== skin.id),
          {
            skinId: skin.id,
            status: recovered.minted ? 'minted' : recovered.status ?? 'minting',
            wallet: payerWallet,
            tx: null,
            solscan: recovered.solscan ?? null,
          },
        ]);
        setCnft({ skin: skin.name, minting: false, minted: recovered.minted, solscan: recovered.solscan });
      };

      const pendingSettlement = getPendingDispatchSkinSettlement(skin.id, payerWallet);
      if (pendingSettlement) {
        setCnft({ skin: skin.name, minting: true, minted: false });
        const settled = await purchaseSkinCnft(
          skin.id,
          pendingSettlement.txSignature,
          pendingSettlement.paymentIntentId,
        );
        clearPendingDispatchSkinSettlement(skin.id, payerWallet);
        applySettledSkin(settled);
        return;
      }

      const existing = skinCnfts.find((row) => row.skinId === skin.id);
      if (existing?.status === 'minted') {
        grantSkin(skin.id);
        equipSkin(skin.id);
        setCnft({ skin: skin.name, minting: false, minted: true, solscan: existing.solscan });
        return;
      }
      if (existing?.status === 'claimable') {
        await recoverPaidSkin();
        return;
      }
      if (existing?.status === 'minting') {
        grantSkin(skin.id);
        equipSkin(skin.id);
        setCnft({ skin: skin.name, minting: false, minted: false, solscan: existing.solscan });
        return;
      }

      let intent: Awaited<ReturnType<typeof createSkinPaymentIntent>>;
      try {
        intent = await createSkinPaymentIntent(skin.id, payerWallet);
      } catch (intentError) {
        if (intentError instanceof DispatchSkinClaimableError) {
          await recoverPaidSkin();
          return;
        }
        throw intentError;
      }
      const txSignature = await driveHatch(intent, `Dispatch skin: ${skin.name}`);
      savePendingDispatchSkinSettlement({
        skinId: skin.id,
        payerWallet,
        paymentIntentId: intent.intentId,
        txSignature,
      });
      setCnft({ skin: skin.name, minting: true, minted: false });
      const res = await purchaseSkinCnft(skin.id, txSignature, intent.intentId);
      clearPendingDispatchSkinSettlement(skin.id, payerWallet);
      // Local ownership follows authoritative settlement, not wallet broadcast.
      applySettledSkin(res);
    } catch (e) {
      setCnft(null);
      setError(e instanceof Error ? e.message : 'Payment cancelled.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur sm:items-center"
        onClick={onClose}
      >
        <div
          className="relative max-h-[88vh] w-full max-w-[640px] overflow-y-auto rounded-t-2xl border border-[#9ed5e7]/30 bg-[rgba(8,12,10,0.97)] p-5 text-[#e8f7fb] shadow-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-md px-2 py-1 text-[#9fc1c7] hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-[#9ed5e7]">
            <span aria-hidden>✦</span> Courier Skins
          </h2>
          <p className="mb-2 text-xs text-[#9fc1c7]">
            ◆ {Math.round(data).toLocaleString()} Data · earn Data by dispatching agents. Premium skins burn $HATCHER.
          </p>
          <p className="mb-4 flex items-center gap-1 text-[11px] text-[#ffd46b]">
            <span aria-hidden>⛓</span> Premium ★ skins mint a collectible cNFT to your wallet.
          </p>

          {error && (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {cnft && (
            <div className="mb-3 rounded-lg border border-[#ffd46b]/40 bg-[#ffd46b]/10 px-3 py-2 text-xs text-[#ffe7a8]">
              {cnft.minting ? (
                <>⛓ Minting your <b>{cnft.skin}</b> cNFT…</>
              ) : cnft.minted ? (
                <>
                  🎁 <b>{cnft.skin}</b> cNFT minted to your wallet!
                  {cnft.solscan && (
                    <a href={cnft.solscan} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
                      view on Solscan
                    </a>
                  )}
                </>
              ) : (
                <>✓ <b>{cnft.skin}</b> unlocked. The cNFT mint is pending — it&apos;ll arrive shortly.</>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DISPATCH_SKINS.map((skin) => {
              const owned = ownedSkins.includes(skin.id);
              const equipped = equippedSkin === skin.id;
              const claimable = skinCnfts.some((row) => row.skinId === skin.id && row.status === 'claimable');
              const canAfford = skin.currency === 'data' ? data >= skin.price : true;
              return (
                <div
                  key={skin.id}
                  className="flex flex-col rounded-xl border bg-black/30 p-3"
                  style={{ borderColor: equipped ? skin.color : 'rgba(255,255,255,0.1)' }}
                >
                  <div
                    className="mb-2 h-16 rounded-lg"
                    style={{
                      background: `radial-gradient(circle at 50% 45%, ${skin.color} 0%, ${skin.trail}55 45%, transparent 75%)`,
                    }}
                  />
                  <div className="flex items-center gap-1 text-sm font-bold" style={{ color: skin.color }}>
                    {skin.name}
                    {skin.premium && <span className="text-[10px] text-[#ffd46b]">★</span>}
                  </div>
                  <p className="mb-2 line-clamp-2 text-[10px] text-[#9fc1c7]">{skin.desc}</p>
                  {claimable ? (
                    <button
                      onClick={() => handleBuy(skin)}
                      disabled={busyId === skin.id}
                      className="mt-auto rounded-lg border border-[#ffd46b]/50 py-1.5 text-center text-xs font-bold text-[#ffd46b] transition hover:bg-[#ffd46b]/10 disabled:opacity-40"
                    >
                      {busyId === skin.id ? '…' : 'Retry cNFT'}
                    </button>
                  ) : equipped ? (
                    <span className="mt-auto rounded-lg bg-white/10 py-1.5 text-center text-xs font-semibold">Equipped</span>
                  ) : owned ? (
                    <button
                      onClick={() => equipSkin(skin.id)}
                      className="mt-auto rounded-lg bg-[#9ed5e7] py-1.5 text-center text-xs font-bold text-black transition hover:bg-[#d7eff5]"
                    >
                      Equip
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(skin)}
                      disabled={busyId === skin.id || (skin.currency === 'data' && !canAfford)}
                      className="mt-auto rounded-lg border border-white/15 py-1.5 text-center text-xs font-bold transition hover:bg-white/5 disabled:opacity-40"
                      style={{ color: skin.color }}
                    >
                      {busyId === skin.id
                        ? '…'
                        : skin.currency === 'data'
                          ? `◆ ${skin.price}`
                          : `$${skin.price.toFixed(2)} ◈`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ConfirmPaymentModal state={confirmState} onClose={closeConfirm} />
    </>
  );
}
