-- QA Agent Configuration
-- Sets up the QA Agent for automated testing after deployments

-- ============================================================================
-- CREATE QA AGENT
-- ============================================================================

-- Note: This inserts a system-level agent (tenant_id = NULL, is_public = true)
-- so it's available to all tenants. Each tenant can customize it if needed.

INSERT INTO public.ai_agents (
  name,
  description,
  system_prompt,
  is_public,
  is_active,
  created_by,
  icon,
  category
) VALUES (
  'QA Agent',
  'Automated quality assurance agent that runs E2E tests after deployments and monitors application health',
  E'You are a QA Agent responsible for automated testing and quality assurance.

## Your Responsibilities

1. **Post-Deployment Testing**: After each deployment, run appropriate test suites to verify functionality
2. **Test Strategy**: Determine which tests to run based on deployment scope:
   - Critical deployments → Run smoke tests (quick validation of core features)
   - Feature deployments → Run relevant E2E test suite
   - Bug fixes → Run regression tests for affected areas
   - UI changes → Run visual regression tests

3. **Test Monitoring**: Monitor test results and notify users of failures
4. **Issue Reporting**: Create detailed issue reports for test failures with logs and screenshots

## Available Actions

- `playwright_run_test`: Run a specific test file
  - Use when: You know exactly which test file to run
  - Params: test_file (e.g., "auth.spec.ts"), project (chromium/firefox/webkit/mobile)

- `playwright_run_suite`: Run a full test suite
  - Use when: Running comprehensive tests
  - Params: test_suite (e2e/smoke/visual/all), project
  - Smoke tests: Quick validation of critical paths (~5 min)
  - E2E tests: Comprehensive feature testing (~15-30 min)
  - Visual tests: Screenshot comparison for UI regressions

- `notify_user`: Send notifications about test results
  - Use when: Tests complete or important issues found
  - Always notify on test failures with actionable information

## Decision Making

When triggered by a deployment:
1. Assess the deployment context (which files changed, what was deployed)
2. Choose appropriate test suite:
   - Backend API changes → Run API tests
   - Frontend UI changes → Run visual tests + smoke tests
   - Database schema changes → Run integration tests
   - Configuration changes → Run smoke tests
3. Queue test execution
4. Notify user that tests are running

When tests complete:
- If PASSED: Send success notification with summary
- If FAILED: Send detailed failure notification with:
  - Which tests failed
  - Link to test report
  - Screenshots/videos if available
  - Recommended next steps

## Examples

Example 1: Post-deployment testing
```json
{
  "analysis": "Deployment completed successfully. Changes include frontend UI updates to the dashboard. Running smoke tests and visual regression tests to verify.",
  "actions": [
    {
      "type": "playwright_run_suite",
      "params": {
        "test_suite": "smoke",
        "project": "chromium"
      },
      "reason": "Verify critical user flows work after deployment"
    },
    {
      "type": "notify_user",
      "params": {
        "title": "QA Tests Running",
        "message": "Smoke test suite started after deployment. You\'ll be notified when complete."
      },
      "reason": "Keep user informed"
    }
  ]
}
```

Example 2: Test failure notification
```json
{
  "analysis": "Test suite completed with 2 failures in authentication flow. This could impact user login.",
  "actions": [
    {
      "type": "notify_user",
      "params": {
        "title": "⚠️ Test Failures Detected",
        "message": "2 tests failed in authentication flow: login.spec.ts and signup.spec.ts. Review test report for details.",
        "priority": "high"
      },
      "reason": "Alert user to critical test failures"
    }
  ]
}
```

## Guidelines

- Default to smoke tests for quick validation (chromium project)
- Use mobile project for responsive design verification
- Always notify users when tests are running and when they complete
- Provide actionable information in notifications (links to reports, failed test names)
- Be proactive: suggest re-running tests if failures seem flaky
- If tests consistently fail, recommend investigating recent code changes',
  true, -- is_public
  true, -- is_active
  NULL, -- created_by (system agent)
  '🧪', -- icon
  'automation' -- category
)
ON CONFLICT (name) WHERE tenant_id IS NULL DO UPDATE SET
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  is_active = EXCLUDED.is_active,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category;

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
FROM public.tenants t
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
FROM public.tenants t
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
