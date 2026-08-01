import {
  QWERTI_WIDGET_ORIGIN,
  QWERTI_WIDGET_SCRIPT_CSP_HASH,
} from './qwerti-widget';

const QWERTI_API_HOST = 'https://api.qwerti.ai';
const DEFAULT_LOCAL_API_URL = 'http://localhost:3001';

function isLocalApiUrl(url: URL): boolean {
  return ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname);
}

function configuredApiConnectSource(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_LOCAL_API_URL;
  try {
    const url = new URL(apiUrl);
    const ws = process.env.NODE_ENV === 'development' || isLocalApiUrl(url)
      ? ` ${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.host}`
      : '';
    return ` ${url.origin}${ws}`;
  } catch {
    return '';
  }
}

/**
 * Whether a locale-stripped pathname is the agent desktop page
 * (`/dashboard/agent/<id>/desktop`). Exact page only — sub-paths and other
 * dashboard routes keep the strict frame-src allowlist.
 */
export function isAgentDesktopRoute(strippedPathname: string): boolean {
  return /^\/dashboard\/agent\/[^/]+\/desktop\/?$/.test(strippedPathname);
}

export function buildCsp(
  nonce: string,
  isEmbedRoute: boolean,
  isQwertiWidgetRoute = false,
  isDesktopRoute = false,
): string {
  const isDev = process.env.NODE_ENV === 'development';
  const apiConnect = configuredApiConnectSource();
  const devConnect = isDev
    ? ' http://localhost:3001 ws://localhost:3001 http://localhost:8080 http://127.0.0.1:3001 ws://127.0.0.1:3001 http://127.0.0.1:8080'
    : '';
  const scriptDev = isDev ? " 'unsafe-" + "eval'" : '';
  const styleSrc = isDev
    ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
    : `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`;
  const styleSrcElem = isDev || isQwertiWidgetRoute
    ? "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com"
    : `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`;
  const qwertiScript = isQwertiWidgetRoute ? ` ${QWERTI_WIDGET_SCRIPT_CSP_HASH}` : '';
  const qwertiConnect = isQwertiWidgetRoute
    ? ` ${QWERTI_API_HOST}`
    : '';
  const qwertiFont = isQwertiWidgetRoute ? ` ${QWERTI_WIDGET_ORIGIN}` : '';
  const parts = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://s3.tradingview.com${qwertiScript}${scriptDev}`,
    "worker-src 'self' blob:",
    styleSrc,
    styleSrcElem,
    "style-src-attr 'unsafe-inline'",
    `font-src 'self' https://fonts.gstatic.com${qwertiFont}`,
    `img-src 'self' data: blob: https:`,
    "media-src 'self' data: blob: https:",
    `connect-src 'self' blob: https://api.hatcher.host wss://api.hatcher.host https://*.solana.com wss://*.solana.com https://*.helius-rpc.com wss://*.helius-rpc.com https://api.dexscreener.com${qwertiConnect}${apiConnect}${devConnect}`,
    // The agent desktop's Browser app iframes arbitrary sites, so the desktop
    // route (and ONLY that route) additionally allows any https origin.
    `frame-src 'self' https://www.tradingview.com https://s.tradingview.com https://tradingview.com https://www.tradingview-widget.com https://www.geckoterminal.com https://geckoterminal.com https://dexscreener.com https://www.dexscreener.com${isDesktopRoute ? ' https:' : ''}`,
    "base-uri 'self'",
    "form-action 'self'",
    // Framing policy (owner-approved, 2026-07-30): 'self', not 'none' —
    // only hatcher.host pages may frame hatcher.host pages; external framing
    // stays fully blocked. This is the standard SAMEORIGIN posture (paired
    // with X-Frame-Options: SAMEORIGIN in middleware/next.config) and it
    // unblocks the desktop's same-origin windows (Settings iframe, Browser
    // navigating our own site, Preview). /embed/* stays frameable anywhere.
    isEmbedRoute ? 'frame-ancestors *' : "frame-ancestors 'self'",
  ];
  return parts.join('; ');
}
