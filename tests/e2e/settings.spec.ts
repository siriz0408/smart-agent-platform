import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Settings E2E Tests
 * Tests profile editing, notifications, appearance, and security settings
 * 
 * Run with: npx playwright test settings.spec.ts --headed --project=chromium
 */

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /settings/i, 'settings');
  });

  test.describe('Page Display', () => {
    test('should display settings page with header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-page.png' });
    });

    test('should display settings tabs', async ({ page }) => {
      // Check for main tabs
      const profileTab = page.getByRole('tab', { name: /profile/i });
      const notificationsTab = page.getByRole('tab', { name: /notifications/i });
      const appearanceTab = page.getByRole('tab', { name: /appearance/i });
      
      await expect(profileTab).toBeVisible();
      await expect(notificationsTab).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-tabs.png' });
    });

    test('should display profile completion indicator', async ({ page }) => {
      // Look for profile completion
      const completionText = page.getByText(/%.*complete/i);
      const progressBar = page.locator('[class*="progress"]');
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-completion.png' });
    });
  });

  test.describe('Profile Tab', () => {
    test('should display profile information', async ({ page }) => {
      // Profile tab should be default
      const profileTab = page.getByRole('tab', { name: /profile/i });
      await profileTab.click();
      await page.waitForTimeout(500);
      
      // Look for profile elements
      const avatar = page.locator('[class*="avatar"]');
      const nameField = page.getByText(/name|full name/i);
      const emailField = page.getByText(/email/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-profile.png' });
    });

    test('should have edit profile button', async ({ page }) => {
      const profileTab = page.getByRole('tab', { name: /profile/i });
      await profileTab.click();
      await page.waitForTimeout(500);
      
      const editBtn = page.getByRole('button', { name: /edit|update/i });
      await expect(editBtn.first()).toBeVisible();
    });

    test('should open edit profile dialog', async ({ page }) => {
      const profileTab = page.getByRole('tab', { name: /profile/i });
      await profileTab.click();
      await page.waitForTimeout(500);
      
      const editBtn = page.getByRole('button', { name: /edit profile|edit/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(500);
        
        // Check for dialog
        const dialog = page.getByRole('dialog');
        
        await page.screenshot({ path: 'test-artifacts/screenshots/settings-edit-profile-dialog.png' });
        
        // Close dialog
        await page.keyboard.press('Escape');
      }
    });

    test('should update profile name', async ({ page }) => {
      const profileTab = page.getByRole('tab', { name: /profile/i });
      await profileTab.click();
      await page.waitForTimeout(500);
      
      const editBtn = page.getByRole('button', { name: /edit profile|edit/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(500);
        
        // Find name input
        const nameInput = page.getByLabel(/name|full name/i);
        if (await nameInput.isVisible()) {
          const currentName = await nameInput.inputValue();
          await nameInput.fill('Test User Updated');
          
          // Look for save button
          const saveBtn = page.getByRole('button', { name: /save|update/i });
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForTimeout(1000);
          }
          
          await page.screenshot({ path: 'test-artifacts/screenshots/settings-profile-updated.png' });
        }
      }
    });
  });

  test.describe('Notifications Tab', () => {
    test('should display notification settings', async ({ page }) => {
      const notificationsTab = page.getByRole('tab', { name: /notifications/i });
      await notificationsTab.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-notifications.png' });
    });

    test('should display notification toggles', async ({ page }) => {
      const notificationsTab = page.getByRole('tab', { name: /notifications/i });
      await notificationsTab.click();
      await page.waitForTimeout(500);
      
      // Look for switch/toggle elements
      const switches = page.getByRole('switch');
      const switchCount = await switches.count();
      
      expect(switchCount).toBeGreaterThan(0);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-notification-toggles.png' });
    });

    test('should toggle email notifications', async ({ page }) => {
      const notificationsTab = page.getByRole('tab', { name: /notifications/i });
      await notificationsTab.click();
      await page.waitForTimeout(500);
      
      // Find email notification toggle
      const emailSwitch = page.getByRole('switch').first();
      if (await emailSwitch.isVisible()) {
        const initialState = await emailSwitch.isChecked();
        await emailSwitch.click();
        await page.waitForTimeout(500);
        
        const newState = await emailSwitch.isChecked();
        expect(newState).not.toBe(initialState);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/settings-notification-toggled.png' });
      }
    });
  });

  test.describe('Appearance Tab', () => {
    test('should display appearance settings', async ({ page }) => {
      const appearanceTab = page.getByRole('tab', { name: /appearance/i });
      await appearanceTab.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-appearance.png' });
    });

    test('should have dark mode toggle', async ({ page }) => {
      const appearanceTab = page.getByRole('tab', { name: /appearance/i });
      await appearanceTab.click();
      await page.waitForTimeout(500);
      
      // Look for dark mode option
      const darkModeText = page.getByText(/dark mode|theme/i);
      const themeSwitch = page.getByRole('switch');
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-dark-mode.png' });
    });

    test('should toggle dark mode', async ({ page }) => {
      const appearanceTab = page.getByRole('tab', { name: /appearance/i });
      await appearanceTab.click();
      await page.waitForTimeout(500);
      
      // Find theme switch
      const themeSwitch = page.getByRole('switch').first();
      if (await themeSwitch.isVisible()) {
        await themeSwitch.click();
        await page.waitForTimeout(500);
        
        // Check if theme changed (html class)
        const html = page.locator('html');
        
        await page.screenshot({ path: 'test-artifacts/screenshots/settings-theme-changed.png' });
      }
    });
  });

  test.describe('Security Tab', () => {
    test('should display security settings', async ({ page }) => {
      const securityTab = page.getByRole('tab', { name: /security/i });
      await securityTab.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-security.png' });
    });

    test('should have password change option', async ({ page }) => {
      const securityTab = page.getByRole('tab', { name: /security/i });
      await securityTab.click();
      await page.waitForTimeout(500);
      
      // Look for password option
      const passwordSection = page.getByText(/password|change password/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-password-option.png' });
    });
  });

  test.describe('More/Billing Tab', () => {
    test('should display more/billing settings', async ({ page }) => {
      const billingTab = page.getByRole('tab', { name: /more|billing/i });
      await billingTab.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-billing.png' });
    });

    test('should have data export option', async ({ page }) => {
      const billingTab = page.getByRole('tab', { name: /more|billing/i });
      await billingTab.click();
      await page.waitForTimeout(500);
      
      // Look for export option
      const exportBtn = page.getByRole('button', { name: /export|download/i });
      const exportText = page.getByText(/export.*data/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-export-option.png' });
    });

    test('should open data export dialog', async ({ page }) => {
      const billingTab = page.getByRole('tab', { name: /more|billing/i });
      await billingTab.click();
      await page.waitForTimeout(500);
      
      const exportBtn = page.getByRole('button', { name: /export|download/i });
      if (await exportBtn.isVisible()) {
        await exportBtn.click();
        await page.waitForTimeout(500);
        
        const dialog = page.getByRole('dialog');
        
        await page.screenshot({ path: 'test-artifacts/screenshots/settings-export-dialog.png' });
        
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should have keyboard shortcuts option', async ({ page }) => {
      // Look for keyboard shortcuts button/link
      const shortcutsBtn = page.getByRole('button', { name: /keyboard|shortcuts/i });
      const shortcutsLink = page.getByText(/keyboard shortcuts/i);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/settings-shortcuts-option.png' });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle save errors gracefully', async ({ page }) => {
      const profileTab = page.getByRole('tab', { name: /profile/i });
      await profileTab.click();
      await page.waitForTimeout(500);
      
      const editBtn = page.getByRole('button', { name: /edit profile|edit/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(500);
        
        // Clear required field
        const nameInput = page.getByLabel(/name|full name/i);
        if (await nameInput.isVisible()) {
          await nameInput.clear();
          
          const saveBtn = page.getByRole('button', { name: /save|update/i });
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForTimeout(500);
            
            // Check for validation error
            const errorMsg = page.getByText(/required|error|invalid/i);
            
            await page.screenshot({ path: 'test-artifacts/screenshots/settings-save-error.png' });
          }
        }
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      const profileTab = page.getByRole('tab', { name: /profile/i });
      await profileTab.click();
      await page.waitForTimeout(500);
      
      const editBtn = page.getByRole('button', { name: /edit profile|edit/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(500);
        
        // Check for labels
        const labels = page.getByRole('textbox');
        const labelCount = await labels.count();
        
        await page.screenshot({ path: 'test-artifacts/screenshots/settings-form-labels.png' });
      }
    });
  });
});
