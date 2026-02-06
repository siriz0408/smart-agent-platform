import { test, expect } from '@playwright/test';

/**
 * Authentication Tests - P0 Critical
 * Run with: npx playwright test auth.spec.ts
 */

test.describe('Authentication', () => {
  test.describe('Landing Page', () => {
    test('should display landing page for unauthenticated users', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should show landing page with login link and get started button
      await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
    });
  });

  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    });

    test('should display login form', async ({ page }) => {
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      // Password field is type="password" so use locator
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      const email = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
      const password = process.env.TEST_USER_PASSWORD || 'Test1234';

      await page.getByRole('textbox', { name: /email/i }).fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to home/dashboard after login
      await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible({ timeout: 15000 });
    });

    test('should stay on login page with invalid credentials', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com');
      await page.locator('input[type="password"]').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for potential error message
      await page.waitForTimeout(2000);
      
      // Should stay on login page
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should have forgot password option', async ({ page }) => {
      // Look for forgot password link or button
      const forgotPassword = page.getByText(/forgot password/i);
      await expect(forgotPassword).toBeVisible();
    });

    test('should have sign up link', async ({ page }) => {
      // Look for sign up or create account link
      const signUpLink = page.getByText(/sign up|create.*account|don't have an account/i);
      await expect(signUpLink).toBeVisible();
    });
  });
});
