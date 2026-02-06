import { Page, Browser, expect } from '@playwright/test';

/**
 * Authentication Helpers for E2E Tests
 *
 * Provides reusable functions for sign-up, sign-in, sign-out, and
 * obtaining pre-authenticated browser pages.
 */

/** Default test credentials (overridable via env vars) */
const DEFAULT_EMAIL = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
const DEFAULT_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test1234';

/**
 * Sign in with the given (or default) credentials.
 * Navigates to /login, fills the form, and waits until the dashboard is ready.
 */
export async function signIn(
  page: Page,
  email: string = DEFAULT_EMAIL,
  password: string = DEFAULT_PASSWORD,
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Only fill the form if we're actually on the login page
  const signInButton = page.getByRole('button', { name: /sign in/i });
  const isOnLoginPage = await signInButton.isVisible().catch(() => false);

  if (isOnLoginPage) {
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.locator('input[type="password"]').fill(password);
    await signInButton.click();

    // Wait for navigation away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15000,
    });
    await page.waitForLoadState('networkidle');
  }

  // Confirm the dashboard is loaded (contacts link is a reliable indicator)
  await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible({
    timeout: 15000,
  });
}

/**
 * Complete the full sign-up flow.
 * Navigates to the signup page, fills email/password/name, and waits for
 * the app to load (may land on onboarding or dashboard).
 */
export async function signUp(
  page: Page,
  email: string,
  password: string,
  name: string,
): Promise<void> {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');

  // Fill signup form
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Some signup forms include a name field; fill it if present
  const nameInput = page.getByRole('textbox', { name: /name/i });
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(name);
  }

  // Submit
  const signUpButton = page
    .getByRole('button', { name: /sign up|create account/i })
    .first();
  await signUpButton.click();

  // Wait for redirect away from signup page
  await page.waitForURL(
    (url) =>
      !url.pathname.includes('/signup') && !url.pathname.includes('/login'),
    { timeout: 15000 },
  );
  await page.waitForLoadState('networkidle');
}

/**
 * Sign out the currently authenticated user.
 * Attempts multiple strategies: user menu dropdown, direct navigation, etc.
 */
export async function signOut(page: Page): Promise<void> {
  // Strategy 1: Look for a user/avatar menu trigger in the sidebar or header
  const avatarButton = page
    .locator('[class*="avatar"]')
    .or(page.getByRole('button', { name: /profile|account|menu/i }))
    .first();

  if (await avatarButton.isVisible().catch(() => false)) {
    await avatarButton.click();
    await page.waitForTimeout(500);

    const logoutItem = page
      .getByRole('menuitem', { name: /log ?out|sign ?out/i })
      .or(page.getByText(/log ?out|sign ?out/i));

    if (await logoutItem.first().isVisible().catch(() => false)) {
      await logoutItem.first().click();
      await page.waitForURL((url) => url.pathname.includes('/login') || url.pathname === '/', {
        timeout: 10000,
      });
      return;
    }
  }

  // Strategy 2: Navigate to a logout route directly (common pattern)
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
}

/**
 * Get a brand-new page that is already authenticated.
 * Useful for tests that need a fresh browser context with an active session.
 *
 * @returns A new Page instance with an active, authenticated session.
 */
export async function getAuthenticatedPage(
  browser: Browser,
  email: string = DEFAULT_EMAIL,
  password: string = DEFAULT_PASSWORD,
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email, password);
  return page;
}
