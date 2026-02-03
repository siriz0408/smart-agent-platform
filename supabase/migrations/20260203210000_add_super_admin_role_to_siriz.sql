-- Add super_admin role to siriz04081@gmail.com
-- Super admins have unlimited AI usage and full platform access

DO $$
DECLARE
  target_user_id uuid;
  target_tenant_id uuid;
BEGIN
  -- Get user_id from auth.users by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'siriz04081@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User siriz04081@gmail.com not found - they may not have signed up yet';
    RETURN;
  END IF;
  
  -- Get tenant_id from profiles
  SELECT tenant_id INTO target_tenant_id
  FROM profiles
  WHERE user_id = target_user_id;
  
  IF target_tenant_id IS NULL THEN
    -- If no tenant found, use the one we know from test data
    target_tenant_id := '5098bedb-a0bc-40ae-83fa-799df8f44981'::uuid;
  END IF;
  
  -- Insert or update super_admin role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (target_user_id, target_tenant_id, 'super_admin')
  ON CONFLICT (user_id, tenant_id, role) 
  DO NOTHING;
  
  RAISE NOTICE 'Successfully added super_admin role to siriz04081@gmail.com (user_id: %)', target_user_id;
END $$;

-- Verify the role was added
DO $$
DECLARE
  role_count int;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM user_roles ur
  JOIN auth.users au ON ur.user_id = au.id
  WHERE au.email = 'siriz04081@gmail.com'
    AND ur.role = 'super_admin';
    
  IF role_count > 0 THEN
    RAISE NOTICE '✅ Verified: siriz04081@gmail.com now has super_admin role';
  ELSE
    RAISE NOTICE '⚠️ Could not verify super_admin role for siriz04081@gmail.com';
  END IF;
END $$;
