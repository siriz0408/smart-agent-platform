import { Page, expect } from '@playwright/test';

/**
 * Helper function to login to the app
 */
export async function login(page: Page) {
  const email = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
  const password = process.env.TEST_USER_PASSWORD || 'Test1234';

  // Go directly to login page for reliability
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Check if we need to log in (sign in button visible)
  const signInButton = page.getByRole('button', { name: /sign in/i });
  const isOnLoginPage = await signInButton.isVisible().catch(() => false);
  
  if (isOnLoginPage) {
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.getByRole('textbox', { name: /password/i }).fill(password);
    await signInButton.click();
    
    // Wait for navigation away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  }
  
  // Wait for contacts link to appear (indicates successful login)
  await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate to a page directly via URL (more reliable than clicking links)
 */
export async function navigateTo(page: Page, _linkName: RegExp, urlPath: string) {
  // Use direct navigation which is more reliable for SPA routing
  await page.goto(`/${urlPath}`);
  await page.waitForLoadState('networkidle');
  // Small wait for React hydration
  await page.waitForTimeout(500);
}
