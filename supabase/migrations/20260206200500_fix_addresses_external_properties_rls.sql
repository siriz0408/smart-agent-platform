-- ============================================================================
-- FIX OVERLY PERMISSIVE RLS POLICIES
-- ============================================================================
-- Security Fix: HO-008 from PM-Security
-- Date: 2026-02-07
-- Purpose: Tighten RLS policies for addresses and external_properties tables
--          to enforce workspace isolation and prevent cross-tenant data leakage
-- ============================================================================

-- ============================================================================
-- PHASE 0: Fix ambiguous get_user_tenant_id() function
-- ============================================================================
-- There are two overloads: get_user_tenant_id() and get_user_tenant_id(uuid DEFAULT NULL)
-- Both match a no-arg call, causing SQLSTATE 42725.
-- Both have dependent policies, can't drop either, can't remove defaults.
-- Solution: All policies in this migration use explicit tenant_id lookup
-- instead of calling the ambiguous function. We also drop the no-arg version
-- with CASCADE and immediately recreate it plus any affected policies later.
-- For now, we just inline the query in all policies below.

-- ============================================================================
-- PHASE 1: Fix addresses table RLS policies
-- ============================================================================
-- Addresses are normalized and referenced by properties and contacts.
-- Users should only see addresses that belong to properties/contacts in their workspace.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read addresses" ON public.addresses;
DROP POLICY IF EXISTS "Authenticated users can view addresses" ON public.addresses;
DROP POLICY IF EXISTS "Authenticated users can insert addresses" ON public.addresses;
DROP POLICY IF EXISTS "Authenticated users can update addresses" ON public.addresses;

-- SELECT: Users can only view addresses used by properties/contacts in their workspace
DROP POLICY IF EXISTS "addresses_select_by_workspace" ON public.addresses;
CREATE POLICY "addresses_select_by_workspace"
ON public.addresses FOR SELECT
USING (
  -- Super admin sees all
  (SELECT public.is_super_admin()) OR
  -- Address is used by a property in user's workspace
  id IN (
    SELECT address_id FROM public.properties
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND address_id IS NOT NULL
  ) OR
  -- Address is used by a contact in user's workspace
  id IN (
    SELECT address_id FROM public.contacts
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND address_id IS NOT NULL
  ) OR
  -- Address is used by an external_property that is saved by users in user's workspace
  id IN (
    SELECT ep.address_id FROM public.external_properties ep
    INNER JOIN public.saved_properties sp ON sp.external_property_id = ep.id
    INNER JOIN public.profiles p ON p.user_id = sp.user_id
    WHERE p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND ep.address_id IS NOT NULL
  )
);

