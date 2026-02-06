/**
 * Contact data validation and quality utilities
 */

/**
 * Validates phone number format
 * Accepts various formats, checks that it has 10-15 digits
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return true; // Empty is OK (optional)
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Formats phone number to (XXX) XXX-XXXX format
 */
export function formatPhone(phone: string): string {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone; // Return as-is if not standard US format
}

/**
 * Calculates contact data completeness score (0-100)
 * Core fields: name (required), email, phone, company
 * Extended fields: contact_type, notes, buyer/seller preferences
 */
export function calculateContactCompleteness(contact: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  contact_type?: string | null;
  notes?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  preferred_beds?: number | null;
  preferred_baths?: number | null;
  preferred_areas?: string[] | null;
  owned_property_address?: string | null;
  seller_motivation?: string | null;
}): number {
  const coreFields = [
    contact.first_name,
    contact.last_name,
    contact.email,
    contact.phone,
    contact.company,
  ];
  const coreScore = (coreFields.filter(Boolean).length / coreFields.length) * 50;

  const extendedFields = [
    contact.contact_type,
    contact.notes,
    contact.price_min,
    contact.price_max,
    contact.preferred_beds,
    contact.preferred_baths,
    contact.preferred_areas && contact.preferred_areas.length > 0,
    contact.owned_property_address,
    contact.seller_motivation,
  ];
  const extendedScore = (extendedFields.filter(Boolean).length / extendedFields.length) * 50;

  return Math.round(coreScore + extendedScore);
}

/**
 * Gets completeness badge variant based on score
 */
export function getCompletenessVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

/**
 * Gets completeness label
 */
export function getCompletenessLabel(score: number): string {
  if (score >= 80) return "Complete";
  if (score >= 50) return "Partial";
  return "Incomplete";
}
