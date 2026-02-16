-- ============================================================================
-- SEC-017: Create Missing RLS Policies
-- ============================================================================
-- Security Fix: SEC-017 from PM-Security (Cycle 14)
-- Date: 2026-02-15
-- Purpose: Audit and fix tables with missing or weak RLS policies to ensure
--          proper tenant isolation across the entire database.
--
-- Issues addressed:
--   1. churn_risk_assessments - Fix overly permissive policy
--   2. push_notification_tokens - Fix service policy lacking TO service_role
--   3. mrr_snapshots - Add tenant isolation for admin policies
--   4. subscription_events - Add tenant isolation for admin policies
--   5. Add missing super_admin bypass and service_role policies
--
-- Approach: Drop overly permissive policies, replace with tenant-scoped
--           versions. Super admin retains cross-tenant access. Fix service
--           role policies to properly restrict to service_role.
-- ============================================================================

-- ============================================================================
-- PHASE 1: Fix churn_risk_assessments overly permissive policy
-- ============================================================================
-- ISSUE: "Service role can manage churn assessments" uses
--        USING (auth.uid() IS NOT NULL) which allows ANY authenticated user
--        to manage ALL churn assessments across ALL tenants.
-- FIX:   Replace with proper service_role restricted policy.

DROP POLICY IF EXISTS "Service role can manage churn assessments" ON public.churn_risk_assessments;

-- Service role can manage all churn assessments (for edge functions)
CREATE POLICY "churn_risk_assessments_service_role"
  ON public.churn_risk_assessments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Super admin bypass for churn risk assessments
DROP POLICY IF EXISTS "Super admins can manage churn assessments" ON public.churn_risk_assessments;
CREATE POLICY "Super admins can manage churn assessments"
  ON public.churn_risk_assessments FOR ALL
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- Fix the existing admin policy to add tenant isolation
DROP POLICY IF EXISTS "Admins can view churn assessments" ON public.churn_risk_assessments;
CREATE POLICY "Tenant admins can view their churn assessments"
  ON public.churn_risk_assessments FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own assessment
    auth.uid() = user_id
    OR
    -- Tenant admins can view assessments for users in their workspace
    (
      workspace_id = (
        SELECT active_workspace_id FROM public.profiles
        WHERE user_id = auth.uid() LIMIT 1
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
          AND user_roles.role IN ('admin', 'super_admin')
      )
    )
  );

-- ============================================================================
-- PHASE 2: Fix push_notification_tokens service policy
-- ============================================================================
-- ISSUE: "Service can read all push tokens" uses USING(true) without
--        TO service_role restriction. Any authenticated user could read
--        ALL push tokens for ALL users.
-- FIX:   Drop and recreate with TO service_role restriction.

DROP POLICY IF EXISTS "Service can read all push tokens" ON public.push_notification_tokens;

-- Service role can read all tokens (for sending push notifications)
CREATE POLICY "push_notification_tokens_select_service_role"
  ON public.push_notification_tokens FOR SELECT
  TO service_role
  USING (true);

-- Service role can manage tokens (for cleanup operations)
CREATE POLICY "push_notification_tokens_manage_service_role"
  ON public.push_notification_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PHASE 3: Fix mrr_snapshots admin policy - add tenant isolation
-- ============================================================================
-- ISSUE: "Admins can view mrr snapshots" checks admin role but does NOT
--        filter by workspace_id. An admin from Workspace A can view MRR
--        metrics for ALL workspaces.
-- FIX:   Regular admins see only their workspace snapshots + global (NULL).
--        Super admins retain full cross-workspace visibility.

DROP POLICY IF EXISTS "Admins can view mrr snapshots" ON public.mrr_snapshots;

