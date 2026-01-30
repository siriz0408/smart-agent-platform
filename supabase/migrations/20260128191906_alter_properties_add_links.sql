-- Migration: Alter properties table to add address and seller links
-- Part of Phase 2 Architecture Revamp - Sprint 2.1.7

-- Add address reference to properties (for normalized address storage)
ALTER TABLE public.properties ADD COLUMN address_id UUID REFERENCES public.addresses(id);

-- Add seller contact reference
ALTER TABLE public.properties ADD COLUMN seller_contact_id UUID REFERENCES public.contacts(id);

-- Create indexes
CREATE INDEX idx_properties_address ON public.properties(address_id) WHERE address_id IS NOT NULL;
CREATE INDEX idx_properties_seller ON public.properties(seller_contact_id) WHERE seller_contact_id IS NOT NULL;

COMMENT ON COLUMN public.properties.address_id IS 'Reference to normalized address (supplements existing address fields)';
COMMENT ON COLUMN public.properties.seller_contact_id IS 'Reference to the seller contact for this property';
