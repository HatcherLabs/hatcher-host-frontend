import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // Next.js sets "jsx": "preserve" in tsconfig; plugin-react gives vitest
  // its own JSX transform so imports of .tsx files work in tests.
  plugins: [react()],
  resolve: {
    // Mirror tsconfig's "@/*": "./*" so test files can use the same
    // "@/components/..." imports as app code.
    alias: {
      '@': path.resolve(__dirname, './'),
      // next-intl's createNavigation imports the bare `next/navigation`
      // subpath, which Next only exposes via a CJS shim file — vitest's
      // ESM resolver needs the explicit mapping (components importing
      // `@/i18n/routing`, e.g. the desktop SettingsApp, pull it in).
      'next/navigation': path.resolve(__dirname, 'node_modules/next/navigation.js'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', 'components/**/*.test.ts', 'components/**/*.test.tsx'],
    // Externalized deps are resolved by Node directly and skip the alias
    // above — inline next-intl so its `next/navigation` import resolves.
    server: { deps: { inline: ['next-intl'] } },
  },
});
