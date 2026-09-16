import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'direct-chat.spec.ts', workers: 1,
  timeout: 60000, use: { baseURL: 'http://127.0.0.1:3048', browserName: 'chromium' },
});
