-- Migration: Create saved_properties table
-- Part of Phase 2 Architecture Revamp - Sprint 2.1.3

-- Create property type enum for saved properties
CREATE TYPE public.saved_property_type AS ENUM ('internal', 'external');

-- Create saved_properties junction table
CREATE TABLE public.saved_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Polymorphic reference to either internal or external property
  property_type saved_property_type NOT NULL,
  internal_property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  external_property_id UUID REFERENCES public.external_properties(id) ON DELETE CASCADE,

  -- User notes and preferences
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ensure exactly one property reference is set
  CONSTRAINT saved_properties_has_property CHECK (
    (property_type = 'internal' AND internal_property_id IS NOT NULL AND external_property_id IS NULL) OR
    (property_type = 'external' AND external_property_id IS NOT NULL AND internal_property_id IS NULL)
  )
);

-- Prevent duplicate saves of the same property (partial unique indexes)
CREATE UNIQUE INDEX idx_saved_properties_unique_internal
  ON public.saved_properties(user_id, internal_property_id)
  WHERE internal_property_id IS NOT NULL;

CREATE UNIQUE INDEX idx_saved_properties_unique_external
  ON public.saved_properties(user_id, external_property_id)
  WHERE external_property_id IS NOT NULL;

-- Create indexes
CREATE INDEX idx_saved_properties_user ON public.saved_properties(user_id);
CREATE INDEX idx_saved_properties_internal ON public.saved_properties(internal_property_id) WHERE internal_property_id IS NOT NULL;
CREATE INDEX idx_saved_properties_external ON public.saved_properties(external_property_id) WHERE external_property_id IS NOT NULL;
CREATE INDEX idx_saved_properties_favorites ON public.saved_properties(user_id, is_favorite) WHERE is_favorite = true;

-- Enable RLS
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Owner only
CREATE POLICY "Users can view their own saved properties"
  ON public.saved_properties FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved properties"
  ON public.saved_properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved properties"
  ON public.saved_properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved properties"
  ON public.saved_properties FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER update_saved_properties_updated_at
  BEFORE UPDATE ON public.saved_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.saved_properties IS 'User-saved properties (both internal listings and external from Zillow/etc)';
