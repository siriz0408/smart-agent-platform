-- DEBUG SEARCH ISSUES
-- Run this in Supabase SQL Editor while logged in

-- ============================================================================
-- STEP 1: Check your user and profile info
-- ============================================================================
SELECT 
  'User ID' as info,
  auth.uid()::text as value
UNION ALL
SELECT 
  'User Email',
  (SELECT email FROM auth.users WHERE id = auth.uid())
UNION ALL
SELECT 
  'Profile Tenant ID',
  (SELECT tenant_id::text FROM profiles WHERE user_id = auth.uid());

-- ============================================================================
-- STEP 2: Check if profile exists and has tenant_id
-- ============================================================================
SELECT 
  'Profile Check' as section,
  p.user_id,
  p.tenant_id,
  CASE 
    WHEN p.tenant_id IS NULL THEN '❌ NO TENANT ID!'
    ELSE '✅ Has tenant_id'
  END as status
FROM profiles p
WHERE p.user_id = auth.uid();

-- ============================================================================
-- STEP 3: Check contacts data
-- ============================================================================
SELECT 
  'Contacts' as section,
  COUNT(*) as total_contacts,
  COUNT(DISTINCT tenant_id) as unique_tenant_ids
FROM contacts;

-- Show first 5 contacts with their tenant_ids
SELECT 
  'Sample Contacts' as section,
  first_name,
  last_name,
  tenant_id,
  tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()) as matches_my_tenant
FROM contacts
LIMIT 5;

-- ============================================================================
-- STEP 4: Check if contacts match YOUR tenant
-- ============================================================================
SELECT 
  'My Contacts' as section,
  first_name,
  last_name,
  email
FROM contacts
WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
LIMIT 10;

-- ============================================================================
-- STEP 5: Check properties data
-- ============================================================================
SELECT 
  'My Properties' as section,
  address,
  city
FROM properties
WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
LIMIT 10;

-- ============================================================================
-- STEP 6: Test the search function directly
-- ============================================================================
SELECT 
  'Direct Search Test for "sarah"' as section,
  entity_type,
  name,
  subtitle
FROM search_all_entities(
  'sarah',
  (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()),
  ARRAY['contact', 'document', 'property', 'deal'],
  10
);

-- ============================================================================
-- STEP 7: Test the search function for "922"
-- ============================================================================
SELECT 
  'Direct Search Test for "922"' as section,
  entity_type,
  name,
  subtitle
FROM search_all_entities(
  '922',
  (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()),
  ARRAY['contact', 'document', 'property', 'deal'],
  10
);

-- ============================================================================
-- STEP 8: Check if search function exists
-- ============================================================================
SELECT 
  'Function Check' as section,
  proname as function_name,
  'EXISTS' as status
FROM pg_proc
WHERE proname = 'search_all_entities';
