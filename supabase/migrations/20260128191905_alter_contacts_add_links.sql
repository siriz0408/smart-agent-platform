-- Migration: Alter contacts table to add address link
-- Part of Phase 2 Architecture Revamp - Sprint 2.1.6

-- Add address reference to contacts
-- Note: user_id column already exists (added in migration 20260128222229)
ALTER TABLE public.contacts ADD COLUMN address_id UUID REFERENCES public.addresses(id);

-- Create index for address lookups
CREATE INDEX idx_contacts_address ON public.contacts(address_id) WHERE address_id IS NOT NULL;

COMMENT ON COLUMN public.contacts.address_id IS 'Reference to normalized address for this contact';
