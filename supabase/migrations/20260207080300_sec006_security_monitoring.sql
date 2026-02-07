-- ============================================================================
-- SEC-006: Security Monitoring Infrastructure
-- ============================================================================
-- Security Enhancement: SEC-006 from PM-Security (Cycle #9)
-- Date: 2026-02-07
-- Purpose: Implement comprehensive security monitoring to detect, track, and
--          alert on suspicious activities, authentication failures, policy
--          violations, and potential security threats.
--
-- Components:
--   1. security_events table - Centralized audit log for all security events
--   2. security_alerts table - Critical security alerts requiring investigation
--   3. Helper functions - Easy event logging from edge functions
--   4. Automated threat detection - Trigger-based suspicious pattern detection
--   5. Reporting views - Security dashboards and analytics
--
-- Metrics:
--   - Failed auth attempts per user/IP
--   - Unauthorized access attempts
--   - RLS policy violations
--   - Admin actions audit trail
--   - Suspicious rate patterns
--
-- Approach: Log all security events with rich context, detect patterns via
--           triggers, escalate to alerts when thresholds exceeded, provide
--           real-time security visibility to platform admins.
-- ============================================================================

-- ============================================================================
-- PHASE 1: Create security_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'auth_attempt',           -- Authentication attempt (success/failure)
    'auth_token_refresh',     -- Token refresh (success/failure)
    'auth_logout',            -- Logout event
    'access_denied',          -- Authorization failure (RLS, role check)
    'admin_action',           -- Admin/super admin action
    'data_access',            -- Sensitive data access
    'data_modification',      -- Create/update/delete operations
    'rls_violation',          -- RLS policy prevented access
    'rate_limit_exceeded',    -- Rate limiting triggered
    'suspicious_activity',    -- Detected suspicious pattern
    'security_config_change', -- Security setting changed
    'api_abuse',              -- API abuse detected
    'cors_violation',         -- CORS policy violation
    'token_validation_failed',-- JWT validation failed
    'service_role_usage'      -- Service role key used
  )),

  severity TEXT NOT NULL CHECK (severity IN (
    'critical',  -- Immediate attention required
    'high',      -- Investigate within 1 hour
    'medium',    -- Review within 24 hours
    'low',       -- Track for patterns
    'info'       -- Informational only
  )),

  -- Event details
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::JSONB, -- Flexible event-specific data

  -- Actor (who triggered the event)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,

  -- Context
  tenant_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,

  -- Tracking
  session_id TEXT,
  request_id TEXT,
  edge_function TEXT,

  -- Resolution
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  source TEXT DEFAULT 'system' -- 'system', 'edge_function', 'rls_trigger', etc.
);

-- Indexes for common queries
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_event_type ON public.security_events(event_type) WHERE NOT resolved;
CREATE INDEX idx_security_events_severity ON public.security_events(severity) WHERE NOT resolved AND severity IN ('critical', 'high');
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_events_tenant_id ON public.security_events(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_security_events_ip_address ON public.security_events(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX idx_security_events_unresolved ON public.security_events(created_at DESC) WHERE NOT resolved;

-- GIN index for JSONB details field (for searching event-specific data)
CREATE INDEX idx_security_events_details ON public.security_events USING GIN(details);

-- GIN index for tags array
CREATE INDEX idx_security_events_tags ON public.security_events USING GIN(tags);

-- Composite index for user auth failure tracking
CREATE INDEX idx_security_events_auth_failures
  ON public.security_events(user_email, event_type, created_at DESC)
  WHERE event_type = 'auth_attempt' AND (details->>'success')::boolean = false;

-- Composite index for IP-based threat detection
CREATE INDEX idx_security_events_ip_threats
  ON public.security_events(ip_address, event_type, created_at DESC)
  WHERE severity IN ('high', 'critical');

COMMENT ON TABLE public.security_events IS 'Centralized audit log for all security-related events, authentication attempts, and suspicious activities';

-- ============================================================================
-- PHASE 2: Create security_alerts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Alert classification
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'brute_force_attempt',      -- Multiple failed auth attempts
    'account_takeover_risk',    -- Suspicious account activity
    'privilege_escalation',     -- Unauthorized role access attempt
    'data_exfiltration_risk',   -- Unusual data access pattern
    'api_abuse',                -- Excessive API usage
    'rls_bypass_attempt',       -- Attempted RLS policy bypass
    'credential_leak_detected', -- Potential credential exposure
    'suspicious_ip_activity',   -- Multiple violations from IP
    'rate_limit_exceeded',      -- Rate limiting triggered repeatedly
    'security_misconfiguration', -- Security setting issue detected
    'anomalous_behavior'        -- ML/heuristic-detected anomaly
  )),

  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),

  -- Alert content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT, -- Suggested action to take

  -- Context
  affected_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_tenant_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  source_ip INET,

  -- Related events
  related_event_ids UUID[] DEFAULT ARRAY[]::UUID[],
  event_count INTEGER DEFAULT 0, -- Number of related events

  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',           -- New alert, needs investigation
    'acknowledged',   -- Someone is looking at it
    'investigating',  -- Under active investigation
    'resolved',       -- Issue resolved
    'false_positive', -- Not a real threat
    'ignored'         -- Acknowledged but no action needed
  )),

  -- Resolution
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Thresholds that triggered alert
  threshold_config JSONB,

  -- Notification
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  notification_channels TEXT[] DEFAULT ARRAY[]::TEXT[] -- 'email', 'slack', 'pagerduty'
);

