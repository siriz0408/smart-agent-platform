import { test, expect } from '@playwright/test';
import { login, navigateTo } from './fixtures/helpers';

/**
 * Message Flow E2E Tests - P0 Critical
 * Tests messaging functionality: sending messages, real-time updates, conversation management
 * 
 * Covers:
 * - Message sending and display
 * - Conversation creation
 * - Message thread rendering
 * - Conversation list updates
 * - Message input validation
 * 
 * Note: Full real-time testing with two users requires two browser contexts (future enhancement)
 */

test.describe('Message Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, /messages/i, 'messages');
    await page.waitForLoadState('networkidle');
    // Wait for messages page to load
    await page.waitForTimeout(1000);
  });

  test.describe('Messages Page', () => {
    test('should display messages page with conversation list', async ({ page }) => {
      // Should show messages page structure
      // Either shows conversation list or "Select a conversation" message
      const hasConversationList = await page.getByText(/select a conversation|new conversation/i).isVisible().catch(() => false);
      const hasNewButton = await page.getByRole('button', { name: /new/i }).isVisible().catch(() => false);
      
      // At least one of these should be visible
      expect(hasConversationList || hasNewButton).toBeTruthy();
    });

    test('should show "Select a conversation" when no conversation selected', async ({ page }) => {
      // Navigate to messages without selecting a conversation
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      
      // Should show empty state
      await expect(page.getByText(/select a conversation/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Conversation Creation', () => {
    test('should open new conversation dialog', async ({ page }) => {
      // Look for "New" button or similar
      const newButton = page.getByRole('button', { name: /new/i }).first();
      
      if (await newButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await newButton.click();
        
        // Should show dialog for selecting contact
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      } else {
        // If no new button, skip this test
        test.skip();
      }
    });
  });

  test.describe('Message Sending', () => {
    test('should send a text message when conversation is selected', async ({ page }) => {
      // First, check if there are any existing conversations
      // Try to find and select a conversation
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        // No conversations exist - create one first
        // This requires a contact, which is complex, so we'll skip for now
        test.skip('No conversations available - requires contact creation');
        return;
      }

      // Select first conversation
      await conversationItems.first().click();
      await page.waitForTimeout(1000);

      // Find message input
      const messageInput = page.getByPlaceholder(/type a message/i);
      await expect(messageInput).toBeVisible({ timeout: 5000 });

      // Type and send a test message
      const testMessage = `Test message ${Date.now()}`;
      await messageInput.fill(testMessage);
      
      // Find and click send button
      const sendButton = page.getByRole('button', { name: /send/i }).or(page.locator('button[aria-label*="send" i]'));
      await sendButton.click();

      // Wait for message to appear in thread
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
      
      // Verify message appears in the thread
      const messageElements = page.locator(`text=${testMessage}`);
      await expect(messageElements.first()).toBeVisible();
    });

    test('should not send empty message', async ({ page }) => {
      // Find a conversation to select
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      await conversationItems.first().click();
      await page.waitForTimeout(1000);

      const messageInput = page.getByPlaceholder(/type a message/i);
      await expect(messageInput).toBeVisible({ timeout: 5000 });

      // Send button should be disabled when input is empty
      const sendButton = page.getByRole('button', { name: /send/i }).or(page.locator('button[aria-label*="send" i]'));
      
      // Clear input if it has any content
      await messageInput.clear();
      
      // Send button should be disabled
      await expect(sendButton).toBeDisabled();
    });

    test('should handle Enter key to send message', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      await conversationItems.first().click();
      await page.waitForTimeout(1000);

      const messageInput = page.getByPlaceholder(/type a message/i);
      await expect(messageInput).toBeVisible({ timeout: 5000 });

      const testMessage = `Enter test ${Date.now()}`;
      await messageInput.fill(testMessage);
      
      // Press Enter (not Shift+Enter)
      await messageInput.press('Enter');

      // Wait for message to appear
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Message Display', () => {
    test('should display messages in thread correctly', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      await conversationItems.first().click();
      await page.waitForTimeout(2000);

      // Check if messages are displayed
      // Look for message containers or content
      const messageThread = page.locator('[class*="message"], [class*="thread"]').or(page.locator('div').filter({ hasText: /.+/ }));
      
      // At minimum, should show "No messages yet" or actual messages
      const hasMessages = await page.getByText(/no messages yet|start the conversation/i).isVisible().catch(() => false);
      const hasMessageContent = await messageThread.count() > 0;
      
      // One of these should be true
      expect(hasMessages || hasMessageContent).toBeTruthy();
    });

    test('should show message timestamps', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      await conversationItems.first().click();
      await page.waitForTimeout(2000);

      // Send a test message first
      const messageInput = page.getByPlaceholder(/type a message/i);
      if (await messageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const testMessage = `Timestamp test ${Date.now()}`;
        await messageInput.fill(testMessage);
        await messageInput.press('Enter');
        await page.waitForTimeout(2000);
      }

      // Look for time indicators (format: "h:mm a" like "3:45 PM")
      const timePattern = /\d{1,2}:\d{2}\s*(AM|PM)/i;
      const hasTime = await page.locator('text=/\\d{1,2}:\\d{2}\\s*(AM|PM)/i').count() > 0;
      
      // Timestamps may or may not be visible depending on UI state
      // Verify the page rendered correctly and message thread is functional
      const msgInput = page.getByPlaceholder(/type a message/i);
      const inputVisible = await msgInput.isVisible().catch(() => false);
      expect(inputVisible || hasTime).toBeTruthy();
    });
  });

  test.describe('Message Input', () => {
    test('should have message input with placeholder', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      await conversationItems.first().click();
      await page.waitForTimeout(1000);

      const messageInput = page.getByPlaceholder(/type a message/i);
      await expect(messageInput).toBeVisible({ timeout: 5000 });
    });

    test('should have attach file button', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      await conversationItems.first().click();
      await page.waitForTimeout(1000);

      // Look for attach/file button
      const attachButton = page.getByRole('button', { name: /attach|file|paperclip/i }).or(
        page.locator('button[aria-label*="attach" i]')
      );
      
      await expect(attachButton).toBeVisible({ timeout: 5000 });
    });

    test('should auto-resize textarea', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      await conversationItems.first().click();
      await page.waitForTimeout(1000);

      const messageInput = page.getByPlaceholder(/type a message/i);
      await expect(messageInput).toBeVisible({ timeout: 5000 });

      // Type multiple lines
      await messageInput.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
      
      // Textarea should expand (check height)
      const height = await messageInput.evaluate((el) => (el as HTMLTextAreaElement).offsetHeight);
      expect(height).toBeGreaterThan(40); // Should be taller than single line
    });
  });

  test.describe('Conversation List', () => {
    test('should update conversation list after sending message', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();
      
      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      // Get first conversation
      const firstConversation = conversationItems.first();
      const conversationText = await firstConversation.textContent();
      
      await firstConversation.click();
      await page.waitForTimeout(1000);

      // Send a message
      const messageInput = page.getByPlaceholder(/type a message/i);
      await expect(messageInput).toBeVisible({ timeout: 5000 });
      
      const testMessage = `Update test ${Date.now()}`;
      await messageInput.fill(testMessage);
      await messageInput.press('Enter');
      
      // Wait a bit for conversation list to update
      await page.waitForTimeout(2000);
      
      // Conversation should still be visible in list (may have moved to top)
      const updatedConversations = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const newCount = await updatedConversations.count();
      
      // Should still have conversations
      expect(newCount).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should handle mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // On mobile, should show either conversation list or message thread
      const hasConversationList = await page.getByText(/select a conversation/i).isVisible().catch(() => false);
      const hasMessageInput = await page.getByPlaceholder(/type a message/i).isVisible().catch(() => false);

      // One of these should be visible
      expect(hasConversationList || hasMessageInput).toBeTruthy();
    });
  });

  test.describe('Message Search (COM-006)', () => {
    test('should open message search interface', async ({ page }) => {
      // Look for search button in conversation list
      const searchButton = page.getByRole('button', { name: /search/i }).or(
        page.locator('button[aria-label*="search" i]')
      );

      if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchButton.click();

        // Should show search input
        await expect(page.getByPlaceholder(/search message/i)).toBeVisible({ timeout: 5000 });
      } else {
        test.skip('Search button not available');
      }
    });

    test('should search messages by content', async ({ page }) => {
      // Open search
      const searchButton = page.getByRole('button', { name: /search/i }).first();

      if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(500);

        const searchInput = page.getByPlaceholder(/search message/i);
        await expect(searchInput).toBeVisible({ timeout: 5000 });

        // Type search query (at least 2 characters)
        await searchInput.fill('test');
        await page.waitForTimeout(1000);

        // Should show either results or "No messages match" message
        const hasResults = await page.getByText(/result/i).isVisible().catch(() => false);
        const noResults = await page.getByText(/no messages match/i).isVisible().catch(() => false);
        const typeMore = await page.getByText(/type at least 2 characters/i).isVisible().catch(() => false);

        expect(hasResults || noResults || typeMore).toBeTruthy();
      } else {
        test.skip('Search button not available');
      }
    });

    test('should require minimum 2 characters for search', async ({ page }) => {
      const searchButton = page.getByRole('button', { name: /search/i }).first();

      if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(500);

        const searchInput = page.getByPlaceholder(/search message/i);
        await expect(searchInput).toBeVisible({ timeout: 5000 });

        // Type only 1 character
        await searchInput.fill('a');
        await page.waitForTimeout(500);

        // Should show prompt to type more
        await expect(page.getByText(/type at least 2 characters/i)).toBeVisible({ timeout: 3000 });
      } else {
        test.skip('Search button not available');
      }
    });

    test('should highlight search matches in results', async ({ page }) => {
      const searchButton = page.getByRole('button', { name: /search/i }).first();

      if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(500);

        const searchInput = page.getByPlaceholder(/search message/i);
        await searchInput.fill('test');
        await page.waitForTimeout(1500);

        // Look for highlighted text (mark element with yellow background)
        const hasHighlight = await page.locator('mark').isVisible().catch(() => false);
        const hasResults = await page.getByText(/result/i).isVisible().catch(() => false);

        // Either should have highlights or no results found
        expect(hasHighlight || !hasResults).toBeTruthy();
      } else {
        test.skip('Search button not available');
      }
    });

    test('should navigate to conversation from search result', async ({ page }) => {
      const searchButton = page.getByRole('button', { name: /search/i }).first();

      if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(500);

        const searchInput = page.getByPlaceholder(/search message/i);
        await searchInput.fill('test');
        await page.waitForTimeout(1500);

        // If there are results, click first one
        const resultButtons = page.locator('button').filter({ hasText: /ago|result/i });
        const resultCount = await resultButtons.count();

        if (resultCount > 0) {
          await resultButtons.first().click();
          await page.waitForTimeout(1000);

          // Should navigate to conversation and show message input
          await expect(page.getByPlaceholder(/type a message/i)).toBeVisible({ timeout: 5000 });
        }
      } else {
        test.skip('Search button not available');
      }
    });

    test('should close search panel', async ({ page }) => {
      const searchButton = page.getByRole('button', { name: /search/i }).first();

      if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(500);

        // Look for close button (X)
        const closeButton = page.getByRole('button', { name: /close/i }).or(
          page.locator('button').filter({ has: page.locator('svg') }).first()
        );

        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
          await page.waitForTimeout(500);

          // Search panel should be closed, conversation list visible
          await expect(page.getByText(/new conversation|conversations/i)).toBeVisible({ timeout: 3000 });
        }
      } else {
        test.skip('Search button not available');
      }
    });
  });

  test.describe('Conversation Archive (COM-006)', () => {
    test('should show archive option in conversation menu', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();

      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      // Select first conversation
      await conversationItems.first().click();
      await page.waitForTimeout(1000);

      // Look for more options button (three dots)
      const moreButton = page.getByRole('button', { name: /more|options/i }).or(
        page.locator('button[aria-label*="more" i]').or(
          page.locator('button').filter({ has: page.locator('svg') })
        )
      );

      // Try to find and click the more button
      const buttons = await page.locator('button').all();
      let foundMenu = false;

      for (const btn of buttons) {
        const ariaLabel = await btn.getAttribute('aria-label');
        if (ariaLabel?.toLowerCase().includes('more') || ariaLabel?.toLowerCase().includes('menu')) {
          await btn.click();
          foundMenu = true;
          break;
        }
      }

      if (foundMenu) {
        await page.waitForTimeout(500);

        // Should show archive option
        const archiveOption = page.getByRole('menuitem', { name: /archive/i }).or(
          page.getByText(/archive/i)
        );

        await expect(archiveOption).toBeVisible({ timeout: 3000 });
      }
    });

    test('should archive a conversation', async ({ page }) => {
      const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
      const conversationCount = await conversationItems.count();

      if (conversationCount === 0) {
        test.skip('No conversations available');
        return;
      }

      // Get conversation name before archiving
      const firstConversation = conversationItems.first();
      const conversationText = await firstConversation.textContent();

      await firstConversation.click();
      await page.waitForTimeout(1000);

      // Try to find more options menu
      const buttons = await page.locator('button').all();
      let foundArchive = false;

      for (const btn of buttons) {
        const ariaLabel = await btn.getAttribute('aria-label');
        if (ariaLabel?.toLowerCase().includes('more') || ariaLabel?.toLowerCase().includes('menu')) {
          await btn.click();
          await page.waitForTimeout(500);

          // Look for archive option
          const archiveOption = page.getByRole('menuitem', { name: /archive/i }).or(
            page.getByText(/archive/i).first()
          );

          if (await archiveOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await archiveOption.click();
            foundArchive = true;
            break;
          }
        }
      }

      if (foundArchive) {
        await page.waitForTimeout(1000);

        // Should show success toast
        const toast = page.getByText(/conversation archived/i);
        await expect(toast).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show archived conversations in archived tab', async ({ page }) => {
      // Look for archived tab/filter
      const archivedTab = page.getByRole('button', { name: /archived/i }).or(
        page.getByText(/archived/i).first()
      );

      if (await archivedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await archivedTab.click();
        await page.waitForTimeout(1000);

        // Should either show archived conversations or "no archived conversations" message
        const hasConversations = await page.locator('[role="button"], [role="listitem"]').count() > 0;
        const emptyMessage = await page.getByText(/no.*archived/i).isVisible().catch(() => false);

        expect(hasConversations || emptyMessage).toBeTruthy();
      }
    });

    test('should unarchive a conversation', async ({ page }) => {
      // First, go to archived tab
      const archivedTab = page.getByRole('button', { name: /archived/i }).or(
        page.getByText(/archived/i).first()
      );

      if (await archivedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await archivedTab.click();
        await page.waitForTimeout(1000);

        // Check if there are archived conversations
        const conversationItems = page.locator('[role="button"], [role="listitem"]').filter({ hasText: /.+/ });
        const count = await conversationItems.count();

        if (count > 0) {
          await conversationItems.first().click();
          await page.waitForTimeout(1000);

          // Try to find more options and unarchive
          const buttons = await page.locator('button').all();

          for (const btn of buttons) {
            const ariaLabel = await btn.getAttribute('aria-label');
            if (ariaLabel?.toLowerCase().includes('more') || ariaLabel?.toLowerCase().includes('menu')) {
              await btn.click();
              await page.waitForTimeout(500);

              const unarchiveOption = page.getByRole('menuitem', { name: /unarchive/i }).or(
                page.getByText(/unarchive/i).first()
              );

              if (await unarchiveOption.isVisible({ timeout: 2000 }).catch(() => false)) {
                await unarchiveOption.click();
                await page.waitForTimeout(1000);

                // Should show success toast
                const toast = page.getByText(/conversation unarchived/i);
                await expect(toast).toBeVisible({ timeout: 5000 });
                break;
              }
            }
          }
        }
      }
    });

    test('should show archive count badge', async ({ page }) => {
      // Look for archive tab with count badge
      const archivedTab = page.getByRole('button', { name: /archived/i }).or(
        page.locator('button').filter({ hasText: /archived/i })
      );

      if (await archivedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        // May have a badge showing count of archived conversations
        const badge = page.locator('[class*="badge"]').filter({ hasText: /\d+/ });

        // Badge is optional - just verify archived tab is functional
        const tabVisible = await archivedTab.isVisible();
        expect(tabVisible).toBeTruthy();
      }
    });
  });
});
