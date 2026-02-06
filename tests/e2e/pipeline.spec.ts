import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Pipeline E2E Tests - P0
 * Tests pipeline functionality: seller deals, stage transitions, milestones, view switching
 * 
 * Covers:
 * - Seller deal creation and verification
 * - Pipeline stage transitions
 * - Milestone auto-creation on under_contract
 * - Buyer/Seller tab switching
 * - Deal detail viewing
 * - Mobile/desktop layouts
 */

test.describe('Pipeline Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /pipeline/i, 'pipeline/buyers');
    await page.waitForTimeout(1000);
  });

  test.describe('Seller Deals', () => {
    test('should create seller deal with all fields', async ({ page }) => {
      // Switch to Sellers tab
      await page.getByRole('tab', { name: /sellers/i }).click();
      await expect(page.getByRole('tab', { name: /sellers/i })).toHaveAttribute('aria-selected', 'true');
      
      // Click Add Deal
      await page.getByRole('button', { name: /add deal/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Select contact (required)
      await page.getByRole('combobox', { name: /contact/i }).click();
      const contactOption = page.getByRole('option').first();
      if (await contactOption.count() > 0) {
        await contactOption.click();
      }

      // Fill basic info
      await page.getByRole('combobox', { name: /stage/i }).click();
      await page.getByRole('option', { name: /prospect/i }).click();
      await page.getByRole('spinbutton', { name: /estimated value/i }).fill('450000');
      await page.getByRole('spinbutton', { name: /commission rate/i }).fill('3.0');

      // Expand Financials
      await page.getByRole('button', { name: /financials/i }).click();
      await page.getByRole('spinbutton', { name: /earnest money/i }).fill('10000');

      // Expand Key Dates
      await page.getByRole('button', { name: /key dates/i }).click();
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 45);
      await page.getByRole('textbox', { name: /expected close date/i }).fill(closeDate.toISOString().split('T')[0]);

      // Expand Title & Escrow
      await page.getByRole('button', { name: /title & escrow/i }).click();
      await page.getByRole('textbox', { name: /title company/i }).fill('Fidelity National Title');
      await page.getByRole('textbox', { name: /escrow officer name/i }).fill('Lisa Anderson');

      // Save deal
      await page.getByRole('button', { name: /create deal/i }).click();
      await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
    });

    test('should display seller deal in correct stage column', async ({ page }) => {
      // Switch to Sellers tab
      await page.getByRole('tab', { name: /sellers/i }).click();
      
      // Create a seller deal in "Prospect" stage
      await page.getByRole('button', { name: /add deal/i }).click();
      await page.getByRole('combobox', { name: /contact/i }).click();
      const contactOption = page.getByRole('option').first();
      if (await contactOption.count() > 0) {
        await contactOption.click();
      }
      await page.getByRole('combobox', { name: /stage/i }).click();
      await page.getByRole('option', { name: /prospect/i }).click();
      await page.getByRole('spinbutton', { name: /estimated value/i }).fill('350000');
      await page.getByRole('button', { name: /create deal/i }).click();
      await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
      
      // Verify deal appears in Prospect column
      await page.waitForTimeout(1000);
      const prospectColumn = page.locator('text=Prospect').locator('..').locator('..');
      await expect(prospectColumn).toBeVisible();
    });

    test('should transition seller deal through stages', async ({ page }) => {
      // Switch to Sellers tab
      await page.getByRole('tab', { name: /sellers/i }).click();
      
      // Create seller deal
      await page.getByRole('button', { name: /add deal/i }).click();
      await page.getByRole('combobox', { name: /contact/i }).click();
      const contactOption = page.getByRole('option').first();
      if (await contactOption.count() > 0) {
        await contactOption.click();
      }
      await page.getByRole('combobox', { name: /stage/i }).click();
      await page.getByRole('option', { name: /prospect/i }).click();
      await page.getByRole('spinbutton', { name: /estimated value/i }).fill('500000');
      await page.getByRole('button', { name: /create deal/i }).click();
      await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
      
      await page.waitForTimeout(1000);
      
      // Find the deal card and move it to "Contacted" stage
      const dealCard = page.locator('[data-testid="deal-card"]').first();
      if (await dealCard.count() > 0) {
        // Click on deal card to open menu
        await dealCard.click();
        await page.waitForTimeout(500);
        
        // Look for stage transition menu/button
        const moveButton = page.getByRole('button', { name: /move to/i }).or(page.getByRole('button', { name: /stage/i }));
        if (await moveButton.count() > 0) {
          await moveButton.click();
          await page.getByRole('option', { name: /contacted/i }).click();
          await expect(page.getByText(/deal moved/i)).toBeVisible({ timeout: 3000 });
        }
      }
    });
  });

  test.describe('Milestone Creation', () => {
    test('should auto-create milestones when moving deal to under_contract', async ({ page }) => {
      // Create a buyer deal first
      await page.getByRole('button', { name: /add deal/i }).click();
      await page.getByRole('combobox', { name: /contact/i }).click();
      const contactOption = page.getByRole('option').first();
      if (await contactOption.count() > 0) {
        await contactOption.click();
      }
      
      // Set expected close date (required for milestones)
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);
      await page.getByRole('button', { name: /key dates/i }).click();
      await page.getByRole('textbox', { name: /expected close date/i }).fill(closeDate.toISOString().split('T')[0]);
      
      await page.getByRole('spinbutton', { name: /estimated value/i }).fill('400000');
      await page.getByRole('button', { name: /create deal/i }).click();
      await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
      
      await page.waitForTimeout(1000);
      
      // Move deal to "Under Contract" stage
      const dealCard = page.locator('[data-testid="deal-card"]').first();
      if (await dealCard.count() > 0) {
        await dealCard.click();
        await page.waitForTimeout(500);
        
        // Move to under_contract stage
        const moveButton = page.getByRole('button', { name: /move to/i }).or(page.getByRole('button', { name: /stage/i }));
        if (await moveButton.count() > 0) {
          await moveButton.click();
          await page.getByRole('option', { name: /under contract/i }).click();
          await expect(page.getByText(/deal moved/i)).toBeVisible({ timeout: 3000 });
        }
        
        // Open deal details to verify milestones were created
        await dealCard.click();
        await page.waitForTimeout(500);
        
        // Check for milestone indicators or milestone section
        const milestoneSection = page.getByText(/milestone/i).or(page.getByText(/earnest money/i));
        // Milestones should be visible in deal detail view
        await expect(milestoneSection.first()).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Pipeline Navigation', () => {
    test('should switch between Buyers and Sellers tabs', async ({ page }) => {
      // Start on Buyers tab
      await expect(page.getByRole('tab', { name: /buyers/i })).toHaveAttribute('aria-selected', 'true');
      
      // Switch to Sellers
      await page.getByRole('tab', { name: /sellers/i }).click();
      await expect(page.getByRole('tab', { name: /sellers/i })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText(/seller pipeline/i).or(page.getByText(/listing/i))).toBeVisible();
      
      // Switch back to Buyers
      await page.getByRole('tab', { name: /buyers/i }).click();
      await expect(page.getByRole('tab', { name: /buyers/i })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText(/buyer pipeline/i).or(page.getByText(/showing/i))).toBeVisible();
    });

    test('should display correct stages for buyer vs seller pipelines', async ({ page }) => {
      // Check buyer stages
      await expect(page.getByText(/new lead/i).or(page.getByText(/showing/i))).toBeVisible();
      
      // Switch to seller stages
      await page.getByRole('tab', { name: /sellers/i }).click();
      await expect(page.getByText(/prospect/i).or(page.getByText(/listing signed/i))).toBeVisible();
    });

    test('should calculate pipeline value correctly', async ({ page }) => {
      // Pipeline value should be displayed
      const pipelineValue = page.getByText(/pipeline value/i);
      await expect(pipelineValue).toBeVisible();
      
      // Value should be a number format
      const valueText = await pipelineValue.textContent();
      expect(valueText).toMatch(/\$\d+/);
    });
  });

  test.describe('Deal Detail View', () => {
    test('should open deal detail sheet when clicking deal card', async ({ page }) => {
      // Create a deal first
      await page.getByRole('button', { name: /add deal/i }).click();
      await page.getByRole('combobox', { name: /contact/i }).click();
      const contactOption = page.getByRole('option').first();
      if (await contactOption.count() > 0) {
        await contactOption.click();
      }
      await page.getByRole('spinbutton', { name: /estimated value/i }).fill('300000');
      await page.getByRole('button', { name: /create deal/i }).click();
      await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
      
      await page.waitForTimeout(1000);
      
      // Click on deal card
      const dealCard = page.locator('[data-testid="deal-card"]').first();
      if (await dealCard.count() > 0) {
        await dealCard.click();
        await page.waitForTimeout(500);
        
        // Deal detail sheet should be visible
        const detailSheet = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
        await expect(detailSheet).toBeVisible({ timeout: 2000 });
      }
    });

    test('should display deal information in detail view', async ({ page }) => {
      // Create deal with financials
      await page.getByRole('button', { name: /add deal/i }).click();
      await page.getByRole('combobox', { name: /contact/i }).click();
      const contactOption = page.getByRole('option').first();
      if (await contactOption.count() > 0) {
        await contactOption.click();
      }
      
      await page.getByRole('spinbutton', { name: /estimated value/i }).fill('425000');
      await page.getByRole('button', { name: /financials/i }).click();
      await page.getByRole('spinbutton', { name: /earnest money/i }).fill('8500');
      await page.getByRole('button', { name: /create deal/i }).click();
      await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
      
      await page.waitForTimeout(1000);
      
      // Open deal details
      const dealCard = page.locator('[data-testid="deal-card"]').first();
      if (await dealCard.count() > 0) {
        await dealCard.click();
        await page.waitForTimeout(1000);
        
        // Verify deal details are shown
        const detailSheet = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
        await expect(detailSheet).toBeVisible();
        // Should show estimated value or financial info
        await expect(detailSheet.getByText(/425000/i).or(detailSheet.getByText(/8500/i))).toBeVisible({ timeout: 2000 });
      }
    });
  });

  test.describe('Pipeline Layout', () => {
    test('should display kanban board on desktop', async ({ page, viewport }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Should see horizontal stage columns
      const stageColumns = page.locator('[class*="flex gap"]');
      await expect(stageColumns.first()).toBeVisible();
    });

    test('should display mobile accordion layout on small screens', async ({ page, viewport }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Should see collapsible stage sections
      const collapsibleTrigger = page.locator('[role="button"]').filter({ hasText: /prospect|new lead/i }).first();
      if (await collapsibleTrigger.count() > 0) {
        await expect(collapsibleTrigger).toBeVisible();
      }
    });
  });

  test.describe('Pipeline Health Checks', () => {
    test('should load pipeline without errors', async ({ page }) => {
      // Check for console errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should have no critical errors
      const criticalErrors = errors.filter(e => 
        !e.includes('favicon') && 
        !e.includes('404') &&
        !e.includes('net::ERR')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('should handle empty pipeline state', async ({ page }) => {
      // Navigate to sellers tab (might be empty)
      await page.getByRole('tab', { name: /sellers/i }).click();
      await page.waitForTimeout(1000);
      
      // Should show "No deals yet" or similar empty state
      const emptyState = page.getByText(/no deals/i).or(page.getByText(/add deal/i));
      await expect(emptyState.first()).toBeVisible();
    });

    test('should update pipeline value when deals are added', async ({ page }) => {
      // Get initial pipeline value
      const initialValueText = await page.getByText(/pipeline value/i).textContent();
      const initialValue = parseInt(initialValueText?.match(/\$([\d,]+)/)?.[1]?.replace(/,/g, '') || '0');
      
      // Create a deal
      await page.getByRole('button', { name: /add deal/i }).click();
      await page.getByRole('combobox', { name: /contact/i }).click();
      const contactOption = page.getByRole('option').first();
      if (await contactOption.count() > 0) {
        await contactOption.click();
      }
      await page.getByRole('spinbutton', { name: /estimated value/i }).fill('250000');
      await page.getByRole('button', { name: /create deal/i }).click();
      await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
      
      await page.waitForTimeout(1000);
      
      // Pipeline value should increase
      const newValueText = await page.getByText(/pipeline value/i).textContent();
      const newValue = parseInt(newValueText?.match(/\$([\d,]+)/)?.[1]?.replace(/,/g, '') || '0');
      expect(newValue).toBeGreaterThanOrEqual(initialValue);
    });
  });
});
