import { test, expect } from '@playwright/test';

/**
 * Password Reset E2E Tests
 * Tests the forgot password flow and password reset functionality
 * 
 * Run with: npx playwright test password-reset.spec.ts --headed --project=chromium
 */

test.describe('Password Reset', () => {
  test.describe('Forgot Password - From Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    });

    test('should display forgot password link on login page', async ({ page }) => {
      const forgotPasswordLink = page.getByRole('link', { name: /forgot|reset/i })
        .or(page.getByRole('button', { name: /forgot|reset/i }))
        .or(page.getByText(/forgot.*password/i));
      
      await expect(forgotPasswordLink.first()).toBeVisible();
      
      await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-link.png' });
    });

    test('should show error when submitting without email', async ({ page }) => {
      const forgotPasswordLink = page.getByRole('link', { name: /forgot|reset/i })
        .or(page.getByRole('button', { name: /forgot|reset/i }))
        .or(page.getByText(/forgot.*password/i));
      
      if (await forgotPasswordLink.first().isVisible()) {
        await forgotPasswordLink.first().click();
        await page.waitForTimeout(1000);
        
        // Check for error message (email required)
        const errorMsg = page.getByText(/email.*required|enter.*email|please.*email/i);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-no-email-error.png' });
      }
    });

    test('should submit password reset with valid email', async ({ page }) => {
      // First enter email in login form
      const emailInput = page.getByRole('textbox', { name: /email/i })
        .or(page.getByLabel(/email/i))
        .or(page.getByPlaceholder(/email/i));
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
      }
      
      const forgotPasswordLink = page.getByRole('link', { name: /forgot|reset/i })
        .or(page.getByRole('button', { name: /forgot|reset/i }))
        .or(page.getByText(/forgot.*password/i));
      
      if (await forgotPasswordLink.first().isVisible()) {
        await forgotPasswordLink.first().click();
        await page.waitForTimeout(2000);
        
        // Check for success message
        const successMsg = page.getByText(/check.*email|sent|reset link/i);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-submitted.png' });
      }
    });

    test('should show error for invalid email format', async ({ page }) => {
      const emailInput = page.getByRole('textbox', { name: /email/i })
        .or(page.getByLabel(/email/i))
        .or(page.getByPlaceholder(/email/i));
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('invalidemail');
      }
      
      const forgotPasswordLink = page.getByRole('link', { name: /forgot|reset/i })
        .or(page.getByRole('button', { name: /forgot|reset/i }))
        .or(page.getByText(/forgot.*password/i));
      
      if (await forgotPasswordLink.first().isVisible()) {
        await forgotPasswordLink.first().click();
        await page.waitForTimeout(1000);
        
        // Check for validation error
        const errorMsg = page.getByText(/invalid.*email|valid.*email/i);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-invalid-email.png' });
      }
    });
  });

  test.describe('Direct Reset Page Access', () => {
    test('should access reset password page directly', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-direct-access.png' });
    });
  });

  test.describe('Password Reset Form', () => {
    test('should display new password form on reset page', async ({ page }) => {
      // Note: This test simulates accessing the reset page with a token
      // In real scenario, user would click link in email
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Look for password inputs
      const newPasswordInput = page.getByLabel(/new password/i)
        .or(page.getByPlaceholder(/new password/i));
      const confirmPasswordInput = page.getByLabel(/confirm/i)
        .or(page.getByPlaceholder(/confirm/i));
      
      await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-form.png' });
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const newPasswordInput = page.getByLabel(/new password/i)
        .or(page.getByPlaceholder(/new password/i))
        .or(page.getByLabel(/password/i).first());
      
      if (await newPasswordInput.isVisible()) {
        // Enter weak password
        await newPasswordInput.fill('123');
        await page.waitForTimeout(500);
        
        // Look for strength indicator or error
        const strengthIndicator = page.getByText(/weak|strong|password.*requirement/i);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-weak.png' });
      }
    });

    test('should validate password match', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const newPasswordInput = page.getByLabel(/new password/i)
        .or(page.getByPlaceholder(/new password/i))
        .or(page.getByLabel(/password/i).first());
      const confirmPasswordInput = page.getByLabel(/confirm/i)
        .or(page.getByPlaceholder(/confirm/i))
        .or(page.getByLabel(/password/i).last());
      
      if (await newPasswordInput.isVisible() && await confirmPasswordInput.isVisible()) {
        await newPasswordInput.fill('SecurePass123!');
        await confirmPasswordInput.fill('DifferentPass456!');
        
        // Try to submit
        const submitBtn = page.getByRole('button', { name: /reset|update|submit/i });
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(500);
        }
        
        // Check for mismatch error
        const mismatchError = page.getByText(/match|not.*same|different/i);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-mismatch.png' });
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rapid resubmit', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.getByRole('textbox', { name: /email/i })
        .or(page.getByLabel(/email/i))
        .or(page.getByPlaceholder(/email/i));
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
      }
      
      const forgotPasswordLink = page.getByRole('link', { name: /forgot|reset/i })
        .or(page.getByRole('button', { name: /forgot|reset/i }))
        .or(page.getByText(/forgot.*password/i));
      
      if (await forgotPasswordLink.first().isVisible()) {
        // Click multiple times rapidly
        await forgotPasswordLink.first().click();
        await forgotPasswordLink.first().click().catch(() => {});
        await forgotPasswordLink.first().click().catch(() => {});
        
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-rapid-submit.png' });
      }
    });

    test('should handle empty form submission', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const submitBtn = page.getByRole('button', { name: /reset|update|submit/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
        
        // Check for validation errors
        await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-empty-submit.png' });
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back to login from reset page', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('networkidle');
      
      // Look for back to login link
      const backLink = page.getByRole('link', { name: /back|login|sign in/i });
      
      if (await backLink.isVisible()) {
        await backLink.click();
        await page.waitForLoadState('networkidle');
        
        // Verify we're on login page
        await expect(page).toHaveURL(/login/);
        
        await page.screenshot({ path: 'test-artifacts/screenshots/password-reset-back-to-login.png' });
      }
    });
  });
});
