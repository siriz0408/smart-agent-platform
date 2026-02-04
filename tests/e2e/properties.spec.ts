import { test, expect } from '@playwright/test';
import { login } from './auth.spec';

/**
 * Properties Tests - P0/P1
 * Tests property CRUD with new fields (HOA, schools, parking, etc.)
 */

test.describe('Properties', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /properties/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display properties list', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add property/i })).toBeVisible();
  });

  test('should create property with basic info', async ({ page }) => {
    await page.getByRole('button', { name: /add property/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill required fields
    await page.getByRole('textbox', { name: /street address/i }).fill('123 Test Street');
    await page.getByRole('textbox', { name: /city/i }).fill('Austin');
    
    // Select state
    await page.getByRole('combobox', { name: /state/i }).click();
    await page.getByRole('option', { name: /TX/i }).click();
    
    await page.getByRole('textbox', { name: /zip code/i }).fill('78701');
    await page.getByRole('spinbutton', { name: /price/i }).fill('450000');

    // Save
    await page.getByRole('button', { name: /add property/i }).click();
    await expect(page.getByText(/property created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should create luxury property with HOA - Marcus Persona', async ({ page }) => {
    await page.getByRole('button', { name: /add property/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Basic info
    await page.getByRole('textbox', { name: /street address/i }).fill('5678 Lakefront Estate');
    await page.getByRole('textbox', { name: /city/i }).fill('Austin');
    await page.getByRole('combobox', { name: /state/i }).click();
    await page.getByRole('option', { name: /TX/i }).click();
    await page.getByRole('textbox', { name: /zip code/i }).fill('78746');
    await page.getByRole('spinbutton', { name: /price/i }).fill('2500000');
    await page.getByRole('spinbutton', { name: /beds/i }).fill('5');
    await page.getByRole('spinbutton', { name: /baths/i }).fill('4.5');
    await page.getByRole('spinbutton', { name: /sq ft/i }).fill('6500');

    // HOA & Fees section
    await page.getByRole('button', { name: /hoa & fees/i }).click();
    await page.getByRole('spinbutton', { name: /hoa fee/i }).fill('850');
    await page.getByRole('textbox', { name: /hoa name/i }).fill('Lake Austin Estates HOA');

    // Schools section
    await page.getByRole('button', { name: /schools/i }).click();
    await page.getByRole('textbox', { name: /school district/i }).fill('Lake Travis ISD');
    await page.getByRole('textbox', { name: /elementary school/i }).fill('Lakeway Elementary');

    // Taxes section
    await page.getByRole('button', { name: /taxes/i }).click();
    await page.getByRole('spinbutton', { name: /annual taxes/i }).fill('45000');

    // Save
    await page.getByRole('button', { name: /add property/i }).click();
    await expect(page.getByText(/property created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should create property with parking info', async ({ page }) => {
    await page.getByRole('button', { name: /add property/i }).click();

    // Basic info
    await page.getByRole('textbox', { name: /street address/i }).fill('789 Garage Lane');
    await page.getByRole('textbox', { name: /city/i }).fill('Austin');
    await page.getByRole('combobox', { name: /state/i }).click();
    await page.getByRole('option', { name: /TX/i }).click();
    await page.getByRole('textbox', { name: /zip code/i }).fill('78702');
    await page.getByRole('spinbutton', { name: /price/i }).fill('550000');

    // Parking & HVAC section
    await page.getByRole('button', { name: /parking & hvac/i }).click();
    await page.getByRole('spinbutton', { name: /parking spaces/i }).fill('2');
    await page.getByRole('combobox', { name: /parking type/i }).click();
    await page.getByRole('option', { name: /garage/i }).click();
    await page.getByRole('textbox', { name: /heating type/i }).fill('Central Heat');
    await page.getByRole('textbox', { name: /cooling type/i }).fill('Central A/C');

    await page.getByRole('button', { name: /add property/i }).click();
    await expect(page.getByText(/property created/i)).toBeVisible({ timeout: 5000 });
  });

  test('should view property details', async ({ page }) => {
    // Click on property card or row to open detail
    const propertyCard = page.locator('[data-testid="property-card"]').first();
    
    if (await propertyCard.count() > 0) {
      await propertyCard.click();
      // Should show property detail sheet
      await expect(page.getByRole('heading')).toBeVisible();
    }
  });
});
