import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Next.js sets "jsx": "preserve" in tsconfig; plugin-react gives vitest
  // its own JSX transform so imports of .tsx files work in tests.
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', 'components/**/*.test.ts', 'components/**/*.test.tsx'],
  },
});
