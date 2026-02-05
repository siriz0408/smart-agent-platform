# Playwright MCP Quick Start Guide 🚀

Fast reference for using the Playwright MCP integration.

---

## 🎯 What is Playwright MCP?

Agent-driven E2E testing integration that allows AI agents to:
- Trigger automated tests via GitHub Actions
- Receive test results via webhooks
- Notify users of test outcomes
- Monitor application health

---

## ⚡ Quick Deploy (5 Minutes)

```bash
# 1. Run deployment script
./scripts/deploy-playwright-mcp.sh

# 2. Set required secrets (if not done by script)
npx supabase secrets set GITHUB_TOKEN=ghp_xxxxx
npx supabase secrets set GITHUB_REPO_OWNER=your-username
npx supabase secrets set GITHUB_REPO_NAME=ReAgentOS_V1
npx supabase secrets set PLAYWRIGHT_WEBHOOK_SECRET=$(openssl rand -hex 32)

# 3. Verify deployment
npx supabase functions list
# Should show: playwright-mcp, playwright-webhook, mcp-gateway
```

---

## 🧪 Common Operations

### Manually Trigger Tests

**Via API:**
```bash
curl -X POST "https://xxxxx.supabase.co/functions/v1/mcp-gateway" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "mcp_type": "playwright",
    "tool_name": "playwright_run_suite",
    "params": {
      "test_suite": "smoke",
      "project": "chromium"
    }
  }'
```

**Via SQL:**
```sql
-- Get QA Agent ID first
SELECT id FROM ai_agents WHERE name = 'QA Agent';

-- Execute agent (use in Supabase SQL Editor or via API)
SELECT public.trigger_qa_agent(
  'YOUR_USER_ID'::uuid,
  'smoke',  -- test_suite: smoke/e2e/visual/all
  'chromium',  -- project: chromium/firefox/webkit/mobile
  'Manual test trigger'  -- context
);
```

**Via GitHub UI:**
1. Go to Actions → Playwright Tests
2. Click "Run workflow"
3. Fill in inputs:
   - `test_run_id`: Generate UUID or use `00000000-0000-0000-0000-000000000000`
   - `test_suite`: smoke/e2e/visual/all
   - `project`: chromium/firefox/webkit/mobile
   - `callback_url`: Your webhook URL
4. Click "Run workflow"

### View Test Results

**Check Latest Test Runs:**
```sql
SELECT
  id,
  test_suite,
  project,
  status,
  total_tests,
  passed_tests,
  failed_tests,
  github_run_url,
  created_at
FROM test_runs
ORDER BY created_at DESC
LIMIT 10;
```

**Check Test Run Details:**
```sql
SELECT
  *
FROM test_runs
WHERE id = 'TEST_RUN_ID';
```

**View Notifications:**
```sql
SELECT
  title,
  body,
  type,
  created_at,
  action_url
FROM notifications
WHERE type IN ('test_success', 'test_failure', 'test_cancelled')
ORDER BY created_at DESC
LIMIT 10;
```

### Monitor Agent Activity

**Check MCP Calls:**
```sql
SELECT
  tool_name,
  status,
  duration_ms,
  error_message,
  created_at
FROM mcp_call_logs
WHERE mcp_type = 'playwright'
ORDER BY created_at DESC
LIMIT 20;
```

**Check Agent Runs:**
```sql
SELECT
  ar.id,
  ag.name AS agent_name,
  ar.status,
  ar.created_at,
  ar.completed_at
FROM agent_runs ar
JOIN ai_agents ag ON ag.id = ar.agent_id
WHERE ag.name = 'QA Agent'
ORDER BY ar.created_at DESC
LIMIT 10;
```

**Check Queued Actions:**
```sql
SELECT
  action_type,
  action_params,
  status,
  created_at
FROM action_queue
WHERE action_type LIKE 'playwright_%'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Test Suites & Projects

### Test Suites

| Suite | Description | Duration | Tests |
|-------|-------------|----------|-------|
| `smoke` | Critical paths only | ~5 min | Tagged with `@smoke` |
| `e2e` | All E2E tests | ~15-30 min | All in `tests/e2e/` |
| `visual` | Screenshot comparison | ~10 min | Tagged with `@visual` |
| `all` | Everything | ~30+ min | All tests |

### Projects (Browsers/Devices)

| Project | Description | Use Case |
|---------|-------------|----------|
| `chromium` | Desktop Chrome | Default, fastest |
| `firefox` | Desktop Firefox | Cross-browser testing |
| `webkit` | Safari (WebKit) | Mac/iOS compatibility |
| `mobile` | Mobile Chrome (Pixel 5) | Responsive design |
| `mobile-chrome` | Alias for mobile | Same as above |

---

## 🔧 Configuration

### Environment Variables

**Supabase Secrets:**
```bash
GITHUB_TOKEN              # GitHub PAT with repo + workflow permissions
GITHUB_REPO_OWNER         # Your GitHub username/org
GITHUB_REPO_NAME          # Repository name (e.g., ReAgentOS_V1)
PLAYWRIGHT_WEBHOOK_SECRET # Secret for webhook verification
```

**GitHub Secrets:**
```bash
SUPABASE_URL                      # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key
VITE_SUPABASE_URL                 # Same as SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY     # Supabase anon key
PLAYWRIGHT_WEBHOOK_SECRET         # Same as Supabase secret
TEST_BASE_URL                     # (Optional) Test environment URL
```

### GitHub Token Permissions

Required scopes:
- ✅ `repo` - Repository access
- ✅ `workflow` - Trigger workflows

Generate at: https://github.com/settings/tokens

---

## 🐛 Troubleshooting

### Workflow Doesn't Trigger

**Check:**
1. GitHub token has `workflow` permission
2. Workflow file exists on main branch
3. Workflow is enabled in GitHub UI

**Fix:**
```bash
# Verify token
gh auth status

