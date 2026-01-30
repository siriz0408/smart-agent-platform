-- ============================================================================
-- Profile Extensions & Real-time Presence Tables
-- ============================================================================

-- Profile Social Links table
CREATE TABLE public.profile_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- Profile Credentials table (licenses, certifications)
CREATE TABLE public.profile_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL, -- 'license', 'certification', 'award'
  title TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  expiry_date DATE,
  credential_number TEXT,
  verification_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profile Gallery table
CREATE TABLE public.profile_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profile Privacy Settings table
CREATE TABLE public.profile_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT true,
  show_social_links BOOLEAN DEFAULT true,
  show_credentials BOOLEAN DEFAULT true,
  show_gallery BOOLEAN DEFAULT true,
  profile_visibility TEXT DEFAULT 'tenant' CHECK (profile_visibility IN ('public', 'tenant', 'private')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Presence table (online status)
CREATE TABLE public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  current_page TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- NOTE: typing_indicators table requires conversations table which is not yet implemented
-- Will be created as part of real-time messaging feature
-- CREATE TABLE public.typing_indicators (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   started_at TIMESTAMPTZ DEFAULT now(),
--   UNIQUE (conversation_id, user_id)
-- );

-- Add extended profile fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS brokerage_name TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS license_state TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS specialties TEXT[],
  ADD COLUMN IF NOT EXISTS service_areas TEXT[],
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Profile Social Links RLS
ALTER TABLE public.profile_social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own social links"
  ON public.profile_social_links FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view social links based on privacy settings"
  ON public.profile_social_links FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profile_privacy_settings pps
      WHERE pps.user_id = profile_social_links.user_id
      AND pps.show_social_links = true
    ) OR
    NOT EXISTS (
      SELECT 1 FROM profile_privacy_settings pps
      WHERE pps.user_id = profile_social_links.user_id
    )
  );

-- Profile Credentials RLS
ALTER TABLE public.profile_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own credentials"
  ON public.profile_credentials FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view credentials based on privacy settings"
  ON public.profile_credentials FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profile_privacy_settings pps
      WHERE pps.user_id = profile_credentials.user_id
      AND pps.show_credentials = true
    ) OR
    NOT EXISTS (
      SELECT 1 FROM profile_privacy_settings pps
      WHERE pps.user_id = profile_credentials.user_id
    )
  );

-- Profile Gallery RLS
ALTER TABLE public.profile_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own gallery"
  ON public.profile_gallery FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view gallery based on privacy settings"
  ON public.profile_gallery FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profile_privacy_settings pps
      WHERE pps.user_id = profile_gallery.user_id
      AND pps.show_gallery = true
    ) OR
    NOT EXISTS (
      SELECT 1 FROM profile_privacy_settings pps
      WHERE pps.user_id = profile_gallery.user_id
    )
  );

-- Profile Privacy Settings RLS
ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own privacy settings"
  ON public.profile_privacy_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User Presence RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own presence"
  ON public.user_presence FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view presence in their tenant"
  ON public.user_presence FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT p.user_id FROM profiles p
      WHERE p.tenant_id = (SELECT get_user_tenant_id(auth.uid()))
    )
  );

-- NOTE: typing_indicators RLS - deferred until conversations table exists
-- ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage their own typing indicators"
--   ON public.typing_indicators FOR ALL TO authenticated
--   USING (user_id = auth.uid())
--   WITH CHECK (user_id = auth.uid());
-- CREATE POLICY "Participants can view typing indicators"
--   ON public.typing_indicators FOR SELECT TO authenticated
--   USING (is_conversation_participant(auth.uid(), conversation_id));

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profile_social_links_user_id ON public.profile_social_links(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_credentials_user_id ON public.profile_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_gallery_user_id ON public.profile_gallery(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_privacy_settings_user_id ON public.profile_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status);
-- NOTE: typing_indicators index - deferred until table exists
-- CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON public.typing_indicators(conversation_id);

-- ============================================================================
-- Enable Realtime for presence and typing
-- ============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
EXCEPTION WHEN duplicate_object THEN
  -- Already added, ignore
END $$;

-- NOTE: typing_indicators realtime - deferred until table exists
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- ============================================================================
-- Auto-cleanup function for stale typing indicators
-- ============================================================================

-- NOTE: cleanup function for typing_indicators - deferred until table exists
-- CREATE OR REPLACE FUNCTION public.cleanup_stale_typing_indicators()
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--   DELETE FROM typing_indicators
--   WHERE started_at < now() - interval '10 seconds';
-- END;
-- $$;

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_profile_social_links_updated_at
  BEFORE UPDATE ON public.profile_social_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profile_credentials_updated_at
  BEFORE UPDATE ON public.profile_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profile_privacy_settings_updated_at
  BEFORE UPDATE ON public.profile_privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Storage Buckets
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('profile-covers', 'profile-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('profile-gallery', 'profile-gallery', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for avatars (only create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload own avatar') THEN
    CREATE POLICY "Users can upload own avatar"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars are publicly accessible') THEN
    CREATE POLICY "Avatars are publicly accessible"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own avatar') THEN
    CREATE POLICY "Users can update own avatar"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own avatar') THEN
    CREATE POLICY "Users can delete own avatar"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Storage RLS Policies for profile-covers (only create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload own cover') THEN
    CREATE POLICY "Users can upload own cover"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'profile-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Covers are publicly accessible') THEN
    CREATE POLICY "Covers are publicly accessible"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'profile-covers');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own cover') THEN
    CREATE POLICY "Users can update own cover"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'profile-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own cover') THEN
    CREATE POLICY "Users can delete own cover"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'profile-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Storage RLS Policies for profile-gallery (only create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload to own gallery') THEN
    CREATE POLICY "Users can upload to own gallery"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'profile-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Gallery is publicly accessible') THEN
    CREATE POLICY "Gallery is publicly accessible"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'profile-gallery');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own gallery items') THEN
    CREATE POLICY "Users can update own gallery items"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'profile-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own gallery items') THEN
    CREATE POLICY "Users can delete own gallery items"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'profile-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;