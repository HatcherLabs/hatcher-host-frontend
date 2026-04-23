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
    alias: { '@': path.resolve(__dirname, './') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', 'components/**/*.test.ts', 'components/**/*.test.tsx'],
  },
});
