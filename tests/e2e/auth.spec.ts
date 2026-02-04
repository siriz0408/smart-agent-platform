import { test, expect } from '@playwright/test';

/**
 * Authentication Tests - P0 Critical
 * Run with: npx playwright test auth.spec.ts
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

    // Should redirect to home/dashboard after login
    await expect(page).toHaveURL(/.*/, { timeout: 10000 });
    await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 5000 });
  });

  test('should have forgot password link', async ({ page }) => {
    await expect(page.getByRole('button', { name: /forgot password/i })).toBeVisible();
  });

  test('should have sign up link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });
});

// Helper to login for other tests
export async function login(page: any) {
  const email = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
  const password = process.env.TEST_USER_PASSWORD || 'Test1234';

  await page.goto('/');
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/.*(?<!login)$/, { timeout: 10000 });
}
