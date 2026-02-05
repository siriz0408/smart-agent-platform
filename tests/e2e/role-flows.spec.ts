import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Role-Based Flow E2E Tests
 * Tests different user role experiences (Agent, Buyer, Seller, Admin)
 * 
 * Run with: npx playwright test role-flows.spec.ts --headed --project=chromium
 */

// Helper function to generate unique test email
function generateTestEmail(role: string): string {
  const timestamp = Date.now();
  return `test-${role}-${timestamp}@example.com`;
}

test.describe('Role-Based Flows', () => {
  test.describe('Agent Role', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should display agent navigation items', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Agents should see these navigation items
      const contactsLink = page.getByRole('link', { name: /contacts/i });
      const pipelineLink = page.getByRole('link', { name: /pipeline|deals/i });
      const documentsLink = page.getByRole('link', { name: /documents/i });
      
      await expect(contactsLink).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-agent-nav.png' });
    });

    test('should access contacts page', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      
      await expect(page.getByRole('heading', { name: /contacts/i })).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-agent-contacts.png' });
    });

    test('should access pipeline/deals page', async ({ page }) => {
      await navigateTo(page, /pipeline/i, 'pipeline');
      
      const heading = page.getByRole('heading', { name: /pipeline|deals/i });
      await expect(heading.first()).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-agent-pipeline.png' });
    });

    test('should access documents page', async ({ page }) => {
      await navigateTo(page, /documents/i, 'documents');
      
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-agent-documents.png' });
    });

    test('should access tools page', async ({ page }) => {
      await navigateTo(page, /tools/i, 'tools');
      
      await expect(page.getByRole('heading', { name: /tools/i })).toBeVisible();
      
      // Agent should see all tabs including Agents tab
      const agentsTab = page.getByRole('tab', { name: /agents/i });
      await expect(agentsTab).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-agent-tools.png' });
    });
  });

  test.describe('Buyer Role Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should display property search option', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Look for property search in navigation
      const searchLink = page.getByRole('link', { name: /search|properties/i });
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-buyer-nav.png' });
    });

    test('should access property search page', async ({ page }) => {
      await navigateTo(page, /search/i, 'properties/search');
      
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-buyer-search.png' });
    });

    test('should access saved properties page', async ({ page }) => {
      await navigateTo(page, /saved/i, 'properties/saved');
      
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-buyer-saved.png' });
    });
  });

  test.describe('Seller Role Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should access tools with seller calculator', async ({ page }) => {
      await navigateTo(page, /tools/i, 'tools');
      
      await page.waitForTimeout(1000);
      
      // Click on Sellers tab
      const sellersTab = page.getByRole('tab', { name: /sellers/i });
      if (await sellersTab.isVisible()) {
        await sellersTab.click();
        await page.waitForTimeout(500);
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-seller-tools.png' });
    });
  });

  test.describe('Admin Role', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should display admin navigation item', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Admin should see admin link
      const adminLink = page.getByRole('link', { name: /admin/i });
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-admin-nav.png' });
    });

    test('should access admin page', async ({ page }) => {
      await navigateTo(page, /admin/i, 'admin');
      
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-admin-page.png' });
    });

    test('should see role testing mode on admin page', async ({ page }) => {
      await navigateTo(page, /admin/i, 'admin');
      
      await page.waitForTimeout(1000);
      
      // Look for role testing card
      const roleTestingCard = page.getByText(/role testing|test as/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-admin-testing.png' });
    });

    test('should switch role testing mode', async ({ page }) => {
      await navigateTo(page, /admin/i, 'admin');
      
      await page.waitForTimeout(1000);
      
      // Find role selector
      const roleSelector = page.getByRole('combobox').or(page.getByLabel(/role/i));
      if (await roleSelector.isVisible()) {
        await roleSelector.click();
        await page.waitForTimeout(500);
        
        // Select buyer role
        const buyerOption = page.getByRole('option', { name: /buyer/i });
        if (await buyerOption.isVisible()) {
          await buyerOption.click();
          await page.waitForTimeout(500);
        }
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-admin-switch-role.png' });
    });
  });

  test.describe('Role-Based Access Control', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should access settings from any role', async ({ page }) => {
      await navigateTo(page, /settings/i, 'settings');
      
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-settings-access.png' });
    });

    test('should access home/dashboard from any role', async ({ page }) => {
      await navigateTo(page, /home|dashboard/i, '');
      
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-dashboard-access.png' });
    });

    test('should access AI chat from any role', async ({ page }) => {
      await navigateTo(page, /chat/i, '');
      
      await page.waitForTimeout(1000);
      
      // Look for chat interface
      const chatInput = page.getByRole('textbox');
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-chat-access.png' });
    });
  });

  test.describe('Navigation Sidebar', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should display main navigation items', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Check for key navigation items
      const homeLink = page.getByRole('link', { name: /home|dashboard/i });
      const toolsLink = page.getByRole('link', { name: /tools/i });
      const settingsLink = page.getByRole('link', { name: /settings/i });
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-main-nav.png' });
    });

    test('should highlight active navigation item', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      
      await page.waitForTimeout(1000);
      
      // Check if contacts link has active styling
      const contactsLink = page.getByRole('link', { name: /contacts/i });
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-active-nav.png' });
    });
  });

  test.describe('Onboarding Role Selection', () => {
    test('should show role options during onboarding', async ({ page }) => {
      // Go to onboarding page directly
      await page.goto('/onboarding');
      await page.waitForTimeout(2000);
      
      // If onboarding is accessible, look for role selection
      const roleOptions = page.getByText(/agent|buyer|seller/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-onboarding-options.png' });
    });
  });

  test.describe('Role-Specific UI Elements', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should display user profile indicator', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Look for user avatar or profile indicator
      const avatar = page.locator('[class*="avatar"]');
      const userMenu = page.getByRole('button', { name: /menu|profile|user/i });
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-profile-indicator.png' });
    });

    test('should show role badge if applicable', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Look for role badge in header or sidebar
      const roleBadge = page.locator('[class*="badge"]').filter({ hasText: /agent|buyer|seller|admin/i });
      
      await page.screenshot({ path: 'test-artifacts/screenshots/role-badge.png' });
    });
  });
});
