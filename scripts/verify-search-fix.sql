-- Verify the search fix is working

-- 1. Check profile mapping
SELECT
  '=== Step 1: Profile Mapping ===' as step,
  p.user_id,
  p.tenant_id,
  p.email,
  au.email as auth_email
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE p.email = 'siriz04081@gmail.com'
   OR au.email = 'siriz04081@gmail.com';

-- 2. Check test data exists for this tenant
SELECT
  '=== Step 2: Test Data ===' as step,
  tenant_id,
  first_name,
  last_name,
  email,
  CASE WHEN embedding IS NOT NULL THEN 'YES' ELSE 'NO' END as has_embedding
FROM contacts
WHERE tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'
  AND first_name ILIKE '%sarah%';

-- 3. Test the RPC function directly
SELECT
  '=== Step 3: RPC Test ===' as step,
  entity_type,
  name,
  subtitle,
  similarity,
  rrf_score
FROM search_all_entities_hybrid(
  'sarah',
  (SELECT ARRAY_AGG(0.1::float4)::vector(1536) FROM generate_series(1, 1536)),
  '5098bedb-a0bc-40ae-83fa-799df8f44981'::uuid,
  ARRAY['contact'],
  0.0,
  10
)
ORDER BY rrf_score DESC
LIMIT 5;

-- 4. Summary
SELECT
  '=== SUMMARY ===' as step,
  'Profile tenant_id: ' || p.tenant_id as profile,
  'Contacts with Sarah: ' || COUNT(c.id) as contacts,
  'Search should work: ' || CASE
    WHEN COUNT(c.id) > 0 THEN '✅ YES'
    ELSE '❌ NO'
  END as status
FROM profiles p
LEFT JOIN contacts c ON c.tenant_id = p.tenant_id AND c.first_name ILIKE '%sarah%'
WHERE p.tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'
GROUP BY p.tenant_id;
