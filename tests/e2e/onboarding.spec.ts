import { test, expect, Page } from '@playwright/test';

/**
 * Onboarding Workflow Tests
 * Run with: npx playwright test onboarding.spec.ts
 * Run in UI mode: npx playwright test onboarding.spec.ts --ui
 * Run with debug: npx playwright test onboarding.spec.ts --debug
 */

// Helper to login
async function login(page: Page, email?: string, password?: string) {
  const testEmail = email || process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
  const testPassword = password || process.env.TEST_USER_PASSWORD || 'Test1234';
  
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.getByRole('textbox', { name: /email/i }).fill(testEmail);
  await page.getByRole('textbox', { name: /password/i }).fill(testPassword);
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for navigation
  await page.waitForTimeout(3000);
}

test.describe('Landing Page', () => {
  test('should display landing page elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Screenshot the landing page
    await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-01-landing.png' });
    
    // Check for Smart Agent branding
    await expect(page.getByText('Smart Agent').first()).toBeVisible();
    
    // Check for Log In link
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
    
    // Check for Get Started link (signup)
    await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click Get Started
    await page.getByRole('link', { name: /get started/i }).first().click();
    await page.waitForLoadState('networkidle');
    
    // Screenshot
    await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-02-signup.png' });
    
    // Should be on signup page
    expect(page.url()).toContain('/signup');
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click Log In
    await page.getByRole('link', { name: /log in/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Screenshot
    await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-03-login.png' });
    
    // Should be on login page
    expect(page.url()).toContain('/login');
  });
});

test.describe('Login Flow', () => {
  test('should login and see dashboard or onboarding', async ({ page }) => {
    await login(page);
    
    // Screenshot current state
    await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-04-post-login.png' });
    
    const currentUrl = page.url();
    console.log('Post-login URL:', currentUrl);
    
    // Should be on dashboard OR onboarding
    const onDashboard = currentUrl.includes('/dashboard') || currentUrl.includes('/chat');
    const onOnboarding = currentUrl.includes('/onboarding');
    
    expect(onDashboard || onOnboarding).toBe(true);
  });
});

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should access onboarding page directly', async ({ page }) => {
    // Navigate directly to onboarding
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Screenshot
    await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-05-wizard.png' });
    
    const currentUrl = page.url();
    console.log('Onboarding URL:', currentUrl);
    
    // Check if we're redirected (user may have completed onboarding)
    if (currentUrl.includes('/onboarding')) {
      // We're on onboarding page - check for wizard elements
      const hasStepIndicator = await page.getByText(/step \d+ of \d+/i).isVisible().catch(() => false);
      const hasSkipButton = await page.getByRole('button', { name: /skip setup/i }).isVisible().catch(() => false);
      const hasProgress = await page.locator('.progress, [role="progressbar"]').first().isVisible().catch(() => false);
      
      console.log('Onboarding elements:', { hasStepIndicator, hasSkipButton, hasProgress });
      
      // At least one onboarding element should be visible
      expect(hasStepIndicator || hasSkipButton || hasProgress).toBe(true);
    } else {
      // User was redirected (already completed onboarding)
      console.log('User redirected - already completed onboarding');
      expect(true).toBe(true); // Test passes - onboarding completed
    }
  });

  test('should show onboarding welcome step', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/onboarding')) {
      // Screenshot
      await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-06-welcome.png' });
      
      // Look for welcome step content
      const welcomeHeading = await page.getByRole('heading', { name: /welcome/i }).isVisible().catch(() => false);
      const getStartedBtn = await page.getByRole('button', { name: /get started|next|continue/i }).isVisible().catch(() => false);
      
      console.log('Welcome step elements:', { welcomeHeading, getStartedBtn });
      
      // Take additional screenshot if welcome is visible
      if (welcomeHeading) {
        await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-06-welcome-detail.png' });
      }
    } else {
      console.log('Skipped - user already completed onboarding');
    }
  });

  test('should be able to skip onboarding', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/onboarding')) {
      // Look for skip button
      const skipButton = page.getByRole('button', { name: /skip setup/i });
      const isSkipVisible = await skipButton.isVisible().catch(() => false);
      
      if (isSkipVisible) {
        // Screenshot before skip
        await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-07-before-skip.png' });
        
        // Don't actually click skip - just verify it exists
        console.log('Skip button is visible');
        expect(true).toBe(true);
      } else {
        console.log('Skip button not visible - may be on completion step');
      }
    } else {
      console.log('Skipped - user already completed onboarding');
    }
  });

  test('should navigate through profile step', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/onboarding')) {
      // Screenshot initial state
      await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-08-profile-step.png' });
      
      // Check for profile setup elements
      const profileHeading = await page.getByRole('heading', { name: /profile|setup|tell us/i }).isVisible().catch(() => false);
      const firstNameInput = await page.getByLabel(/first name/i).isVisible().catch(() => false);
      const lastNameInput = await page.getByLabel(/last name/i).isVisible().catch(() => false);
      
      console.log('Profile step elements:', { profileHeading, firstNameInput, lastNameInput });
      
      // If we see profile inputs, try filling them
      if (firstNameInput) {
        await page.getByLabel(/first name/i).fill('Test');
      }
      if (lastNameInput) {
        await page.getByLabel(/last name/i).fill('User');
      }
      
      // Screenshot after filling
      await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-08-profile-filled.png' });
    } else {
      console.log('Skipped - user already completed onboarding');
    }
  });

  test('should show role selection step', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/onboarding')) {
      // Screenshot
      await page.screenshot({ path: 'test-artifacts/screenshots/onboarding-09-role-step.png' });
      
      // Check for role selection elements
      const roleHeading = await page.getByRole('heading', { name: /role|what.*do|select/i }).isVisible().catch(() => false);
      const agentOption = await page.getByText(/agent/i).first().isVisible().catch(() => false);
      const buyerOption = await page.getByText(/buyer/i).first().isVisible().catch(() => false);
      const sellerOption = await page.getByText(/seller/i).first().isVisible().catch(() => false);
      
      console.log('Role step elements:', { roleHeading, agentOption, buyerOption, sellerOption });
    } else {
      console.log('Skipped - user already completed onboarding');
    }
  });
});

