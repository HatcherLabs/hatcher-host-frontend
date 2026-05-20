'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Coins, ExternalLink, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import styles from './HatcherMarketStatus.module.css';

type TokenMarket = {
  symbol: string;
  mint: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  priceChange24h: number | null;
  pairUrl: string;
  solscanUrl: string;
  tokenPageUrl: string;
  updatedAt: string;
};

type Props = {
  variant?: 'nav' | 'drawer';
  onNavigate?: () => void;
};

const REFRESH_MS = 60_000;

function formatCompactUsd(value: number | null): string {
  if (value === null) return '...';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `$${Math.max(0, value).toFixed(value >= 1 ? 2 : 6)}`;
}

function formatPrice(value: number | null): string {
  if (value === null) return 'Unavailable';
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
}

function formatChange(value: number | null): string {
  if (value === null) return '';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function HatcherMarketStatus({ variant = 'nav', onNavigate }: Props) {
  const [market, setMarket] = useState<TokenMarket | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const loadMarket = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/token/market', {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await response.json() as TokenMarket | { message?: string; error?: string };
      if (!response.ok) {
        throw new Error('message' in payload ? payload.message ?? 'Could not load $HATCHER market data.' : 'Could not load $HATCHER market data.');
      }
      setMarket(payload as TokenMarket);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load $HATCHER market data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarket();
    const timer = window.setInterval(() => void loadMarket(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadMarket]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const change = market?.priceChange24h ?? null;
  const ChangeIcon = change !== null && change < 0 ? TrendingDown : TrendingUp;
  const symbol = market?.symbol ? `$${market.symbol}` : '$HATCHER';

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${variant === 'nav' ? styles.navRoot : styles.drawerRoot}`}
    >
      <button
        type="button"
        className={`${styles.trigger} ${styles[variant]}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open HATCHER token market data"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.coin} aria-hidden>
          {loading && !market ? <Loader2 size={12} className={styles.spin} /> : <Coins size={12} />}
        </span>
        <span className={styles.triggerText}>
          <span className={styles.symbol}>{symbol}</span>
          <span className={styles.marketCap}>
            <span className={styles.marketCapLabel}>MC</span> {formatCompactUsd(market?.marketCapUsd ?? null)}
          </span>
          {change !== null && (
            <span className={`${styles.change} ${change >= 0 ? styles.up : styles.down}`}>
              {formatChange(change)}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="$HATCHER market links">
          <div className={styles.header}>
            <div>
              <span className={styles.eyebrow}>Token market</span>
              <span className={styles.title}>{symbol}</span>
            </div>
            <span className={styles.source}>
              <ChangeIcon size={13} className={change !== null && change < 0 ? styles.down : styles.up} />
              Dexscreener
            </span>
          </div>

          <div className={styles.grid}>
            <div className={styles.metric}>
              <span>Market cap</span>
              <strong>{formatCompactUsd(market?.marketCapUsd ?? null)}</strong>
            </div>
            <div className={styles.metric}>
              <span>Price</span>
              <strong>{formatPrice(market?.priceUsd ?? null)}</strong>
            </div>
            <div className={styles.metric}>
              <span>24h volume</span>
              <strong>{formatCompactUsd(market?.volume24hUsd ?? null)}</strong>
            </div>
            <div className={styles.metric}>
              <span>Liquidity</span>
              <strong>{formatCompactUsd(market?.liquidityUsd ?? null)}</strong>
            </div>
          </div>

          {error && <p className={`${styles.eyebrow} ${styles.error}`}>{error}</p>}

          <div className={styles.links}>
            <a
              className={styles.link}
              href={market?.pairUrl ?? 'https://dexscreener.com/solana/Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Dexscreener <ExternalLink size={13} />
            </a>
            <a
              className={styles.link}
              href={market?.solscanUrl ?? 'https://solscan.io/token/Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Solscan <ExternalLink size={13} />
            </a>
            <Link
              className={styles.link}
              href="/token"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              Token page <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
