import { withSentryConfig } from '@sentry/nextjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const NEXT_INTL_REQUEST_CONFIG = './i18n/request.ts';

// Inject the app version from package.json into the client bundle so the
// LandingV3 footer line ("$ hatcher --version  v<X.Y.Z>") shows real data.
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

class SuppressWebpackCacheBigStringWarningPlugin {
  apply(compiler) {
    compiler.hooks.infrastructureLog.tap(
      'SuppressWebpackCacheBigStringWarningPlugin',
      (origin, type, args) => {
        const message = args?.[0];

        if (
          origin === 'webpack.cache.PackFileCacheStrategy' &&
          type === 'warn' &&
          typeof message === 'string' &&
          message.startsWith('Serializing big strings')
        ) {
          return true;
        }

        return undefined;
      }
    );
  }
}

function withNextIntlConfig(config) {
  const nextIntlConfig = {
    ...config,
    webpack(webpackConfig, context) {
      webpackConfig.resolve ??= {};
      webpackConfig.resolve.alias ??= {};
      webpackConfig.resolve.alias['next-intl/config'] = resolve(
        webpackConfig.context || __dirname,
        NEXT_INTL_REQUEST_CONFIG
      );
      webpackConfig.plugins ??= [];
      webpackConfig.plugins.push(new SuppressWebpackCacheBigStringWarningPlugin());

      return typeof config.webpack === 'function' ? config.webpack(webpackConfig, context) : webpackConfig;
    },
  };

  if (process.env.TURBOPACK != null) {
    nextIntlConfig.turbopack = {
      ...config.turbopack,
      resolveAlias: {
        ...config.turbopack?.resolveAlias,
        'next-intl/config': NEXT_INTL_REQUEST_CONFIG,
      },
    };
  }

  if (config.trailingSlash) {
    nextIntlConfig.env = {
      ...config.env,
      _next_intl_trailing_slash: 'true',
    };
  }

  return nextIntlConfig;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  transpilePackages: ['@hatcher/shared'],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'reactflow',
      'cmdk',
      '@solana/web3.js',
    ],
  },
  async headers() {
    // CSP shared between default and embed routes, except for frame-ancestors.
    //
    // Security notes (recon M-003, 2026-04-23):
    //   - `'unsafe-eval'` dropped in favour of `'wasm-unsafe-eval'`.
    //     Three.js / drei use WebAssembly (Draco/KTX2 decoders) which
    //     needs wasm-unsafe-eval; no first-party code path uses plain
    //     `eval()` or `new Function(string)` (grep-verified).
    //   - `'unsafe-inline'` is still allowed for scripts because Next.js
    //     App Router injects inline hydration scripts without a stable
    //     nonce hook as of Next 15. A nonce-based CSP migration is its
    //     own effort (custom middleware + per-request nonces for every
    //     <Script>/<script>). Tracked separately.
    //
    // 3D scene additions (2026-04-24):
    //   - `worker-src 'self' blob:` — three.js DRACOLoader spins up a
    //     decoder Web Worker from a blob URL; without this every GLB
    //     fails to decompress.
    //   - `blob:` in script-src for the same reason on browsers that
    //     don't honour a separate worker-src yet.
    //   - `blob:` in connect-src because GLTFLoader turns embedded GLB
    //     textures into Blob URLs before uploading them to WebGL.
    //   - Google Ads / GTM conversion tracking fans out to several
    //     sibling domains — enumerated so pixel fetches don't get
    //     CSP-blocked on every page load.
    const GOOGLE_ADS_HOSTS = [
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://www.google.com',
      'https://googleads.g.doubleclick.net',
      'https://www.googleadservices.com',
      'https://pagead2.googlesyndication.com',
    ].join(' ');
    const QWERTI_WIDGET_HOSTS = ['https://widget.qwerti.ai', 'https://api.qwerti.ai'].join(' ');
    const baseCspParts = [
      "default-src 'self'",
      // Dev builds use source maps generated via runtime code execution, which
      // CSP blocks by default. Prod builds do not, so the relaxed directive is
      // applied only when NODE_ENV is not production.
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://s3.tradingview.com https://widget.qwerti.ai ${GOOGLE_ADS_HOSTS}${process.env.NODE_ENV !== 'production' ? " 'unsafe-" + "eval'" : ''}`,
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://widget.qwerti.ai",
      `img-src 'self' data: blob: https: ${GOOGLE_ADS_HOSTS}`,
      `media-src 'self' data: blob: https: ${GOOGLE_ADS_HOSTS}`,
      `connect-src 'self' blob: https://api.hatcher.host wss://api.hatcher.host https://*.solana.com wss://*.solana.com https://*.helius-rpc.com wss://*.helius-rpc.com https://api.dexscreener.com https://threejs.org ${GOOGLE_ADS_HOSTS} ${QWERTI_WIDGET_HOSTS}${process.env.NODE_ENV !== 'production' ? ' http://localhost:3001 ws://localhost:3001 http://localhost:8080 http://127.0.0.1:3001 ws://127.0.0.1:3001 http://127.0.0.1:8080' : ''}`,
      "frame-src 'self' https://www.tradingview.com https://s.tradingview.com https://tradingview.com https://www.tradingview-widget.com https://www.geckoterminal.com https://geckoterminal.com https://dexscreener.com https://www.dexscreener.com",
      "base-uri 'self'",
      "form-action 'self'",
    ];
    return [
      {
        // /embed/* routes are meant to be iframed on third-party sites so
        // they opt out of X-Frame-Options DENY and widen frame-ancestors
        // to *. Everything else keeps the strict defaults below.
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [...baseCspParts, "frame-ancestors *"].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Strict default for every path EXCEPT /embed/* — the `missing` key
        // tells Next to skip this block when the URL starts with /embed/.
        // Without it, /(.*) would also match /embed/* and (per Next's
        // headers() merge rules) override the relaxed frame-ancestors.
        source: '/((?!embed).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [...baseCspParts, "frame-ancestors 'none'"].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Cross-origin isolation trio (recon I-004, 2026-04-23). Using
          // the "-allow-popups" variant of COOP so Solana wallet adapters
          // can still open wallet popups. CORP=same-origin blocks other
          // sites from embedding our resources as subresources. COEP is
          // intentionally omitted because Three.js/drei load textures
          // from CDNs (e.g. threejs.org) that don't send CORP, and
          // enabling COEP would break those fetches.
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
    ];
  },
  async redirects() {
    // V1 city + agent-room routes were deleted on 2026-04-25 in favour
    // of V2 (which is the only scene now). These 301s preserve any
    // backlinks, search-engine equity, and embed iframes that landed
    // in the wild between the V1 launch (2026-04-22) and the cleanup,
    // turning a hard 404 into a click-through to the V2 agent room.
    //
    // Two entries per dead route — one for the EN default (no locale
    // prefix) and one for the explicit non-default locales (zh/de/fr/ro).
    // i18n uses `localePrefix: 'as-needed'` so EN URLs never carry a
    // prefix and the bare path doesn't double-match.
    const dead = ['agent/:id/room-legacy', 'agent/:id/city', 'embed/agent/:id'];
    const target = '/agent/:id/room';
    const out = [];
    const cityCategory =
      ':category(automation|business|compliance|creative|customer-success|data|development|devops|ecommerce|education|finance|freelance|healthcare|hr|legal|marketing|moltbook|ollama|personal|productivity|real-estate|saas|security|supply-chain|voice)';

    out.push({ source: `/city/${cityCategory}`, destination: '/city', permanent: true });
    out.push({
      source: `/:locale(zh|de|fr|ro)/city/${cityCategory}`,
      destination: '/:locale/city',
      permanent: true,
    });
    out.push({ source: '/create/template', destination: '/chat-to-hatch', permanent: true });
    out.push({
      source: '/:locale(zh|de|fr|ro)/create/template',
      destination: '/:locale/chat-to-hatch',
      permanent: true,
    });

    for (const slug of [
      'openclaw-vs-hermes-vs-elizaos',
      'openclaw-vs-hermes-elizaos-milady',
    ]) {
      out.push({
        source: `/blog/${slug}`,
        destination: '/blog/state-of-ai-agent-hosting-2026',
        permanent: true,
      });
      out.push({
        source: `/:locale(zh|de|fr|ro)/blog/${slug}`,
        destination: '/:locale/blog/state-of-ai-agent-hosting-2026',
        permanent: true,
      });
    }

    for (const path of dead) {
      out.push({ source: `/${path}`, destination: target, permanent: true });
      out.push({
        source: `/:locale(zh|de|fr|ro)/${path}`,
        destination: `/:locale${target}`,
        permanent: true,
      });
    }

    // Affiliate short-links — `hatcher.host/r/<code>` is the user-facing share
    // URL, but the cookie-dropping handler lives on the API (it must set
    // `hx_ref` on the api.hatcher.host origin so the registration POST sends
    // it back). Without this redirect, next-intl rewrites `/r/<code>` to
    // `/en/r/<code>` and the request 404s — see referrals attribution bug
    // 2026-05-03. Use 302 (not permanent) so we can change the destination
    // later without poisoning browser caches.
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    out.push({ source: '/r/:code', destination: `${API_URL}/r/:code`, permanent: false });
    out.push({
      source: '/:locale(zh|de|fr|ro)/r/:code',
      destination: `${API_URL}/r/:code`,
      permanent: false,
    });

    return out;
  },
};

export default withSentryConfig(withNextIntlConfig(nextConfig), {
  silent: true,
  hideSourceMaps: true,
});
