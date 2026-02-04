-- CRM Data Enrichment Migration
-- Adds 50+ new fields to contacts, properties, and deals tables
-- All fields are nullable (non-breaking change)

-- ============================================================================
-- CONTACTS TABLE ENRICHMENT
-- ============================================================================

-- Buyer preferences
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS price_min numeric;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS price_max numeric;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_beds integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_baths numeric;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_areas text[];
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_property_types text[];

-- Seller info
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owned_property_address text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS seller_motivation text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS listing_timeline text;

-- Communication preferences
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_contact_method text; -- 'phone'|'email'|'text'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS best_time_to_call text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS secondary_phone text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS secondary_email text;

-- Lead tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_source text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_source text;

-- Financial status
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pre_approval_status text; -- 'none'|'pending'|'approved'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pre_approval_amount numeric;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lender_name text;

-- Timeline
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS urgency_level text; -- 'low'|'medium'|'high'|'immediate'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS target_move_date date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lease_expiration date;

-- ============================================================================
-- PROPERTIES TABLE ENRICHMENT
-- ============================================================================

-- HOA information
ALTER TABLE properties ADD COLUMN IF NOT EXISTS hoa_fee numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS hoa_name text;

-- Parking (aligned with Zillow parkingSpaces)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_spaces integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_type text; -- 'garage'|'carport'|'street'|'none'

-- HVAC
ALTER TABLE properties ADD COLUMN IF NOT EXISTS heating_type text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cooling_type text;

-- Schools (aligned with Zillow school data)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS school_district text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS elementary_school text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS middle_school text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS high_school text;

-- Taxes
ALTER TABLE properties ADD COLUMN IF NOT EXISTS annual_taxes numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_assessment numeric;

-- Marketing info (aligned with Zillow: daysOnMarket, brokerName, listingDate)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS days_on_market integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_date date;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_agent_name text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_agent_phone text;

-- ============================================================================
-- DEALS TABLE ENRICHMENT
-- ============================================================================

-- Financials
ALTER TABLE deals ADD COLUMN IF NOT EXISTS earnest_money numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS option_fee numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS appraisal_value numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS final_sale_price numeric;

-- Key dates
ALTER TABLE deals ADD COLUMN IF NOT EXISTS option_period_end date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS inspection_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS appraisal_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS financing_deadline date;

-- Contingencies (boolean flags with sensible defaults)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS has_inspection_contingency boolean DEFAULT true;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS has_financing_contingency boolean DEFAULT true;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS has_appraisal_contingency boolean DEFAULT true;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS has_sale_contingency boolean DEFAULT false;

-- Lender information
ALTER TABLE deals ADD COLUMN IF NOT EXISTS loan_type text; -- 'conventional'|'fha'|'va'|'usda'|'cash'
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lender_name text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS loan_officer_name text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS loan_officer_phone text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS loan_officer_email text;

-- Title/Escrow information
ALTER TABLE deals ADD COLUMN IF NOT EXISTS title_company text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS escrow_officer_name text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS escrow_officer_phone text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS title_policy_type text;

-- Additional participants (foreign keys to contacts)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS co_buyer_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS co_seller_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS attorney_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS inspector_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES FOR NEW COLUMNS (Performance optimization)
-- ============================================================================

-- Contacts indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_contacts_price_range ON contacts (price_min, price_max) WHERE price_min IS NOT NULL OR price_max IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_pre_approval_status ON contacts (pre_approval_status) WHERE pre_approval_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_urgency_level ON contacts (urgency_level) WHERE urgency_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_lead_source ON contacts (lead_source) WHERE lead_source IS NOT NULL;

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_hoa_fee ON properties (hoa_fee) WHERE hoa_fee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_school_district ON properties (school_district) WHERE school_district IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_days_on_market ON properties (days_on_market) WHERE days_on_market IS NOT NULL;

-- Deals indexes for date-based queries
CREATE INDEX IF NOT EXISTS idx_deals_inspection_date ON deals (inspection_date) WHERE inspection_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_appraisal_date ON deals (appraisal_date) WHERE appraisal_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_financing_deadline ON deals (financing_deadline) WHERE financing_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_loan_type ON deals (loan_type) WHERE loan_type IS NOT NULL;

-- Foreign key indexes for deal participants
CREATE INDEX IF NOT EXISTS idx_deals_co_buyer_contact_id ON deals (co_buyer_contact_id) WHERE co_buyer_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_co_seller_contact_id ON deals (co_seller_contact_id) WHERE co_seller_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_attorney_contact_id ON deals (attorney_contact_id) WHERE attorney_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_inspector_contact_id ON deals (inspector_contact_id) WHERE inspector_contact_id IS NOT NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN contacts.preferred_contact_method IS 'Preferred contact method: phone, email, or text';
COMMENT ON COLUMN contacts.pre_approval_status IS 'Pre-approval status: none, pending, or approved';
COMMENT ON COLUMN contacts.urgency_level IS 'Urgency level: low, medium, high, or immediate';

COMMENT ON COLUMN properties.parking_type IS 'Parking type: garage, carport, street, or none';
COMMENT ON COLUMN properties.days_on_market IS 'Number of days property has been on market (from Zillow)';

COMMENT ON COLUMN deals.loan_type IS 'Loan type: conventional, fha, va, usda, or cash';
COMMENT ON COLUMN deals.has_inspection_contingency IS 'Whether deal has inspection contingency';
COMMENT ON COLUMN deals.has_financing_contingency IS 'Whether deal has financing contingency';
COMMENT ON COLUMN deals.has_appraisal_contingency IS 'Whether deal has appraisal contingency';
COMMENT ON COLUMN deals.has_sale_contingency IS 'Whether deal has sale of home contingency';
