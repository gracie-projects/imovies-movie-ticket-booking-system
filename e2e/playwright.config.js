import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT) || 5055;
export const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  outputDir: './output/test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: './output/report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  // Builds the React app and serves it from Express with a fresh, seeded in-memory database.
  // Never points at production data.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm --prefix ../frontend run build && node ../backend/src/server.js',
        url: `${BASE_URL}/api/health/ready`,
        timeout: 240_000,
        reuseExistingServer: false,
        stdout: 'ignore',
        stderr: 'pipe',
        // NODE_ENV is deliberately not set here: Vite must create a normal production build
        env: {
          PORT: String(PORT),
          MONGODB_URI: 'memory',
          SEED_ON_START: 'true',
          SERVE_FRONTEND: 'true',
          AUTH_RATE_LIMIT: '1000',
          LOG_LEVEL: 'warn',
          CLIENT_ORIGIN: BASE_URL,
        },
      },
});
