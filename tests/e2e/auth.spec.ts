import { test, expect } from '@playwright/test';

/**
 * Authentication Tests - P0 Critical
 * Run with: npx playwright test auth.spec.ts
 */

test.describe('Authentication', () => {
  test.describe('Landing Page', () => {
    test('should display landing page with login and signup options', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Landing page should show Get Started and Log In options
      const getStarted = page.getByRole('link', { name: /get started/i });
      const logIn = page.getByRole('link', { name: /log in/i });
      
      await expect(getStarted.or(logIn).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    });

    test('should display login form', async ({ page }) => {
      // Login page should show sign in form
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      const email = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
      const password = process.env.TEST_USER_PASSWORD || 'Test1234';

      await page.getByRole('textbox', { name: /email/i }).fill(email);
      await page.getByRole('textbox', { name: /password/i }).fill(password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to home/dashboard after login - wait for navigation link to appear
      await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible({ timeout: 15000 });
    });

    test('should stay on login page with invalid credentials', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com');
      await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for potential navigation or error
      await page.waitForTimeout(2000);
      
      // Should stay on login page (sign in button still visible means we didn't login)
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should have forgot password option', async ({ page }) => {
      const forgotPassword = page.getByText(/forgot.*password/i);
      await expect(forgotPassword).toBeVisible();
    });

    test('should have sign up link', async ({ page }) => {
      await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    });
  });

  test.describe('Signup Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
    });

    test('should display signup form', async ({ page }) => {
      // Signup page should show create account form
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
      await expect(page.getByLabel(/full name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      // Password input (type=password) is not a textbox role
      await expect(page.locator('input#password')).toBeVisible();
    });

    test('should have login link', async ({ page }) => {
      await expect(page.getByRole('link', { name: /log in|sign in/i })).toBeVisible();
    });
  });
});
