import { test, expect } from '@playwright/test';
import { login } from './fixtures/helpers';

/**
 * Onboarding Wizard Tests - P0 Critical
 * Tests the complete onboarding flow: welcome → profile → role → completion
 * 
 * Covers:
 * - Welcome step display and navigation
 * - Profile setup with required fields
 * - Role selection (agent/buyer/seller)
 * - Onboarding completion and redirect
 */

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first to access onboarding
    await login(page);
  });

  test.describe('Welcome Step', () => {
    test('should display welcome step with features', async ({ page }) => {
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');

      // Should show welcome heading
      await expect(page.getByRole('heading', { name: /welcome to smart agent/i })).toBeVisible();
      
      // Should show feature cards
      await expect(page.getByText(/ai-powered chat/i)).toBeVisible();
      await expect(page.getByText(/document intelligence/i)).toBeVisible();
      await expect(page.getByText(/crm built for real estate/i)).toBeVisible();
      await expect(page.getByText(/pipeline management/i)).toBeVisible();

      // Should show Get Started button
      await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
    });

    test('should navigate to profile step when clicking Get Started', async ({ page }) => {
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');

      // Click Get Started
      await page.getByRole('button', { name: /get started/i }).click();
      
      // Should navigate to profile step
      await expect(page.getByText(/complete your profile/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Profile Setup Step', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');
      // Navigate past welcome step
      await page.getByRole('button', { name: /get started/i }).click();
      await page.waitForTimeout(1000);
    });

    test('should display profile form with required fields', async ({ page }) => {
      // Should show profile form
      await expect(page.getByText(/complete your profile/i)).toBeVisible();
      await expect(page.getByLabel(/full name/i)).toBeVisible();
      await expect(page.getByLabel(/title/i)).toBeVisible();
      await expect(page.getByLabel(/phone number/i)).toBeVisible();
      
      // Should show Back and Continue buttons
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
    });

    test('should require full name to continue', async ({ page }) => {
      // Try to continue without filling name
      await page.getByRole('button', { name: /continue/i }).click();
      
      // Should show error or stay on page
      await expect(page.getByText(/complete your profile/i)).toBeVisible();
    });

    test('should save profile and navigate to role step', async ({ page }) => {
      // Fill required name field
      await page.getByLabel(/full name/i).fill('Test User');
      
      // Optionally fill other fields
      await page.getByLabel(/title/i).fill('Real Estate Agent');
      await page.getByLabel(/phone number/i).fill('555-123-4567');

      // Click Continue
      await page.getByRole('button', { name: /continue/i }).click();
      
      // Should navigate to role selection step
      await expect(page.getByText(/how will you use smart agent/i)).toBeVisible({ timeout: 5000 });
    });

    test('should navigate back to welcome step', async ({ page }) => {
      // Click Back button
      await page.getByRole('button', { name: /back/i }).click();
      
      // Should return to welcome step
      await expect(page.getByRole('heading', { name: /welcome to smart agent/i })).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Role Selection Step', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');
      // Navigate through welcome and profile steps
      await page.getByRole('button', { name: /get started/i }).click();
      await page.waitForTimeout(1000);
      await page.getByLabel(/full name/i).fill('Test User');
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(1000);
    });

    test('should display role options', async ({ page }) => {
      // Should show role selection heading
      await expect(page.getByText(/how will you use smart agent/i)).toBeVisible();
      
      // Should show all three role options
      await expect(page.getByText(/real estate agent/i)).toBeVisible();
      await expect(page.getByText(/home buyer/i)).toBeVisible();
      await expect(page.getByText(/home seller/i)).toBeVisible();
    });

    test('should select agent role and continue', async ({ page }) => {
      // Click on Agent role
      await page.getByText(/real estate agent/i).click();
      
      // Continue button should be enabled
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeEnabled();
      
      // Click Continue
      await continueButton.click();
      
      // Should navigate to completion step
      await expect(page.getByText(/you're all set/i).or(page.getByText(/complete/i))).toBeVisible({ timeout: 5000 });
    });

    test('should select buyer role', async ({ page }) => {
      await page.getByText(/home buyer/i).click();
      await expect(page.getByRole('button', { name: /continue/i })).toBeEnabled();
    });

    test('should select seller role', async ({ page }) => {
      await page.getByText(/home seller/i).click();
      await expect(page.getByRole('button', { name: /continue/i })).toBeEnabled();
    });

    test('should require role selection to continue', async ({ page }) => {
      // Continue button should be disabled without selection
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeDisabled();
    });

    test('should navigate back to profile step', async ({ page }) => {
      await page.getByRole('button', { name: /back/i }).click();
      
      // Should return to profile step
      await expect(page.getByText(/complete your profile/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Completion Step', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');
      // Navigate through all steps
      await page.getByRole('button', { name: /get started/i }).click();
      await page.waitForTimeout(1000);
      await page.getByLabel(/full name/i).fill('Test User');
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(1000);
      await page.getByText(/real estate agent/i).click();
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(1000);
    });

    test('should display completion step', async ({ page }) => {
      // Should show completion message
      await expect(
        page.getByText(/you're all set/i).or(page.getByText(/complete/i)).or(page.getByText(/ready/i))
      ).toBeVisible({ timeout: 5000 });
    });

    test('should complete onboarding and redirect to home', async ({ page }) => {
      // Look for Complete button or similar
      const completeButton = page.getByRole('button', { name: /complete/i }).or(
        page.getByRole('button', { name: /get started/i })
      ).or(page.getByRole('button', { name: /finish/i }));
      
      if (await completeButton.count() > 0) {
        await completeButton.first().click();
      } else {
        // If no button, check if already redirected
        await page.waitForTimeout(2000);
      }
      
      // Should redirect to home page (not onboarding)
      await page.waitForURL((url) => !url.pathname.includes('/onboarding'), { timeout: 10000 });
      
      // Should see main app navigation
      await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Full Onboarding Flow', () => {
    test('should complete full onboarding flow end-to-end', async ({ page }) => {
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');

      // Step 1: Welcome
      await expect(page.getByRole('heading', { name: /welcome to smart agent/i })).toBeVisible();
      await page.getByRole('button', { name: /get started/i }).click();
      
      // Step 2: Profile
      await expect(page.getByText(/complete your profile/i)).toBeVisible({ timeout: 5000 });
      await page.getByLabel(/full name/i).fill('E2E Test User');
      await page.getByLabel(/title/i).fill('Test Agent');
      await page.getByRole('button', { name: /continue/i }).click();
      
      // Step 3: Role
      await expect(page.getByText(/how will you use smart agent/i)).toBeVisible({ timeout: 5000 });
      await page.getByText(/real estate agent/i).click();
      await page.getByRole('button', { name: /continue/i }).click();
      
      // Step 4: Completion
      await page.waitForTimeout(2000);
      
      // Should redirect to home
      await page.waitForURL((url) => !url.pathname.includes('/onboarding'), { timeout: 10000 });
      await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Onboarding Progress', () => {
    test('should show progress indicator', async ({ page }) => {
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');

      // Progress bar or step indicator should be visible
      const progressIndicator = page.locator('[role="progressbar"]').or(
        page.getByText(/step/i)
      ).or(page.locator('[class*="progress"]'));
      
      // At least one progress indicator should exist
      const hasProgress = await progressIndicator.count() > 0;
      expect(hasProgress).toBeTruthy();
    });
  });
});
