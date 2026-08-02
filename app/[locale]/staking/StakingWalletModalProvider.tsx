'use client';

import { WalletReadyState } from '@solana/wallet-adapter-base';
import type { Wallet } from '@solana/wallet-adapter-react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  WalletIcon,
  WalletModalContext,
  useWalletModal,
} from '@solana/wallet-adapter-react-ui';
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export interface StakingWalletDescriptor {
  adapter: { name: string };
  readyState: WalletReadyState;
}

export const RECOMMENDED_STAKING_WALLETS = [
  { name: 'Phantom', url: 'https://phantom.com/' },
  { name: 'Solflare', url: 'https://solflare.com/' },
  { name: 'Backpack', url: 'https://backpack.app/' },
] as const;

function normalizeWalletName(name: string): string {
  return name.toLowerCase().replace(/\s+wallet$/, '').trim();
}

export function isSelectableStakingWallet(readyState: WalletReadyState): boolean {
  return readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable;
}

export function groupStakingWallets<T extends StakingWalletDescriptor>(wallets: readonly T[]): {
  recommended: Array<{ config: (typeof RECOMMENDED_STAKING_WALLETS)[number]; wallet: T | null }>;
  additional: T[];
} {
  const walletsByName = new Map<string, T>();
  for (const wallet of wallets) {
    const key = normalizeWalletName(wallet.adapter.name);
    if (!walletsByName.has(key)) walletsByName.set(key, wallet);
  }

  const recommendedNames = new Set(
    RECOMMENDED_STAKING_WALLETS.map((wallet) => normalizeWalletName(wallet.name)),
  );

  return {
    recommended: RECOMMENDED_STAKING_WALLETS.map((config) => ({
      config,
      wallet: walletsByName.get(normalizeWalletName(config.name)) ?? null,
    })),
    additional: Array.from(walletsByName.values()).filter(
      (wallet) =>
        !recommendedNames.has(normalizeWalletName(wallet.adapter.name))
        && isSelectableStakingWallet(wallet.readyState),
    ),
  };
}

function WalletFallbackIcon({ name }: { name: string }) {
  return (
    <span className={`staking-wallet-modal__fallback-icon staking-wallet-modal__fallback-icon--${normalizeWalletName(name)}`}>
      {name.slice(0, 1)}
    </span>
  );
}

function WalletOption({
  config,
  wallet,
  onClose,
  onSelect,
}: {
  config?: (typeof RECOMMENDED_STAKING_WALLETS)[number];
  wallet: Wallet | null;
  onClose: () => void;
  onSelect: (wallet: Wallet) => void;
}) {
  const name = wallet?.adapter.name ?? config?.name ?? 'Solana wallet';
  const selectable = wallet ? isSelectableStakingWallet(wallet.readyState) : false;

  const icon = wallet
    ? <WalletIcon wallet={wallet} />
    : <WalletFallbackIcon name={name} />;

  const content = (
    <>
      <span className="staking-wallet-modal__wallet-icon">{icon}</span>
      <span className="staking-wallet-modal__wallet-name">{name}</span>
      <span className="staking-wallet-modal__wallet-state">
        {selectable ? 'Detected' : 'Get wallet'}
      </span>
    </>
  );

  if (wallet && selectable) {
    return (
      <button
        className="staking-wallet-modal__wallet"
        onClick={() => onSelect(wallet)}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <a
      className="staking-wallet-modal__wallet"
      href={wallet?.adapter.url ?? config?.url}
      onClick={onClose}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}

function StakingWalletModal() {
  const { wallets, select } = useWallet();
  const { setVisible } = useWalletModal();
  const dialogRef = useRef<HTMLDivElement>(null);
  const { recommended, additional } = useMemo(() => groupStakingWallets(wallets), [wallets]);

  const closeModal = useCallback(() => setVisible(false), [setVisible]);

  const selectWallet = useCallback((wallet: Wallet) => {
    select(wallet.adapter.name);
    closeModal();
  }, [closeModal, select]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      dialog?.querySelector<HTMLElement>('button, a[href]')?.focus();
    }, 0);

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closeModal]);

  const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) closeModal();
  };

  return createPortal(
    <div className="staking-wallet-modal" onMouseDown={handleBackdropMouseDown}>
      <div
        aria-describedby="staking-wallet-modal-description"
        aria-labelledby="staking-wallet-modal-title"
        aria-modal="true"
        className="staking-wallet-modal__panel"
        ref={dialogRef}
        role="dialog"
      >
        <button
          aria-label="Close wallet picker"
          className="staking-wallet-modal__close"
          onClick={closeModal}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="M4 4l12 12M16 4L4 16" />
          </svg>
        </button>

        <header className="staking-wallet-modal__header">
          <p className="staking-wallet-modal__eyebrow">Hatcher staking</p>
          <h1 id="staking-wallet-modal-title">Connect a Solana wallet</h1>
          <p id="staking-wallet-modal-description">
            Choose a wallet that can sign messages and staking transactions.
          </p>
        </header>

        <section aria-labelledby="staking-wallet-recommended-title">
          <h2 className="staking-wallet-modal__section-title" id="staking-wallet-recommended-title">
            Recommended
          </h2>
          <div className="staking-wallet-modal__wallets">
            {recommended.map(({ config, wallet }) => (
              <WalletOption
                config={config}
                key={config.name}
                onClose={closeModal}
                onSelect={selectWallet}
                wallet={wallet}
              />
            ))}
          </div>
        </section>

        {additional.length > 0 ? (
          <section aria-labelledby="staking-wallet-detected-title">
            <h2 className="staking-wallet-modal__section-title" id="staking-wallet-detected-title">
              Other detected wallets
            </h2>
            <div className="staking-wallet-modal__wallets">
              {additional.map((wallet) => (
                <WalletOption
                  key={wallet.adapter.name}
                  onClose={closeModal}
                  onSelect={selectWallet}
                  wallet={wallet}
                />
              ))}
            </div>
          </section>
        ) : null}

        <p className="staking-wallet-modal__footnote">
          Compatible wallets installed through the Solana Wallet Standard appear automatically.
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function StakingWalletModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const contextValue = useMemo(() => ({ visible, setVisible }), [visible]);

  return (
    <WalletModalContext.Provider value={contextValue}>
      {children}
      {visible ? <StakingWalletModal /> : null}
    </WalletModalContext.Provider>
  );
}
