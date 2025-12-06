import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Tests critical user flows end-to-end:
 * - Authentication (login/logout)
 * - Member onboarding
 * - Loan application
 * - Payment processing
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:4000',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
