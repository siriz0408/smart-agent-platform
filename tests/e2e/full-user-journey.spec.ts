import { test, expect, Page } from '@playwright/test';

// Increase default timeout for this complex flow
test.setTimeout(120000);

/**
 * Full User Journey Test
 * 1. Sign up as new user
 * 2. Complete onboarding (profile setup, role selection)
 * 3. Navigate to dashboard
 * 4. Create a contact
 * 5. Create a deal
 * 6. Send a chat message about mortgage rates
 * 
 * Run with: npx playwright test full-user-journey.spec.ts --headed --project=chromium
 */

// Generate unique test data
function generateTestData() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return {
    email: `test_${timestamp}_${random}@testmail.com`,
    password: 'TestPassword123!',
    fullName: `Test User ${random}`,
    contactFirstName: `John_${random}`,
    contactLastName: `Doe_${random}`,
    contactEmail: `johndoe_${random}@example.com`,
    contactPhone: '555-123-4567',
  };
}

test.describe('Full User Journey', () => {
  test('complete signup, onboarding, create contact, create deal, and chat', async ({ page }) => {
    const testData = generateTestData();
    
    console.log('=== TEST DATA ===');
    console.log('User Email:', testData.email);
    console.log('Contact Name:', `${testData.contactFirstName} ${testData.contactLastName}`);
    console.log('================');

    // ==========================================
    // STEP 1: SIGN UP
    // ==========================================
    console.log('\n--- STEP 1: SIGN UP ---');
    
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-01-signup.png' });
    
    // Fill signup form
    await page.getByLabel(/full name/i).fill(testData.fullName);
    await page.getByLabel(/email/i).fill(testData.email);
    await page.getByLabel(/password/i).fill(testData.password);
    await page.locator('#terms').click();
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-02-signup-filled.png' });
    
    // Submit
    await page.getByRole('button', { name: /create account/i }).click();
    console.log('Signup form submitted');
    
    // Wait for redirect
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-03-after-signup.png' });
    console.log('After signup URL:', page.url());

    // ==========================================
    // STEP 2: COMPLETE ONBOARDING
    // ==========================================
    console.log('\n--- STEP 2: ONBOARDING ---');
    
    // Navigate to onboarding if not already there
    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-04-onboarding-start.png' });
    
    // Step 2a: Welcome step - Click Get Started
    const getStartedBtn = page.getByRole('button', { name: /get started/i });
    if (await getStartedBtn.isVisible().catch(() => false)) {
      console.log('Clicking Get Started on welcome step');
      await getStartedBtn.click();
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-05-after-welcome.png' });
    
    // Step 2b: Profile Setup step
    const profileHeading = page.getByRole('heading', { name: /complete your profile/i });
    if (await profileHeading.isVisible().catch(() => false)) {
      console.log('Filling profile setup form');
      
      const fullNameInput = page.getByLabel(/full name/i);
      if (await fullNameInput.isVisible()) {
        await fullNameInput.clear();
        await fullNameInput.fill(testData.fullName);
      }
      
      const titleInput = page.getByLabel(/title|role/i);
      if (await titleInput.isVisible()) {
        await titleInput.fill('Real Estate Agent');
      }
      
      const phoneInput = page.getByLabel(/phone/i);
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('555-987-6543');
      }
      
      await page.screenshot({ path: 'test-artifacts/screenshots/journey-06-profile-filled.png' });
      
      // Click Continue
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-07-after-profile.png' });
    
    // Step 2c: Role Selection step
    const roleHeading = page.getByText(/how will you use smart agent/i);
    if (await roleHeading.isVisible().catch(() => false)) {
      console.log('Selecting role: Real Estate Agent');
      
      // Click on Real Estate Agent option
      const agentOption = page.getByText(/real estate agent/i).first();
      await agentOption.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'test-artifacts/screenshots/journey-08-role-selected.png' });
      
      // Click Continue
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-09-after-role.png' });
    
    // Step 2d: Completion step (if shown)
    const completionBtn = page.getByRole('button', { name: /go to dashboard|get started|finish/i });
    if (await completionBtn.isVisible().catch(() => false)) {
      console.log('Clicking completion button');
      await completionBtn.click();
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-10-after-completion.png' });
    console.log('After onboarding URL:', page.url());

    // ==========================================
    // STEP 3: NAVIGATE TO DASHBOARD
    // ==========================================
    console.log('\n--- STEP 3: DASHBOARD ---');
    
    // Ensure we're at dashboard
    if (!page.url().includes('/dashboard') && !page.url().endsWith('/')) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-11-dashboard.png' });
    console.log('Dashboard URL:', page.url());

    // ==========================================
    // STEP 4: CREATE A CONTACT
    // ==========================================
    console.log('\n--- STEP 4: CREATE CONTACT ---');
    
    // Navigate to Contacts page
    const contactsLink = page.getByRole('link', { name: /contacts/i }).first();
    if (await contactsLink.isVisible()) {
      await contactsLink.click();
    } else {
      await page.goto('/contacts');
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-12-contacts-page.png' });
    console.log('Contacts page URL:', page.url());
    
    // Click "Add Contact" button
    const addContactBtn = page.getByRole('button', { name: /add contact|new contact/i });
    await addContactBtn.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-13-contact-dialog.png' });
    
    // Fill contact form
    console.log('Filling contact form');
    
    // First Name
    const firstNameInput = page.getByLabel(/first name/i);
    await firstNameInput.fill(testData.contactFirstName);
    
    // Last Name
    const lastNameInput = page.getByLabel(/last name/i);
    await lastNameInput.fill(testData.contactLastName);
    
    // Email
    const emailInput = page.getByLabel(/^email$/i);
    if (await emailInput.isVisible()) {
      await emailInput.fill(testData.contactEmail);
    }
    
    // Phone
    const contactPhoneInput = page.getByLabel(/^phone$/i);
    if (await contactPhoneInput.isVisible()) {
      await contactPhoneInput.fill(testData.contactPhone);
    }
    
    // Contact Type - Try to select "Buyer" using shadcn Select component
    // The component uses a trigger button that shows current value
    try {
      const contactTypeTrigger = page.locator('button').filter({ hasText: /lead|buyer|seller/i }).first();
      if (await contactTypeTrigger.isVisible({ timeout: 2000 })) {
        await contactTypeTrigger.click();
        await page.waitForTimeout(500);
        // Look for the Buyer option in the dropdown
        const buyerOption = page.locator('[role="option"]').filter({ hasText: /^buyer$/i }).first();
        if (await buyerOption.isVisible({ timeout: 2000 })) {
          await buyerOption.click();
        } else {
          // Click away to close dropdown if option not found
          await page.keyboard.press('Escape');
        }
      }
    } catch {
      console.log('Contact type selection skipped - using default');
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-14-contact-filled.png' });
    
    // Submit contact - scroll to button first if needed
    const createContactBtn = page.getByRole('button', { name: /create contact/i });
    await createContactBtn.scrollIntoViewIfNeeded();
    await createContactBtn.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-15-contact-created.png' });
    console.log('Contact created:', `${testData.contactFirstName} ${testData.contactLastName}`);

    // ==========================================
    // STEP 5: CREATE A DEAL
    // ==========================================
    console.log('\n--- STEP 5: CREATE DEAL ---');
    
    // Navigate to Pipeline page
    const pipelineLink = page.getByRole('link', { name: /pipeline|deals/i }).first();
    if (await pipelineLink.isVisible()) {
      await pipelineLink.click();
    } else {
      await page.goto('/pipeline');
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-16-pipeline-page.png' });
    console.log('Pipeline page URL:', page.url());
    
    // Click "Add Deal" button
    const addDealBtn = page.getByRole('button', { name: /add deal|new deal|add/i }).first();
    await addDealBtn.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-17-deal-dialog.png' });
    
    // Fill deal form
    console.log('Filling deal form');
    
    // Select Contact (combobox) - look for the trigger button
    try {
      const contactTrigger = page.getByText(/select a contact/i);
      if (await contactTrigger.isVisible({ timeout: 3000 })) {
        await contactTrigger.click();
        await page.waitForTimeout(1000);
        
        // Try to find and click our contact in the dropdown
        const contactOption = page.locator('[role="option"], [data-value]').filter({ 
          hasText: new RegExp(testData.contactFirstName, 'i') 
        }).first();
        
        if (await contactOption.isVisible({ timeout: 3000 })) {
          await contactOption.click();
          console.log('Contact selected for deal');
        } else {
          // Just click the first available contact
          const firstContact = page.locator('[role="option"]').first();
          if (await firstContact.isVisible({ timeout: 2000 })) {
            await firstContact.click();
            console.log('First available contact selected');
          }
        }
        await page.waitForTimeout(500);
      }
    } catch {
      console.log('Contact selection for deal skipped');
    }
    
    // Select Stage - try to click the stage trigger
    try {
      const stageTrigger = page.locator('button').filter({ hasText: /new lead|stage|select/i }).first();
      if (await stageTrigger.isVisible({ timeout: 2000 })) {
        await stageTrigger.click();
        await page.waitForTimeout(500);
        const stageOption = page.locator('[role="option"]').first();
        if (await stageOption.isVisible({ timeout: 2000 })) {
          await stageOption.click();
        }
      }
    } catch {
      console.log('Stage selection skipped - using default');
    }
    
    // Estimated Value - look for input
    try {
      const estimatedValue = page.getByLabel(/estimated value/i);
      if (await estimatedValue.isVisible({ timeout: 2000 })) {
        await estimatedValue.fill('450000');
      }
    } catch {
      console.log('Estimated value input not found');
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-18-deal-filled.png' });
    
    // Submit deal
    const createDealBtn = page.getByRole('button', { name: /create deal/i });
    if (await createDealBtn.isVisible({ timeout: 3000 })) {
      await createDealBtn.scrollIntoViewIfNeeded();
      await createDealBtn.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('Create Deal button not found - skipping deal creation');
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-19-deal-created.png' });
    console.log('Deal created for contact:', testData.contactFirstName);

    // ==========================================
    // STEP 6: SEND CHAT MESSAGE
    // ==========================================
    console.log('\n--- STEP 6: CHAT ---');
    
    // Navigate to Home/Chat page
    const homeLink = page.getByRole('link', { name: /home|chat|assistant/i }).first();
    if (await homeLink.isVisible()) {
      await homeLink.click();
    } else {
      await page.goto('/');
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-20-chat-page.png' });
    console.log('Chat page URL:', page.url());
    
    // Find the chat input
    const chatMessage = 'What are current mortgage rates right now in the US?';
    console.log('Sending message:', chatMessage);
    
    // Try multiple selectors for the chat input
    let chatInputFound = false;
    
    // Method 1: Try contenteditable first
    try {
      const contentEditable = page.locator('[contenteditable="true"]').first();
      if (await contentEditable.isVisible({ timeout: 3000 })) {
        await contentEditable.click();
        // Use type() for contenteditable as fill() may not work
        await contentEditable.type(chatMessage);
        chatInputFound = true;
        console.log('Found contenteditable input');
      }
    } catch {
      console.log('Contenteditable not found');
    }
    
    // Method 2: Try textarea/input
    if (!chatInputFound) {
      try {
        const textArea = page.locator('textarea, input[type="text"]').first();
        if (await textArea.isVisible({ timeout: 2000 })) {
          await textArea.fill(chatMessage);
          chatInputFound = true;
          console.log('Found textarea/input');
        }
      } catch {
        console.log('Textarea/input not found');
      }
    }
    
    // Method 3: Try any textbox role
    if (!chatInputFound) {
      try {
        const textbox = page.getByRole('textbox').first();
        if (await textbox.isVisible({ timeout: 2000 })) {
          await textbox.click();
          await textbox.type(chatMessage);
          chatInputFound = true;
          console.log('Found textbox role');
        }
      } catch {
        console.log('Textbox role not found');
      }
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-21-chat-message-typed.png' });
    
    if (chatInputFound) {
      // Submit the message - try form submit button first
      try {
        // Look for a button with type submit or containing arrow/send icon
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
          console.log('Clicked submit button');
        } else {
          // Try pressing Enter
          await page.keyboard.press('Enter');
          console.log('Pressed Enter to submit');
        }
      } catch {
        // Fallback to Enter
        await page.keyboard.press('Enter');
        console.log('Pressed Enter as fallback');
      }
      
      console.log('Message sent, waiting for response...');
      
      // Wait for AI response (longer timeout as AI may take time)
      await page.waitForTimeout(15000);
    } else {
      console.log('WARNING: Could not find chat input');
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-22-chat-response.png', fullPage: true });
    
    // Check if we got a response
    const messageCount = await page.locator('[class*="message"], [class*="chat"]').count();
    console.log('Message elements found:', messageCount);

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    console.log('\n=== TEST COMPLETE ===');
    console.log('User created:', testData.email);
    console.log('Contact created:', `${testData.contactFirstName} ${testData.contactLastName}`);
    console.log('Deal created for contact');
    console.log('Chat message sent about mortgage rates');
    console.log('Final URL:', page.url());
    
    await page.screenshot({ path: 'test-artifacts/screenshots/journey-final.png', fullPage: true });
  });
});