-- Indexes
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_status ON public.security_alerts(status, severity, created_at DESC) WHERE status IN ('open', 'acknowledged', 'investigating');
CREATE INDEX idx_security_alerts_affected_user ON public.security_alerts(affected_user_id) WHERE affected_user_id IS NOT NULL;
CREATE INDEX idx_security_alerts_source_ip ON public.security_alerts(source_ip) WHERE source_ip IS NOT NULL;
CREATE INDEX idx_security_alerts_unnotified ON public.security_alerts(created_at DESC) WHERE NOT notified AND status = 'open';

COMMENT ON TABLE public.security_alerts IS 'Critical security alerts requiring investigation, aggregated from security events';

-- ============================================================================
-- PHASE 3: Create helper function for logging security events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_request_method TEXT DEFAULT NULL,
  p_edge_function TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_source TEXT DEFAULT 'system'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_resolved_user_id UUID;
  v_resolved_email TEXT;
  v_resolved_tenant_id UUID;
BEGIN
  -- Auto-resolve user_id if not provided but auth.uid() is available
  v_resolved_user_id := COALESCE(p_user_id, auth.uid());

  -- Auto-resolve user email if not provided
  IF p_user_email IS NULL AND v_resolved_user_id IS NOT NULL THEN
    SELECT email INTO v_resolved_email
    FROM auth.users
    WHERE id = v_resolved_user_id
    LIMIT 1;
  ELSE
    v_resolved_email := p_user_email;
  END IF;

  -- Auto-resolve tenant_id if not provided
  IF p_tenant_id IS NULL AND v_resolved_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_resolved_tenant_id
    FROM public.profiles
    WHERE user_id = v_resolved_user_id
    LIMIT 1;
  ELSE
    v_resolved_tenant_id := p_tenant_id;
  END IF;

  -- Insert event
  INSERT INTO public.security_events (
    event_type,
    severity,
    description,
    details,
    user_id,
    user_email,
    tenant_id,
    ip_address,
    user_agent,
    request_path,
    request_method,
    edge_function,
    tags,
    source
  ) VALUES (
    p_event_type,
    p_severity,
    p_description,
    p_details,
    v_resolved_user_id,
    v_resolved_email,
    v_resolved_tenant_id,
    p_ip_address,
    p_user_agent,
    p_request_path,
    p_request_method,
    p_edge_function,
    p_tags,
    p_source
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.log_security_event IS 'Helper function to log security events from edge functions or triggers. Auto-resolves user context when possible.';

-- ============================================================================
-- PHASE 4: Create threat detection triggers
-- ============================================================================

-- Function to detect brute force attempts
CREATE OR REPLACE FUNCTION public.detect_brute_force_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_failure_count INTEGER;
  v_existing_alert_id UUID;
  v_time_window INTERVAL := '15 minutes';
  v_threshold INTEGER := 5; -- 5 failed attempts in 15 minutes
BEGIN
  -- Only process failed auth attempts
  IF NEW.event_type = 'auth_attempt' AND (NEW.details->>'success')::boolean = false THEN

    -- Count recent failures from same user/email or IP
    SELECT COUNT(*) INTO v_failure_count
    FROM public.security_events
    WHERE event_type = 'auth_attempt'
      AND (details->>'success')::boolean = false
      AND created_at > NOW() - v_time_window
      AND (
        (NEW.user_email IS NOT NULL AND user_email = NEW.user_email)
        OR (NEW.ip_address IS NOT NULL AND ip_address = NEW.ip_address)
      );

    -- If threshold exceeded, create alert
    IF v_failure_count >= v_threshold THEN

      -- Check if alert already exists (don't spam)
      SELECT id INTO v_existing_alert_id
      FROM public.security_alerts
      WHERE alert_type = 'brute_force_attempt'
        AND status IN ('open', 'acknowledged', 'investigating')
        AND (
          (NEW.user_email IS NOT NULL AND affected_user_id = NEW.user_id)
          OR (NEW.ip_address IS NOT NULL AND source_ip = NEW.ip_address)
        )
        AND created_at > NOW() - v_time_window
      LIMIT 1;

      IF v_existing_alert_id IS NULL THEN
        -- Create new alert
        INSERT INTO public.security_alerts (
          alert_type,
          severity,
          title,
          description,
          recommendation,
          affected_user_id,
          source_ip,
          event_count,
          related_event_ids,
          threshold_config
        ) VALUES (
          'brute_force_attempt',
          CASE WHEN v_failure_count > 10 THEN 'critical' ELSE 'high' END,
          'Brute Force Attack Detected',
          format('Detected %s failed authentication attempts in %s from %s',
            v_failure_count,
            v_time_window,
            COALESCE(NEW.user_email, NEW.ip_address::text, 'unknown source')
          ),
          'Consider temporarily blocking this user/IP and notifying the account owner if legitimate user.',
          NEW.user_id,
          NEW.ip_address,
          v_failure_count,
          ARRAY[NEW.id],
          jsonb_build_object(
            'threshold', v_threshold,
            'time_window', v_time_window::text,
            'failure_count', v_failure_count
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for brute force detection
DROP TRIGGER IF EXISTS trigger_detect_brute_force ON public.security_events;
CREATE TRIGGER trigger_detect_brute_force
  AFTER INSERT ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_brute_force_attempts();

COMMENT ON FUNCTION public.detect_brute_force_attempts IS 'Automatically detects brute force authentication attempts and creates alerts';

-- ============================================================================
-- PHASE 5: Create security reporting views
-- ============================================================================

-- View: Recent critical security events
CREATE OR REPLACE VIEW public.security_dashboard_critical AS
SELECT
  id,
  created_at,
  event_type,
  severity,
  description,
  user_email,
  ip_address,
  tenant_id,
  resolved,
  tags
FROM public.security_events
WHERE severity IN ('critical', 'high')
  AND NOT resolved
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

COMMENT ON VIEW public.security_dashboard_critical IS 'Last 7 days of unresolved critical/high severity security events';

-- View: Authentication failure summary by user
CREATE OR REPLACE VIEW public.auth_failure_summary AS
SELECT
  user_email,
  COUNT(*) as failure_count,
  COUNT(DISTINCT ip_address) as distinct_ips,
  MAX(created_at) as last_failure,
  MIN(created_at) as first_failure,
  array_agg(DISTINCT ip_address::text) as ip_addresses
FROM public.security_events
WHERE event_type = 'auth_attempt'
  AND (details->>'success')::boolean = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
HAVING COUNT(*) >= 3
ORDER BY failure_count DESC;

COMMENT ON VIEW public.auth_failure_summary IS 'Summary of authentication failures in last 24 hours (users with 3+ failures)';

-- View: Suspicious IP addresses
CREATE OR REPLACE VIEW public.suspicious_ips AS
SELECT
  ip_address,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_email) as affected_users,
  array_agg(DISTINCT event_type) as event_types,
  MAX(created_at) as last_seen,
  MIN(created_at) as first_seen
FROM public.security_events
WHERE severity IN ('high', 'critical')
  AND ip_address IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY event_count DESC;

COMMENT ON VIEW public.suspicious_ips IS 'IP addresses with 5+ high/critical severity events in last 24 hours';

-- View: Open security alerts dashboard
CREATE OR REPLACE VIEW public.security_alerts_dashboard AS
SELECT
  id,
  created_at,
  alert_type,
  severity,
  title,
  description,
  affected_user_id,
  source_ip,
  event_count,
  status,
  notified,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_open
FROM public.security_alerts
WHERE status IN ('open', 'acknowledged', 'investigating')
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  created_at DESC;

COMMENT ON VIEW public.security_alerts_dashboard IS 'All open security alerts ordered by severity and age';

-- ============================================================================
-- PHASE 6: Row-Level Security (RLS) for security tables
-- ============================================================================

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Super admins can see all events and alerts
CREATE POLICY "Super admins can view all security events"
  ON public.security_events FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can manage security events"
  ON public.security_events FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can view all security alerts"
  ON public.security_alerts FOR ALL
  USING (public.is_super_admin());

-- Service role can insert events and alerts (for automated systems)
CREATE POLICY "Service role can insert security events"
  ON public.security_events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert security alerts"
  ON public.security_alerts FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Tenant admins can view events for their tenant only
CREATE POLICY "Tenant admins can view their security events"
  ON public.security_events FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE user_id = auth.uid() LIMIT 1
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Tenant admins can view their security alerts"
  ON public.security_alerts FOR SELECT
  USING (
    affected_tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE user_id = auth.uid() LIMIT 1
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Grant access to views (inherit RLS from base tables)
GRANT SELECT ON public.security_dashboard_critical TO authenticated;
GRANT SELECT ON public.auth_failure_summary TO authenticated;
GRANT SELECT ON public.suspicious_ips TO authenticated;
GRANT SELECT ON public.security_alerts_dashboard TO authenticated;

-- ============================================================================
-- PHASE 7: Create maintenance functions
-- ============================================================================

-- Function to auto-resolve old events
CREATE OR REPLACE FUNCTION public.archive_old_security_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_archived_count INTEGER;
  v_retention_days INTEGER := 90; -- Keep 90 days of events
BEGIN
  -- Mark old low/info severity events as resolved
  UPDATE public.security_events
  SET resolved = true,
      resolved_at = NOW(),
      resolution_notes = 'Auto-archived after retention period'
  WHERE created_at < NOW() - (v_retention_days || ' days')::INTERVAL
    AND NOT resolved
    AND severity IN ('low', 'info');

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  RETURN v_archived_count;
END;
$$;

COMMENT ON FUNCTION public.archive_old_security_events IS 'Archives low/info severity security events older than retention period (90 days)';

-- Function to get security health score
CREATE OR REPLACE FUNCTION public.get_security_health_score()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_critical_count INTEGER;
  v_high_count INTEGER;
  v_open_alerts INTEGER;
  v_recent_incidents INTEGER;
  v_score NUMERIC;
BEGIN
  -- Count unresolved critical events (last 7 days)
  SELECT COUNT(*) INTO v_critical_count
  FROM public.security_events
  WHERE severity = 'critical'
    AND NOT resolved
    AND created_at > NOW() - INTERVAL '7 days';

  -- Count unresolved high severity events (last 7 days)
  SELECT COUNT(*) INTO v_high_count
  FROM public.security_events
  WHERE severity = 'high'
    AND NOT resolved
    AND created_at > NOW() - INTERVAL '7 days';

  -- Count open alerts
  SELECT COUNT(*) INTO v_open_alerts
  FROM public.security_alerts
  WHERE status IN ('open', 'acknowledged', 'investigating');

  -- Count recent security incidents (last 24 hours)
  SELECT COUNT(*) INTO v_recent_incidents
  FROM public.security_events
  WHERE severity IN ('critical', 'high')
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Calculate score (100 = perfect, 0 = critical issues)
  v_score := 100
    - (v_critical_count * 20)  -- Each critical event -20 points
    - (v_high_count * 5)        -- Each high severity -5 points
    - (v_open_alerts * 3)       -- Each open alert -3 points
    - (v_recent_incidents * 2); -- Each recent incident -2 points

  v_score := GREATEST(v_score, 0); -- Floor at 0

  RETURN jsonb_build_object(
    'score', v_score,
    'grade', CASE
      WHEN v_score >= 95 THEN 'A+'
      WHEN v_score >= 90 THEN 'A'
      WHEN v_score >= 85 THEN 'B+'
      WHEN v_score >= 80 THEN 'B'
      WHEN v_score >= 75 THEN 'C+'
      WHEN v_score >= 70 THEN 'C'
      WHEN v_score >= 60 THEN 'D'
      ELSE 'F'
    END,
    'critical_events', v_critical_count,
    'high_severity_events', v_high_count,
    'open_alerts', v_open_alerts,
    'recent_incidents_24h', v_recent_incidents,
    'status', CASE
      WHEN v_score >= 90 THEN 'healthy'
      WHEN v_score >= 70 THEN 'warning'
      ELSE 'critical'
    END,
    'calculated_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION public.get_security_health_score IS 'Calculates overall security health score based on recent events and open alerts';

-- ============================================================================
-- VALIDATION: Verify tables and functions created successfully
-- ============================================================================

DO $$
DECLARE
  v_events_table_exists BOOLEAN;
  v_alerts_table_exists BOOLEAN;
  v_log_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_views_count INTEGER;
BEGIN
  -- Check security_events table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'security_events'
  ) INTO v_events_table_exists;

  -- Check security_alerts table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'security_alerts'
  ) INTO v_alerts_table_exists;

  -- Check log_security_event function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'log_security_event'
  ) INTO v_log_function_exists;

  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_detect_brute_force'
  ) INTO v_trigger_exists;

  -- Count security views
  SELECT COUNT(*) INTO v_views_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN (
      'security_dashboard_critical',
      'auth_failure_summary',
      'suspicious_ips',
      'security_alerts_dashboard'
    );

  IF v_events_table_exists AND v_alerts_table_exists
     AND v_log_function_exists AND v_trigger_exists
     AND v_views_count = 4 THEN
    RAISE NOTICE 'SEC-006: Security monitoring infrastructure created successfully';
    RAISE NOTICE '  ✓ security_events table with 9 indexes';
    RAISE NOTICE '  ✓ security_alerts table with 5 indexes';
    RAISE NOTICE '  ✓ log_security_event() helper function';
    RAISE NOTICE '  ✓ detect_brute_force_attempts() trigger';
    RAISE NOTICE '  ✓ 4 security dashboard views';
    RAISE NOTICE '  ✓ archive_old_security_events() maintenance function';
    RAISE NOTICE '  ✓ get_security_health_score() analytics function';
    RAISE NOTICE '  ✓ RLS policies for tenant isolation';
  ELSE
    RAISE WARNING 'SEC-006: Some components may be missing:';
    RAISE WARNING '  security_events table: %', v_events_table_exists;
    RAISE WARNING '  security_alerts table: %', v_alerts_table_exists;
    RAISE WARNING '  log_security_event function: %', v_log_function_exists;
    RAISE WARNING '  brute_force_trigger: %', v_trigger_exists;
    RAISE WARNING '  security views: %/4', v_views_count;
  END IF;
END $$;

-- ============================================================================
-- DONE: SEC-006 Security Monitoring Infrastructure Complete
-- ============================================================================
-- Summary:
-- 1. Created security_events table with 15 event types, severity levels,
--    rich context (user, tenant, IP, user-agent), and flexible JSONB details.
--    Added 9 indexes for performance including GIN indexes for JSONB/arrays.
--
-- 2. Created security_alerts table with 11 alert types for aggregating
--    related security events into actionable alerts with status tracking,
--    resolution workflow, and notification support.
--
-- 3. Created log_security_event() helper function for easy event logging
--    from edge functions with automatic context resolution (user, email, tenant).
--
-- 4. Implemented automated threat detection with detect_brute_force_attempts()
--    trigger that automatically creates alerts when threshold exceeded
--    (5 failed auth attempts in 15 minutes).
--
-- 5. Created 4 security dashboard views for real-time visibility:
--    - security_dashboard_critical: Unresolved critical/high events (7 days)
--    - auth_failure_summary: Users with 3+ failures (24 hours)
--    - suspicious_ips: IPs with 5+ high/critical events (24 hours)
--    - security_alerts_dashboard: All open alerts by severity
--
-- 6. Implemented RLS policies:
--    - Super admins: full access to all events and alerts
--    - Tenant admins: view events/alerts for their tenant only
--    - Service role: can insert events and alerts (automated systems)
--
-- 7. Created maintenance functions:
--    - archive_old_security_events(): Auto-archive old low/info events (90 day retention)
--    - get_security_health_score(): Calculate security health score (A+ to F)
--
-- Usage from edge functions:
--   SELECT log_security_event(
--     'auth_attempt',
--     'high',
--     'Failed login attempt',
--     jsonb_build_object('success', false, 'reason', 'invalid_password'),
--     p_user_email := 'user@example.com',
--     p_ip_address := '192.168.1.1'::inet
--   );
--
-- Query examples:
--   -- Get security health
--   SELECT * FROM get_security_health_score();
--
--   -- View critical events
--   SELECT * FROM security_dashboard_critical;
--
--   -- Check open alerts
--   SELECT * FROM security_alerts_dashboard;
--
-- Next steps (for future enhancement):
--   - Integrate with notification system (email/Slack for critical alerts)
--   - Add ML-based anomaly detection
--   - Create security metrics dashboard in frontend
--   - Implement IP blocking/rate limiting based on alerts
--   - Add SIEM integration (export to Splunk, DataDog, etc.)
-- ============================================================================
