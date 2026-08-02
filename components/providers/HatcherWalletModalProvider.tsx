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
import { isSelectableSolanaWallet } from '@/lib/wallet-adapter-state';

export interface HatcherWalletDescriptor {
  adapter: { name: string };
  readyState: WalletReadyState;
}

export const RECOMMENDED_HATCHER_WALLETS = [
  { name: 'Phantom' },
  { name: 'Solflare' },
  { name: 'Backpack' },
] as const;

function normalizeWalletName(name: string): string {
  return name.toLowerCase().replace(/\s+wallet$/, '').trim();
}

export function isSelectableHatcherWallet(
  walletName: string,
  readyState: WalletReadyState,
): boolean {
  return isSelectableSolanaWallet(walletName, readyState);
}

export function groupHatcherWallets<T extends HatcherWalletDescriptor>(wallets: readonly T[]): {
  recommended: Array<{ config: (typeof RECOMMENDED_HATCHER_WALLETS)[number]; wallet: T | null }>;
  additional: T[];
} {
  const walletsByName = new Map<string, T>();
  for (const wallet of wallets) {
    const key = normalizeWalletName(wallet.adapter.name);
    if (!walletsByName.has(key)) walletsByName.set(key, wallet);
  }

  const recommendedNames = new Set(
    RECOMMENDED_HATCHER_WALLETS.map((wallet) => normalizeWalletName(wallet.name)),
  );

  return {
    recommended: RECOMMENDED_HATCHER_WALLETS.map((config) => ({
      config,
      wallet: walletsByName.get(normalizeWalletName(config.name)) ?? null,
    })),
    additional: Array.from(walletsByName.values()).filter(
      (wallet) =>
        !recommendedNames.has(normalizeWalletName(wallet.adapter.name))
        && isSelectableHatcherWallet(wallet.adapter.name, wallet.readyState),
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
  onUnavailable,
  onSelect,
}: {
  config?: (typeof RECOMMENDED_HATCHER_WALLETS)[number];
  wallet: Wallet | null;
  onUnavailable: (walletName: string) => void;
  onSelect: (wallet: Wallet) => void;
}) {
  const name = wallet?.adapter.name ?? config?.name ?? 'Solana wallet';
  const selectable = wallet
    ? isSelectableHatcherWallet(wallet.adapter.name, wallet.readyState)
    : false;

  const icon = wallet
    ? <WalletIcon wallet={wallet} />
    : <WalletFallbackIcon name={name} />;

  const content = (
    <>
      <span className="staking-wallet-modal__wallet-icon">{icon}</span>
      <span className="staking-wallet-modal__wallet-name">{name}</span>
      <span className="staking-wallet-modal__wallet-state">
        {selectable ? 'Detected' : 'Not installed'}
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
    <button
      aria-label={`${name} is not installed`}
      className="staking-wallet-modal__wallet staking-wallet-modal__wallet--unavailable"
      onClick={() => onUnavailable(name)}
      type="button"
    >
      {content}
    </button>
  );
}

interface HatcherWalletModalCopy {
  description: string;
  eyebrow: string;
}

function HatcherWalletModal({ description, eyebrow }: HatcherWalletModalCopy) {
  const { wallets, select } = useWallet();
  const { setVisible } = useWalletModal();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [installationNotice, setInstallationNotice] = useState<string | null>(null);
  const { recommended, additional } = useMemo(() => groupHatcherWallets(wallets), [wallets]);

  const closeModal = useCallback(() => setVisible(false), [setVisible]);

  const selectWallet = useCallback((wallet: Wallet) => {
    select(wallet.adapter.name);
    closeModal();
  }, [closeModal, select]);

  const showUnavailableNotice = useCallback((walletName: string) => {
    setInstallationNotice(
      `${walletName} is not installed. Install its browser extension, then reload Hatcher.`,
    );
  }, []);

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
        aria-describedby="hatcher-wallet-modal-description"
        aria-labelledby="hatcher-wallet-modal-title"
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
          <p className="staking-wallet-modal__eyebrow">{eyebrow}</p>
          <h1 id="hatcher-wallet-modal-title">Connect a Solana wallet</h1>
          <p id="hatcher-wallet-modal-description">{description}</p>
        </header>

        <section aria-labelledby="hatcher-wallet-recommended-title">
          <h2 className="staking-wallet-modal__section-title" id="hatcher-wallet-recommended-title">
            Recommended
          </h2>
          <div className="staking-wallet-modal__wallets">
            {recommended.map(({ config, wallet }) => (
              <WalletOption
                config={config}
                key={config.name}
                onUnavailable={showUnavailableNotice}
                onSelect={selectWallet}
                wallet={wallet}
              />
            ))}
          </div>
        </section>

        {additional.length > 0 ? (
          <section aria-labelledby="hatcher-wallet-detected-title">
            <h2 className="staking-wallet-modal__section-title" id="hatcher-wallet-detected-title">
              Other detected wallets
            </h2>
            <div className="staking-wallet-modal__wallets">
              {additional.map((wallet) => (
                <WalletOption
                  key={wallet.adapter.name}
                  onUnavailable={showUnavailableNotice}
                  onSelect={selectWallet}
                  wallet={wallet}
                />
              ))}
            </div>
          </section>
        ) : null}

        {installationNotice ? (
          <p aria-live="polite" className="staking-wallet-modal__notice" role="status">
            {installationNotice}
          </p>
        ) : null}

        <p className="staking-wallet-modal__footnote">
          Compatible wallets installed through the Solana Wallet Standard appear automatically.
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function HatcherWalletModalProvider({
  children,
  description,
  eyebrow,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
}) {
  const [visible, setVisible] = useState(false);
  const contextValue = useMemo(() => ({ visible, setVisible }), [visible]);

  return (
    <WalletModalContext.Provider value={contextValue}>
      {children}
      {visible ? <HatcherWalletModal description={description} eyebrow={eyebrow} /> : null}
    </WalletModalContext.Provider>
  );
}
