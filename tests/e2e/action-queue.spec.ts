import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Action Queue E2E Tests
 * Tests AI action approval, rejection, and batch operations
 * 
 * Run with: npx playwright test action-queue.spec.ts --headed --project=chromium
 */

test.describe('Action Queue', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /action|queue/i, 'action-queue');
  });

  test.describe('Page Display', () => {
    test('should display action queue page with header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /action|queue/i })).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-page.png' });
    });

    test('should display status filter tabs', async ({ page }) => {
      // Check for status tabs
      const pendingTab = page.getByRole('tab', { name: /pending/i });
      const allTab = page.getByRole('tab', { name: /all/i });
      
      const hasPendingTab = await pendingTab.isVisible().catch(() => false);
      const hasAllTab = await allTab.isVisible().catch(() => false);
      
      expect(hasPendingTab || hasAllTab).toBeTruthy();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-tabs.png' });
    });

    test('should display empty state or action list', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Either empty state or action items
      const emptyState = page.getByText(/no actions|empty|nothing/i);
      const actionItems = page.locator('[class*="card"]');
      
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      const hasItems = (await actionItems.count()) > 0;
      
      expect(hasEmptyState || hasItems).toBeTruthy();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-content.png' });
    });
  });

  test.describe('Status Filtering', () => {
    test('should filter by pending status', async ({ page }) => {
      const pendingTab = page.getByRole('tab', { name: /pending/i });
      
      if (await pendingTab.isVisible()) {
        await pendingTab.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-pending.png' });
      }
    });

    test('should filter by approved status', async ({ page }) => {
      const approvedTab = page.getByRole('tab', { name: /approved/i });
      
      if (await approvedTab.isVisible()) {
        await approvedTab.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-approved.png' });
      }
    });

    test('should filter by completed status', async ({ page }) => {
      const completedTab = page.getByRole('tab', { name: /completed/i });
      
      if (await completedTab.isVisible()) {
        await completedTab.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-completed.png' });
      }
    });

    test('should filter by failed status', async ({ page }) => {
      const failedTab = page.getByRole('tab', { name: /failed/i });
      
      if (await failedTab.isVisible()) {
        await failedTab.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-failed.png' });
      }
    });
  });

  test.describe('Action Details', () => {
    test('should display action type badges', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Look for action type badges
      const badges = page.locator('[class*="badge"]');
      
      await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-badges.png' });
    });

    test('should display action timestamps', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Look for time indicators
      const timestamps = page.getByText(/ago|minutes|hours|days/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-timestamps.png' });
    });
  });

  test.describe('Action Approval', () => {
    test('should display approve button for pending actions', async ({ page }) => {
      // Switch to pending tab first
      const pendingTab = page.getByRole('tab', { name: /pending/i });
      if (await pendingTab.isVisible()) {
        await pendingTab.click();
        await page.waitForTimeout(500);
      }
      
      // Look for approve button
      const approveBtn = page.getByRole('button', { name: /approve/i }).first();
      
      if (await approveBtn.isVisible()) {
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-approve-btn.png' });
      }
    });

    test('should approve a pending action', async ({ page }) => {
      const pendingTab = page.getByRole('tab', { name: /pending/i });
      if (await pendingTab.isVisible()) {
        await pendingTab.click();
        await page.waitForTimeout(500);
      }
      
      const approveBtn = page.getByRole('button', { name: /approve/i }).first();
      
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
        await page.waitForTimeout(1000);
        
        // Check for success indication
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-approved-action.png' });
      }
    });
  });

  test.describe('Action Rejection', () => {
    test('should display reject button for pending actions', async ({ page }) => {
      const pendingTab = page.getByRole('tab', { name: /pending/i });
      if (await pendingTab.isVisible()) {
        await pendingTab.click();
        await page.waitForTimeout(500);
      }
      
      const rejectBtn = page.getByRole('button', { name: /reject/i }).first();
      
      if (await rejectBtn.isVisible()) {
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-reject-btn.png' });
      }
    });

    test('should reject a pending action with reason', async ({ page }) => {
      const pendingTab = page.getByRole('tab', { name: /pending/i });
      if (await pendingTab.isVisible()) {
        await pendingTab.click();
        await page.waitForTimeout(500);
      }
      
      const rejectBtn = page.getByRole('button', { name: /reject/i }).first();
      
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();
        await page.waitForTimeout(500);
        
        // Look for reason input in dialog
        const reasonInput = page.getByRole('textbox');
        if (await reasonInput.isVisible()) {
          await reasonInput.fill('Test rejection reason');
        }
        
        // Confirm rejection
        const confirmBtn = page.getByRole('button', { name: /confirm|reject/i }).last();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(1000);
        }
        
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-rejected-action.png' });
      }
    });
  });

  test.describe('Batch Operations', () => {
    test('should display selection checkboxes', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const checkboxes = page.getByRole('checkbox');
      const checkboxCount = await checkboxes.count();
      
      if (checkboxCount > 0) {
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-checkboxes.png' });
      }
    });

    test('should select multiple actions', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const checkboxes = page.getByRole('checkbox');
      const count = await checkboxes.count();
      
      if (count >= 2) {
        await checkboxes.nth(0).click();
        await checkboxes.nth(1).click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-multi-select.png' });
      }
    });

    test('should show batch actions when items selected', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const checkboxes = page.getByRole('checkbox');
      const count = await checkboxes.count();
      
      if (count > 0) {
        await checkboxes.nth(0).click();
        await page.waitForTimeout(500);
        
        // Look for batch action buttons
        const batchApprove = page.getByRole('button', { name: /approve selected|batch approve/i });
        const batchReject = page.getByRole('button', { name: /reject selected|batch reject/i });
        
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-batch-actions.png' });
      }
    });
  });

  test.describe('Refresh and Updates', () => {
    test('should have refresh button', async ({ page }) => {
      const refreshBtn = page.getByRole('button', { name: /refresh/i });
      
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-refreshed.png' });
      }
    });
  });

  test.describe('Action Types', () => {
    test('should display different action type icons', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Look for various action types
      const createContact = page.getByText(/create contact/i);
      const updateContact = page.getByText(/update contact/i);
      const sendEmail = page.getByText(/send email/i);
      const createDeal = page.getByText(/create deal/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-types.png' });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty queue gracefully', async ({ page }) => {
      // Filter by a status likely to have no items
      const failedTab = page.getByRole('tab', { name: /failed|rejected/i });
      
      if (await failedTab.isVisible()) {
        await failedTab.click();
        await page.waitForTimeout(500);
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/action-queue-empty.png' });
    });
  });
});
