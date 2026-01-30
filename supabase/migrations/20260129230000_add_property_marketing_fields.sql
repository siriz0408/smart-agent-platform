-- Migration: Add marketing and listing fields to external_properties
-- Sprint 2: Property Card Data Mapping & Incremental UI Improvements

-- Add marketing/listing fields
ALTER TABLE public.external_properties
  ADD COLUMN IF NOT EXISTS days_on_market INTEGER,
  ADD COLUMN IF NOT EXISTS listing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS broker_name TEXT,
  ADD COLUMN IF NOT EXISTS listing_agent_name TEXT,
  ADD COLUMN IF NOT EXISTS listing_agent_phone TEXT,
  ADD COLUMN IF NOT EXISTS price_per_sqft NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS lot_size_sqft INTEGER;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_external_properties_days_on_market
  ON public.external_properties(days_on_market)
  WHERE days_on_market IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_properties_listing_date
  ON public.external_properties(listing_date);

-- Add comments
COMMENT ON COLUMN public.external_properties.days_on_market IS 'Number of days property has been listed (e.g., "4 days on Zillow")';
COMMENT ON COLUMN public.external_properties.broker_name IS 'Listing broker/agency name';
COMMENT ON COLUMN public.external_properties.listing_agent_name IS 'Primary listing agent name';
COMMENT ON COLUMN public.external_properties.price_per_sqft IS 'Calculated price per square foot';
COMMENT ON COLUMN public.external_properties.lot_size_sqft IS 'Lot size in square feet (may differ from square_feet which is living area)';
