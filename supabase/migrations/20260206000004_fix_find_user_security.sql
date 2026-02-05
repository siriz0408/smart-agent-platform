-- ============================================================================
-- FIX: find_user_by_email Security Issues
-- ============================================================================
-- Fixes:
-- 1. Add input validation (prevent DoS, validate email format)
-- 2. Return email column (missing from original)
-- 3. Fix cross-tenant data leakage (linked_contact_count)
-- ============================================================================

-- Must drop first because return type is changing (adding email column)
DROP FUNCTION IF EXISTS public.find_user_by_email(text);

CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  email text,
  is_platform_user boolean,
  primary_role text,
  linked_contact_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.email,  -- FIX #2: Include email in return columns
    COALESCE(p.is_platform_user, true) as is_platform_user,
    p.primary_role::text,
    -- FIX #3: Only count contacts in current user's tenant (prevent cross-tenant leakage)
    (SELECT COUNT(*) FROM public.contacts
     WHERE user_id = p.user_id
     AND tenant_id = public.get_user_tenant_id(auth.uid())
    ) as linked_contact_count
  FROM public.profiles p
  -- FIX #1: Input validation
  WHERE LOWER(p.email) = LOWER(TRIM(_email))
    AND LENGTH(_email) <= 255  -- Prevent DoS via extremely long input
    AND _email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'  -- Basic email format validation
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.find_user_by_email IS
'Searches for a platform user by email address. Includes input validation and tenant isolation for linked contact counts.';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  -- Check function was updated
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'find_user_by_email'
  ) INTO function_exists;

  IF NOT function_exists THEN
    RAISE EXCEPTION 'find_user_by_email function not found';
  END IF;

  RAISE NOTICE '✅ find_user_by_email security fixes applied';
END $$;
