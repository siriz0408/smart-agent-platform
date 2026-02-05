-- ============================================================================
-- CONTACT-USER LINKING MIGRATION
-- ============================================================================
-- Enables agents to link contacts to platform users, with user preferences
-- separate from agent CRM notes. Supports multi-agent relationships and
-- cross-workspace deal invitations.
--
-- SAFETY: This migration includes validation checkpoints at each phase.
-- Rollback migration: 20260206000001_rollback_contact_user_linking.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- CHECKPOINT 0: Pre-migration validation
-- ============================================================================

DO $$
DECLARE
  contacts_count INTEGER;
  profiles_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO contacts_count FROM public.contacts;
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;

  RAISE NOTICE '✅ Pre-migration check: % contacts, % profiles', contacts_count, profiles_count;

  IF contacts_count = 0 THEN
    RAISE WARNING '⚠️  No contacts in database - this is unusual for an existing system';
  END IF;
END $$;

-- ============================================================================
-- PHASE 1: Create user_preferences table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Search Preferences (User-controlled)
  price_min NUMERIC(12, 2),
  price_max NUMERIC(12, 2),
  preferred_beds INT,
  preferred_baths NUMERIC(3, 1),
  preferred_areas TEXT[],
  preferred_property_types TEXT[],
  target_move_date DATE,
  urgency_level TEXT CHECK (urgency_level IN ('high', 'medium', 'low')),

  -- Financial (User-controlled)
  pre_approval_status TEXT CHECK (pre_approval_status IN ('approved', 'pending', 'not_started', 'not_needed')),
  pre_approval_amount NUMERIC(12, 2),
  lender_name TEXT,

  -- Communication (User-controlled)
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'any')),
  best_time_to_call TEXT CHECK (best_time_to_call IN ('morning', 'afternoon', 'evening', 'anytime')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

COMMENT ON TABLE public.user_preferences IS 'User-owned preferences visible to all their agents (read-only for agents)';
COMMENT ON COLUMN public.user_preferences.user_id IS 'Platform user who owns these preferences';

-- ============================================================================
-- CHECKPOINT 1: Verify user_preferences created
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  ) THEN
    RAISE NOTICE '✅ CHECKPOINT 1: user_preferences table created successfully';
  ELSE
    RAISE EXCEPTION '❌ CHECKPOINT 1 FAILED: user_preferences table not found';
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: Extend contacts table
-- ============================================================================

-- Link contact → platform user (if already exists, skip)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added user_id column to contacts';
  ELSE
    RAISE NOTICE 'ℹ️  user_id column already exists in contacts';
  END IF;
END $$;

-- Ownership type for portability rules
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'workspace' CHECK (ownership_type IN ('personal', 'workspace'));

-- Visual indicator of contact source
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS linked_from_user BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_ownership_type ON public.contacts(ownership_type);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON public.contacts(created_by);

COMMENT ON COLUMN public.contacts.user_id IS 'Links contact to platform user - multiple agents can have contacts for same user';
COMMENT ON COLUMN public.contacts.ownership_type IS 'personal = portable across workspaces, workspace = stays with brokerage';
COMMENT ON COLUMN public.contacts.linked_from_user IS 'True if agent linked existing platform user (for UI badge)';

-- ============================================================================
-- CHECKPOINT 2: Verify contacts columns added
-- ============================================================================

DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contacts'
    AND column_name IN ('user_id', 'ownership_type', 'linked_from_user');

  IF column_count = 3 THEN
    RAISE NOTICE '✅ CHECKPOINT 2: All 3 columns added to contacts table';
  ELSE
    RAISE EXCEPTION '❌ CHECKPOINT 2 FAILED: Expected 3 columns, found %', column_count;
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: Enable RLS on user_preferences
-- ============================================================================

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage their own preferences
CREATE POLICY "users_manage_own_preferences"
ON public.user_preferences FOR ALL
USING (user_id = auth.uid());

-- Agents can READ preferences of their linked contacts
CREATE POLICY "agents_read_contact_preferences"
ON public.user_preferences FOR SELECT
USING (
  user_id IN (
    SELECT c.user_id
    FROM public.contacts c
    WHERE c.tenant_id = public.get_user_tenant_id(auth.uid())
    AND c.user_id IS NOT NULL
  )
);

