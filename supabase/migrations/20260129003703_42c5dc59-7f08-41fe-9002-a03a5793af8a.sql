-- Create addresses table for normalized location data
CREATE TABLE public.addresses (
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

-- Create external_properties table for Zillow/third-party data
CREATE TABLE public.external_properties (
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

-- Create saved_properties table for user favorites
CREATE TABLE public.saved_properties (
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

-- Create message_attachments table for chat files
CREATE TABLE public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS for addresses (public read for all authenticated)
CREATE POLICY "Authenticated users can view addresses"
  ON public.addresses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert addresses"
  ON public.addresses FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS for external_properties (public read)
CREATE POLICY "Authenticated users can view external properties"
  ON public.external_properties FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert external properties"
  ON public.external_properties FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS for saved_properties (user owns their saves)
CREATE POLICY "Users can manage their own saved properties"
  ON public.saved_properties FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS for message_attachments
CREATE POLICY "Users can view attachments in their conversations"
  ON public.message_attachments FOR SELECT TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      WHERE is_conversation_participant(auth.uid(), m.conversation_id)
    )
  );

CREATE POLICY "Users can insert attachments for their messages"
  ON public.message_attachments FOR INSERT TO authenticated
  WITH CHECK (
    message_id IN (
      SELECT m.id FROM public.messages m WHERE m.sender_id = auth.uid()
    )
  );

-- Create message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message-attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Users can view attachments in their conversations"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments');