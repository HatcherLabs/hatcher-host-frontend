/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hatcher/shared'],
  typescript: {
    // Type check separately via `tsc --noEmit` — wallet adapter types conflict in standalone mode
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
