import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.resolve(frontDir, '../saudy-api-monolith');

export default defineConfig({
  testDir: './specs',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: [
    {
      command: 'pnpm exec tsx src/server.ts',
      cwd: apiDir,
      url: 'http://127.0.0.1:3301/health',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: 'postgresql://saudy_e2e:saudy_e2e_password@127.0.0.1:55433/saudy_e2e',
        DIRECT_URL: 'postgresql://saudy_e2e:saudy_e2e_password@127.0.0.1:55433/saudy_e2e',
        JWT_SECRET: 'saudy-e2e-only-jwt-secret',
        CORS_ORIGIN: 'http://127.0.0.1:4173,http://localhost:4173',
        PORT: '3301',
        NODE_ENV: 'test',
        WHATSAPP_HSM_SYNC_INTERVAL_MINUTES: '1440',
        WHATSAPP_AUTOMATION_INTERVAL_MINUTES: '1440',
        WHATSAPP_HUMAN_TIMEOUT_INTERVAL_MINUTES: '1440',
      },
    },
    {
      command: 'yarn dev --host 127.0.0.1 --port 4173',
      cwd: frontDir,
      url: 'http://127.0.0.1:4173/login',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: 'http://127.0.0.1:3301',
        VITE_E2E: 'true',
      },
    },
  ],
});
