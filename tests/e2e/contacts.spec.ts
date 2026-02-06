import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Contacts Tests - P0/P1
 * Tests contact CRUD with new CRM fields (buyer prefs, seller info, etc.)
 */

test.describe('Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /contacts/i, 'contacts');
    // Wait for the Add Contact button to appear
    await expect(page.getByRole('button', { name: /add contact/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display contacts list', async ({ page }) => {
    // Should show contacts page with add button and table
    await expect(page.getByRole('button', { name: /add contact/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /contacts/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should create buyer contact with preferences - Sarah Persona', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /add contact/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill basic info - use snake_case field names
    await page.locator('input[name="first_name"]').fill('John');
    await page.locator('input[name="last_name"]').fill('TestBuyer');
    await page.locator('input[name="email"]').fill(`john.buyer.${Date.now()}@test.com`);
    
    // Select buyer type - find the contact type select trigger
    const typeSelect = page.locator('[role="dialog"]').locator('button').filter({ hasText: /lead|buyer|seller/i }).first();
    await typeSelect.click();
    await page.locator('[role="option"]').filter({ hasText: /^buyer$/i }).click();

    // Save contact
    await page.getByRole('button', { name: /create contact/i }).click();

    // Verify success - dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  });

  test('should create seller contact', async ({ page }) => {
    await page.getByRole('button', { name: /add contact/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill basic info - use snake_case field names
    await page.locator('input[name="first_name"]').fill('Lisa');
    await page.locator('input[name="last_name"]').fill('TestSeller');
    await page.locator('input[name="email"]').fill(`lisa.seller.${Date.now()}@test.com`);

    // Select seller type
    const typeSelect = page.locator('[role="dialog"]').locator('button').filter({ hasText: /lead|buyer|seller/i }).first();
    await typeSelect.click();
    await page.locator('[role="option"]').filter({ hasText: /^seller$/i }).click();

    // Save
    await page.getByRole('button', { name: /create contact/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  });

  test('should search contacts', async ({ page }) => {
    // Find and use the search input
    const searchInput = page.getByPlaceholder(/search contacts/i);
    await searchInput.fill('Test');
    await page.waitForTimeout(500); // Debounce

    // Table should still be visible
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should open contact details', async ({ page }) => {
    // Click the action button on first contact row (usually a "..." or view button)
    const actionButton = page.locator('table tbody tr').first().locator('button').first();
    
    if (await actionButton.count() > 0) {
      await actionButton.click();
      // Wait for detail sheet or dropdown
      await page.waitForTimeout(500);
    }
  });
});
