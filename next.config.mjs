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
  cacheHandler: resolve(__dirname, 'cache-handler.cjs'),
  cacheMaxMemorySize: 0,
  transpilePackages: ['@hatcher/shared'],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: 'gateway.irys.xyz' },
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
    // CSP is generated in middleware.ts with a per-request nonce. Keeping it
    // static here would block Next's inline RSC/bootstrap scripts.
    return [
      {
        // /embed/* routes are meant to be iframed on third-party sites so
        // they opt out of X-Frame-Options entirely and widen
        // frame-ancestors to *. Everything else keeps the strict defaults
        // below (SAMEORIGIN framing).
        source: '/embed/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Strict default for every path EXCEPT /embed/* — the negative
        // lookahead skips this block for that prefix. Without it, /(.*)
        // would also match /embed and (per Next's headers() merge rules)
        // re-impose X-Frame-Options / override the relaxed frame-ancestors.
        //
        // Framing policy (owner-approved, 2026-07-30): SAMEORIGIN, not
        // DENY — only hatcher.host pages may frame hatcher.host pages;
        // external framing stays fully blocked. This unblocks the agent
        // desktop's same-origin windows (Settings iframe, Browser on our
        // own site, Preview), so the former dedicated carve-out for
        // /api/agents/:agentId/preview/:path+ is gone on purpose: the
        // preview proxy simply carries SAMEORIGIN like everything else
        // (its route-level CSP `sandbox ...; frame-ancestors 'self'`
        // stays as defense in depth), and dropping the extra lookahead
        // also closes the case-sensitivity gap it opened.
        source: '/((?!embed).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
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
          // intentionally omitted because pages render cross-origin
          // images/media (agent avatars, token logos) from hosts that
          // don't send CORP, and enabling COEP would break those fetches.
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
    // Hatcher City, the 3D agent room, and their V1 ancestors were
    // retired on 2026-08-01. These 301s keep old backlinks, search
    // equity, and embeds landing somewhere useful instead of a 404.
    //
    // Two entries per dead route — one for the EN default (no locale
    // prefix) and one for the explicit non-default locales (zh/de/fr/ro).
    // i18n uses `localePrefix: 'as-needed'` so EN URLs never carry a
    // prefix and the bare path doesn't double-match.
    const dead = ['agent/:id/room', 'agent/:id/room-legacy', 'agent/:id/city', 'embed/agent/:id'];
    const target = '/agent/:id';
    const out = [];

    out.push({ source: '/city', destination: '/', permanent: true });
    out.push({ source: '/city/:path*', destination: '/', permanent: true });
    out.push({
      source: '/:locale(zh|de|fr|ro)/city',
      destination: '/:locale',
      permanent: true,
    });
    out.push({
      source: '/:locale(zh|de|fr|ro)/city/:path*',
      destination: '/:locale',
      permanent: true,
    });
    out.push({ source: '/create/template', destination: '/create', permanent: true });
    out.push({
      source: '/:locale(zh|de|fr|ro)/create/template',
      destination: '/:locale/create',
      permanent: true,
    });
    // Retired marketing/program pages keep old links landing somewhere useful.
    out.push({ source: '/affiliate', destination: '/', permanent: true });
    out.push({ source: '/affiliate/apply', destination: '/', permanent: true });
    // /chat-to-hatch was a duplicate entry point for the same flow as /create.
    out.push({ source: '/chat-to-hatch', destination: '/create', permanent: true });
    out.push({
      source: '/:locale(zh|de|fr|ro)/chat-to-hatch',
      destination: '/:locale/create',
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
