-- QUICK FIX for Universal Search
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/sql

-- This fix ensures that when the user logs in, the search will find their data
-- by making sure the profile's tenant_id matches where the test data lives

-- Step 1: Find where Sarah contacts are
DO $$
DECLARE
  sarah_tenant_id uuid;
  user_email text := 'siriz04081@gmail.com';
BEGIN
  -- Find tenant_id that has Sarah contacts
  SELECT tenant_id INTO sarah_tenant_id
  FROM contacts
  WHERE first_name ILIKE '%sarah%'
  LIMIT 1;

  RAISE NOTICE 'Sarah contacts found in tenant: %', sarah_tenant_id;

  -- Update or create profile to point to this tenant
  INSERT INTO profiles (user_id, tenant_id, email, full_name, created_at, updated_at)
  SELECT
    id as user_id,
    sarah_tenant_id as tenant_id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
    NOW(),
    NOW()
  FROM auth.users
  WHERE email = user_email
  ON CONFLICT (user_id)
  DO UPDATE SET
    tenant_id = sarah_tenant_id,
    updated_at = NOW();

  RAISE NOTICE 'Profile updated for %', user_email;
END $$;

-- Verify the fix
SELECT
  'Profile after fix:' as status,
  p.user_id,
  p.tenant_id,
  p.email,
  (SELECT COUNT(*) FROM contacts WHERE tenant_id = p.tenant_id AND first_name ILIKE '%sarah%') as sarah_count
FROM profiles p
WHERE p.email = 'siriz04081@gmail.com';
