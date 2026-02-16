import { Page, expect } from '@playwright/test';

/**
 * Navigation Helpers for E2E Tests
 *
 * Typed convenience wrappers that navigate directly to each app section
 * via URL (more reliable than clicking links in an SPA).
 */

/**
 * Internal helper – navigates to a path and waits for React to hydrate.
 */
async function navigateAndWait(page: Page, path: string): Promise<void> {
  await page.goto(`/${path}`);
  await page.waitForLoadState('networkidle');
  // Small wait for React hydration / lazy-loaded chunks
  await page.waitForTimeout(500);
}

/** Navigate to the Home / AI Chat page. */
export async function goToHome(page: Page): Promise<void> {
  await navigateAndWait(page, '');
}

/** Navigate to the Contacts page. */
export async function goToContacts(page: Page): Promise<void> {
  await navigateAndWait(page, 'contacts');
  await expect(
    page.getByRole('button', { name: /add contact/i }),
  ).toBeVisible({ timeout: 10000 });
}

/** Navigate to the Deals / Pipeline page.
 *  @param type – 'buyers' (default) or 'sellers'
 */
export async function goToDeals(
  page: Page,
  type: 'buyers' | 'sellers' = 'buyers',
): Promise<void> {
  await navigateAndWait(page, `pipeline/${type}`);
  await expect(
    page.getByRole('button', { name: /add deal/i }),
  ).toBeVisible({ timeout: 10000 });
}

/** Navigate to the Properties page. */
export async function goToProperties(page: Page): Promise<void> {
  await navigateAndWait(page, 'properties');
  await expect(
    page.getByRole('button', { name: /add property/i }),
  ).toBeVisible({ timeout: 10000 });
}

/** Navigate to the Documents page. */
export async function goToDocuments(page: Page): Promise<void> {
  await navigateAndWait(page, 'documents');
}

/** Navigate to the Messages page. */
export async function goToMessages(page: Page): Promise<void> {
  await navigateAndWait(page, 'messages');
}

/** Navigate to the Settings page.
 *  @param tab – Optional tab hash to deep-link (e.g. 'notifications', 'appearance', 'security', 'more')
 */
export async function goToSettings(
  page: Page,
  tab?: 'profile' | 'notifications' | 'appearance' | 'security' | 'more',
): Promise<void> {
  const hash = tab ? `#${tab}` : '';
  await navigateAndWait(page, `settings${hash}`);
  await expect(
    page.getByRole('heading', { name: /settings/i }),
  ).toBeVisible({ timeout: 10000 });
}

/** Navigate to the Billing page. */
export async function goToBilling(page: Page): Promise<void> {
  await navigateAndWait(page, 'settings/billing');
}

/** Navigate to the AI Chat page. */
export async function goToChat(page: Page): Promise<void> {
  await navigateAndWait(page, 'chat');
}

/** Navigate to the Onboarding wizard. */
export async function goToOnboarding(page: Page): Promise<void> {
  await navigateAndWait(page, 'onboarding');
}

/** Navigate to the Agents page. */
export async function goToAgents(page: Page): Promise<void> {
  await navigateAndWait(page, 'agents');
}

/** Navigate to the Growth Metrics page (admin only).
 *  @param tab - Optional tab: 'growth' for MRR, 'search-analytics' for Search Analytics
 */
export async function goToGrowthMetrics(
  page: Page,
  tab: 'growth' | 'search-analytics' = 'growth',
): Promise<void> {
  await navigateAndWait(page, `settings#${tab}`);
  await expect(
    page.getByRole('heading', { name: /settings/i }),
  ).toBeVisible({ timeout: 10000 });
}