-- Super admins can view ALL MRR snapshots (cross-workspace)
CREATE POLICY "Super admins can view all mrr snapshots"
  ON public.mrr_snapshots FOR SELECT
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- Workspace admins can only view their workspace MRR snapshots + global
CREATE POLICY "Workspace admins can view their mrr snapshots"
  ON public.mrr_snapshots FOR SELECT
  TO authenticated
  USING (
    (
      workspace_id IS NULL
      OR workspace_id = (
        SELECT active_workspace_id FROM public.profiles
        WHERE user_id = auth.uid() LIMIT 1
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- PHASE 4: Fix subscription_events admin policy - add tenant isolation
-- ============================================================================
-- ISSUE: "Admins can view subscription events" checks admin role but does NOT
--        filter by workspace_id. An admin from Workspace A can view subscription
--        events for ALL workspaces.
-- FIX:   Regular admins see only their workspace events.
--        Super admins retain full cross-workspace visibility.

DROP POLICY IF EXISTS "Admins can view subscription events" ON public.subscription_events;

-- Super admins can view ALL subscription events (cross-workspace)
CREATE POLICY "Super admins can view all subscription events"
  ON public.subscription_events FOR SELECT
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- Workspace admins can only view their workspace subscription events
CREATE POLICY "Workspace admins can view their subscription events"
  ON public.subscription_events FOR SELECT
  TO authenticated
  USING (
    workspace_id = (
      SELECT active_workspace_id FROM public.profiles
      WHERE user_id = auth.uid() LIMIT 1
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- PHASE 5: Add missing super_admin bypass policies
-- ============================================================================

-- user_activity_log: Super admin bypass (was missing)
DROP POLICY IF EXISTS "Super admins can manage user activity" ON public.user_activity_log;
CREATE POLICY "Super admins can manage user activity"
  ON public.user_activity_log FOR ALL
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- retention_email_queue: Super admin bypass (was missing)
DROP POLICY IF EXISTS "Super admins can manage retention emails" ON public.retention_email_queue;
CREATE POLICY "Super admins can manage retention emails"
  ON public.retention_email_queue FOR ALL
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- message_reactions: Super admin bypass (was missing)
DROP POLICY IF EXISTS "Super admins can manage message reactions" ON public.message_reactions;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'message_reactions'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admins can manage message reactions"
      ON public.message_reactions FOR ALL
      TO authenticated
      USING ((SELECT public.is_super_admin()))';
  END IF;
END $$;

-- search_click_events: Super admin bypass (was missing)
DROP POLICY IF EXISTS "Super admins can manage search click events" ON public.search_click_events;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'search_click_events'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admins can manage search click events"
      ON public.search_click_events FOR ALL
      TO authenticated
      USING ((SELECT public.is_super_admin()))';
  END IF;
END $$;

-- ============================================================================
-- PHASE 6: Add missing service_role policies
-- ============================================================================

-- user_activity_log: Service role (for automated activity logging)
DROP POLICY IF EXISTS "user_activity_log_service_role" ON public.user_activity_log;
CREATE POLICY "user_activity_log_service_role"
  ON public.user_activity_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- retention_email_queue: Service role (for email sending)
DROP POLICY IF EXISTS "retention_email_queue_service_role" ON public.retention_email_queue;
CREATE POLICY "retention_email_queue_service_role"
  ON public.retention_email_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- message_reactions: Service role (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'message_reactions'
  ) THEN
    DROP POLICY IF EXISTS "message_reactions_service_role" ON public.message_reactions;
    EXECUTE 'CREATE POLICY "message_reactions_service_role"
      ON public.message_reactions FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- search_click_events: Service role (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'search_click_events'
  ) THEN
    DROP POLICY IF EXISTS "search_click_events_service_role" ON public.search_click_events;
    EXECUTE 'CREATE POLICY "search_click_events_service_role"
      ON public.search_click_events FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================================
-- PHASE 7: Add performance indexes for new RLS filter patterns
-- ============================================================================

-- Index for churn_risk_assessments workspace filtering
CREATE INDEX IF NOT EXISTS idx_churn_risk_assessments_workspace_id
  ON public.churn_risk_assessments(workspace_id)
  WHERE workspace_id IS NOT NULL;

-- Index for mrr_snapshots workspace filtering
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_workspace_id_date
  ON public.mrr_snapshots(workspace_id, snapshot_date DESC)
  WHERE workspace_id IS NOT NULL;

-- Index for subscription_events workspace filtering
CREATE INDEX IF NOT EXISTS idx_subscription_events_workspace_id_created
  ON public.subscription_events(workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- VALIDATION: Verify policies were created correctly
-- ============================================================================

DO $$
DECLARE
  churn_ok BOOLEAN;
  push_ok BOOLEAN;
  mrr_ok BOOLEAN;
  sub_events_ok BOOLEAN;
BEGIN
  -- Check churn_risk_assessments policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'churn_risk_assessments'
      AND policyname = 'churn_risk_assessments_service_role'
  ) INTO churn_ok;

  -- Check push_notification_tokens policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_notification_tokens'
      AND policyname = 'push_notification_tokens_select_service_role'
  ) INTO push_ok;

  -- Check mrr_snapshots policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mrr_snapshots'
      AND policyname IN ('Super admins can view all mrr snapshots', 'Workspace admins can view their mrr snapshots')
  ) INTO mrr_ok;

  -- Check subscription_events policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_events'
      AND policyname IN ('Super admins can view all subscription events', 'Workspace admins can view their subscription events')
  ) INTO sub_events_ok;

  IF churn_ok AND push_ok AND mrr_ok AND sub_events_ok THEN
    RAISE NOTICE 'SEC-017: All missing RLS policies created successfully';
    RAISE NOTICE '   churn_risk_assessments: service_role policy fixed';
    RAISE NOTICE '   push_notification_tokens: service_role restriction added';
    RAISE NOTICE '   mrr_snapshots: tenant isolation added';
    RAISE NOTICE '   subscription_events: tenant isolation added';
    RAISE NOTICE '   super_admin bypass policies added where missing';
    RAISE NOTICE '   service_role policies added where missing';
  ELSE
    RAISE WARNING 'SEC-017: Some policies may be missing:';
    RAISE WARNING '   churn_risk_assessments_service_role: %', churn_ok;
    RAISE WARNING '   push_notification_tokens_select_service_role: %', push_ok;
    RAISE WARNING '   mrr_snapshots policies: %', mrr_ok;
    RAISE WARNING '   subscription_events policies: %', sub_events_ok;
  END IF;
END $$;

-- ============================================================================
-- DONE: SEC-017 Missing RLS Policies Complete
-- ============================================================================
-- Summary:
-- 1. churn_risk_assessments: Fixed overly permissive policy. Was using
--    USING(auth.uid() IS NOT NULL) which allowed any authenticated user to
--    manage ALL assessments. Now properly restricted to service_role + tenant
--    admins can only view their workspace.
-- 2. push_notification_tokens: Fixed service policy. Was using USING(true)
--    without TO service_role restriction. Any authenticated user could read
--    ALL tokens. Now properly restricted to service_role only.
-- 3. mrr_snapshots: Added tenant isolation. Admin policy was cross-tenant.
--    Now workspace admins see only their workspace + global snapshots.
-- 4. subscription_events: Added tenant isolation. Admin policy was cross-tenant.
--    Now workspace admins see only their workspace events.
-- 5. Added super_admin bypass policies to: user_activity_log, retention_email_queue,
--    message_reactions, search_click_events.
-- 6. Added service_role policies to: user_activity_log, retention_email_queue,
--    message_reactions, search_click_events.
-- 7. Added performance indexes for all new RLS filter patterns.
--
-- Reviewed and kept as-is:
-- - security_events: Already has proper tenant-scoped admin policy + super_admin
-- - security_alerts: Already has proper tenant-scoped admin policy + super_admin
-- - addresses: Fixed in SEC-014 with workspace-scoped policies
-- - external_properties: Fixed in SEC-014 with workspace-scoped policies
-- ============================================================================
