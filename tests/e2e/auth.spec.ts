import { test, expect } from '@playwright/test';

/**
 * Authentication Tests - P0 Critical
 * Run with: npx playwright test auth.spec.ts
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    // Should redirect to login or show login form
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
    // And contacts link should NOT be visible (not logged in)
    await expect(page.getByRole('link', { name: /contacts/i })).not.toBeVisible();
  });

  test('should have forgot password link', async ({ page }) => {
    await expect(page.getByRole('button', { name: /forgot password/i })).toBeVisible();
  });

  test('should have sign up link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });
});
