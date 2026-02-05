-- ============================================================================
-- CREATE is_super_admin() FUNCTION
-- ============================================================================
-- This function checks if the current authenticated user is a super admin
-- by comparing their email against the hardcoded super admin email.
-- 
-- Used by RLS policies to grant super admin access across all tables.
-- ============================================================================

-- Create the is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  super_admin_email CONSTANT TEXT := 'siriz04081@gmail.com';
BEGIN
  -- Get current user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Return true if email matches super admin
  RETURN user_email = super_admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ============================================================================
-- DONE: is_super_admin() function created
-- ============================================================================