# Check workflow file
git ls-tree -r main --name-only | grep playwright.yml

# Enable workflow (if disabled)
# Go to GitHub → Actions → Playwright Tests → Enable
```

### Webhook Not Receiving Results

**Check:**
1. Webhook secret matches in both places
2. Callback URL is correct
3. Function logs for errors

**Fix:**
```bash
# Compare secrets
npx supabase secrets list | grep PLAYWRIGHT_WEBHOOK_SECRET
gh secret list | grep PLAYWRIGHT_WEBHOOK_SECRET

# Check logs
npx supabase functions logs playwright-webhook --limit 50

# Verify callback URL format
echo "https://xxxxx.supabase.co/functions/v1/playwright-webhook"
# No trailing slash!
```

### Tests Fail Immediately

**Check:**
1. Dependencies installed (`npm ci`)
2. Playwright browsers installed
3. Test files exist

**Fix:**
```bash
# Locally test
npm ci
npx playwright install
npx playwright test tests/e2e/auth.spec.ts --project=chromium

# Check GitHub logs
gh run list --workflow=playwright.yml
gh run view <run-id> --log
```

### QA Agent Not Found

**Check:**
1. Migration applied
2. Agent is active

**Fix:**
```sql
-- Verify agent exists
SELECT * FROM ai_agents WHERE name = 'QA Agent';

-- Activate if needed
UPDATE ai_agents SET is_active = true WHERE name = 'QA Agent';
```

---

## 📚 Key Endpoints

### Edge Functions

| Function | URL | Purpose |
|----------|-----|---------|
| `playwright-mcp` | `/functions/v1/playwright-mcp` | Trigger tests |
| `playwright-webhook` | `/functions/v1/playwright-webhook` | Receive results |
| `mcp-gateway` | `/functions/v1/mcp-gateway` | Route MCP calls |

### Database Tables

| Table | Purpose |
|-------|---------|
| `test_runs` | Test execution records |
| `visual_baselines` | Visual regression baselines |
| `mcp_call_logs` | MCP call audit log |
| `action_queue` | Agent actions queue |
| `notifications` | User notifications |

### GitHub Workflow

| File | Purpose |
|------|---------|
| `.github/workflows/playwright.yml` | Test execution workflow |

---

## 🎓 Example Agent Prompts

### Smoke Tests After Deployment

```
"New deployment to production just completed. Run smoke tests to verify critical functionality."
```

**Agent Response:**
```json
{
  "actions": [
    {
      "type": "playwright_run_suite",
      "params": { "test_suite": "smoke", "project": "chromium" },
      "reason": "Quick validation of critical paths"
    }
  ]
}
```

### Full E2E on Mobile

```
"Test the new mobile UI changes. Run all E2E tests on mobile viewport."
```

**Agent Response:**
```json
{
  "actions": [
    {
      "type": "playwright_run_suite",
      "params": { "test_suite": "e2e", "project": "mobile" },
      "reason": "Comprehensive testing on mobile viewport"
    }
  ]
}
```

### Specific Test File

```
"Users are reporting login issues. Run the authentication tests."
```

**Agent Response:**
```json
{
  "actions": [
    {
      "type": "playwright_run_test",
      "params": { "test_file": "auth.spec.ts", "project": "chromium" },
      "reason": "Validate login and signup flows"
    }
  ]
}
```

---

## 📈 Success Metrics

**Monitor these:**
- Test run success rate (target: >95%)
- Average test duration (target: smoke <5min, e2e <30min)
- Time to detect failures (target: <10min after deployment)
- False positive rate (target: <5%)

**Queries:**
```sql
-- Success rate (last 7 days)
SELECT
  ROUND(100.0 * SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) / COUNT(*), 2) AS success_rate_pct
FROM test_runs
WHERE created_at > NOW() - INTERVAL '7 days';

-- Average durations
SELECT
  test_suite,
  AVG(test_duration_ms / 1000.0 / 60.0) AS avg_duration_min
FROM test_runs
WHERE status = 'passed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY test_suite;
```

---

## 🔗 Documentation Links

- **Full Implementation Guide:** `docs/MCP_PHASE2_IMPLEMENTATION.md`
- **Phase 1 Foundation:** `docs/MCP_PHASE1_IMPLEMENTATION.md`
- **Deployment Script:** `scripts/deploy-playwright-mcp.sh`
- **Playwright Config:** `playwright.config.ts`
- **Test Files:** `tests/e2e/*.spec.ts`

---

## 💡 Pro Tips

1. **Use Smoke Tests by Default** - Fast feedback loop
2. **Run Full E2E Weekly** - Comprehensive validation without blocking deploys
3. **Tag Tests Properly** - Use `@smoke`, `@visual` for better suite organization
4. **Monitor Flaky Tests** - Check `failed_test_names` for patterns
5. **Set Up Daily Health Checks** - Enable scheduled trigger for QA Agent
6. **Keep Baselines Updated** - Approve new visual baselines after intentional UI changes
7. **Clean Old Artifacts** - Set up lifecycle policies for `test-artifacts` bucket (>30 days)

---

**Need Help?** Check full docs or search logs:
```bash
npx supabase functions logs playwright-mcp
npx supabase functions logs playwright-webhook
gh run list --workflow=playwright.yml
```
