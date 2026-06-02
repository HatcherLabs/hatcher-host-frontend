'use client';
import { useState } from 'react';
import { useDispatchStore } from '@/lib/agent-dispatch/store';
import { DISPATCH_SKINS, type DispatchSkin } from '@/lib/agent-dispatch/config';
import { usePaymentDrivers } from '@/lib/payment-drivers';
import { ConfirmPaymentModal } from '@/components/payments/ConfirmPaymentModal';

export function SkinShop({ onClose }: { onClose: () => void }) {
  const data = useDispatchStore((s) => s.data);
  const ownedSkins = useDispatchStore((s) => s.ownedSkins);
  const equippedSkin = useDispatchStore((s) => s.equippedSkin);
  const buyWithData = useDispatchStore((s) => s.buyWithData);
  const grantSkin = useDispatchStore((s) => s.grantSkin);
  const equipSkin = useDispatchStore((s) => s.equipSkin);

  const { driveHatch, confirmState, closeConfirm, connected, openWalletModal } = usePaymentDrivers();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      await driveHatch(skin.price, `Dispatch skin: ${skin.name}`);
      grantSkin(skin.id); // cosmetic-only, unlocked locally on tx success
      equipSkin(skin.id);
    } catch (e) {
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
          className="relative max-h-[88vh] w-full max-w-[640px] overflow-y-auto rounded-t-2xl border border-[#39ff88]/30 bg-[rgba(8,12,10,0.97)] p-5 text-[#dffbe9] shadow-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-md px-2 py-1 text-[#9fceb4] hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-[#39ff88]">
            <span aria-hidden>✦</span> Courier Skins
          </h2>
          <p className="mb-4 text-xs text-[#9fceb4]">
            ◆ {Math.round(data).toLocaleString()} Data · earn Data by dispatching agents. Premium skins burn $HATCHER.
          </p>

          {error && (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DISPATCH_SKINS.map((skin) => {
              const owned = ownedSkins.includes(skin.id);
              const equipped = equippedSkin === skin.id;
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
                  <p className="mb-2 line-clamp-2 text-[10px] text-[#9fceb4]">{skin.desc}</p>
                  {equipped ? (
                    <span className="mt-auto rounded-lg bg-white/10 py-1.5 text-center text-xs font-semibold">Equipped</span>
                  ) : owned ? (
                    <button
                      onClick={() => equipSkin(skin.id)}
                      className="mt-auto rounded-lg bg-[#39ff88] py-1.5 text-center text-xs font-bold text-black transition hover:bg-[#5fffa0]"
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