-- INSERT: Users can insert addresses (they'll be linked to properties/contacts with workspace isolation)
DROP POLICY IF EXISTS "addresses_insert_authenticated" ON public.addresses;
CREATE POLICY "addresses_insert_authenticated"
ON public.addresses FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Users can only update addresses used by properties/contacts in their workspace
DROP POLICY IF EXISTS "addresses_update_by_workspace" ON public.addresses;
CREATE POLICY "addresses_update_by_workspace"
ON public.addresses FOR UPDATE
USING (
  (SELECT public.is_super_admin()) OR
  id IN (
    SELECT address_id FROM public.properties
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND address_id IS NOT NULL
  ) OR
  id IN (
    SELECT address_id FROM public.contacts
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND address_id IS NOT NULL
  )
)
WITH CHECK (
  (SELECT public.is_super_admin()) OR
  id IN (
    SELECT address_id FROM public.properties
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND address_id IS NOT NULL
  ) OR
  id IN (
    SELECT address_id FROM public.contacts
    WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND address_id IS NOT NULL
  )
);

-- DELETE: Only super admin can delete addresses (to prevent orphaned references)
DROP POLICY IF EXISTS "addresses_delete_super_admin" ON public.addresses;
CREATE POLICY "addresses_delete_super_admin"
ON public.addresses FOR DELETE
USING ((SELECT public.is_super_admin()));

-- Service role can manage addresses (for edge functions)
DROP POLICY IF EXISTS "addresses_service_role" ON public.addresses;
CREATE POLICY "addresses_service_role"
ON public.addresses FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- PHASE 2: Fix external_properties table RLS policies
-- ============================================================================
-- External properties are public data (Zillow, Redfin, etc.) but should be
-- workspace-isolated to prevent cross-tenant data leakage.
-- Users can only see external_properties that are saved by users in their workspace.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read external properties" ON public.external_properties;
DROP POLICY IF EXISTS "Authenticated users can view external properties" ON public.external_properties;
DROP POLICY IF EXISTS "Authenticated users can insert external properties" ON public.external_properties;
DROP POLICY IF EXISTS "Service role can insert external properties" ON public.external_properties;
DROP POLICY IF EXISTS "Service role can update external properties" ON public.external_properties;

-- SELECT: Users can only view external_properties saved by users in their workspace
-- This ensures workspace isolation: users can see properties saved by colleagues in their workspace
DROP POLICY IF EXISTS "external_properties_select_by_workspace" ON public.external_properties;
CREATE POLICY "external_properties_select_by_workspace"
ON public.external_properties FOR SELECT
USING (
  -- Super admin sees all
  (SELECT public.is_super_admin()) OR
  -- External property is saved by ANY user in the same workspace
  -- This allows workspace members to see properties saved by their colleagues
  id IN (
    SELECT sp.external_property_id FROM public.saved_properties sp
    INNER JOIN public.profiles p ON p.user_id = sp.user_id
    WHERE p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND sp.external_property_id IS NOT NULL
  )
);

-- INSERT: Only service role can insert (via edge functions)
DROP POLICY IF EXISTS "external_properties_insert_service_role" ON public.external_properties;
CREATE POLICY "external_properties_insert_service_role"
ON public.external_properties FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Only service role can update (via edge functions)
DROP POLICY IF EXISTS "external_properties_update_service_role" ON public.external_properties;
CREATE POLICY "external_properties_update_service_role"
ON public.external_properties FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- DELETE: Only super admin can delete
DROP POLICY IF EXISTS "external_properties_delete_super_admin" ON public.external_properties;
CREATE POLICY "external_properties_delete_super_admin"
ON public.external_properties FOR DELETE
USING ((SELECT public.is_super_admin()));

-- Super admin bypass
DROP POLICY IF EXISTS "external_properties_super_admin" ON public.external_properties;
CREATE POLICY "external_properties_super_admin"
ON public.external_properties FOR ALL
USING ((SELECT public.is_super_admin()));

-- ============================================================================
-- PHASE 3: Add indexes for RLS performance
-- ============================================================================

-- Index for addresses workspace filtering
CREATE INDEX IF NOT EXISTS idx_properties_address_tenant 
ON public.properties(address_id, tenant_id) 
WHERE address_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_address_tenant 
ON public.contacts(address_id, tenant_id) 
WHERE address_id IS NOT NULL;

-- Index for external_properties workspace filtering
CREATE INDEX IF NOT EXISTS idx_saved_properties_external_workspace
ON public.saved_properties(external_property_id)
WHERE external_property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_properties_address
ON public.external_properties(address_id)
WHERE address_id IS NOT NULL;

-- ============================================================================
-- VALIDATION: Verify policies were created correctly
-- ============================================================================

DO $$
DECLARE
  addresses_policy_count INTEGER;
  external_properties_policy_count INTEGER;
BEGIN
  -- Check addresses policies
  SELECT COUNT(*) INTO addresses_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'addresses'
    AND policyname IN (
      'addresses_select_by_workspace',
      'addresses_insert_authenticated',
      'addresses_update_by_workspace',
      'addresses_delete_super_admin',
      'addresses_service_role'
    );

  -- Check external_properties policies
  SELECT COUNT(*) INTO external_properties_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'external_properties'
    AND policyname IN (
      'external_properties_select_by_workspace',
      'external_properties_insert_service_role',
      'external_properties_update_service_role',
      'external_properties_delete_super_admin',
      'external_properties_super_admin'
    );

  IF addresses_policy_count >= 5 AND external_properties_policy_count >= 5 THEN
    RAISE NOTICE '✅ RLS policies fixed successfully: addresses (%), external_properties (%)', 
      addresses_policy_count, external_properties_policy_count;
  ELSE
    RAISE EXCEPTION '❌ Policy creation failed: addresses (%), external_properties (%)', 
      addresses_policy_count, external_properties_policy_count;
  END IF;
END $$;

-- ============================================================================
-- DONE: RLS Policy Security Fix Complete
-- ============================================================================
-- Summary:
-- 1. Fixed addresses RLS: Filter through properties/contacts in user's workspace
-- 2. Fixed external_properties RLS: Filter through saved_properties in user's workspace
-- 3. Added super_admin bypass for both tables
-- 4. Added service_role policies for backend operations
-- 5. Added performance indexes for RLS filtering
-- ============================================================================
