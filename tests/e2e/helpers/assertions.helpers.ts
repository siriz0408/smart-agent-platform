import { Page, expect } from '@playwright/test';

/**
 * Assertion Helpers for E2E Tests
 *
 * Reusable assertion utilities that encapsulate common "expect" patterns
 * found across the test suite.
 */

/**
 * Wait for a toast notification containing the given text and assert it is visible.
 *
 * Toast notifications in shadcn/ui typically live in a `[role="status"]`
 * container or a `[data-sonner-toast]` element. This helper checks several
 * common patterns.
 *
 * @param page    – Playwright Page
 * @param message – Text or regex to match inside the toast
 * @param timeout – Max ms to wait (default 5 000)
 */
export async function expectToast(
  page: Page,
  message: string | RegExp,
  timeout = 5000,
): Promise<void> {
  const pattern =
    typeof message === 'string' ? new RegExp(message, 'i') : message;

  // shadcn/sonner toasts + generic role="status" containers
  const toast = page
    .locator('[data-sonner-toast]')
    .or(page.locator('[role="status"]'))
    .or(page.getByText(pattern));

  await expect(toast.filter({ hasText: pattern }).first()).toBeVisible({
    timeout,
  });
}

/**
 * Assert that a table row containing the specified text exists and is visible.
 *
 * @param page – Playwright Page
 * @param text – Text (or regex) expected somewhere in the row
 */
export async function expectTableRow(
  page: Page,
  text: string | RegExp,
): Promise<void> {
  const pattern = typeof text === 'string' ? new RegExp(text, 'i') : text;
  const row = page.locator('table tbody tr').filter({ hasText: pattern });
  await expect(row.first()).toBeVisible({ timeout: 5000 });
}

/**
 * Assert that a card element with the given title text is visible on the page.
 * Works with shadcn Card components (which render headings or bold text for titles).
 *
 * @param page  – Playwright Page
 * @param title – Card title text or regex
 */
export async function expectCardWithTitle(
  page: Page,
  title: string | RegExp,
): Promise<void> {
  const pattern = typeof title === 'string' ? new RegExp(title, 'i') : title;
  const card = page
    .locator('[class*="card"]')
    .or(page.locator('[data-testid*="card"]'))
    .filter({ hasText: pattern });
  await expect(card.first()).toBeVisible({ timeout: 5000 });
}

/**
 * Assert that a dialog (modal) is currently visible.
 */
export async function expectDialogVisible(page: Page): Promise<void> {
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
}

/**
 * Assert that no dialog is currently open.
 */
export async function expectDialogClosed(page: Page): Promise<void> {
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
}

/**
 * Collect console errors during a callback and assert there are no
 * critical errors (ignoring benign ones like favicon 404s and network issues).
 *
 * Usage:
 * ```ts
 * await expectNoErrors(page, async () => {
 *   await page.reload();
 *   await page.waitForLoadState('networkidle');
 * });
 * ```
 */
export async function expectNoErrors(
  page: Page,
  action?: () => Promise<void>,
): Promise<void> {
  const errors: string[] = [];

  const handler = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  };

  page.on('console', handler);

  if (action) {
    await action();
  } else {
    // Default: reload the page and check
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  // Remove the listener so it doesn't leak into subsequent test steps
  page.removeListener('console', handler);

  // Filter benign errors
  const criticalErrors = errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('net::ERR') &&
      !e.includes('Stripe'), // Stripe SDK may log non-critical warnings
  );

  expect(criticalErrors).toHaveLength(0);
}

/**
 * Assert that a heading with the given text is visible.
 *
 * @param page  – Playwright Page
 * @param text  – Heading text (string or regex)
 * @param level – Optional heading level (1-6)
 */
export async function expectHeading(
  page: Page,
  text: string | RegExp,
  level?: 1 | 2 | 3 | 4 | 5 | 6,
): Promise<void> {
  const options: { name: string | RegExp; level?: number } = {
    name: text,
  };
  if (level) {
    options.level = level;
  }
  await expect(page.getByRole('heading', options)).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Assert that a button with the given name exists and is enabled.
 */
export async function expectButtonEnabled(
  page: Page,
  name: string | RegExp,
): Promise<void> {
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible({ timeout: 5000 });
  await expect(button).toBeEnabled();
}

/**
 * Assert that a button with the given name exists and is disabled.
 */
export async function expectButtonDisabled(
  page: Page,
  name: string | RegExp,
): Promise<void> {
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible({ timeout: 5000 });
  await expect(button).toBeDisabled();
}

/**
 * Assert the page URL matches a given pattern.
 */
export async function expectUrl(
  page: Page,
  pattern: string | RegExp,
  timeout = 5000,
): Promise<void> {
  if (typeof pattern === 'string') {
    await page.waitForURL(`**/${pattern}*`, { timeout });
  } else {
    await page.waitForURL(pattern, { timeout });
  }
}
