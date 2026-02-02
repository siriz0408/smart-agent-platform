-- Check tenant_id mapping for the test user
-- Run in Supabase SQL Editor

-- Step 1: Find all profiles (we don't know the exact user_id)
SELECT
  '=== All Profiles (showing user_id to tenant_id mapping) ===' as info;

SELECT
  id as profile_id,
  user_id,
  tenant_id,
  full_name,
  email,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Find which tenant has "sarah" contacts
SELECT
  '=== Contacts named Sarah (grouped by tenant_id) ===' as info;

SELECT
  tenant_id,
  COUNT(*) as sarah_count,
  STRING_AGG(first_name || ' ' || last_name, ', ') as names
FROM contacts
WHERE first_name ILIKE '%sarah%'
GROUP BY tenant_id;

-- Step 3: Show all contacts for each tenant (summary)
SELECT
  '=== Contact count by tenant_id ===' as info;

SELECT
  tenant_id,
  COUNT(*) as total_contacts,
  COUNT(embedding) as with_embeddings
FROM contacts
GROUP BY tenant_id
ORDER BY total_contacts DESC;

-- Step 4: Check if there's a user_id that matches the tenant with Sarah
SELECT
  '=== Is there a profile where user_id = tenant_id with Sarah contacts? ===' as info;

SELECT
  p.user_id,
  p.tenant_id,
  p.full_name,
  p.email,
  c.contact_count,
  c.sarah_count
FROM profiles p
LEFT JOIN (
  SELECT
    tenant_id,
    COUNT(*) as contact_count,
    COUNT(*) FILTER (WHERE first_name ILIKE '%sarah%') as sarah_count
  FROM contacts
  GROUP BY tenant_id
) c ON c.tenant_id = p.tenant_id
WHERE c.sarah_count > 0
ORDER BY c.sarah_count DESC;

-- Step 5: Diagnostic - show exact mismatch
SELECT
  '=== Diagnostic: Profile vs Contact tenant mismatch ===' as info;

SELECT
  'Profile user_id: ' || COALESCE(p.user_id::text, 'NULL') as user_id,
  'Profile tenant_id: ' || COALESCE(p.tenant_id::text, 'NULL') as profile_tenant,
  'Contacts tenant_id: ' || COALESCE(c.tenant_id::text, 'NULL') as contacts_tenant,
  'Match: ' || CASE
    WHEN p.user_id = c.tenant_id THEN 'user_id = contacts.tenant_id ✅'
    WHEN p.tenant_id = c.tenant_id THEN 'profile.tenant_id = contacts.tenant_id ✅'
    ELSE 'MISMATCH ❌'
  END as match_status
FROM profiles p
CROSS JOIN (
  SELECT DISTINCT tenant_id
  FROM contacts
  WHERE first_name ILIKE '%sarah%'
) c
LIMIT 5;

-- Step 6: Recommended fix SQL (uncomment to execute)
/*
-- Option A: Update profile to match contacts tenant_id
UPDATE profiles
SET tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'  -- Replace with actual tenant from Step 2
WHERE user_id = 'USER_ID_HERE';  -- Replace with actual user_id from Step 1

-- Option B: Update contacts to match profile's tenant_id
UPDATE contacts
SET tenant_id = (SELECT tenant_id FROM profiles WHERE email = 'siriz04081@gmail.com')
WHERE first_name ILIKE '%sarah%';
*/
