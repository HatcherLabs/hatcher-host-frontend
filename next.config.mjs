import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  transpilePackages: ['@hatcher/shared'],
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
    const baseCspParts = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.ipfs.nftstorage.link https://arweave.net https://raw.githubusercontent.com",
      `connect-src 'self' https://api.hatcher.host wss://api.hatcher.host https://*.solana.com wss://*.solana.com https://*.helius-rpc.com wss://*.helius-rpc.com https://api.dexscreener.com https://threejs.org${process.env.NODE_ENV !== 'production' ? ' http://localhost:3001 ws://localhost:3001 http://localhost:8080 http://127.0.0.1:3001 ws://127.0.0.1:3001 http://127.0.0.1:8080' : ''}`,
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
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  hideSourceMaps: true,
});
