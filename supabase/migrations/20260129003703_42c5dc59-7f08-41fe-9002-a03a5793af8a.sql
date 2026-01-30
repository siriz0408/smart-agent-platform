-- Migration: Ensure tables exist for property and messaging features
-- NOTE: Most tables were already created in earlier migrations (20260128191900-20260128191903)
-- This migration adds any missing components only

-- Create addresses table if not exists
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  street_address text NOT NULL,
  unit text,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  latitude numeric,
  longitude numeric,
  formatted_address text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(street_address, unit, city, state, zip_code)
);

-- Create external_properties table if not exists
CREATE TABLE IF NOT EXISTS public.external_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text NOT NULL,
  address jsonb,
  price numeric,
  bedrooms integer,
  bathrooms numeric,
  square_feet integer,
  lot_size numeric,
  year_built integer,
  property_type text,
  status text,
  description text,
  photos text[] DEFAULT '{}',
  raw_data jsonb DEFAULT '{}',
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(source, external_id)
);

-- Create saved_properties table if not exists
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_type text NOT NULL CHECK (property_type IN ('internal', 'external')),
  internal_property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  external_property_id uuid REFERENCES public.external_properties(id) ON DELETE CASCADE,
  notes text,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

-- RLS for addresses (only create if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'Authenticated users can view addresses') THEN
    CREATE POLICY "Authenticated users can view addresses"
      ON public.addresses FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'Authenticated users can insert addresses') THEN
    CREATE POLICY "Authenticated users can insert addresses"
      ON public.addresses FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- RLS for external_properties (only create if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'external_properties' AND policyname = 'Authenticated users can view external properties') THEN
    CREATE POLICY "Authenticated users can view external properties"
      ON public.external_properties FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'external_properties' AND policyname = 'Authenticated users can insert external properties') THEN
    CREATE POLICY "Authenticated users can insert external properties"
      ON public.external_properties FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- RLS for saved_properties (only create if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_properties' AND policyname = 'Users can manage their own saved properties') THEN
    CREATE POLICY "Users can manage their own saved properties"
      ON public.saved_properties FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Create message-attachments storage bucket (safe to run multiple times)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- NOTE: message_attachments table and related policies are skipped here
-- They require the messaging feature tables (messages, conversation_participants)
-- which will be created as part of the real-time messaging feature implementation
