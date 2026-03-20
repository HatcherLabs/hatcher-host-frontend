/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hatcher/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
