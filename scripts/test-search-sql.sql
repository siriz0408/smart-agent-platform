-- Direct SQL Test for Universal Search Issue
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/sthnezuadfbmbqlxiwtq/sql

-- Step 1: Check if test data exists
SELECT '=== Step 1: Checking test data ===' as step;

SELECT
  id,
  first_name,
  last_name,
  tenant_id,
  CASE WHEN embedding IS NOT NULL THEN 'YES' ELSE 'NO' END as has_embedding,
  search_text
FROM contacts
WHERE tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'
ORDER BY first_name;

-- Step 2: Check user profiles
SELECT '=== Step 2: Checking profiles ===' as step;

SELECT
  id,
  user_id,
  tenant_id,
  full_name
FROM profiles
WHERE tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'
LIMIT 5;

-- Step 3: Test RPC function exists
SELECT '=== Step 3: Testing if RPC exists ===' as step;

SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%search%';

-- Step 4: Test RPC function directly (if it exists)
SELECT '=== Step 4: Testing RPC function ===' as step;

-- Generate a simple embedding (1536 dimensions of 0.1)
DO $$
DECLARE
  test_embedding vector(1536);
  result_count integer;
BEGIN
  -- Create test embedding
  test_embedding := (SELECT ARRAY_AGG(0.1::float4) FROM generate_series(1, 1536))::vector(1536);

  -- Test the RPC
  SELECT COUNT(*) INTO result_count
  FROM search_all_entities_hybrid(
    'sarah',
    test_embedding,
    '5098bedb-a0bc-40ae-83fa-799df8f44981'::uuid,
    ARRAY['contact'],
    0.0,
    10
  );

  RAISE NOTICE 'RPC returned % results', result_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'RPC Error: %', SQLERRM;
END $$;

-- Step 5: Check if contacts have embeddings
SELECT '=== Step 5: Embedding status ===' as step;

SELECT
  COUNT(*) as total_contacts,
  COUNT(embedding) as contacts_with_embeddings,
  COUNT(*) - COUNT(embedding) as contacts_without_embeddings
FROM contacts
WHERE tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981';

-- Step 6: Check RLS policies
SELECT '=== Step 6: Checking RLS policies ===' as step;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contacts', 'properties', 'deals', 'profiles')
ORDER BY tablename, policyname;

-- Step 7: Simple keyword search (fallback test)
SELECT '=== Step 7: Simple keyword search ===' as step;

SELECT
  id,
  first_name,
  last_name,
  email,
  company
FROM contacts
WHERE tenant_id = '5098bedb-a0bc-40ae-83fa-799df8f44981'
  AND (
    first_name ILIKE '%sarah%'
    OR last_name ILIKE '%sarah%'
    OR email ILIKE '%sarah%'
  )
LIMIT 5;
