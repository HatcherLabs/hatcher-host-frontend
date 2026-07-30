'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppWindow, ArrowRight, BookOpen, Compass, ExternalLink, Globe, Home, RotateCw } from 'lucide-react';
import { useWindowManager } from '../WindowManager';
import { classifyBrowserInput, normalizeBrowserUrl } from './browserUrl';

/**
 * In-desktop web browser: combined address+search bar, iframe viewport and
 * a curated start page.
 *
 * Address bar semantics (`classifyBrowserInput`):
 * - 'url' input (explicit http(s) scheme, or a dotted host that passes
 *   `normalizeBrowserUrl`) navigates in-frame, as before.
 * - everything else is a SEARCH and opens Google results in a NEW TAB
 *   (noopener,noreferrer) with a one-line note in the window — Google,
 *   DuckDuckGo (html+lite) and Bing all send X-Frame-Options /
 *   frame-ancestors, so a results page framed here can only ever render
 *   blank (verified 2026-07-30). No refusal-detection heuristics: refusal
 *   is not reliably detectable cross-origin, hence the permanent quiet
 *   hint pointing at "Open in new tab".
 *
 * Start page: tiles that GENUINELY frame — hatcher.host (frameable by our
 * own pages under the SAMEORIGIN framing policy) and Wikipedia (verified,
 * no framing restrictions) — plus a cross-app "Open app preview" tile that
 * opens the desktop's Preview window. hatcher.host is also the default
 * homepage loaded on open; the Home button returns to the start page.
 *
 * Security shape:
 * - Every address goes through `normalizeBrowserUrl`, so only http(s) URLs
 *   ever reach the iframe (javascript:/data:/file: classify as searches).
 *   Navigation only ever swaps the iframe src — never the parent window.
 * - The desktop route's CSP relaxes `frame-src` to `https:` (middleware,
 *   desktop route only); everywhere else the strict allowlist still applies.
 * - Deliberately NO sandbox attribute: external sites need their real origin
 *   (cookies, storage) to function at all, and a cross-origin iframe cannot
 *   touch the parent DOM regardless. `referrerPolicy="no-referrer"` keeps
 *   the desktop URL out of third-party logs.
 */

const HOME_URL = 'https://hatcher.host/';
const WIKIPEDIA_URL = 'https://en.wikipedia.org/';

const TILE_CLASS =
  'flex w-32 flex-col items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-4 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';

export function BrowserApp() {
  const t = useTranslations('desktop.browser');
  const { openWindow } = useWindowManager();
  const [address, setAddress] = useState(HOME_URL);
  const [src, setSrc] = useState<string | null>(HOME_URL);
  // Shown after a search is handed off to a new tab; cleared on navigation.
  const [searchNote, setSearchNote] = useState(false);
  // Bumped on Reload so the iframe remounts even when the URL is unchanged.
  const [frameEpoch, setFrameEpoch] = useState(0);

  const openUrl = (url: string) => {
    setSearchNote(false);
    setAddress(url);
    setSrc(url);
    setFrameEpoch((epoch) => epoch + 1);
  };

  const navigate = () => {
    const input = address.trim();
    if (!input) return;
    if (classifyBrowserInput(input) === 'url') {
      // The classifier only answers 'url' for input the normalizer accepts.
      const normalized = normalizeBrowserUrl(input);
      if (normalized) openUrl(normalized);
      return;
    }
    // Search: engines refuse framing, so results honestly open in a new tab.
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(input)}`,
      '_blank',
      'noopener,noreferrer',
    );
    setSearchNote(true);
  };

  const goHome = () => {
    setSearchNote(false);
    setAddress('');
    setSrc(null);
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
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title={t('home')}
        >
          <Home size={12} aria-hidden />
          <span className="sr-only">{t('home')}</span>
        </button>
        <input
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder={t('addressPlaceholder')}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          aria-label={t('addressLabel')}
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

      {searchNote && (
        <div role="status" className="flex-shrink-0 border-b border-[var(--border-line)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)]">
          {t('searchNote')}
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
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <Compass size={28} className="text-[var(--text-muted)]" aria-hidden />
            <p className="text-sm text-[var(--text-secondary)]">{t('startTitle')}</p>
            <div className="flex flex-wrap items-stretch justify-center gap-3">
              <button type="button" onClick={() => openUrl(HOME_URL)} className={TILE_CLASS}>
                <Globe size={20} aria-hidden />
                <span>hatcher.host</span>
              </button>
              <button type="button" onClick={() => openUrl(WIKIPEDIA_URL)} className={TILE_CLASS}>
                <BookOpen size={20} aria-hidden />
                <span>Wikipedia</span>
              </button>
              <button type="button" onClick={() => openWindow('preview')} className={TILE_CLASS}>
                <AppWindow size={20} aria-hidden />
                <span>{t('openPreview')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
