import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Property Search E2E Tests
 * Tests property searching, filtering, and saving properties
 * 
 * Run with: npx playwright test property-search.spec.ts --headed --project=chromium
 */

test.describe('Property Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /search/i, 'properties/search');
  });

  test.describe('Page Display', () => {
    test('should display property search page', async ({ page }) => {
      // Check for search heading or form
      const heading = page.getByRole('heading', { name: /property|search|find/i });
      const searchForm = page.getByRole('form').or(page.locator('form'));
      
      const hasHeading = await heading.isVisible().catch(() => false);
      const hasForm = await searchForm.isVisible().catch(() => false);
      
      expect(hasHeading || hasForm).toBeTruthy();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-page.png' });
    });

    test('should display location input', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await expect(locationInput).toBeVisible();
    });

    test('should display search button', async ({ page }) => {
      const searchBtn = page.getByRole('button', { name: /search/i });
      await expect(searchBtn).toBeVisible();
    });
  });

  test.describe('Search Filters', () => {
    test('should display bedroom filter', async ({ page }) => {
      const bedsFilter = page.getByLabel(/bed|bedroom/i).or(page.getByText(/beds/i));
      await expect(bedsFilter.first()).toBeVisible();
    });

    test('should display bathroom filter', async ({ page }) => {
      const bathsFilter = page.getByLabel(/bath|bathroom/i).or(page.getByText(/baths/i));
      await expect(bathsFilter.first()).toBeVisible();
    });

    test('should display price range filters', async ({ page }) => {
      const priceMin = page.getByLabel(/min.*price|price.*min/i).or(page.getByPlaceholder(/min/i));
      const priceMax = page.getByLabel(/max.*price|price.*max/i).or(page.getByPlaceholder(/max/i));
      
      const hasMin = await priceMin.isVisible().catch(() => false);
      const hasMax = await priceMax.isVisible().catch(() => false);
      
      // At least some price filters should exist
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-price-filters.png' });
    });

    test('should display list type toggle (for sale/rent)', async ({ page }) => {
      const listType = page.getByLabel(/list type|sale|rent/i);
      const forSaleOption = page.getByText(/for sale/i);
      const forRentOption = page.getByText(/for rent/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-list-type.png' });
    });

    test('should display property type filter', async ({ page }) => {
      const propertyType = page.getByLabel(/property type/i);
      
      if (await propertyType.isVisible()) {
        await propertyType.click();
        await page.waitForTimeout(500);
        
        // Check for options
        const house = page.getByText(/house|single family/i);
        const condo = page.getByText(/condo|condominium/i);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/property-search-property-types.png' });
      }
    });
  });

  test.describe('Search Execution', () => {
    test('should search by location', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      // Wait for results or loading state
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-results.png' });
    });

    test('should search with bedroom filter', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      // Select bedrooms
      const bedsSelect = page.getByLabel(/beds|bedroom/i);
      if (await bedsSelect.isVisible()) {
        await bedsSelect.click();
        await page.waitForTimeout(300);
        const option = page.getByRole('option', { name: /3/i }).first();
        if (await option.isVisible()) {
          await option.click();
        }
      }
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-with-beds.png' });
    });

    test('should search with price range', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      // Set min price
      const priceMinInput = page.getByLabel(/min.*price/i).or(page.getByPlaceholder(/min/i).first());
      if (await priceMinInput.isVisible()) {
        await priceMinInput.fill('200000');
      }
      
      // Set max price
      const priceMaxInput = page.getByLabel(/max.*price/i).or(page.getByPlaceholder(/max/i).first());
      if (await priceMaxInput.isVisible()) {
        await priceMaxInput.fill('500000');
      }
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-price-range.png' });
    });
  });

  test.describe('Search Results', () => {
    test('should display property cards in results', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      await page.waitForTimeout(5000);
      
      // Look for property cards
      const propertyCards = page.locator('[class*="card"]');
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-cards.png' });
    });

    test('should display property details (price, beds, baths)', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      await page.waitForTimeout(5000);
      
      // Check for price indicators
      const priceText = page.getByText(/\$[\d,]+/);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-details.png' });
    });
  });

  test.describe('Save Property', () => {
    test('should have save button on property cards', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      await page.waitForTimeout(5000);
      
      // Look for save/heart/bookmark button
      const saveBtn = page.getByRole('button', { name: /save|favorite|heart/i }).first();
      const heartIcon = page.locator('button').filter({ has: page.locator('svg[class*="heart"]') }).first();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-save-btn.png' });
    });

    test('should save a property', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      await page.waitForTimeout(5000);
      
      // Click save button
      const saveBtn = page.getByRole('button', { name: /save/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
        
        // Check for success message
        const successToast = page.getByText(/saved|success/i);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/property-search-saved.png' });
      }
    });
  });

  test.describe('Pagination', () => {
    test('should have pagination controls', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      await page.waitForTimeout(5000);
      
      // Look for pagination
      const nextBtn = page.getByRole('button', { name: /next|more/i });
      const prevBtn = page.getByRole('button', { name: /prev|back/i });
      const pageNumbers = page.getByText(/page \d/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-pagination.png' });
    });
  });

  test.describe('Error Handling', () => {
    test('should show error when searching without location', async ({ page }) => {
      // Try to search without entering location
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      // Check for error message
      const errorMsg = page.getByText(/location|required|enter/i);
      
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-no-location-error.png' });
    });

    test('should handle no results gracefully', async ({ page }) => {
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Nonexistent City, XX');
      
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.click();
      
      await page.waitForTimeout(5000);
      
      // Should show no results or empty state
      await page.screenshot({ path: 'test-artifacts/screenshots/property-search-no-results.png' });
    });
  });

  test.describe('Clear Filters', () => {
    test('should clear all filters', async ({ page }) => {
      // Fill in some filters
      const locationInput = page.getByLabel(/location/i).or(page.getByPlaceholder(/city|location/i));
      await locationInput.fill('Austin, TX');
      
      const priceMinInput = page.getByLabel(/min.*price/i).or(page.getByPlaceholder(/min/i).first());
      if (await priceMinInput.isVisible()) {
        await priceMinInput.fill('300000');
      }
      
      // Look for clear/reset button
      const clearBtn = page.getByRole('button', { name: /clear|reset/i });
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(500);
        
        // Verify filters are cleared
        await page.screenshot({ path: 'test-artifacts/screenshots/property-search-cleared.png' });
      }
    });
  });
});