-- ============================================================================
-- CHECKPOINT 3: Verify user_preferences RLS enabled
-- ============================================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'user_preferences' AND relnamespace = 'public'::regnamespace;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_preferences';

  IF rls_enabled AND policy_count >= 2 THEN
    RAISE NOTICE '✅ CHECKPOINT 3: user_preferences RLS enabled with % policies', policy_count;
  ELSE
    RAISE EXCEPTION '❌ CHECKPOINT 3 FAILED: RLS enabled=%, policies=%', rls_enabled, policy_count;
  END IF;
END $$;

-- ============================================================================
-- PHASE 4: Update contacts RLS policies
-- ============================================================================

-- Drop existing simple policies
DROP POLICY IF EXISTS contacts_select_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_insert_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_update_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_policy ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON public.contacts;

-- SELECT: Workspace members + workspace admins see all + agents see own
CREATE POLICY "contacts_select_by_workspace"
ON public.contacts FOR SELECT
USING (
  -- Super admin sees all
  public.is_super_admin() OR

  -- Workspace admins see all contacts in workspace
  (tenant_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')
  )) OR

  -- Regular agents see only contacts they created OR are assigned via contact_agents
  (tenant_id = public.get_user_tenant_id(auth.uid()) AND (
    created_by = auth.uid() OR
    id IN (
      SELECT contact_id FROM public.contact_agents WHERE agent_user_id = auth.uid()
    )
  ))
);

-- Platform users can view contacts linked to them (for "My Agents" feature)
CREATE POLICY "users_view_own_linked_contacts"
ON public.contacts FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Anyone in workspace can create contacts
CREATE POLICY "contacts_insert_by_workspace_member"
ON public.contacts FOR INSERT
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
);

-- UPDATE: Only creator or workspace admin or assigned agent
CREATE POLICY "contacts_update_by_owner_or_admin"
ON public.contacts FOR UPDATE
USING (
  public.is_super_admin() OR
  created_by = auth.uid() OR
  public.is_workspace_admin(tenant_id) OR
  id IN (
    SELECT contact_id FROM public.contact_agents WHERE agent_user_id = auth.uid()
  )
);

-- DELETE: Only creator or workspace admin (not assigned agents)
CREATE POLICY "contacts_delete_by_owner_or_admin"
ON public.contacts FOR DELETE
USING (
  public.is_super_admin() OR
  created_by = auth.uid() OR
  public.is_workspace_admin(tenant_id)
);

-- ============================================================================
-- CHECKPOINT 4: Verify contacts RLS policies updated
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  old_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'contacts'
    AND policyname IN (
      'contacts_select_by_workspace',
      'users_view_own_linked_contacts',
      'contacts_insert_by_workspace_member',
      'contacts_update_by_owner_or_admin',
      'contacts_delete_by_owner_or_admin',
      'contacts_super_admin'  -- Existing policy should remain
    );

  SELECT COUNT(*) INTO old_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'contacts'
    AND policyname IN ('contacts_select_policy', 'contacts_insert_policy');

  IF policy_count >= 5 AND old_policy_count = 0 THEN
    RAISE NOTICE '✅ CHECKPOINT 4: Contacts RLS policies updated (% new policies, old policies dropped)', policy_count;
  ELSE
    RAISE EXCEPTION '❌ CHECKPOINT 4 FAILED: New policies=%, Old policies still exist=%', policy_count, old_policy_count;
  END IF;
END $$;

-- ============================================================================
-- PHASE 5: Create helper functions
-- ============================================================================

-- Check if user has a platform account (for contact linking UI)
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  is_platform_user boolean,
  primary_role text,
  linked_contact_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.is_platform_user,
    p.primary_role::text,
    (SELECT COUNT(*) FROM public.contacts WHERE user_id = p.user_id) as linked_contact_count
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(_email)
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.find_user_by_email(text) IS 'Search platform users by email for contact linking';

