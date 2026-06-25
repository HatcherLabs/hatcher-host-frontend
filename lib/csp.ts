const GOOGLE_ADS_HOSTS = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://www.google.com',
  'https://googleads.g.doubleclick.net',
  'https://www.googleadservices.com',
  'https://pagead2.googlesyndication.com',
].join(' ');

const MIRARI_HOST = 'https://entermirari.cloud';
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

export function buildCsp(nonce: string, isEmbedRoute: boolean): string {
  const isDev = process.env.NODE_ENV === 'development';
  const apiConnect = configuredApiConnectSource();
  const devConnect = isDev
    ? ' http://localhost:3001 ws://localhost:3001 http://localhost:8080 http://127.0.0.1:3001 ws://127.0.0.1:3001 http://127.0.0.1:8080'
    : '';
  const scriptDev = isDev ? " 'unsafe-" + "eval'" : '';
  const styleSrc = isDev
    ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
    : `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`;
  const styleSrcElem = isDev
    ? "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com"
    : `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`;
  const parts = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://s3.tradingview.com ${GOOGLE_ADS_HOSTS}${scriptDev}`,
    "worker-src 'self' blob:",
    styleSrc,
    styleSrcElem,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: https: ${MIRARI_HOST} ${GOOGLE_ADS_HOSTS}`,
    `media-src 'self' data: blob: https: ${GOOGLE_ADS_HOSTS}`,
    `connect-src 'self' blob: https://api.hatcher.host wss://api.hatcher.host ${MIRARI_HOST} https://*.solana.com wss://*.solana.com https://*.helius-rpc.com wss://*.helius-rpc.com https://api.dexscreener.com https://threejs.org ${GOOGLE_ADS_HOSTS}${apiConnect}${devConnect}`,
    `frame-src 'self' ${MIRARI_HOST} https://www.tradingview.com https://s.tradingview.com https://tradingview.com https://www.tradingview-widget.com https://www.geckoterminal.com https://geckoterminal.com https://dexscreener.com https://www.dexscreener.com`,
    "base-uri 'self'",
    "form-action 'self'",
    isEmbedRoute ? 'frame-ancestors *' : "frame-ancestors 'none'",
  ];
  return parts.join('; ');
}
