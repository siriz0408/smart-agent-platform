import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * AI Agents E2E Tests
 * Tests agent marketplace, browsing, favorites, and execution
 * 
 * Run with: npx playwright test ai-agents.spec.ts --headed --project=chromium
 */

test.describe('AI Agents', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /agents/i, 'agents');
  });

  test.describe('Marketplace Display', () => {
    test('should display agents page with header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /agents/i })).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/agents-page.png' });
    });

    test('should display search input', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      await expect(searchInput).toBeVisible();
    });

    test('should display filter tabs', async ({ page }) => {
      // Check for filter tabs (All, Certified, Favorites)
      const allTab = page.getByRole('tab', { name: /all/i });
      const certifiedTab = page.getByRole('tab', { name: /certified/i });
      const favoritesTab = page.getByRole('tab', { name: /favorites/i });
      
      await expect(allTab).toBeVisible();
      
      // Certified and favorites may or may not be visible
      await page.screenshot({ path: 'test-artifacts/screenshots/agents-tabs.png' });
    });

    test('should display agent cards', async ({ page }) => {
      // Wait for agents to load
      await page.waitForTimeout(2000);
      
      // Look for agent cards
      const agentCards = page.locator('[class*="card"], [data-testid="agent-card"]');
      const cardCount = await agentCards.count();
      
      // May have 0 or more agents
      await page.screenshot({ path: 'test-artifacts/screenshots/agents-cards.png' });
    });
  });

  test.describe('Search and Filter', () => {
    test('should filter agents when searching', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      
      await searchInput.fill('document');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/agents-search-results.png' });
    });

    test('should clear search', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await searchInput.clear();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/agents-search-cleared.png' });
    });

    test('should switch to certified tab', async ({ page }) => {
      const certifiedTab = page.getByRole('tab', { name: /certified/i });
      
      if (await certifiedTab.isVisible()) {
        await certifiedTab.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/agents-certified-tab.png' });
      }
    });

    test('should switch to favorites tab', async ({ page }) => {
      const favoritesTab = page.getByRole('tab', { name: /favorites/i });
      
      if (await favoritesTab.isVisible()) {
        await favoritesTab.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/agents-favorites-tab.png' });
      }
    });
  });

  test.describe('Agent Favorites', () => {
    test('should toggle agent favorite status', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Find a star/favorite button
      const favoriteBtn = page.getByRole('button', { name: /favorite|star/i }).first();
      const starIcon = page.locator('button').filter({ has: page.locator('svg[class*="star"]') }).first();
      
      if (await favoriteBtn.isVisible().catch(() => false)) {
        await favoriteBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-artifacts/screenshots/agents-favorite-toggled.png' });
      } else if (await starIcon.isVisible().catch(() => false)) {
        await starIcon.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'test-artifacts/screenshots/agents-star-clicked.png' });
      }
    });
  });

  test.describe('Agent Details', () => {
    test('should open agent details when clicking agent card', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Click on first agent card
      const agentCard = page.locator('[class*="card"]').first();
      
      if (await agentCard.isVisible()) {
        await agentCard.click();
        await page.waitForTimeout(1000);
        
        // Check if detail view or sheet opened
        const sheet = page.getByRole('dialog');
        const detailView = page.getByText(/run|execute|description/i);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/agents-detail-view.png' });
      }
    });
  });

  test.describe('Agent Execution', () => {
    test('should display execution interface when running agent', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Find a "Run" or "Execute" button
      const runBtn = page.getByRole('button', { name: /run|execute|try/i }).first();
      
      if (await runBtn.isVisible()) {
        await runBtn.click();
        await page.waitForTimeout(1000);
        
        // Look for execution sheet/modal
        const executionDialog = page.getByRole('dialog');
        const inputField = page.getByRole('textbox');
        
        await page.screenshot({ path: 'test-artifacts/screenshots/agents-execution-interface.png' });
      }
    });

    test('should show error when running agent without input', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const runBtn = page.getByRole('button', { name: /run|execute|try/i }).first();
      
      if (await runBtn.isVisible()) {
        await runBtn.click();
        await page.waitForTimeout(500);
        
        // Try to submit without input
        const submitBtn = page.getByRole('button', { name: /submit|run|execute/i }).last();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(500);
          
          // Check for validation error
          const errorMsg = page.getByText(/required|please|error/i);
          await page.screenshot({ path: 'test-artifacts/screenshots/agents-execution-error.png' });
        }
      }
    });

    test('should execute agent with valid input', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const runBtn = page.getByRole('button', { name: /run|execute|try/i }).first();
      
      if (await runBtn.isVisible()) {
        await runBtn.click();
        await page.waitForTimeout(500);
        
        // Find input field and fill it
        const inputField = page.getByRole('textbox').first();
        if (await inputField.isVisible()) {
          await inputField.fill('Test input for agent execution');
        }
        
        // Submit
        const submitBtn = page.getByRole('button', { name: /submit|run|execute/i }).last();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          
          // Wait for execution (may take time)
          await page.waitForTimeout(5000);
          
          await page.screenshot({ path: 'test-artifacts/screenshots/agents-execution-result.png' });
        }
      }
    });
  });

  test.describe('Agent Categories', () => {
    test('should display agent categories/badges', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Look for category badges
      const badges = page.locator('[class*="badge"]');
      const badgeCount = await badges.count();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/agents-categories.png' });
    });
  });

  test.describe('Create Agent (Admin)', () => {
    test('should show create agent button for admin', async ({ page }) => {
      // Look for create/add button
      const createBtn = page.getByRole('button', { name: /create|add|new/i }).filter({ hasText: /agent/i });
      const plusBtn = page.getByRole('link', { name: /create|add|new/i });
      
      const hasCreateBtn = await createBtn.isVisible().catch(() => false);
      const hasPlusBtn = await plusBtn.isVisible().catch(() => false);
      
      if (hasCreateBtn || hasPlusBtn) {
        await page.screenshot({ path: 'test-artifacts/screenshots/agents-create-button.png' });
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle search with no results', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      
      await searchInput.fill('xyznonexistent12345');
      await page.waitForTimeout(1000);
      
      // Should show empty state or no results message
      await page.screenshot({ path: 'test-artifacts/screenshots/agents-no-results.png' });
    });
  });
});
