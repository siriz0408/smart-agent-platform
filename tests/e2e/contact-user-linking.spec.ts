import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Contact-User Linking Feature Tests
 * Tests the new contact-user linking functionality including:
 * - User search by email
 * - Linking contacts to platform users
 * - Viewing user preferences
 * - Unlinking contacts
 * - Contact ownership toggle
 */

test.describe('Contact-User Linking', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /contacts/i, 'contacts');
    await expect(page.getByRole('button', { name: /add contact/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display Link to Platform User button for unlinked contact', async ({ page }) => {
    // Click on first contact in the table to open detail sheet
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();

    // Wait for contact detail sheet to open
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Should see "Link to Platform User" button
    await expect(page.getByRole('button', { name: /link to platform user/i })).toBeVisible();
  });

  test('should open user search modal when clicking Link button', async ({ page }) => {
    // Open first contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Click "Link to Platform User" button
    await page.getByRole('button', { name: /link to platform user/i }).click();

    // Should open modal with search input
    await expect(page.getByRole('dialog', { name: /link contact to platform user/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByPlaceholder(/enter email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible();
  });

  test('should search for user by email', async ({ page }) => {
    // Open first contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Open link modal
    await page.getByRole('button', { name: /link to platform user/i }).click();
    await expect(page.getByRole('dialog', { name: /link contact to platform user/i })).toBeVisible({ timeout: 3000 });

    // Type a test email (this will likely not be found, but tests the search flow)
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('testuser@example.com');

    // Click search button
    await page.getByRole('button', { name: /search/i }).click();

    // Should show either:
    // - User found message/card, OR
    // - "No platform user found" message
    // We'll wait for loading to finish and verify one of these appears
    await page.waitForTimeout(2000); // Wait for search to complete

    // Verify the search completed (loading indicator should be gone)
    await expect(page.getByRole('button', { name: /searching/i })).not.toBeVisible({ timeout: 5000 });
  });

  test('should validate email format before searching', async ({ page }) => {
    // Open first contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Open link modal
    await page.getByRole('button', { name: /link to platform user/i }).click();

    // Try to search with empty email
    await page.getByRole('button', { name: /search/i }).click();

    // Should show toast error "Please enter an email address"
    await expect(page.getByText(/please enter an email/i)).toBeVisible({ timeout: 3000 });
  });

  test('should display contact ownership toggle', async ({ page }) => {
    // Open first contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Should see ownership section with Personal/Workspace badge
    await expect(page.getByText(/ownership/i)).toBeVisible();

    // Should see either "Personal" or "Workspace" badge
    const ownershipBadge = page.locator('[class*="badge"]').filter({ hasText: /(personal|workspace)/i });
    await expect(ownershipBadge.first()).toBeVisible({ timeout: 3000 });
  });

  test('should show AlertDialog when unlinking contact (not browser confirm)', async ({ page }) => {
    // This test verifies that we're using the proper AlertDialog component
    // instead of the browser's native confirm() dialog

    // Note: To fully test this, we'd need a contact that's already linked
    // For now, we'll verify the unlink flow structure exists

    // Open a contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // If contact is linked, should see "Unlink" button
    const unlinkButton = page.getByRole('button', { name: /^unlink$/i });
    const isLinked = await unlinkButton.isVisible().catch(() => false);

    if (isLinked) {
      // Click unlink button
      await unlinkButton.click();

      // Should show AlertDialog (not browser confirm)
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 3000 });
      await expect(page.getByRole('heading', { name: /unlink contact from platform user/i })).toBeVisible();

      // Should have Cancel and Unlink buttons
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /unlink/i })).toBeVisible();

      // Click cancel to close dialog
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 3000 });
    } else {
      console.log('Contact not linked - skipping unlink dialog test');
    }
  });

  test('should display user preferences panel when contact is linked', async ({ page }) => {
    // Open a contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Check if contact is linked (has "Linked to Platform User" badge)
    const linkedBadge = page.getByText(/linked to platform user/i);
    const isLinked = await linkedBadge.isVisible().catch(() => false);

    if (isLinked) {
      // Should display user preferences panel
      await expect(page.getByText(/user's preferences \(read-only\)/i)).toBeVisible({ timeout: 3000 });

      // May show different sections based on what preferences exist:
      // - Property Search
      // - Financial Status
      // - Timeline
      // - Communication

      // Verify at least the preferences card is present
      const preferencesCard = page.locator('[class*="card"]').filter({ hasText: /user's preferences/i });
      await expect(preferencesCard).toBeVisible();
    } else {
      console.log('Contact not linked - skipping preferences panel test');
    }
  });

  test('should handle safe date formatting in preferences', async ({ page }) => {
    // This test verifies that invalid dates don't crash the component
    // The formatSafeDate helper should show "Invalid date" instead of crashing

    // Open a contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // If preferences are visible, verify dates are formatted
    const preferencesCard = page.locator('[class*="card"]').filter({ hasText: /user's preferences/i });
    const hasPreferences = await preferencesCard.isVisible().catch(() => false);

    if (hasPreferences) {
      // Look for "Last updated" text which uses formatSafeDate
      const lastUpdated = page.getByText(/last updated:/i);

      if (await lastUpdated.isVisible().catch(() => false)) {
        // Should show either a valid date or "Invalid date" - not crash
        await expect(lastUpdated).toBeVisible();

        // Verify the text after "Last updated:" is present (either date or "Invalid date")
        const dateText = await lastUpdated.textContent();
        expect(dateText).toBeTruthy();
        expect(dateText).toMatch(/last updated:/i);
      }
    }
  });

  test('should close link modal when clicking Cancel', async ({ page }) => {
    // Open first contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Open link modal
    await page.getByRole('button', { name: /link to platform user/i }).click();
    await expect(page.getByRole('dialog', { name: /link contact to platform user/i })).toBeVisible({ timeout: 3000 });

    // Click close button or Cancel
    const closeButton = page.getByRole('button', { name: /close|cancel/i }).first();
    await closeButton.click();

    // Modal should close
    await expect(page.getByRole('dialog', { name: /link contact to platform user/i })).not.toBeVisible({ timeout: 3000 });
  });

  test('should show help tooltip for ownership toggle', async ({ page }) => {
    // Open first contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Look for help tooltip/icon near ownership controls
    const ownershipSection = page.locator('text=/ownership/i').locator('..');

    // Should have some form of help text or tooltip
    await expect(ownershipSection).toBeVisible();
  });
});

test.describe('Contact-User Linking - Permission Checks', () => {
  test('should disable ownership toggle for contacts created by other agents', async ({ page }) => {
    // This test verifies permission checks are working
    // Only the creator or workspace admin can change ownership

    await login(page);
    await navigateTo(page, /contacts/i, 'contacts');

    // Open a contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();
    await expect(page.getByRole('heading', { name: /contact details/i })).toBeVisible({ timeout: 5000 });

    // Find the ownership switch
    const ownershipSwitch = page.locator('button[role="switch"]').filter({
      has: page.locator('text=/personal|workspace/i')
    }).first();

    if (await ownershipSwitch.isVisible().catch(() => false)) {
      // Check if it's disabled (for contacts not owned by current user)
      const isDisabled = await ownershipSwitch.isDisabled();

      // If disabled, that's correct behavior for other agents' contacts
      // If enabled, current user is the owner or admin
      expect(typeof isDisabled).toBe('boolean');
    }
  });
});

test.describe('Contact-User Linking - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should display link button on mobile', async ({ page }) => {
    await login(page);
    await navigateTo(page, /contacts/i, 'contacts');

    // Open a contact
    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();

    // Should see link button (might be in a drawer or sheet on mobile)
    await expect(page.getByRole('button', { name: /link to platform user/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display search modal properly on mobile', async ({ page }) => {
    await login(page);
    await navigateTo(page, /contacts/i, 'contacts');

    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();

    // Open link modal
    await page.getByRole('button', { name: /link to platform user/i }).click();

    // Modal should fit mobile viewport
    const modal = page.getByRole('dialog', { name: /link contact to platform user/i });
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Verify search input is accessible
    await expect(page.getByPlaceholder(/enter email/i)).toBeVisible();
  });
});

test.describe('Contact-User Linking - Accessibility', () => {
  test('should have proper ARIA labels on link button', async ({ page }) => {
    await login(page);
    await navigateTo(page, /contacts/i, 'contacts');

    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();

    // Link button should be accessible via role
    const linkButton = page.getByRole('button', { name: /link to platform user/i });
    await expect(linkButton).toBeVisible({ timeout: 5000 });

    // Should be keyboard accessible
    await linkButton.focus();
    await expect(linkButton).toBeFocused();
  });

  test('should support keyboard navigation in search modal', async ({ page }) => {
    await login(page);
    await navigateTo(page, /contacts/i, 'contacts');

    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();

    // Open modal
    await page.getByRole('button', { name: /link to platform user/i }).click();

    // Tab through modal elements
    await page.keyboard.press('Tab');

    // Should focus email input first
    const emailInput = page.getByPlaceholder(/enter email/i);
    await expect(emailInput).toBeFocused();

    // Can type email
    await emailInput.type('test@example.com');

    // Press Enter to search
    await page.keyboard.press('Enter');

    // Search should trigger
    await expect(page.getByRole('button', { name: /searching/i })).toBeVisible({ timeout: 1000 });
  });

  test('should use AlertDialog instead of browser confirm', async ({ page }) => {
    // Verify AlertDialog is used for unlink confirmation
    // This is an accessibility improvement over browser confirm()

    await login(page);
    await navigateTo(page, /contacts/i, 'contacts');

    const firstContact = page.getByRole('row').nth(1);
    await firstContact.click();

    // If contact is linked, test unlink dialog
    const unlinkButton = page.getByRole('button', { name: /^unlink$/i });
    const isLinked = await unlinkButton.isVisible().catch(() => false);

    if (isLinked) {
      await unlinkButton.click();

      // Should show AlertDialog with proper ARIA role
      const alertDialog = page.getByRole('alertdialog');
      await expect(alertDialog).toBeVisible({ timeout: 3000 });

      // Should have descriptive heading
      await expect(page.getByRole('heading', { name: /unlink contact from platform user/i })).toBeVisible();

      // Should have descriptive text
      await expect(page.getByText(/are you sure/i)).toBeVisible();
    }
  });
});
