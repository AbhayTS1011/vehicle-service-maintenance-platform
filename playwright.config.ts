import { defineConfig, devices } from '@playwright/test'

// These credentials are local test-only values. The test server is isolated from
// real databases even if the developer's shell has production variables set.
const e2eJwtSecret = 'phase11-playwright-local-test-key-not-for-real-users'
const e2eDatabaseUrl = 'postgresql://phase11_e2e:unused@127.0.0.1:1/phase11_e2e?schema=public'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      JWT_SECRET: e2eJwtSecret,
      DATABASE_URL: e2eDatabaseUrl,
    },
  },
})
