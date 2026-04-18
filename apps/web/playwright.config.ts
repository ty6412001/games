import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173',
    headless: true,
  },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
