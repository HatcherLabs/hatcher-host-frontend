'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { buildPreviewProxyUrl } from '../previewUrl';

export interface PreviewAppProps {
  agent: Agent;
}

/**
 * Desktop app-preview window: mints a short-lived, token-scoped preview
 * session and loads it in a sandboxed iframe (`sandbox="allow-scripts
 * allow-forms"`, deliberately without `allow-same-origin`) so agent-authored
 * HTML renders with an opaque origin — no cookies, no access to the parent
 * DOM. The proxy route applies the matching CSP server-side; this is belt
 * and braces, not the only line of defense.
 */
export function PreviewApp({ agent }: PreviewAppProps) {
  const t = useTranslations('desktop.preview');
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // '' = failed without a server message (translated at render time, like
  // the other desktop apps' load errors).
  const [startError, setStartError] = useState<string | null>(null);
  const [expiredBanner, setExpiredBanner] = useState(false);
  // Tracks whether the current iframe src has already fired one `load`. A
  // sandboxed, opaque-origin iframe can't be inspected for its response
  // status, so a genuine 401-on-expiry can't be told apart from a normal
  // reload by reading the document. Treating a *second* load on the same
  // session as a possible expiry is a deliberately approximate heuristic —
  // Refresh (which always re-mints) is the reliable recovery path either way.
  const hasLoadedOnceRef = useRef(false);

  const start = useCallback(async () => {
    setLoading(true);
    setStartError(null);
    setExpiredBanner(false);
    hasLoadedOnceRef.current = false;
    const res = await api.createPreviewSession(agent.id);
    if (res.success) {
      setSrc(buildPreviewProxyUrl(agent.id, res.data.token));
    } else {
      setSrc(null);
      setStartError(res.error ?? '');
    }
    setLoading(false);
  }, [agent.id]);

  useEffect(() => { void start(); }, [start]);

  const handleIframeLoad = () => {
    if (hasLoadedOnceRef.current) {
      setExpiredBanner(true);
    } else {
      hasLoadedOnceRef.current = true;
    }
  };

  if (startError !== null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-[var(--color-destructive)]">{startError || t('startFailed')}</p>
        <button
          type="button"
          onClick={() => { void start(); }}
          className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-[var(--border-default)] px-3 py-1.5">
        <span className="truncate font-mono text-[10px] text-[var(--text-muted)]">{t('pathLabel')}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { void start(); }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
            title={t('refresh')}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : undefined} /> {t('refresh')}
          </button>
          {src ? (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title={t('openInNewTab')}
            >
              <ExternalLink size={12} /> {t('openInNewTab')}
            </a>
          ) : (
            <span
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] opacity-40"
              title={t('openInNewTab')}
            >
              <ExternalLink size={12} /> {t('openInNewTab')}
            </span>
          )}
        </div>
      </div>

      {expiredBanner && (
        <div className="flex-shrink-0 border-b border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-1.5 text-[11px] text-[var(--color-warning)]">
          {t('expiredBanner')}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-elevated)]">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
          </div>
        )}
        {src && (
          <iframe
            key={src}
            src={src}
            title={t('iframeTitle')}
            sandbox="allow-scripts allow-forms"
            referrerPolicy="no-referrer"
            onLoad={handleIframeLoad}
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
