import { test, expect } from '@playwright/test';
import { login } from './auth.spec';

/**
 * Deals/Pipeline Tests - P0/P1
 * Tests deal CRUD with financials, contingencies, lender info
 */

test.describe('Deals Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /pipeline/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display pipeline view', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add deal/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /buyers/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /sellers/i })).toBeVisible();
  });

  test('should create buyer deal with financials - Sarah Persona', async ({ page }) => {
    await page.getByRole('button', { name: /add deal/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select contact (required)
    await page.getByRole('combobox', { name: /contact/i }).click();
    const contactOption = page.getByRole('option').first();
    if (await contactOption.count() > 0) {
      await contactOption.click();
    }

    // Fill estimated value
    await page.getByRole('spinbutton', { name: /estimated value/i }).fill('375000');

    // Expand Financials
    await page.getByRole('button', { name: /financials/i }).click();
    await page.getByRole('spinbutton', { name: /earnest money/i }).fill('5000');
    await page.getByRole('spinbutton', { name: /option fee/i }).fill('500');

    // Verify Contingencies default values
    await page.getByRole('button', { name: /contingencies/i }).click();
    
    // Check default contingency checkboxes
    const inspectionCheckbox = page.getByRole('checkbox', { name: /inspection contingency/i });
    const financingCheckbox = page.getByRole('checkbox', { name: /financing contingency/i });
    const appraisalCheckbox = page.getByRole('checkbox', { name: /appraisal contingency/i });
    
    await expect(inspectionCheckbox).toBeChecked();
    await expect(financingCheckbox).toBeChecked();
    await expect(appraisalCheckbox).toBeChecked();

    // Save deal
    await page.getByRole('button', { name: /create deal/i }).click();
    await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should create deal with lender info - Marcus Persona', async ({ page }) => {
    await page.getByRole('button', { name: /add deal/i }).click();

    // Select contact
    await page.getByRole('combobox', { name: /contact/i }).click();
    const contactOption = page.getByRole('option').first();
    if (await contactOption.count() > 0) {
      await contactOption.click();
    }

    await page.getByRole('spinbutton', { name: /estimated value/i }).fill('2500000');

    // Financials
    await page.getByRole('button', { name: /financials/i }).click();
    await page.getByRole('spinbutton', { name: /earnest money/i }).fill('75000');
    await page.getByRole('spinbutton', { name: /option fee/i }).fill('5000');

    // Lender Information
    await page.getByRole('button', { name: /lender information/i }).click();
    await page.getByRole('combobox', { name: /loan type/i }).click();
    await page.getByRole('option', { name: /conventional/i }).click();
    await page.getByRole('textbox', { name: /lender name/i }).fill('First Republic Bank');
    await page.getByRole('textbox', { name: /loan officer name/i }).fill('Michael Johnson');
    await page.getByRole('textbox', { name: /loan officer phone/i }).fill('512-555-1234');

    // Title & Escrow
    await page.getByRole('button', { name: /title & escrow/i }).click();
    await page.getByRole('textbox', { name: /title company/i }).fill('Stewart Title');
    await page.getByRole('textbox', { name: /escrow officer name/i }).fill('Jennifer Smith');

    await page.getByRole('button', { name: /create deal/i }).click();
    await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should switch between Buyers and Sellers tabs', async ({ page }) => {
    // Click Sellers tab
    await page.getByRole('tab', { name: /sellers/i }).click();
    await expect(page.getByRole('tab', { name: /sellers/i })).toHaveAttribute('aria-selected', 'true');

    // Click Buyers tab
    await page.getByRole('tab', { name: /buyers/i }).click();
    await expect(page.getByRole('tab', { name: /buyers/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('should view deal details', async ({ page }) => {
    // Look for a deal card and click it
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    
    if (await dealCard.count() > 0) {
      await dealCard.click();
      // Should show deal detail sheet
      await expect(page.getByRole('heading')).toBeVisible();
    }
  });
});
