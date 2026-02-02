-- Fix RLS Policies - Revert Broken Policies from 20260202000100
-- Date: 2026-02-02
-- Issue: Policies using tenant_id = auth.uid() are wrong
-- Fix: Use tenant_id = get_user_tenant_id(auth.uid())

-- Step 1: Drop the broken policies
DROP POLICY IF EXISTS contacts_select_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_insert_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_update_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_policy ON public.contacts;

DROP POLICY IF EXISTS properties_select_policy ON public.properties;
DROP POLICY IF EXISTS properties_insert_policy ON public.properties;
DROP POLICY IF EXISTS properties_update_policy ON public.properties;
DROP POLICY IF EXISTS properties_delete_policy ON public.properties;

DROP POLICY IF EXISTS deals_select_policy ON public.deals;
DROP POLICY IF EXISTS deals_insert_policy ON public.deals;
DROP POLICY IF EXISTS deals_update_policy ON public.deals;
DROP POLICY IF EXISTS deals_delete_policy ON public.deals;

-- Step 2: Recreate correct policies using get_user_tenant_id helper

-- Contacts policies
CREATE POLICY contacts_select_policy ON public.contacts
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY contacts_insert_policy ON public.contacts
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY contacts_update_policy ON public.contacts
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY contacts_delete_policy ON public.contacts
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Properties policies
CREATE POLICY properties_select_policy ON public.properties
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY properties_insert_policy ON public.properties
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY properties_update_policy ON public.properties
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY properties_delete_policy ON public.properties
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Deals policies
CREATE POLICY deals_select_policy ON public.deals
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY deals_insert_policy ON public.deals
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY deals_update_policy ON public.deals
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY deals_delete_policy ON public.deals
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Verification
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('contacts', 'properties', 'deals')
    AND qual LIKE '%get_user_tenant_id%';

  IF policy_count >= 12 THEN
    RAISE NOTICE '✅ RLS policies fixed! % policies now using get_user_tenant_id()', policy_count;
  ELSE
    RAISE WARNING '⚠️ Only % policies updated. Expected 12+', policy_count;
  END IF;
END $$;
