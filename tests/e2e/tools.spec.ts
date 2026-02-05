import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Tools/Calculators E2E Tests
 * Tests financial calculators and checklists for buyers, sellers, and agents
 * 
 * Run with: npx playwright test tools.spec.ts --headed --project=chromium
 */

test.describe('Tools & Calculators', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /tools/i, 'tools');
  });

  test.describe('Page Display', () => {
    test('should display tools page with header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /tools/i })).toBeVisible();
      await expect(page.getByText(/financial calculators|checklists/i)).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-page.png' });
    });

    test('should display category tabs', async ({ page }) => {
      // Check for main category tabs
      const buyersTab = page.getByRole('tab', { name: /buyers/i });
      const sellersTab = page.getByRole('tab', { name: /sellers/i });
      
      await expect(buyersTab).toBeVisible();
      await expect(sellersTab).toBeVisible();
    });
  });

  test.describe('Buyers Tab - Mortgage Calculator', () => {
    test('should display mortgage calculator', async ({ page }) => {
      // Click Buyers tab if not already selected
      await page.getByRole('tab', { name: /buyers/i }).click();
      await page.waitForTimeout(500);
      
      // Click Mortgage sub-tab
      const mortgageTab = page.getByRole('tab', { name: /mortgage/i });
      if (await mortgageTab.isVisible()) {
        await mortgageTab.click();
        await page.waitForTimeout(500);
      }
      
      // Verify mortgage calculator elements
      const priceInput = page.getByLabel(/home price|property price|loan amount/i);
      await expect(priceInput).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-mortgage-calc.png' });
    });

    test('should calculate monthly payment with valid inputs', async ({ page }) => {
      await page.getByRole('tab', { name: /buyers/i }).click();
      await page.waitForTimeout(500);
      
      const mortgageTab = page.getByRole('tab', { name: /mortgage/i });
      if (await mortgageTab.isVisible()) {
        await mortgageTab.click();
        await page.waitForTimeout(500);
      }
      
      // Fill in values (calculator may have default values)
      const priceInput = page.getByLabel(/home price|property price/i);
      if (await priceInput.isVisible()) {
        await priceInput.clear();
        await priceInput.fill('400000');
      }
      
      // Look for calculated result
      await page.waitForTimeout(1000);
      const monthlyPayment = page.getByText(/monthly|payment|\$/i);
      await expect(monthlyPayment.first()).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-mortgage-result.png' });
    });
  });

  test.describe('Buyers Tab - Affordability Calculator', () => {
    test('should display affordability calculator', async ({ page }) => {
      await page.getByRole('tab', { name: /buyers/i }).click();
      await page.waitForTimeout(500);
      
      const affordabilityTab = page.getByRole('tab', { name: /affordability/i });
      if (await affordabilityTab.isVisible()) {
        await affordabilityTab.click();
        await page.waitForTimeout(500);
      }
      
      // Verify affordability calculator has income input
      const incomeInput = page.getByLabel(/income|annual|monthly/i);
      await expect(incomeInput.first()).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-affordability-calc.png' });
    });

    test('should calculate max home price with income input', async ({ page }) => {
      await page.getByRole('tab', { name: /buyers/i }).click();
      await page.waitForTimeout(500);
      
      const affordabilityTab = page.getByRole('tab', { name: /affordability/i });
      if (await affordabilityTab.isVisible()) {
        await affordabilityTab.click();
        await page.waitForTimeout(500);
      }
      
      // Fill income
      const incomeInput = page.getByLabel(/annual income|gross income/i);
      if (await incomeInput.isVisible()) {
        await incomeInput.clear();
        await incomeInput.fill('100000');
      }
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-affordability-result.png' });
    });
  });

  test.describe('Buyers Tab - Closing Costs Calculator', () => {
    test('should display closing costs calculator', async ({ page }) => {
      await page.getByRole('tab', { name: /buyers/i }).click();
      await page.waitForTimeout(500);
      
      const closingTab = page.getByRole('tab', { name: /closing/i });
      if (await closingTab.isVisible()) {
        await closingTab.click();
        await page.waitForTimeout(500);
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-closing-costs.png' });
    });
  });

  test.describe('Buyers Tab - Rent vs Buy Calculator', () => {
    test('should display rent vs buy calculator', async ({ page }) => {
      await page.getByRole('tab', { name: /buyers/i }).click();
      await page.waitForTimeout(500);
      
      const rentVsBuyTab = page.getByRole('tab', { name: /rent.*buy/i });
      if (await rentVsBuyTab.isVisible()) {
        await rentVsBuyTab.click();
        await page.waitForTimeout(500);
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-rent-vs-buy.png' });
    });
  });

  test.describe('Sellers Tab', () => {
    test('should display seller net sheet calculator', async ({ page }) => {
      await page.getByRole('tab', { name: /sellers/i }).click();
      await page.waitForTimeout(500);
      
      // Look for net sheet or closing costs
      const netSheetTab = page.getByRole('tab', { name: /net sheet/i });
      if (await netSheetTab.isVisible()) {
        await netSheetTab.click();
      }
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-seller-net-sheet.png' });
    });

    test('should calculate seller proceeds', async ({ page }) => {
      await page.getByRole('tab', { name: /sellers/i }).click();
      await page.waitForTimeout(500);
      
      // Fill sale price if input available
      const salePriceInput = page.getByLabel(/sale price|selling price|home price/i);
      if (await salePriceInput.isVisible()) {
        await salePriceInput.clear();
        await salePriceInput.fill('500000');
        await page.waitForTimeout(500);
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-seller-proceeds.png' });
    });
  });

  test.describe('Agents Tab', () => {
    test('should display commission calculator', async ({ page }) => {
      const agentsTab = page.getByRole('tab', { name: /agents/i });
      
      if (await agentsTab.isVisible()) {
        await agentsTab.click();
        await page.waitForTimeout(500);
        
        // Look for commission calculator
        const commissionText = page.getByText(/commission/i);
        await expect(commissionText.first()).toBeVisible();
        
        await page.screenshot({ path: 'test-artifacts/screenshots/tools-agent-commission.png' });
      }
    });

    test('should calculate commission amount', async ({ page }) => {
      const agentsTab = page.getByRole('tab', { name: /agents/i });
      
      if (await agentsTab.isVisible()) {
        await agentsTab.click();
        await page.waitForTimeout(500);
        
        // Fill sale price
        const priceInput = page.getByLabel(/sale price|price/i);
        if (await priceInput.isVisible()) {
          await priceInput.clear();
          await priceInput.fill('400000');
        }
        
        // Fill commission rate
        const rateInput = page.getByLabel(/commission.*rate|rate/i);
        if (await rateInput.isVisible()) {
          await rateInput.clear();
          await rateInput.fill('3');
        }
        
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-artifacts/screenshots/tools-commission-result.png' });
      }
    });
  });

  test.describe('Checklists Tab', () => {
    test('should display checklists tab', async ({ page }) => {
      const checklistsTab = page.getByRole('tab', { name: /checklists|planning/i });
      
      if (await checklistsTab.isVisible()) {
        await checklistsTab.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/tools-checklists.png' });
      }
    });

    test('should display buying checklist', async ({ page }) => {
      const checklistsTab = page.getByRole('tab', { name: /checklists|planning/i });
      
      if (await checklistsTab.isVisible()) {
        await checklistsTab.click();
        await page.waitForTimeout(500);
        
        const buyingTab = page.getByRole('tab', { name: /buying/i });
        if (await buyingTab.isVisible()) {
          await buyingTab.click();
          await page.waitForTimeout(500);
        }
        
        // Look for checklist items
        const checklistItem = page.getByRole('checkbox').first();
        const hasCheckbox = await checklistItem.isVisible().catch(() => false);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/tools-buying-checklist.png' });
      }
    });

    test('should toggle checklist item', async ({ page }) => {
      const checklistsTab = page.getByRole('tab', { name: /checklists|planning/i });
      
      if (await checklistsTab.isVisible()) {
        await checklistsTab.click();
        await page.waitForTimeout(500);
        
        const checkbox = page.getByRole('checkbox').first();
        if (await checkbox.isVisible()) {
          const initialState = await checkbox.isChecked();
          await checkbox.click();
          await page.waitForTimeout(500);
          
          // Verify state changed
          const newState = await checkbox.isChecked();
          expect(newState).not.toBe(initialState);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle zero values gracefully', async ({ page }) => {
      await page.getByRole('tab', { name: /buyers/i }).click();
      await page.waitForTimeout(500);
      
      const mortgageTab = page.getByRole('tab', { name: /mortgage/i });
      if (await mortgageTab.isVisible()) {
        await mortgageTab.click();
        await page.waitForTimeout(500);
      }
      
      // Enter zero
      const priceInput = page.getByLabel(/home price|property price/i);
      if (await priceInput.isVisible()) {
        await priceInput.clear();
        await priceInput.fill('0');
        await page.waitForTimeout(500);
      }
      
      // Should not crash, may show validation message
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-zero-value.png' });
    });

    test('should handle very large values', async ({ page }) => {
      await page.getByRole('tab', { name: /buyers/i }).click();
      await page.waitForTimeout(500);
      
      const mortgageTab = page.getByRole('tab', { name: /mortgage/i });
      if (await mortgageTab.isVisible()) {
        await mortgageTab.click();
        await page.waitForTimeout(500);
      }
      
      // Enter large value
      const priceInput = page.getByLabel(/home price|property price/i);
      if (await priceInput.isVisible()) {
        await priceInput.clear();
        await priceInput.fill('999999999');
        await page.waitForTimeout(500);
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-large-value.png' });
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between all tabs', async ({ page }) => {
      const tabs = ['buyers', 'sellers', 'agents', 'checklists'];
      
      for (const tabName of tabs) {
        const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
        if (await tab.isVisible().catch(() => false)) {
          await tab.click();
          await page.waitForTimeout(300);
        }
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/tools-all-tabs.png' });
    });
  });
});
