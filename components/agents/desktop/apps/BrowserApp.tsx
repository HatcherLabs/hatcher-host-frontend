'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Compass, ExternalLink, RotateCw } from 'lucide-react';
import { normalizeBrowserUrl } from './browserUrl';

/**
 * Minimal in-desktop web browser: address bar + iframe.
 *
 * Security shape:
 * - Every address goes through `normalizeBrowserUrl`, so only http(s) URLs
 *   ever reach the iframe (javascript:/data:/file: read as invalid input).
 *   Navigation only ever swaps the iframe src — never the parent window.
 * - The desktop route's CSP relaxes `frame-src` to `https:` (middleware,
 *   desktop route only); everywhere else the strict allowlist still applies.
 * - Deliberately NO sandbox attribute: external sites need their real origin
 *   (cookies, storage) to function at all, and a cross-origin iframe cannot
 *   touch the parent DOM regardless. `referrerPolicy="no-referrer"` keeps
 *   the desktop URL out of third-party logs.
 * - Sites sending X-Frame-Options / frame-ancestors render blank, and that
 *   is not reliably detectable cross-origin — hence the permanent quiet hint
 *   pointing at "Open in new tab" instead of a broken detection heuristic.
 */
export function BrowserApp() {
  const t = useTranslations('desktop.browser');
  const [address, setAddress] = useState('');
  const [src, setSrc] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  // Bumped on Reload so the iframe remounts even when the URL is unchanged.
  const [frameEpoch, setFrameEpoch] = useState(0);

  const navigate = () => {
    const normalized = normalizeBrowserUrl(address);
    if (!normalized) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setAddress(normalized);
    setSrc(normalized);
    setFrameEpoch((epoch) => epoch + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate();
        }}
        className="flex flex-shrink-0 items-center gap-1.5 border-b border-[var(--border-default)] px-3 py-1.5"
      >
        <input
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder={t('addressPlaceholder')}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          aria-label={t('addressLabel')}
          aria-invalid={invalid || undefined}
          className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title={t('go')}
        >
          <ArrowRight size={12} /> {t('go')}
        </button>
        <button
          type="button"
          onClick={() => setFrameEpoch((epoch) => epoch + 1)}
          disabled={!src}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
          title={t('reload')}
        >
          <RotateCw size={12} /> {t('reload')}
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
      </form>

      {/* Permanent, quiet reality check — embed refusals are not detectable. */}
      <div className="flex-shrink-0 border-b border-[var(--border-line)] px-3 py-1 text-[10px] text-[var(--text-muted)]">
        {t('embedHint')}
      </div>

      {invalid && (
        <div role="alert" className="flex-shrink-0 border-b border-[var(--border-line)] px-3 py-1.5 text-[11px] text-[var(--color-destructive)]">
          {t('invalidUrl')}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {src ? (
          <iframe
            key={`${frameEpoch}:${src}`}
            src={src}
            title={t('iframeTitle')}
            referrerPolicy="no-referrer"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Compass size={28} className="text-[var(--text-muted)]" aria-hidden />
            <p className="text-sm text-[var(--text-secondary)]">{t('emptyState')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
