import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Generate unique test email
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Helper function to login to the app
 */
export async function login(page: Page) {
  const email = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
  const password = process.env.TEST_USER_PASSWORD || 'Test1234';

  // Go directly to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Check if we need to log in (sign in button visible)
  const signInButton = page.getByRole('button', { name: /sign in/i });
  const isOnLoginPage = await signInButton.isVisible().catch(() => false);
  
  if (isOnLoginPage) {
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.getByRole('textbox', { name: /password/i }).fill(password);
    await signInButton.click();
  }
  
  // Wait for contacts link to appear (indicates successful login)
  await expect(page.getByRole('link', { name: /contacts/i })).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate to a page directly via URL (more reliable than clicking links)
 */
export async function navigateTo(page: Page, _linkName: RegExp, urlPath: string) {
  // Use direct navigation which is more reliable for SPA routing
  await page.goto(`/${urlPath}`);
  await page.waitForLoadState('networkidle');
  // Small wait for React hydration
  await page.waitForTimeout(500);
}

/**
 * Sign up as a specific role (agent, buyer, seller)
 */
export async function signUpAsRole(page: Page, role: 'agent' | 'buyer' | 'seller') {
  const email = generateTestEmail(role);
  const password = 'TestPass123!';

  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  
  // Fill signup form
  const emailInput = page.getByRole('textbox', { name: /email/i })
    .or(page.getByLabel(/email/i))
    .or(page.getByPlaceholder(/email/i));
  await emailInput.fill(email);
  
  const passwordInput = page.getByRole('textbox', { name: /password/i })
    .or(page.getByLabel(/password/i));
  await passwordInput.fill(password);
  
  // Submit signup
  const signupBtn = page.getByRole('button', { name: /sign up|create|get started/i });
  await signupBtn.click();
  
  await page.waitForTimeout(3000);
  
  // Complete onboarding with role selection
  await page.waitForURL(/onboarding|dashboard/i, { timeout: 10000 });
  
  // If onboarding, select role
  const roleOption = page.getByText(new RegExp(role, 'i'));
  if (await roleOption.isVisible()) {
    await roleOption.click();
    
    const nextBtn = page.getByRole('button', { name: /next|continue/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }
  }
  
  return { email, password };
}

/**
 * Upload a document (mock file path)
 */
export async function uploadDocument(page: Page, filePath: string) {
  await navigateTo(page, /documents/i, 'documents');
  
  const uploadBtn = page.getByRole('button', { name: /upload|add document/i }).first();
  await uploadBtn.click();
  await page.waitForTimeout(500);
  
  // Set file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  
  await page.waitForTimeout(2000);
}

/**
 * Create a contact with provided data
 */
export async function createContact(
  page: Page, 
  contactData: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    type?: 'lead' | 'buyer' | 'seller' | 'agent';
  }
) {
  await navigateTo(page, /contacts/i, 'contacts');
  
  // Click add contact
  const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
  await addBtn.click();
  await page.waitForTimeout(500);
  
  // Fill form
  const firstNameInput = page.getByLabel(/first name/i);
  await firstNameInput.fill(contactData.firstName);
  
  const lastNameInput = page.getByLabel(/last name/i);
  await lastNameInput.fill(contactData.lastName);
  
  if (contactData.email) {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill(contactData.email);
  }
  
  if (contactData.phone) {
    const phoneInput = page.getByLabel(/phone/i);
    await phoneInput.fill(contactData.phone);
  }
  
  if (contactData.type) {
    const typeSelect = page.getByLabel(/type/i);
    if (await typeSelect.isVisible()) {
      await typeSelect.click();
      await page.waitForTimeout(300);
      const option = page.getByRole('option', { name: new RegExp(contactData.type, 'i') });
      await option.click();
    }
  }
  
  // Submit
  const submitBtn = page.getByRole('button', { name: /save|create|add/i }).last();
  await submitBtn.click();
  await page.waitForTimeout(1000);
}

/**
 * Create a deal with provided data
 */
export async function createDeal(
  page: Page,
  dealData: {
    contactName?: string;
    stage?: string;
    value?: string;
    commissionRate?: string;
  }
) {
  await navigateTo(page, /pipeline/i, 'pipeline');
  
  // Click add deal
  const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
  await addBtn.click();
  await page.waitForTimeout(500);
  
  // Select contact if provided
  if (dealData.contactName) {
    const contactSelect = page.getByLabel(/contact/i);
    if (await contactSelect.isVisible()) {
      await contactSelect.click();
      await page.waitForTimeout(300);
      const option = page.getByRole('option', { name: new RegExp(dealData.contactName, 'i') });
      if (await option.isVisible()) {
        await option.click();
      }
    }
  }
  
  // Select stage if provided
  if (dealData.stage) {
    const stageSelect = page.getByLabel(/stage/i);
    if (await stageSelect.isVisible()) {
      await stageSelect.click();
      await page.waitForTimeout(300);
      const option = page.getByRole('option', { name: new RegExp(dealData.stage, 'i') });
      if (await option.isVisible()) {
        await option.click();
      }
    }
  }
  
  // Fill value
  if (dealData.value) {
    const valueInput = page.getByLabel(/value|price/i);
    if (await valueInput.isVisible()) {
      await valueInput.fill(dealData.value);
    }
  }
  
  // Fill commission rate
  if (dealData.commissionRate) {
    const rateInput = page.getByLabel(/commission|rate/i);
    if (await rateInput.isVisible()) {
      await rateInput.fill(dealData.commissionRate);
    }
  }
  
  // Submit
  const submitBtn = page.getByRole('button', { name: /save|create|add/i }).last();
  await submitBtn.click();
  await page.waitForTimeout(1000);
}

/**
 * Create a property with provided data
 */
export async function createProperty(
  page: Page,
  propertyData: {
    address: string;
    city?: string;
    state?: string;
    price?: string;
    beds?: string;
    baths?: string;
  }
) {
  await navigateTo(page, /properties/i, 'properties');
  
  // Click add property
  const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
  await addBtn.click();
  await page.waitForTimeout(500);
  
  // Fill address
  const addressInput = page.getByLabel(/address/i);
  await addressInput.fill(propertyData.address);
  
  if (propertyData.city) {
    const cityInput = page.getByLabel(/city/i);
    if (await cityInput.isVisible()) {
      await cityInput.fill(propertyData.city);
    }
  }
  
  if (propertyData.state) {
    const stateInput = page.getByLabel(/state/i);
    if (await stateInput.isVisible()) {
      await stateInput.fill(propertyData.state);
    }
  }
  
  if (propertyData.price) {
    const priceInput = page.getByLabel(/price/i);
    if (await priceInput.isVisible()) {
      await priceInput.fill(propertyData.price);
    }
  }
  
  if (propertyData.beds) {
    const bedsInput = page.getByLabel(/bed/i);
    if (await bedsInput.isVisible()) {
      await bedsInput.fill(propertyData.beds);
    }
  }
  
  if (propertyData.baths) {
    const bathsInput = page.getByLabel(/bath/i);
    if (await bathsInput.isVisible()) {
      await bathsInput.fill(propertyData.baths);
    }
  }
  
  // Submit
  const submitBtn = page.getByRole('button', { name: /save|create|add/i }).last();
  await submitBtn.click();
  await page.waitForTimeout(1000);
}

/**
 * Wait for a toast notification with specific text
 */
export async function waitForToast(page: Page, text: string | RegExp, timeout: number = 5000) {
  const textPattern = typeof text === 'string' ? new RegExp(text, 'i') : text;
  
  const toast = page.getByText(textPattern);
  await expect(toast).toBeVisible({ timeout });
  
  return toast;
}

/**
 * Run accessibility check using axe-core
 */
export async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  return {
    violations: results.violations,
    criticalViolations: results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    ),
    passes: results.passes,
    inapplicable: results.inapplicable,
  };
}

/**
 * Log out of the application
 */
export async function logout(page: Page) {
  // Look for user menu/avatar
  const userMenu = page.getByRole('button', { name: /menu|profile|user|avatar/i });
  if (await userMenu.isVisible()) {
    await userMenu.click();
    await page.waitForTimeout(300);
    
    const logoutBtn = page.getByRole('menuitem', { name: /log out|sign out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}
