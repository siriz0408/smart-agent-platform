-- Fix properties tenant_id mismatch
-- Properties were seeded with tenant_id 'bbf00c8f-789c-4ffa-98a8-ca4fc4201e1c'
-- But the active user has tenant_id '5098bedb-...'

-- First, let's see what we're working with
DO $$
DECLARE
  old_tenant_id UUID := 'bbf00c8f-789c-4ffa-98a8-ca4fc4201e1c';
  new_tenant_id UUID;
  prop_count INT;
BEGIN
  -- Get the tenant_id from the most recent profile (the active user)
  SELECT tenant_id INTO new_tenant_id 
  FROM profiles 
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;
  
  -- Count properties with old tenant_id
  SELECT COUNT(*) INTO prop_count FROM properties WHERE tenant_id = old_tenant_id;
  
  RAISE NOTICE 'Found % properties with old tenant_id %', prop_count, old_tenant_id;
  RAISE NOTICE 'Will update to new tenant_id: %', new_tenant_id;
  
  -- Update properties to use the correct tenant_id
  IF new_tenant_id IS NOT NULL AND prop_count > 0 THEN
    UPDATE properties 
    SET tenant_id = new_tenant_id 
    WHERE tenant_id = old_tenant_id;
    
    RAISE NOTICE 'Updated % properties to tenant_id %', prop_count, new_tenant_id;
  END IF;
END $$;

-- Verify the fix
SELECT 
  'Properties by tenant' as check_type,
  tenant_id,
  COUNT(*) as count
FROM properties
GROUP BY tenant_id;
