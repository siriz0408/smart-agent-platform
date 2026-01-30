-- Migration: Create external_properties table
-- Part of Phase 2 Architecture Revamp - Sprint 2.1.2

-- Create property source enum
CREATE TYPE public.property_source AS ENUM ('zillow', 'redfin', 'realtor', 'manual');

-- Create external_properties table for Zillow/Redfin/etc listings
CREATE TABLE public.external_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source property_source NOT NULL,
  external_id TEXT NOT NULL,
  address_id UUID REFERENCES public.addresses(id),

  -- Property details
  price DECIMAL(12, 2),
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  square_feet INTEGER,
  lot_size INTEGER,
  year_built INTEGER,
  property_type TEXT,
  status TEXT,
  description TEXT,
  photos TEXT[],

  -- Raw data from source for future extraction
  raw_data JSONB,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Prevent duplicate external properties
  UNIQUE(source, external_id)
);

-- Create indexes
CREATE INDEX idx_external_properties_source ON public.external_properties(source);
CREATE INDEX idx_external_properties_address ON public.external_properties(address_id);
CREATE INDEX idx_external_properties_price ON public.external_properties(price);
CREATE INDEX idx_external_properties_status ON public.external_properties(status);

-- Enable RLS
ALTER TABLE public.external_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read only (external data is not tenant-specific)
CREATE POLICY "Anyone can read external properties"
  ON public.external_properties FOR SELECT
  USING (true);

-- Only service role can insert/update (via edge functions)
CREATE POLICY "Service role can insert external properties"
  ON public.external_properties FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update external properties"
  ON public.external_properties FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_external_properties_updated_at
  BEFORE UPDATE ON public.external_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.external_properties IS 'External property listings from Zillow, Redfin, Realtor.com, etc.';
