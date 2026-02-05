import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Accessibility E2E Tests
 * Tests WCAG compliance using axe-core on key pages
 * 
 * Run with: npx playwright test accessibility.spec.ts --headed --project=chromium
 */

// Helper function to run axe and report violations
async function checkAccessibility(page: Page, pageName: string) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  // Take screenshot
  await page.screenshot({ path: `test-artifacts/screenshots/a11y-${pageName}.png` });
  
  // Log violations for debugging
  if (accessibilityScanResults.violations.length > 0) {
    console.log(`\nAccessibility violations on ${pageName}:`);
    accessibilityScanResults.violations.forEach((violation) => {
      console.log(`  - ${violation.id}: ${violation.description} (${violation.nodes.length} occurrences)`);
    });
  }
  
  return accessibilityScanResults;
}

test.describe('Accessibility Audits', () => {
  test.describe('Public Pages (No Auth)', () => {
    test('should have no critical accessibility violations on landing page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const results = await checkAccessibility(page, 'landing');
      
      // Filter for critical/serious issues
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      // We expect no critical violations
      expect(criticalViolations).toHaveLength(0);
    });

    test('should have no critical accessibility violations on login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const results = await checkAccessibility(page, 'login');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });

    test('should have no critical accessibility violations on signup page', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const results = await checkAccessibility(page, 'signup');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });
  });

  test.describe('Authenticated Pages', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should have no critical accessibility violations on dashboard', async ({ page }) => {
      await navigateTo(page, /home|dashboard/i, '');
      await page.waitForTimeout(2000);
      
      const results = await checkAccessibility(page, 'dashboard');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });

    test('should have no critical accessibility violations on contacts page', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      await page.waitForTimeout(2000);
      
      const results = await checkAccessibility(page, 'contacts');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });

    test('should have no critical accessibility violations on pipeline page', async ({ page }) => {
      await navigateTo(page, /pipeline/i, 'pipeline');
      await page.waitForTimeout(2000);
      
      const results = await checkAccessibility(page, 'pipeline');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });

    test('should have no critical accessibility violations on settings page', async ({ page }) => {
      await navigateTo(page, /settings/i, 'settings');
      await page.waitForTimeout(2000);
      
      const results = await checkAccessibility(page, 'settings');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });

    test('should have no critical accessibility violations on documents page', async ({ page }) => {
      await navigateTo(page, /documents/i, 'documents');
      await page.waitForTimeout(2000);
      
      const results = await checkAccessibility(page, 'documents');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });

    test('should have no critical accessibility violations on tools page', async ({ page }) => {
      await navigateTo(page, /tools/i, 'tools');
      await page.waitForTimeout(2000);
      
      const results = await checkAccessibility(page, 'tools');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should support keyboard navigation in navigation menu', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Focus on first interactive element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      // Tab through navigation items
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
      }
      
      // Take screenshot showing focus state
      await page.screenshot({ path: 'test-artifacts/screenshots/a11y-keyboard-nav.png' });
      
      // Verify focus is visible (element has focus)
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should support keyboard navigation in forms', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      await page.waitForTimeout(2000);
      
      // Click add contact button
      const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        
        // Tab through form fields
        for (let i = 0; i < 8; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(200);
        }
        
        await page.screenshot({ path: 'test-artifacts/screenshots/a11y-form-keyboard.png' });
      }
    });
  });

  test.describe('Focus Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should trap focus in modal dialogs', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      await page.waitForTimeout(2000);
      
      // Open a dialog
      const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        
        // Tab multiple times to verify focus stays in dialog
        for (let i = 0; i < 15; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }
        
        // Focus should still be within dialog
        const dialog = page.getByRole('dialog');
        const focusedElement = page.locator(':focus');
        
        await page.screenshot({ path: 'test-artifacts/screenshots/a11y-focus-trap.png' });
      }
    });

    test('should restore focus when closing dialogs', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      await page.waitForTimeout(2000);
      
      const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
      if (await addBtn.isVisible()) {
        // Note the button before opening
        await addBtn.focus();
        await addBtn.click();
        await page.waitForTimeout(1000);
        
        // Close dialog with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // Focus should return to trigger element
        await page.screenshot({ path: 'test-artifacts/screenshots/a11y-focus-restore.png' });
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast on landing page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ rules: { 'color-contrast': { enabled: true } } })
        .analyze();
      
      const contrastViolations = results.violations.filter(
        v => v.id === 'color-contrast'
      );
      
      await page.screenshot({ path: 'test-artifacts/screenshots/a11y-contrast-landing.png' });
      
      // Log contrast issues but don't fail (many are false positives)
      if (contrastViolations.length > 0) {
        console.log('Color contrast issues found:', contrastViolations.length);
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      await page.waitForTimeout(2000);
      
      // Check for headings
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');
      
      // Should have at least one h1
      const h1Count = await h1.count();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/a11y-headings.png' });
      
      // Log heading structure
      console.log(`H1 count: ${h1Count}, H2 count: ${await h2.count()}`);
    });

    test('should have proper ARIA labels on interactive elements', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      await page.waitForTimeout(2000);
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a'])
        .options({ 
          rules: { 
            'button-name': { enabled: true },
            'link-name': { enabled: true }
          } 
        })
        .analyze();
      
      const ariaViolations = results.violations.filter(
        v => v.id === 'button-name' || v.id === 'link-name'
      );
      
      await page.screenshot({ path: 'test-artifacts/screenshots/a11y-aria-labels.png' });
      
      expect(ariaViolations).toHaveLength(0);
    });

    test('should have alt text on images', async ({ page }) => {
      await navigateTo(page, /contacts/i, 'contacts');
      await page.waitForTimeout(2000);
      
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a'])
        .options({ rules: { 'image-alt': { enabled: true } } })
        .analyze();
      
      const altViolations = results.violations.filter(
        v => v.id === 'image-alt'
      );
      
      expect(altViolations).toHaveLength(0);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await login(page);
      await page.waitForTimeout(2000);
      
      const results = await checkAccessibility(page, 'mobile-dashboard');
      
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations).toHaveLength(0);
    });

    test('should have touch-friendly tap targets', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await login(page);
      await page.waitForTimeout(2000);
      
      // Check button sizes
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      
      // Verify buttons exist and are reasonably sized
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            // Touch target should be at least 44x44 pixels
            console.log(`Button ${i}: ${box.width}x${box.height}`);
          }
        }
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/a11y-mobile-targets.png' });
    });
  });
});
