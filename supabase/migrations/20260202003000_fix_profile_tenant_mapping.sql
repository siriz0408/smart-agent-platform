-- Fix profile tenant_id mapping for test user
-- Ensures siriz04081@gmail.com profile points to the tenant with test data

-- Update or create profile with correct tenant_id
INSERT INTO profiles (user_id, tenant_id, email, full_name, created_at, updated_at)
SELECT
  au.id as user_id,
  '5098bedb-a0bc-40ae-83fa-799df8f44981'::uuid as tenant_id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'siriz04081@gmail.com'
ON CONFLICT (user_id)
DO UPDATE SET
  tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'::uuid,
  updated_at = NOW();

-- Verify the fix
DO $$
DECLARE
  profile_count integer;
  contact_count integer;
BEGIN
  -- Count profiles
  SELECT COUNT(*) INTO profile_count
  FROM profiles
  WHERE email = 'siriz04081@gmail.com'
    AND tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981';

  -- Count contacts for this tenant
  SELECT COUNT(*) INTO contact_count
  FROM contacts
  WHERE tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'
    AND first_name ILIKE '%sarah%';

  IF profile_count > 0 AND contact_count > 0 THEN
    RAISE NOTICE '✅ Fix successful! Profile updated, % Sarah contacts found', contact_count;
  ELSIF profile_count = 0 THEN
    RAISE WARNING '⚠️ Profile not created - user may not exist in auth.users';
  ELSIF contact_count = 0 THEN
    RAISE WARNING '⚠️ No Sarah contacts found for tenant';
  END IF;
END $$;
