import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 5'] } }
  ],
  webServer: [
    {
      command: 'DATA_DIR=/tmp/codekick-playwright MATCH_SECONDS=12 PORT=8787 cargo run --manifest-path realtime/Cargo.toml',
      url: 'http://127.0.0.1:8787/health',
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      timeout: 30_000
    }
  ]
});
