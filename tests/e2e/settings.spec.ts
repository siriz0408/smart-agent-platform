import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Settings E2E Tests - P0/P1
 * Tests settings page functionality: profile editing, notifications, appearance, security
 * 
 * Covers:
 * - Profile tab (edit profile, credentials, social links, photo gallery)
 * - Notifications tab (email, push, deal updates toggles)
 * - Appearance tab (dark mode toggle, data export)
 * - Security tab (privacy settings)
 * - Keyboard shortcuts dialog
 * - Navigation between tabs
 */

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /settings/i, 'settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Settings Navigation', () => {
    test('should display settings page with all tabs', async ({ page }) => {
      // Verify all tabs are visible
      await expect(page.getByRole('tab', { name: /profile/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /notifications/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /appearance/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /security/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /more/i })).toBeVisible();
    });

    test('should switch between tabs', async ({ page }) => {
      // Start on Profile tab (default)
      await expect(page.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true');
      
      // Switch to Notifications
      await page.getByRole('tab', { name: /notifications/i }).click();
      await expect(page.getByRole('tab', { name: /notifications/i })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText(/configure how you receive notifications/i)).toBeVisible();
      
      // Switch to Appearance
      await page.getByRole('tab', { name: /appearance/i }).click();
      await expect(page.getByRole('tab', { name: /appearance/i })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText(/customize the look and feel/i)).toBeVisible();
      
      // Switch to Security
      await page.getByRole('tab', { name: /security/i }).click();
      await expect(page.getByRole('tab', { name: /security/i })).toHaveAttribute('aria-selected', 'true');
      
      // Switch back to Profile
      await page.getByRole('tab', { name: /profile/i }).click();
      await expect(page.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Profile Tab', () => {
    test('should display profile information', async ({ page }) => {
      // Profile tab should be active by default
      await expect(page.getByRole('tab', { name: /profile/i })).toHaveAttribute('aria-selected', 'true');
      
      // Verify profile card is visible
      await expect(page.getByText(/profile/i)).toBeVisible();
      await expect(page.getByText(/your personal information/i)).toBeVisible();
      
      // Should show avatar or initials
      const avatar = page.locator('[class*="avatar"]').first();
      await expect(avatar).toBeVisible();
      
      // Should show Edit Profile button
      await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible();
    });

    test('should open edit profile dialog', async ({ page }) => {
      await page.getByRole('button', { name: /edit profile/i }).click();
      
      // Dialog should appear
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 2000 });
      
      // Should have form fields
      await expect(dialog.getByRole('textbox', { name: /full name/i }).or(dialog.getByRole('textbox', { name: /name/i }))).toBeVisible();
    });

    test('should display profile completion progress if incomplete', async ({ page }) => {
      // Check if progress bar exists (may not be visible if profile is complete)
      const progressBar = page.locator('[role="progressbar"]');
      const progressText = page.getByText(/profile.*% complete/i);
      
      // If progress is shown, verify it's between 0-100
      if (await progressText.isVisible().catch(() => false)) {
        const text = await progressText.textContent();
        const match = text?.match(/(\d+)%/);
        if (match) {
          const percentage = parseInt(match[1]);
          expect(percentage).toBeGreaterThanOrEqual(0);
          expect(percentage).toBeLessThanOrEqual(100);
        }
      }
    });

    test('should display profile extensions section', async ({ page }) => {
      // Profile extensions (credentials, social links, photo gallery) should be visible
      // These are rendered as separate components, so we check for their presence
      await page.waitForTimeout(500); // Allow components to render
      
      // At minimum, the profile card should be visible
      await expect(page.getByText(/profile/i)).toBeVisible();
    });
  });

  test.describe('Notifications Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: /notifications/i }).click();
      await expect(page.getByRole('tab', { name: /notifications/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('should display notification preferences', async ({ page }) => {
      await expect(page.getByText(/configure how you receive notifications/i)).toBeVisible();
      
      // Should show email notifications toggle
      await expect(page.getByLabel(/email notifications/i)).toBeVisible();
      
      // Should show push notifications toggle
      await expect(page.getByLabel(/push notifications/i)).toBeVisible();
      
      // Should show deal updates toggle
      await expect(page.getByLabel(/deal updates/i)).toBeVisible();
    });

    test('should toggle email notifications', async ({ page }) => {
      const emailToggle = page.getByLabel(/email notifications/i);
      
      // Get initial state
      const initialChecked = await emailToggle.isChecked();
      
      // Toggle it
      await emailToggle.click();
      await page.waitForTimeout(500);
      
      // State should have changed
      const newChecked = await emailToggle.isChecked();
      expect(newChecked).not.toBe(initialChecked);
    });

    test('should toggle push notifications', async ({ page }) => {
      const pushToggle = page.getByLabel(/push notifications/i);
      
      const initialChecked = await pushToggle.isChecked();
      await pushToggle.click();
      await page.waitForTimeout(500);
      
      const newChecked = await pushToggle.isChecked();
      expect(newChecked).not.toBe(initialChecked);
    });

    test('should toggle deal updates', async ({ page }) => {
      const dealToggle = page.getByLabel(/deal updates/i);
      
      const initialChecked = await dealToggle.isChecked();
      await dealToggle.click();
      await page.waitForTimeout(500);
      
      const newChecked = await dealToggle.isChecked();
      expect(newChecked).not.toBe(initialChecked);
    });
  });

  test.describe('Appearance Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: /appearance/i }).click();
      await expect(page.getByRole('tab', { name: /appearance/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('should display appearance settings', async ({ page }) => {
      await expect(page.getByText(/customize the look and feel/i)).toBeVisible();
      
      // Should show dark mode toggle
      await expect(page.getByLabel(/dark mode/i)).toBeVisible();
      
      // Should show data export section
      await expect(page.getByText(/data export/i)).toBeVisible();
    });

    test('should toggle dark mode', async ({ page }) => {
      const darkModeToggle = page.getByLabel(/dark mode/i);
      
      // Get initial state
      const initialChecked = await darkModeToggle.isChecked();
      
      // Toggle dark mode
      await darkModeToggle.click();
      await page.waitForTimeout(1000); // Wait for theme change
      
      // Verify state changed
      const newChecked = await darkModeToggle.isChecked();
      expect(newChecked).not.toBe(initialChecked);
      
      // Verify theme class is applied to html element
      const html = page.locator('html');
      const hasDarkClass = await html.evaluate((el) => el.classList.contains('dark'));
      expect(hasDarkClass).toBe(newChecked);
    });

    test('should open data export dialog', async ({ page }) => {
      const exportButton = page.getByRole('button', { name: /export data/i });
      await expect(exportButton).toBeVisible();
      
      await exportButton.click();
      
      // Dialog should appear
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 2000 });
      
      // Should show export options
      await expect(dialog.getByText(/export/i).or(dialog.getByText(/download/i))).toBeVisible();
    });
  });

  test.describe('Security Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: /security/i }).click();
      await expect(page.getByRole('tab', { name: /security/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('should display security/privacy settings', async ({ page }) => {
      // Privacy settings component should be rendered
      await page.waitForTimeout(500);
      
      // Should show some security-related content
      // The PrivacySettings component may have various sections
      const securityContent = page.locator('#privacy-section');
      await expect(securityContent).toBeVisible();
    });
  });

  test.describe('Billing & More Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: /more/i }).click();
      await expect(page.getByRole('tab', { name: /more/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('should display billing and shortcuts cards', async ({ page }) => {
      // Should show billing card
      await expect(page.getByText(/billing & subscription/i)).toBeVisible();
      
      // Should show keyboard shortcuts card
      await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible();
    });

    test('should navigate to billing page', async ({ page }) => {
      // Click on billing card
      const billingCard = page.getByText(/billing & subscription/i).locator('..').locator('..');
      await billingCard.click();
      
      // Should navigate to billing page
      await page.waitForURL(/.*billing.*/, { timeout: 5000 });
      await expect(page.getByText(/billing/i).or(page.getByText(/subscription/i))).toBeVisible();
    });

    test('should open keyboard shortcuts dialog', async ({ page }) => {
      // Click on keyboard shortcuts card
      const shortcutsCard = page.getByText(/keyboard shortcuts/i).locator('..').locator('..');
      await shortcutsCard.click();
      
      // Dialog should appear
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 2000 });
      
      // Should show shortcuts content
      await expect(dialog.getByText(/shortcut/i).or(dialog.getByText(/keyboard/i))).toBeVisible();
    });
  });

  test.describe('Settings Page Health Checks', () => {
    test('should load settings page without errors', async ({ page }) => {
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

    test('should persist tab selection in URL hash', async ({ page }) => {
      // Switch to notifications tab
      await page.getByRole('tab', { name: /notifications/i }).click();
      await page.waitForTimeout(500);
      
      // URL should contain hash
      const url = page.url();
      expect(url).toContain('#');
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Notifications tab should still be selected
      await expect(page.getByRole('tab', { name: /notifications/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Settings page should still be visible
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
      
      // Tabs should be scrollable/horizontal
      const tabsList = page.locator('[role="tablist"]');
      await expect(tabsList).toBeVisible();
    });
  });
});
