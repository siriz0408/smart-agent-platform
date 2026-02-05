import { test, expect, Page } from '@playwright/test';

/**
 * Signup & Onboarding Debug Test
 * Run with: npx playwright test signup-onboarding.spec.ts --headed --project=chromium
 */

// Generate unique test email
function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test_${timestamp}_${random}@testmail.com`;
}

test.describe('Signup and Onboarding Flow', () => {
  test('should complete full signup and onboarding flow', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    const testFullName = 'Test User Debug';
    
    console.log('Test credentials:', { testEmail, testFullName });
    
    // Step 1: Navigate to signup
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-01-signup-page.png' });
    console.log('Step 1: On signup page');
    
    // Step 2: Fill signup form
    await page.getByLabel(/full name/i).fill(testFullName);
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    
    // Accept terms
    const termsCheckbox = page.locator('#terms');
    await termsCheckbox.click();
    
    await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-02-form-filled.png' });
    console.log('Step 2: Form filled');
    
    // Step 3: Submit signup
    await page.getByRole('button', { name: /create account/i }).click();
    console.log('Step 3: Clicked create account');
    
    // Wait for navigation (either to onboarding or dashboard)
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-03-after-signup.png' });
    
    const currentUrl = page.url();
    console.log('Step 3: After signup, URL:', currentUrl);
    
    // Check if we got an error toast
    const errorToast = await page.getByText(/error|failed/i).first().isVisible().catch(() => false);
    if (errorToast) {
      await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-03-error.png' });
      console.log('Step 3: ERROR - Signup failed, error toast visible');
    }
    
    // Step 4: Check if on onboarding
    const isOnOnboarding = currentUrl.includes('/onboarding') || 
      await page.getByText(/step \d+ of \d+/i).isVisible().catch(() => false) ||
      await page.getByText(/welcome to smart agent/i).isVisible().catch(() => false);
    
    console.log('Step 4: Is on onboarding:', isOnOnboarding);
    
    if (isOnOnboarding || currentUrl === '/' || currentUrl.includes('/dashboard')) {
      // Navigate to onboarding explicitly if needed
      if (!currentUrl.includes('/onboarding')) {
        await page.goto('/onboarding');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-04-onboarding.png' });
      console.log('Step 4: On onboarding page');
      
      // Step 5: Complete Welcome step (if visible)
      const welcomeGetStarted = page.getByRole('button', { name: /get started/i });
      if (await welcomeGetStarted.isVisible().catch(() => false)) {
        console.log('Step 5: Clicking Get Started on welcome');
        await welcomeGetStarted.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-05-after-welcome.png' });
      }
      
      // Step 6: Profile Setup step
      const profileHeading = page.getByRole('heading', { name: /complete your profile/i });
      const isOnProfileStep = await profileHeading.isVisible().catch(() => false);
      console.log('Step 6: Is on profile step:', isOnProfileStep);
      
      if (isOnProfileStep) {
        await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-06-profile-step.png' });
        
        // Fill profile form
        const fullNameInput = page.getByLabel(/full name/i);
        const titleInput = page.getByLabel(/title|role/i);
        const phoneInput = page.getByLabel(/phone/i);
        
        if (await fullNameInput.isVisible()) {
          await fullNameInput.clear();
          await fullNameInput.fill('Test User Profile');
        }
        if (await titleInput.isVisible()) {
          await titleInput.fill('Real Estate Agent');
        }
        if (await phoneInput.isVisible()) {
          await phoneInput.fill('555-123-4567');
        }
        
        await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-06-profile-filled.png' });
        console.log('Step 6: Profile form filled');
        
        // Step 7: Click Continue on profile step
        const continueBtn = page.getByRole('button', { name: /continue/i });
        if (await continueBtn.isVisible()) {
          console.log('Step 7: Clicking Continue');
          await continueBtn.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-07-after-profile.png' });
          console.log('Step 7: After clicking Continue, URL:', page.url());
          
          // Check for error
          const profileError = await page.getByText(/error|failed/i).first().isVisible().catch(() => false);
          if (profileError) {
            await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-07-error.png' });
            console.log('Step 7: ERROR - Profile update failed');
          }
        }
      }
      
      // Step 8: Check current state
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-08-current-state.png' });
      console.log('Step 8: Current URL:', page.url());
      
      // Check if still on same step (stuck)
      const stillOnProfileStep = await profileHeading.isVisible().catch(() => false);
      if (stillOnProfileStep) {
        console.log('Step 8: STUCK - Still on profile step');
      }
      
      // Check for role selection step
      const roleStep = await page.getByText(/agent|buyer|seller/i).first().isVisible().catch(() => false);
      console.log('Step 8: On role step:', roleStep);
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-artifacts/screenshots/signup-debug-final.png', fullPage: true });
    console.log('Test complete. Check debug.log for instrumentation logs.');
  });

  test('should test Skip Setup functionality', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    const testFullName = 'Skip Test User';
    
    console.log('Skip test credentials:', { testEmail, testFullName });
    
    // Sign up
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    
    await page.getByLabel(/full name/i).fill(testFullName);
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.locator('#terms').click();
    await page.getByRole('button', { name: /create account/i }).click();
    
    await page.waitForTimeout(5000);
    
    // Navigate to onboarding
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-artifacts/screenshots/skip-debug-01-onboarding.png' });
    console.log('Skip test: On onboarding, URL:', page.url());
    
    // Click Skip Setup
    const skipButton = page.getByRole('button', { name: /skip setup/i });
    if (await skipButton.isVisible()) {
      console.log('Skip test: Clicking Skip Setup');
      await skipButton.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-artifacts/screenshots/skip-debug-02-after-skip.png' });
      console.log('Skip test: After skip, URL:', page.url());
      
      // Check for error
      const skipError = await page.getByText(/error|failed/i).first().isVisible().catch(() => false);
      if (skipError) {
        await page.screenshot({ path: 'test-artifacts/screenshots/skip-debug-02-error.png' });
        console.log('Skip test: ERROR - Skip failed');
      }
    } else {
      console.log('Skip test: Skip button not visible');
    }
  });
});
