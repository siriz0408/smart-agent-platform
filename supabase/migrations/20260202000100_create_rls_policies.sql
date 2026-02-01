-- Migration: Create optimized RLS policies for search entities
-- Date: 2026-02-02
-- Purpose: Secure tenant isolation with performance-optimized RLS patterns

-- ============================================================================
-- Performance Optimization Pattern
-- ============================================================================
-- CRITICAL: Use (SELECT auth.uid()) instead of auth.uid() directly
-- Why: Wrapping in SELECT caches the result → 100x faster on large tables
-- Impact: Single function call vs call per row

-- ============================================================================
-- Enable RLS on all entity tables
-- ============================================================================

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Contacts RLS Policies
-- ============================================================================

-- Drop existing policies if they exist (idempotent migration)
DROP POLICY IF EXISTS contacts_select_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_insert_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_update_policy ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_policy ON public.contacts;

-- SELECT: Users can only view their own tenant's contacts
CREATE POLICY contacts_select_policy ON public.contacts
  FOR SELECT
  USING (tenant_id = (SELECT auth.uid()));

-- INSERT: Users can only create contacts in their tenant
CREATE POLICY contacts_insert_policy ON public.contacts
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT auth.uid()));

-- UPDATE: Users can only update their own tenant's contacts
CREATE POLICY contacts_update_policy ON public.contacts
  FOR UPDATE
  USING (tenant_id = (SELECT auth.uid()))
  WITH CHECK (tenant_id = (SELECT auth.uid()));

-- DELETE: Users can only delete their own tenant's contacts
CREATE POLICY contacts_delete_policy ON public.contacts
  FOR DELETE
  USING (tenant_id = (SELECT auth.uid()));

-- ============================================================================
-- Properties RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS properties_select_policy ON public.properties;
DROP POLICY IF EXISTS properties_insert_policy ON public.properties;
DROP POLICY IF EXISTS properties_update_policy ON public.properties;
DROP POLICY IF EXISTS properties_delete_policy ON public.properties;

CREATE POLICY properties_select_policy ON public.properties
  FOR SELECT
  USING (tenant_id = (SELECT auth.uid()));

CREATE POLICY properties_insert_policy ON public.properties
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT auth.uid()));

CREATE POLICY properties_update_policy ON public.properties
  FOR UPDATE
  USING (tenant_id = (SELECT auth.uid()))
  WITH CHECK (tenant_id = (SELECT auth.uid()));

CREATE POLICY properties_delete_policy ON public.properties
  FOR DELETE
  USING (tenant_id = (SELECT auth.uid()));

-- ============================================================================
-- Deals RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS deals_select_policy ON public.deals;
DROP POLICY IF EXISTS deals_insert_policy ON public.deals;
DROP POLICY IF EXISTS deals_update_policy ON public.deals;
DROP POLICY IF EXISTS deals_delete_policy ON public.deals;

CREATE POLICY deals_select_policy ON public.deals
  FOR SELECT
  USING (tenant_id = (SELECT auth.uid()));

CREATE POLICY deals_insert_policy ON public.deals
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT auth.uid()));

CREATE POLICY deals_update_policy ON public.deals
  FOR UPDATE
  USING (tenant_id = (SELECT auth.uid()))
  WITH CHECK (tenant_id = (SELECT auth.uid()));

CREATE POLICY deals_delete_policy ON public.deals
  FOR DELETE
  USING (tenant_id = (SELECT auth.uid()));

-- ============================================================================
-- Verify indexes exist for RLS columns
-- ============================================================================

-- These indexes were created in previous migration (20260202000000)
-- Verify they exist for optimal RLS performance

DO $$
BEGIN
  -- Check if tenant_id indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'contacts' AND indexname = 'contacts_tenant_id_idx'
  ) THEN
    RAISE NOTICE 'WARNING: contacts_tenant_id_idx missing - RLS will be slow!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'properties' AND indexname = 'properties_tenant_id_idx'
  ) THEN
    RAISE NOTICE 'WARNING: properties_tenant_id_idx missing - RLS will be slow!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'deals' AND indexname = 'deals_tenant_id_idx'
  ) THEN
    RAISE NOTICE 'WARNING: deals_tenant_id_idx missing - RLS will be slow!';
  END IF;
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON POLICY contacts_select_policy ON contacts IS 'Optimized RLS: Users can only view contacts in their tenant';
COMMENT ON POLICY properties_select_policy ON properties IS 'Optimized RLS: Users can only view properties in their tenant';
COMMENT ON POLICY deals_select_policy ON deals IS 'Optimized RLS: Users can only view deals in their tenant';

-- ============================================================================
-- Performance verification query
-- ============================================================================

-- Run this after migration to verify RLS performance:
-- EXPLAIN ANALYZE SELECT * FROM contacts WHERE tenant_id = (SELECT auth.uid()) LIMIT 10;
-- Expected: "Index Scan using contacts_tenant_id_idx"
-- Bad: "Seq Scan on contacts" (means index not being used)
