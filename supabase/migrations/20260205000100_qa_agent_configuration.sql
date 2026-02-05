-- QA Agent Configuration
-- Sets up the QA Agent for automated testing after deployments

-- ============================================================================
-- CREATE QA AGENT
-- ============================================================================

-- Note: This inserts a system-level agent (tenant_id = NULL, is_public = true)
-- so it's available to all workspaces. Each workspace can customize it if needed.

INSERT INTO public.ai_agents (
  name,
  description,
  system_prompt,
  is_public,
  created_by,
  icon,
  category
) VALUES (
  'QA Agent',
  'Automated quality assurance agent that runs E2E tests after deployments and monitors application health',
  $prompt$You are a QA Agent responsible for automated testing and quality assurance.

Your Responsibilities:
1. Post-Deployment Testing: Run appropriate test suites to verify functionality
2. Test Strategy: Determine tests based on deployment scope (smoke, e2e, visual, regression)
3. Test Monitoring: Monitor results and notify users of failures
4. Issue Reporting: Create detailed reports for test failures

Available Actions:
- playwright_run_test: Run a specific test file
- playwright_run_suite: Run a full test suite (e2e/smoke/visual/all)
- notify_user: Send notifications about test results

Guidelines:
- Default to smoke tests for quick validation
- Always notify users when tests complete
- Provide actionable information in notifications$prompt$,
  true,
  NULL,
  '🧪',
  'automation'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE QA AGENT TRIGGERS
-- ============================================================================

-- Note: These create default triggers for the system QA Agent
-- Each tenant can customize or disable these triggers as needed

-- Trigger 1: Manual execution
INSERT INTO public.agent_triggers (
  tenant_id,
  agent_id,
  trigger_type,
  trigger_conditions,
  is_active,
  requires_approval,
  priority,
  name,
  description
)
SELECT
  t.id AS tenant_id,
  a.id AS agent_id,
  'manual',
  '{}',
  true,
  false, -- No approval needed for manual triggers
  5, -- Medium priority
  'Manual QA Testing',
  'Manually trigger QA Agent to run tests on demand'
FROM public.workspaces t
CROSS JOIN public.ai_agents a
WHERE a.name = 'QA Agent' AND a.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- Trigger 2: Scheduled daily health check (3 AM)
INSERT INTO public.agent_triggers (
  tenant_id,
  agent_id,
  trigger_type,
  trigger_conditions,
  schedule_cron,
  is_active,
  requires_approval,
  priority,
  name,
  description
)
SELECT
  t.id AS tenant_id,
  a.id AS agent_id,
  'scheduled',
  jsonb_build_object(
    'test_suite', 'smoke',
    'project', 'chromium'
  ),
  '0 3 * * *', -- Daily at 3 AM
  false, -- Disabled by default (tenant can enable)
  false,
  3, -- Lower priority
  'Daily Health Check',
  'Run smoke tests daily at 3 AM to ensure application health'
FROM public.workspaces t
CROSS JOIN public.ai_agents a
WHERE a.name = 'QA Agent' AND a.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Trigger QA Agent Manually
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_qa_agent(
  p_user_id UUID,
  p_test_suite TEXT DEFAULT 'smoke',
  p_project TEXT DEFAULT 'chromium',
  p_additional_context TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
  v_agent_id UUID;
  v_agent_run_id UUID;
BEGIN
  -- Get tenant ID
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User not found or not associated with a tenant';
  END IF;

  -- Get QA Agent ID
  SELECT id INTO v_agent_id
  FROM public.ai_agents
  WHERE name = 'QA Agent' AND (tenant_id IS NULL OR tenant_id = v_tenant_id)
  ORDER BY tenant_id NULLS LAST -- Prefer tenant-specific agent
  LIMIT 1;

  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'QA Agent not found';
  END IF;

  -- Create agent run (this will be picked up by the execute-agent function)
  -- Note: Actual execution happens via API call, not here
  -- This function just validates and returns context for the caller

  RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.trigger_qa_agent IS 'Manually trigger the QA Agent to run tests. Returns agent_id for execution.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Allow authenticated users to trigger QA agent
GRANT EXECUTE ON FUNCTION public.trigger_qa_agent TO authenticated;
