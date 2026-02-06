import { test, expect } from '@playwright/test';
import { login } from './fixtures/helpers';

/**
 * Admin Agents Delete Test - Super Admin Only
 * Tests the delete functionality for AI agents
 */

test.describe('Admin Agents Delete', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show delete option in dropdown for super admin on admin agents page', async ({ page }) => {
    // Navigate to admin agents page
    await page.goto('/admin/agents');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible({ timeout: 10000 });

    // Check if there are any agents in the list
    const agentRows = page.locator('table tbody tr');
    const rowCount = await agentRows.count();

    if (rowCount > 0) {
      // Click the first agent's action menu
      const firstActionButton = page.locator('table tbody tr').first().getByRole('button', { name: /agent actions/i });
      await firstActionButton.click();

      // Check for delete option in dropdown (super admin only)
      const deleteOption = page.getByRole('menuitem', { name: /delete agent/i });
      
      // The delete option should be visible for super admin
      await expect(deleteOption).toBeVisible({ timeout: 5000 });
      
      // Close dropdown without clicking delete
      await page.keyboard.press('Escape');
    }
  });

  test('should show danger zone section in agent edit page for super admin', async ({ page }) => {
    // Navigate to admin agents page
    await page.goto('/admin/agents');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible({ timeout: 10000 });

    // Check if there are any agents in the list
    const agentRows = page.locator('table tbody tr');
    const rowCount = await agentRows.count();

    if (rowCount > 0) {
      // Click the first agent's action menu
      const firstActionButton = page.locator('table tbody tr').first().getByRole('button', { name: /agent actions/i });
      await firstActionButton.click();

      // Click edit
      const editOption = page.getByRole('menuitem', { name: /edit agent/i });
      await editOption.click();

      // Wait for edit page to load (use first h1 to avoid strict mode violation)
      await expect(page.locator('h1').filter({ hasText: /edit agent/i })).toBeVisible({ timeout: 10000 });

      // Check for danger zone section (super admin only)
      const dangerZone = page.getByText(/danger zone/i);
      await expect(dangerZone).toBeVisible({ timeout: 5000 });

      // Check for delete button
      const deleteButton = page.getByRole('button', { name: /delete/i });
      await expect(deleteButton).toBeVisible();
    }
  });

  test('should show delete confirmation dialog when clicking delete', async ({ page }) => {
    // Navigate directly to admin agent edit page (assumes at least one agent exists)
    await page.goto('/admin/agents');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: /ai agents/i })).toBeVisible({ timeout: 10000 });

    const agentRows = page.locator('table tbody tr');
    const rowCount = await agentRows.count();

    if (rowCount > 0) {
      // Click the first agent's action menu
      const firstActionButton = page.locator('table tbody tr').first().getByRole('button', { name: /agent actions/i });
      await firstActionButton.click();

      // Click delete option
      const deleteOption = page.getByRole('menuitem', { name: /delete agent/i });
      await deleteOption.click();

      // Check for confirmation dialog
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();
      
      // Check for cancel and delete buttons in dialog
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^delete$/i })).toBeVisible();

      // Cancel the dialog
      await page.getByRole('button', { name: /cancel/i }).click();
      
      // Dialog should be closed
      await expect(page.getByRole('alertdialog')).not.toBeVisible();
    }
  });
});
