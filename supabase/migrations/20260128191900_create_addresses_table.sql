-- Migration: Create addresses table
-- Part of Phase 2 Architecture Revamp - Sprint 2.1.1

-- Create addresses table for normalized address storage
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_address TEXT NOT NULL,
  unit TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  county TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  formatted_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Prevent duplicate addresses
  UNIQUE(street_address, unit, city, state, zip_code)
);

-- Create indexes for common queries
CREATE INDEX idx_addresses_city_state ON public.addresses(city, state);
CREATE INDEX idx_addresses_zip_code ON public.addresses(zip_code);
CREATE INDEX idx_addresses_location ON public.addresses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, authenticated write
CREATE POLICY "Anyone can read addresses"
  ON public.addresses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert addresses"
  ON public.addresses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update addresses"
  ON public.addresses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update trigger for updated_at
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comment on table
COMMENT ON TABLE public.addresses IS 'Normalized address storage for properties, contacts, and external listings';
