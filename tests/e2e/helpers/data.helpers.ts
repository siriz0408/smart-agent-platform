import { Page, expect } from '@playwright/test';

/**
 * Test Data Helpers for E2E Tests
 *
 * Reusable functions that create domain entities (contacts, deals,
 * properties, documents) through the UI, following the same flows
 * a real user would take.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  type?: 'lead' | 'buyer' | 'seller' | 'vendor' | 'other';
}

export interface DealData {
  /** Estimated deal value in dollars */
  estimatedValue: string;
  /** Contact to associate (first name or search term – selects the first match) */
  contactSearch?: string;
  /** Commission rate, e.g. "3.0" */
  commissionRate?: string;
  /** Earnest money amount */
  earnestMoney?: string;
  /** Option fee amount */
  optionFee?: string;
  /** Pipeline type (buyer vs seller). Defaults to 'buyer'. */
  pipelineType?: 'buyer' | 'seller';
  /** Stage to set, e.g. 'prospect'. If omitted the default stage is used. */
  stage?: string;
}

export interface PropertyData {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  price: string;
  beds?: string;
  baths?: string;
  sqft?: string;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

/**
 * Create a new contact through the UI.
 * Navigates to /contacts if not already there, fills the dialog, and submits.
 *
 * @returns The generated email used for the contact (useful for later lookups).
 */
export async function createContact(
  page: Page,
  data: ContactData,
): Promise<string> {
  // Ensure we're on the contacts page
  if (!page.url().includes('/contacts')) {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
  }

  await expect(
    page.getByRole('button', { name: /add contact/i }),
  ).toBeVisible({ timeout: 10000 });

  // Open create dialog
  await page.getByRole('button', { name: /add contact/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

  // Fill basic info
  await page.locator('input[name="first_name"]').fill(data.firstName);
  await page.locator('input[name="last_name"]').fill(data.lastName);

  const email =
    data.email ??
    `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}.${Date.now()}@test.com`;
  await page.locator('input[name="email"]').fill(email);

  if (data.phone) {
    const phoneInput = page.locator('input[name="phone"]');
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill(data.phone);
    }
  }

  // Select contact type if specified
  if (data.type) {
    const typeSelect = page
      .locator('[role="dialog"]')
      .locator('button')
      .filter({ hasText: /lead|buyer|seller/i })
      .first();
    if (await typeSelect.isVisible().catch(() => false)) {
      await typeSelect.click();
      await page
        .locator('[role="option"]')
        .filter({ hasText: new RegExp(`^${data.type}$`, 'i') })
        .click();
    }
  }

  // Submit
  await page.getByRole('button', { name: /create contact/i }).click();

  // Wait for dialog to close (success indicator)
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

  return email;
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

/**
 * Create a new deal through the pipeline UI.
 * Navigates to the correct pipeline tab, fills the dialog, and submits.
 */
export async function createDeal(page: Page, data: DealData): Promise<void> {
  const pipelineType = data.pipelineType ?? 'buyer';
  const pipelineUrl = `/pipeline/${pipelineType === 'seller' ? 'sellers' : 'buyers'}`;

  // Navigate to pipeline if not already there
  if (!page.url().includes('/pipeline')) {
    await page.goto(pipelineUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }

  // Switch to correct tab if needed
  const tabName = pipelineType === 'seller' ? /sellers/i : /buyers/i;
  const tab = page.getByRole('tab', { name: tabName });
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  // Open create dialog
  await page.getByRole('button', { name: /add deal/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

  // Select contact (pick first available)
  const contactCombobox = page.getByRole('combobox', { name: /contact/i });
  if (await contactCombobox.isVisible().catch(() => false)) {
    await contactCombobox.click();
    const contactOption = page.getByRole('option').first();
    if ((await contactOption.count()) > 0) {
      await contactOption.click();
    }
  }

  // Set stage if specified
  if (data.stage) {
    const stageCombobox = page.getByRole('combobox', { name: /stage/i });
    if (await stageCombobox.isVisible().catch(() => false)) {
      await stageCombobox.click();
      await page
        .getByRole('option', { name: new RegExp(data.stage, 'i') })
        .click();
    }
  }

  // Fill estimated value
  await page
    .getByRole('spinbutton', { name: /estimated value/i })
    .fill(data.estimatedValue);

  // Optional commission rate
  if (data.commissionRate) {
    const commissionInput = page.getByRole('spinbutton', {
      name: /commission rate/i,
    });
    if (await commissionInput.isVisible().catch(() => false)) {
      await commissionInput.fill(data.commissionRate);
    }
  }

  // Optional financials section
  if (data.earnestMoney || data.optionFee) {
    const financialsButton = page.getByRole('button', {
      name: /financials/i,
    });
    if (await financialsButton.isVisible().catch(() => false)) {
      await financialsButton.click();
    }

    if (data.earnestMoney) {
      await page
        .getByRole('spinbutton', { name: /earnest money/i })
        .fill(data.earnestMoney);
    }
    if (data.optionFee) {
      await page
        .getByRole('spinbutton', { name: /option fee/i })
        .fill(data.optionFee);
    }
  }

  // Submit
  await page.getByRole('button', { name: /create deal/i }).click();
  await expect(page.getByText(/deal created/i)).toBeVisible({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

/**
 * Create a new property through the UI.
 * Navigates to /properties, fills the dialog, and submits.
 */
export async function createProperty(
  page: Page,
  data: PropertyData,
): Promise<void> {
  // Ensure we're on the properties page
  if (!page.url().includes('/properties')) {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
  }

  await expect(
    page.getByRole('button', { name: /add property/i }),
  ).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: /add property/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

  // Required fields
  await page
    .getByRole('textbox', { name: /street address/i })
    .fill(data.streetAddress);
  await page.getByRole('textbox', { name: /city/i }).fill(data.city);

  // Select state
  const stateCombobox = page.getByRole('combobox', { name: /state/i });
  if (await stateCombobox.isVisible().catch(() => false)) {
    await stateCombobox.click();
    await page
      .getByRole('option', { name: new RegExp(data.state, 'i') })
      .click();
  }

  await page.getByRole('textbox', { name: /zip code/i }).fill(data.zipCode);
  await page.getByRole('spinbutton', { name: /price/i }).fill(data.price);

  // Optional fields
  if (data.beds) {
    const bedsInput = page.getByRole('spinbutton', { name: /beds/i });
    if (await bedsInput.isVisible().catch(() => false)) {
      await bedsInput.fill(data.beds);
    }
  }
  if (data.baths) {
    const bathsInput = page.getByRole('spinbutton', { name: /baths/i });
    if (await bathsInput.isVisible().catch(() => false)) {
      await bathsInput.fill(data.baths);
    }
  }
  if (data.sqft) {
    const sqftInput = page.getByRole('spinbutton', { name: /sq ft/i });
    if (await sqftInput.isVisible().catch(() => false)) {
      await sqftInput.fill(data.sqft);
    }
  }

  // Submit (button text is "Add Property" in the dialog too)
  await page.getByRole('button', { name: /add property/i }).click();
  await expect(page.getByText(/property created/i)).toBeVisible({
    timeout: 5000,
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/**
 * Upload a document through the UI and optionally wait for indexing to complete.
 *
 * @param page       – Playwright Page
 * @param filePath   – Absolute path to the file to upload
 * @param name       – Optional display name (if the UI allows renaming)
 * @param waitForIndex – Wait for the "indexed" indicator (default true)
 */
export async function uploadDocument(
  page: Page,
  filePath: string,
  name?: string,
  waitForIndex = true,
): Promise<void> {
  // Navigate to documents page if needed
  if (!page.url().includes('/documents')) {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
  }

  // Open upload dialog / trigger file input
  const uploadButton = page
    .getByRole('button', { name: /upload|add document/i })
    .first();
  await expect(uploadButton).toBeVisible({ timeout: 10000 });

  // Set up a file chooser listener before clicking
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    uploadButton.click(),
  ]);

  await fileChooser.setFiles(filePath);

  // Fill optional name if the dialog has a name field
  if (name) {
    const nameInput = page.getByRole('textbox', { name: /name|title/i });
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(name);
    }
  }

  // Confirm upload if there's a separate confirm button
  const confirmButton = page.getByRole('button', { name: /upload|confirm|save/i });
  if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for indexing to finish
  if (waitForIndex) {
    await expect(
      page
        .getByText(/indexed|completed|ready/i)
        .or(page.getByText(/uploaded/i)),
    ).toBeVisible({ timeout: 30000 });
  }
}