-- Get contact ownership info (for UI indicators)
CREATE OR REPLACE FUNCTION public.get_contact_ownership_info(_contact_id uuid)
RETURNS TABLE (
  is_personal boolean,
  created_by_name text,
  is_linked_user boolean,
  user_name text,
  linked_agent_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    c.ownership_type = 'personal' as is_personal,
    p.full_name as created_by_name,
    c.user_id IS NOT NULL as is_linked_user,
    u.full_name as user_name,
    (SELECT COUNT(*) FROM public.contact_agents WHERE contact_id = c.id) as linked_agent_count
  FROM public.contacts c
  LEFT JOIN public.profiles p ON p.user_id = c.created_by
  LEFT JOIN public.profiles u ON u.user_id = c.user_id
  WHERE c.id = _contact_id;
$$;

COMMENT ON FUNCTION public.get_contact_ownership_info(uuid) IS 'Get contact ownership metadata for UI display';

-- ============================================================================
-- CHECKPOINT 5: Verify helper functions created
-- ============================================================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('find_user_by_email', 'get_contact_ownership_info')
    AND pronamespace = 'public'::regnamespace;

  IF function_count = 2 THEN
    RAISE NOTICE '✅ CHECKPOINT 5: Helper functions created successfully';
  ELSE
    RAISE EXCEPTION '❌ CHECKPOINT 5 FAILED: Expected 2 functions, found %', function_count;
  END IF;
END $$;

-- ============================================================================
-- PHASE 6: Create updated_at trigger for user_preferences
-- ============================================================================

-- Reuse existing update_updated_at_column function
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- CHECKPOINT 6: Final validation
-- ============================================================================

DO $$
DECLARE
  contacts_count INTEGER;
  new_tables INTEGER;
  new_columns INTEGER;
  new_policies INTEGER;
  new_functions INTEGER;
BEGIN
  -- Count existing contacts (should be unchanged)
  SELECT COUNT(*) INTO contacts_count FROM public.contacts;

  -- Count new infrastructure
  SELECT COUNT(*) INTO new_tables
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'user_preferences';

  SELECT COUNT(*) INTO new_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contacts'
    AND column_name IN ('user_id', 'ownership_type', 'linked_from_user');

  SELECT COUNT(*) INTO new_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('contacts', 'user_preferences')
    AND policyname LIKE '%workspace%' OR policyname LIKE '%preferences%';

  SELECT COUNT(*) INTO new_functions
  FROM pg_proc
  WHERE proname IN ('find_user_by_email', 'get_contact_ownership_info')
    AND pronamespace = 'public'::regnamespace;

  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FINAL VALIDATION:';
  RAISE NOTICE '  - Contacts preserved: %', contacts_count;
  RAISE NOTICE '  - New tables created: % (expected: 1)', new_tables;
  RAISE NOTICE '  - New columns added: % (expected: 3)', new_columns;
  RAISE NOTICE '  - New/updated policies: % (expected: 7+)', new_policies;
  RAISE NOTICE '  - Helper functions: % (expected: 2)', new_functions;
  RAISE NOTICE '════════════════════════════════════════════════════════';

  IF new_tables <> 1 OR new_columns <> 3 OR new_functions <> 2 THEN
    RAISE EXCEPTION '❌ FINAL VALIDATION FAILED: Infrastructure incomplete';
  END IF;

  RAISE NOTICE '✅ ✅ ✅ MIGRATION COMPLETED SUCCESSFULLY ✅ ✅ ✅';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================
-- Run these manually to verify the migration worked correctly:
--
-- 1. Check user_preferences table exists:
--    SELECT * FROM information_schema.tables WHERE table_name = 'user_preferences';
--
-- 2. Check contacts has new columns:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'contacts' AND column_name IN ('user_id', 'ownership_type', 'linked_from_user');
--
-- 3. Check RLS policies:
--    SELECT tablename, policyname FROM pg_policies
--    WHERE tablename IN ('contacts', 'user_preferences') ORDER BY tablename, policyname;
--
-- 4. Check helper functions:
--    SELECT proname FROM pg_proc WHERE proname IN ('find_user_by_email', 'get_contact_ownership_info');
--
-- 5. Test contact visibility (as agent):
--    SET ROLE authenticated;
--    SET request.jwt.claims TO '{"sub": "<agent-uuid>"}';
--    SELECT COUNT(*) FROM contacts;  -- Should see only own contacts
--    RESET ROLE;
--
-- ============================================================================