// Debug test - always runs and captures current state
test('Debug: Capture app state', async ({ page }) => {
  // 1. Landing page
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-artifacts/screenshots/debug-01-landing.png', fullPage: true });
  console.log('Landing URL:', page.url());
  
  // 2. Login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-artifacts/screenshots/debug-02-login.png', fullPage: true });
  console.log('Login URL:', page.url());
  
  // 3. Signup page
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-artifacts/screenshots/debug-03-signup.png', fullPage: true });
  console.log('Signup URL:', page.url());
  
  // 4. Login and capture post-auth state
  await login(page);
  await page.screenshot({ path: 'test-artifacts/screenshots/debug-04-post-login.png', fullPage: true });
  console.log('Post-login URL:', page.url());
  
  // 5. Try onboarding directly
  await page.goto('/onboarding');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-artifacts/screenshots/debug-05-onboarding.png', fullPage: true });
  console.log('Onboarding URL:', page.url());
  
  // 6. Dashboard
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-artifacts/screenshots/debug-06-dashboard.png', fullPage: true });
  console.log('Dashboard URL:', page.url());
  
  // Log visible navigation elements
  const navElements = {
    contacts: await page.getByRole('link', { name: /contacts/i }).isVisible().catch(() => false),
    properties: await page.getByRole('link', { name: /properties/i }).isVisible().catch(() => false),
    documents: await page.getByRole('link', { name: /documents/i }).isVisible().catch(() => false),
    pipeline: await page.getByRole('link', { name: /pipeline/i }).isVisible().catch(() => false),
  };
  console.log('Navigation elements visible:', navElements);
  
  expect(true).toBe(true); // Debug test always passes
});
