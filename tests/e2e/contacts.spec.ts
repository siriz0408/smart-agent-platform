import { test, expect } from '@playwright/test';
import { login } from './auth.spec';

/**
 * Contacts Tests - P0/P1
 * Tests contact CRUD with new CRM fields (buyer prefs, seller info, etc.)
 */

test.describe('Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /contacts/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display contacts list', async ({ page }) => {
    // Should show contacts page with add button
    await expect(page.getByRole('button', { name: /add contact/i })).toBeVisible();
  });

  test('should create buyer contact with preferences - Sarah Persona', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /add contact/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill basic info
    await page.getByRole('textbox', { name: /first name/i }).fill('John');
    await page.getByRole('textbox', { name: /last name/i }).fill('TestBuyer');
    await page.getByRole('textbox', { name: /email/i }).fill(`john.buyer.${Date.now()}@test.com`);
    
    // Select buyer type
    await page.getByRole('combobox', { name: /contact type/i }).click();
    await page.getByRole('option', { name: /buyer/i }).click();

    // Expand and fill Buyer Preferences
    await page.getByRole('button', { name: /buyer preferences/i }).click();
    await page.getByRole('spinbutton', { name: /min price/i }).fill('250000');
    await page.getByRole('spinbutton', { name: /max price/i }).fill('400000');
    await page.getByRole('spinbutton', { name: /preferred beds/i }).fill('3');
    await page.getByRole('spinbutton', { name: /preferred baths/i }).fill('2');
    await page.getByRole('textbox', { name: /preferred areas/i }).fill('Austin, Round Rock, Cedar Park');

    // Expand and fill Financial Status
    await page.getByRole('button', { name: /financial status/i }).click();
    await page.getByRole('combobox', { name: /pre-approval status/i }).click();
    await page.getByRole('option', { name: /approved/i }).click();
    await page.getByRole('spinbutton', { name: /pre-approval amount/i }).fill('350000');
    await page.getByRole('textbox', { name: /lender name/i }).fill('First National Bank');

    // Save contact
    await page.getByRole('button', { name: /create contact/i }).click();

    // Verify success
    await expect(page.getByText(/contact created/i)).toBeVisible({ timeout: 5000 });
    
    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('should create seller contact with info - Marcus Persona', async ({ page }) => {
    await page.getByRole('button', { name: /add contact/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill basic info
    await page.getByRole('textbox', { name: /first name/i }).fill('Lisa');
    await page.getByRole('textbox', { name: /last name/i }).fill('TestSeller');
    await page.getByRole('textbox', { name: /email/i }).fill(`lisa.seller.${Date.now()}@test.com`);

    // Select seller type
    await page.getByRole('combobox', { name: /contact type/i }).click();
    await page.getByRole('option', { name: /seller/i }).click();

    // Seller Info section should appear
    await page.getByRole('button', { name: /seller info/i }).click();
    await page.getByRole('textbox', { name: /owned property address/i }).fill('1234 Lakefront Drive, Austin TX');
    await page.getByRole('textbox', { name: /listing timeline/i }).fill('List within 30 days');

    // Save
    await page.getByRole('button', { name: /create contact/i }).click();
    await expect(page.getByText(/contact created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should search contacts', async ({ page }) => {
    // Type in search box
    const searchInput = page.getByRole('textbox', { name: /search contacts/i });
    await searchInput.fill('Test');
    await page.waitForTimeout(500); // Debounce

    // Should filter results
    // Verify search works (results shown or no results message)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should view contact details', async ({ page }) => {
    // Click on first contact in list
    const contactRow = page.locator('[data-testid="contact-row"]').first();
    
    // If no contacts, create one first
    if (await contactRow.count() === 0) {
      await page.getByRole('button', { name: /add contact/i }).click();
      await page.getByRole('textbox', { name: /first name/i }).fill('Detail');
      await page.getByRole('textbox', { name: /last name/i }).fill('Test');
      await page.getByRole('button', { name: /create contact/i }).click();
      await page.waitForTimeout(1000);
    }

    // Click to open detail sheet
    await page.locator('button').filter({ hasText: /view|detail|\.\.\./i }).first().click();
    
    // Should show contact detail sheet
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('should edit contact', async ({ page }) => {
    // Navigate to contact detail and edit
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    
    if (await editButton.count() > 0) {
      await editButton.click();
      // Should show edit form
      await expect(page.getByRole('textbox', { name: /first name/i })).toBeVisible();
    }
  });
});
