-- ============================================================================
-- ADD OWNER ENUM VALUE
-- ============================================================================
-- This must be a separate migration that commits before the workspace migration
-- because PostgreSQL doesn't allow using newly added enum values in the same transaction.
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'owner' BEFORE 'super_admin';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
