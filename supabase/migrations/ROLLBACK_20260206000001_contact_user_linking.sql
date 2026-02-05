-- ============================================================================
-- ROLLBACK: Contact-User Linking Migration
-- ============================================================================
-- Emergency rollback if issues are discovered after deployment
-- This will restore the system to its pre-migration state
--
-- WARNING: This will drop the user_preferences table and remove columns
-- from contacts. Any data in user_preferences will be lost!
-- ============================================================================

BEGIN;

RAISE NOTICE '⚠️  WARNING: Rolling back contact-user linking migration';
RAISE NOTICE '⚠️  This will drop user_preferences table and remove columns from contacts';

-- ============================================================================
-- PHASE 1: Drop helper functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.find_user_by_email(text);
DROP FUNCTION IF EXISTS public.get_contact_ownership_info(uuid);

RAISE NOTICE '✅ Phase 1: Helper functions dropped';

-- ============================================================================
-- PHASE 2: Drop new policies
-- ============================================================================

-- Drop user_preferences policies
DROP POLICY IF EXISTS "users_manage_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "agents_read_contact_preferences" ON public.user_preferences;

-- Drop new contacts policies
DROP POLICY IF EXISTS "contacts_select_by_workspace" ON public.contacts;
DROP POLICY IF EXISTS "users_view_own_linked_contacts" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_by_workspace_member" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_by_owner_or_admin" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_by_owner_or_admin" ON public.contacts;

RAISE NOTICE '✅ Phase 2: New policies dropped';

-- ============================================================================
-- PHASE 3: Restore old simple policies
-- ============================================================================

-- Restore simple workspace-scoped policies (from 20260202004000)
CREATE POLICY contacts_select_policy ON public.contacts
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY contacts_insert_policy ON public.contacts
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY contacts_update_policy ON public.contacts
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY contacts_delete_policy ON public.contacts
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Note: contacts_super_admin policy should still exist from 20260204200001

RAISE NOTICE '✅ Phase 3: Old policies restored';

-- ============================================================================
-- PHASE 4: Drop columns from contacts
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS public.idx_contacts_user_id;
DROP INDEX IF EXISTS public.idx_contacts_ownership_type;
-- idx_contacts_created_by stays (may be used elsewhere)

-- Drop columns (data will be lost!)
ALTER TABLE public.contacts DROP COLUMN IF EXISTS linked_from_user;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS ownership_type;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS user_id;

RAISE NOTICE '✅ Phase 4: Columns dropped from contacts';

-- ============================================================================
-- PHASE 5: Drop user_preferences table
-- ============================================================================

-- Drop trigger first
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;

-- Drop table (CASCADE removes dependent policies)
DROP TABLE IF EXISTS public.user_preferences CASCADE;

RAISE NOTICE '✅ Phase 5: user_preferences table dropped';

-- ============================================================================
-- FINAL VALIDATION
-- ============================================================================

DO $$
DECLARE
  up_table_exists BOOLEAN;
  contacts_columns INTEGER;
  old_policies INTEGER;
BEGIN
  -- Check user_preferences table no longer exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  ) INTO up_table_exists;

  -- Check contacts no longer has new columns
  SELECT COUNT(*) INTO contacts_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contacts'
    AND column_name IN ('user_id', 'ownership_type', 'linked_from_user');

  -- Check old policies are restored
  SELECT COUNT(*) INTO old_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'contacts'
    AND policyname IN ('contacts_select_policy', 'contacts_insert_policy',
                        'contacts_update_policy', 'contacts_delete_policy');

  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ROLLBACK VALIDATION:';
  RAISE NOTICE '  - user_preferences exists: % (expected: false)', up_table_exists;
  RAISE NOTICE '  - New columns remain: % (expected: 0)', contacts_columns;
  RAISE NOTICE '  - Old policies restored: % (expected: 4)', old_policies;
  RAISE NOTICE '════════════════════════════════════════════════════════';

  IF up_table_exists OR contacts_columns > 0 OR old_policies <> 4 THEN
    RAISE EXCEPTION '❌ ROLLBACK VALIDATION FAILED: System not fully restored';
  END IF;

  RAISE NOTICE '✅ ✅ ✅ ROLLBACK COMPLETED SUCCESSFULLY ✅ ✅ ✅';
  RAISE NOTICE 'System restored to pre-migration state';
END $$;

COMMIT;

-- ============================================================================
-- POST-ROLLBACK VERIFICATION
-- ============================================================================
-- Run these manually to verify rollback worked:
--
-- 1. Verify user_preferences table is gone:
--    SELECT * FROM information_schema.tables WHERE table_name = 'user_preferences';
--    -- Should return 0 rows
--
-- 2. Verify contacts columns are gone:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'contacts' AND column_name IN ('user_id', 'ownership_type', 'linked_from_user');
--    -- Should return 0 rows
--
-- 3. Verify old policies are back:
--    SELECT policyname FROM pg_policies WHERE tablename = 'contacts' ORDER BY policyname;
--    -- Should see contacts_select_policy, contacts_insert_policy, etc.
--
-- 4. Test contact access still works:
--    SET ROLE authenticated;
--    SET request.jwt.claims TO '{"sub": "<agent-uuid>"}';
--    SELECT COUNT(*) FROM contacts;  -- Should see contacts in workspace
--    RESET ROLE;
--
-- ============================================================================

-- Log rollback
SELECT NOW() as rolled_back_at, 'Contact-user linking migration rolled back' as message;
