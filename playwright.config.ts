import { defineConfig, devices } from '@playwright/test';

/**
 * Smart Agent E2E Test Configuration
 * Run with: npx playwright test
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-artifacts/playwright-report' }],
    ['json', { outputFile: 'test-artifacts/playwright-results.json' }],
    ['list'],
  ],
  
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Mobile viewports for David persona
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    // Note: mobile-safari requires webkit browser install: npx playwright install webkit
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run dev -- --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  // Output directories
  outputDir: 'test-artifacts/playwright-output',
});
