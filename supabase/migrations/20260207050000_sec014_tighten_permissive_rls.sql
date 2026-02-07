-- ============================================================================
-- SEC-014: Fix Overly Permissive RLS Policies
-- ============================================================================
-- Security Fix: SEC-014 from PM-Security (Cycle #9)
-- Date: 2026-02-07
-- Purpose: Tighten RLS policies that lack proper tenant isolation,
--          preventing cross-tenant data leakage for admin-role users.
--          Also fix "service role" named policies that are missing the
--          TO service_role grant (allowing any authenticated user to exploit).
--
-- Tables affected:
--   1. email_campaign_recipients - admin policy missing tenant filter
--   2. email_send_history        - admin policy missing tenant filter
--   3. email_campaign_steps      - missing tenant-scoped admin policy
--   4. production_metrics        - admin policy leaks cross-tenant data
--   5. search_metrics            - INSERT missing TO service_role restriction
--   6. ai_chat_metrics           - INSERT missing TO service_role restriction
--   7. zero_results_log          - INSERT missing TO service_role restriction
--   8. notifications             - INSERT missing TO service_role restriction
--   9. usage_records_archive     - INSERT/DELETE missing TO service_role
--
-- Approach: Drop overly permissive policies, replace with tenant-scoped
--           versions. Super admin retains cross-tenant access. Fix service
--           role policies to actually restrict to service_role.
-- ============================================================================

-- ============================================================================
-- PHASE 1: Fix email_campaign_recipients admin policy
-- ============================================================================
-- ISSUE: "Admins can manage campaign recipients" checks admin role but does
--        NOT filter by tenant. An admin from Tenant A could manage recipients
--        in Tenant B campaigns.
-- FIX:   Add tenant filter via campaign_id -> email_campaigns.tenant_id

DROP POLICY IF EXISTS "Admins can manage campaign recipients" ON public.email_campaign_recipients;

-- Super admins can manage ALL recipients (cross-tenant)
CREATE POLICY "Super admins can manage all campaign recipients"
  ON public.email_campaign_recipients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'super_admin'
    )
  );

-- Tenant admins can only manage recipients in their tenant campaigns
CREATE POLICY "Tenant admins can manage their campaign recipients"
  ON public.email_campaign_recipients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns ec
      WHERE ec.id = email_campaign_recipients.campaign_id
        AND ec.tenant_id = (
          SELECT tenant_id FROM public.profiles
          WHERE user_id = auth.uid() LIMIT 1
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Service role full access (for edge functions / automated email processing)
CREATE POLICY "email_campaign_recipients_service_role"
  ON public.email_campaign_recipients FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PHASE 2: Fix email_send_history admin policy
-- ============================================================================
-- ISSUE: "Admins can view all email history" checks admin role but does NOT
--        filter by tenant. An admin from Tenant A could view ALL email history.
-- FIX:   Regular admins see only their tenant history; super admins see all.

DROP POLICY IF EXISTS "Admins can view all email history" ON public.email_send_history;

-- Super admins can view all email history (cross-tenant)
CREATE POLICY "Super admins can view all email history"
  ON public.email_send_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'super_admin'
    )
  );

