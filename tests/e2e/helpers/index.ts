/**
 * E2E Test Helpers – Central Re-export
 *
 * Import everything from this barrel file:
 *   import { signIn, createContact, goToDeals, expectToast } from '../helpers';
 *
 * The legacy helpers (login, navigateTo, anyVisible, firstVisible) are also
 * re-exported from `../fixtures/helpers` so existing tests keep working.
 */

// Auth helpers
export {
  signIn,
  signUp,
  signOut,
  getAuthenticatedPage,
} from './auth.helpers';

// Data-creation helpers
export {
  createContact,
  createDeal,
  createProperty,
  uploadDocument,
} from './data.helpers';
export type {
  ContactData,
  DealData,
  PropertyData,
} from './data.helpers';

// Navigation helpers
export {
  goToHome,
  goToContacts,
  goToDeals,
  goToProperties,
  goToDocuments,
  goToMessages,
  goToSettings,
  goToBilling,
  goToChat,
  goToOnboarding,
  goToAgents,
  goToGrowthMetrics,
} from './navigation.helpers';

// Assertion helpers
export {
  expectToast,
  expectTableRow,
  expectCardWithTitle,
  expectDialogVisible,
  expectDialogClosed,
  expectNoErrors,
  expectHeading,
  expectButtonEnabled,
  expectButtonDisabled,
  expectUrl,
} from './assertions.helpers';

// Re-export legacy helpers for backwards compatibility
export { login, navigateTo, anyVisible, firstVisible } from '../fixtures/helpers';