-- Tenant admins can only view email history for their tenant campaigns
CREATE POLICY "Tenant admins can view their email history"
  ON public.email_send_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns ec
      WHERE ec.id = email_send_history.campaign_id
        AND ec.tenant_id = (
          SELECT tenant_id FROM public.profiles
          WHERE user_id = auth.uid() LIMIT 1
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Service role full access (for email sending edge functions)
CREATE POLICY "email_send_history_service_role"
  ON public.email_send_history FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PHASE 3: Fix email_campaign_steps missing tenant-scoped admin policy
-- ============================================================================
-- ISSUE: Only super_admin can manage campaign steps. Regular tenant admins
--        who create campaigns cannot manage steps in their own campaigns.
--        This is too restrictive AND mismatches the email_campaigns pattern.
-- FIX:   Add tenant-scoped admin policy matching email_campaigns pattern.

-- Keep existing super admin policy (already correct)

-- Add tenant-scoped admin policy for campaign steps
CREATE POLICY "Tenant admins can manage their campaign steps"
  ON public.email_campaign_steps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns ec
      WHERE ec.id = email_campaign_steps.campaign_id
        AND ec.tenant_id = (
          SELECT tenant_id FROM public.profiles
          WHERE user_id = auth.uid() LIMIT 1
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Service role full access (for automated campaign management)
CREATE POLICY "email_campaign_steps_service_role"
  ON public.email_campaign_steps FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PHASE 4: Fix production_metrics admin policy
-- ============================================================================
-- ISSUE: "Admins can view production metrics" checks admin/super_admin role
--        but does NOT filter by tenant_id. The table HAS a tenant_id column,
--        but a regular admin from Tenant A can see metrics for all tenants.
-- FIX:   Regular admins see only their tenant metrics + NULL tenant (global).
--        Super admins retain full cross-tenant visibility.

DROP POLICY IF EXISTS "Admins can view production metrics" ON public.production_metrics;

-- Super admins can view ALL production metrics (cross-tenant)
CREATE POLICY "Super admins can view all production metrics"
  ON public.production_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  );

-- Tenant admins can only view their own tenant metrics + global (NULL tenant)
CREATE POLICY "Tenant admins can view their production metrics"
  ON public.production_metrics FOR SELECT
  USING (
    (
      tenant_id IS NULL
      OR tenant_id = (
        SELECT tenant_id FROM public.profiles
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
-- PHASE 5: Fix search_metrics INSERT — missing TO service_role
-- ============================================================================
-- ISSUE: "Service role can insert search metrics" uses WITH CHECK(true) but
--        does NOT restrict to service_role. Any authenticated user can insert
--        arbitrary search metrics, poisoning analytics data.
-- FIX:   Drop and recreate with TO service_role restriction.

DROP POLICY IF EXISTS "Service role can insert search metrics" ON public.search_metrics;

CREATE POLICY "search_metrics_insert_service_role"
  ON public.search_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- PHASE 6: Fix ai_chat_metrics INSERT — missing TO service_role
-- ============================================================================
-- ISSUE: "Service role can insert metrics" uses WITH CHECK(true) but does NOT
--        restrict to service_role. Any authenticated user can insert fake AI
--        chat metrics.
-- FIX:   Drop and recreate with TO service_role restriction.

DROP POLICY IF EXISTS "Service role can insert metrics" ON public.ai_chat_metrics;

CREATE POLICY "ai_chat_metrics_insert_service_role"
  ON public.ai_chat_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- PHASE 7: Fix zero_results_log INSERT — missing TO service_role
-- ============================================================================
-- ISSUE: "Service role can insert zero results" uses WITH CHECK(true) but does
--        NOT restrict to service_role. Any authenticated user can insert fake
--        zero-result log entries, corrupting search analytics.
-- FIX:   Drop and recreate with TO service_role restriction.

DROP POLICY IF EXISTS "Service role can insert zero results" ON public.zero_results_log;

CREATE POLICY "zero_results_log_insert_service_role"
  ON public.zero_results_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- PHASE 8: Fix notifications INSERT — missing TO service_role
-- ============================================================================
-- ISSUE: "Service can insert notifications" and "Service role can insert
--        notifications" both use WITH CHECK(true) without TO service_role.
--        Any authenticated user can insert notifications for ANY user in ANY
--        tenant. This is a significant cross-tenant data injection vector.
-- FIX:   Drop both variants and recreate with TO service_role restriction.

DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE POLICY "notifications_insert_service_role"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- PHASE 9: Fix usage_records_archive INSERT/DELETE — missing TO service_role
-- ============================================================================
-- ISSUE: "Service can archive usage records" INSERT uses WITH CHECK(true) and
--        "Service can cleanup old archives" DELETE uses USING(true). Neither
--        restricts to service_role. Any authenticated user can insert archive
--        records or delete ALL archives.
-- FIX:   Drop and recreate both with TO service_role restriction.

DROP POLICY IF EXISTS "Service can archive usage records" ON public.usage_records_archive;
DROP POLICY IF EXISTS "Service can cleanup old archives" ON public.usage_records_archive;

CREATE POLICY "usage_records_archive_insert_service_role"
  ON public.usage_records_archive FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "usage_records_archive_delete_service_role"
  ON public.usage_records_archive FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- PHASE 10: Add performance indexes for new RLS filter patterns
-- ============================================================================

-- Index to speed up campaign tenant lookups for recipient/step/history policies
CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant_id
  ON public.email_campaigns(tenant_id)
  WHERE tenant_id IS NOT NULL;

-- Index for email_send_history -> campaign_id lookups
CREATE INDEX IF NOT EXISTS idx_email_send_history_campaign_id
  ON public.email_send_history(campaign_id)
  WHERE campaign_id IS NOT NULL;

-- Index for email_campaign_recipients -> campaign_id lookups
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign_id
  ON public.email_campaign_recipients(campaign_id);

-- Index for email_campaign_steps -> campaign_id (may already exist, IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_email_campaign_steps_campaign_id_rls
  ON public.email_campaign_steps(campaign_id);

-- Index for production_metrics -> tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_production_metrics_tenant_id
  ON public.production_metrics(tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ============================================================================
-- VALIDATION: Verify policies were created correctly
-- ============================================================================

DO $$
DECLARE
  ecr_count INTEGER;
  esh_count INTEGER;
  ecs_count INTEGER;
  pm_count INTEGER;
  sm_ok BOOLEAN;
  acm_ok BOOLEAN;
  zrl_ok BOOLEAN;
  notif_ok BOOLEAN;
  ura_ok BOOLEAN;
BEGIN
  -- Check email_campaign_recipients policies
  SELECT COUNT(*) INTO ecr_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'email_campaign_recipients'
    AND policyname IN (
      'Users can view their own campaign status',
      'Super admins can manage all campaign recipients',
      'Tenant admins can manage their campaign recipients',
      'email_campaign_recipients_service_role'
    );

  -- Check email_send_history policies
  SELECT COUNT(*) INTO esh_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'email_send_history'
    AND policyname IN (
      'Users can view their own email history',
      'Super admins can view all email history',
      'Tenant admins can view their email history',
      'email_send_history_service_role'
    );

  -- Check email_campaign_steps policies
  SELECT COUNT(*) INTO ecs_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'email_campaign_steps'
    AND policyname IN (
      'Super admins can manage all campaign steps',
      'Tenant admins can manage their campaign steps',
      'email_campaign_steps_service_role'
    );

  -- Check production_metrics policies
  SELECT COUNT(*) INTO pm_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'production_metrics'
    AND policyname IN (
      'Super admins can view all production metrics',
      'Tenant admins can view their production metrics',
      'Service role can manage production metrics'
    );

  -- Check search_metrics service_role policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'search_metrics'
      AND policyname = 'search_metrics_insert_service_role'
  ) INTO sm_ok;

  -- Check ai_chat_metrics service_role policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_chat_metrics'
      AND policyname = 'ai_chat_metrics_insert_service_role'
  ) INTO acm_ok;

  -- Check zero_results_log service_role policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'zero_results_log'
      AND policyname = 'zero_results_log_insert_service_role'
  ) INTO zrl_ok;

  -- Check notifications service_role policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_insert_service_role'
  ) INTO notif_ok;

  -- Check usage_records_archive service_role policies
  SELECT COUNT(*) >= 2 INTO ura_ok
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'usage_records_archive'
    AND policyname IN (
      'usage_records_archive_insert_service_role',
      'usage_records_archive_delete_service_role'
    );

  IF ecr_count >= 3 AND esh_count >= 3 AND ecs_count >= 2 AND pm_count >= 2
     AND sm_ok AND acm_ok AND zrl_ok AND notif_ok AND ura_ok THEN
    RAISE NOTICE 'SEC-014: All RLS policies tightened successfully';
    RAISE NOTICE '   email_campaign_recipients: % policies', ecr_count;
    RAISE NOTICE '   email_send_history: % policies', esh_count;
    RAISE NOTICE '   email_campaign_steps: % policies', ecs_count;
    RAISE NOTICE '   production_metrics: % policies', pm_count;
    RAISE NOTICE '   search_metrics: service_role INSERT fixed';
    RAISE NOTICE '   ai_chat_metrics: service_role INSERT fixed';
    RAISE NOTICE '   zero_results_log: service_role INSERT fixed';
    RAISE NOTICE '   notifications: service_role INSERT fixed';
    RAISE NOTICE '   usage_records_archive: service_role INSERT+DELETE fixed';
  ELSE
    RAISE WARNING 'SEC-014: Some policies may be missing:';
    RAISE WARNING '   email_campaign_recipients: % (expected >=3)', ecr_count;
    RAISE WARNING '   email_send_history: % (expected >=3)', esh_count;
    RAISE WARNING '   email_campaign_steps: % (expected >=2)', ecs_count;
    RAISE WARNING '   production_metrics: % (expected >=2)', pm_count;
    RAISE WARNING '   search_metrics_insert_service_role: %', sm_ok;
    RAISE WARNING '   ai_chat_metrics_insert_service_role: %', acm_ok;
    RAISE WARNING '   zero_results_log_insert_service_role: %', zrl_ok;
    RAISE WARNING '   notifications_insert_service_role: %', notif_ok;
    RAISE WARNING '   usage_records_archive: %', ura_ok;
  END IF;
END $$;

-- ============================================================================
-- DONE: SEC-014 RLS Policy Security Fix Complete
-- ============================================================================
-- Summary:
-- 1. email_campaign_recipients: Replaced tenant-blind admin policy with
--    tenant-scoped version. Super admin retains cross-tenant access.
-- 2. email_send_history: Replaced tenant-blind admin policy with
--    tenant-scoped version. Super admin retains cross-tenant access.
-- 3. email_campaign_steps: Added tenant-scoped admin policy (was super_admin
--    only, now regular admins can manage their tenant campaign steps).
-- 4. production_metrics: Split admin policy into super_admin (all) and
--    tenant admin (own tenant + global only).
-- 5. search_metrics: Fixed INSERT policy — restricted to service_role only.
--    Was allowing any authenticated user to poison search analytics.
-- 6. ai_chat_metrics: Fixed INSERT policy — restricted to service_role only.
--    Was allowing any authenticated user to inject fake AI metrics.
-- 7. zero_results_log: Fixed INSERT policy — restricted to service_role only.
--    Was allowing any authenticated user to corrupt search failure analytics.
-- 8. notifications: Fixed INSERT policy — restricted to service_role only.
--    Was allowing any authenticated user to inject notifications for any
--    user in any tenant (cross-tenant data injection vector).
-- 9. usage_records_archive: Fixed INSERT and DELETE policies — restricted to
--    service_role only. Was allowing any authenticated user to insert archive
--    records or delete ALL archives.
-- 10. Added performance indexes for all new RLS join patterns.
--
-- Reviewed and kept as-is:
-- - addresses INSERT WITH CHECK(true): Shared reference table without
--   tenant_id. SELECT already workspace-scoped. Acceptable.
-- - workspace INSERT WITH CHECK(true): Intentional for onboarding flow.
-- - service_role TO service_role WITH CHECK(true): Trusted backend role.
-- - external_properties service_role policies: Already restricted to
--   service_role only. Acceptable.
-- ============================================================================
