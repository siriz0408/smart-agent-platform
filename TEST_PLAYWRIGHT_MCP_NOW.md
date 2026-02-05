# 🧪 Test Playwright MCP NOW - Quick Guide

Let's deploy and test the Playwright MCP implementation right now!

---

## ⚡ Quick Test (10 Minutes)

### Step 1: Commit and Push the Code (2 min)

```bash
# Add all MCP files
git add .github/workflows/playwright.yml
git add supabase/functions/mcp-gateway/
git add supabase/functions/playwright-mcp/
git add supabase/functions/playwright-webhook/
git add supabase/migrations/20260205000000_mcp_integration.sql
git add supabase/migrations/20260205000100_qa_agent_configuration.sql
git add scripts/*.sh
git add docs/MCP*.md docs/PLAYWRIGHT*.md
git add PHASE2_COMPLETE.md

# Commit
git commit -m "feat: implement Playwright MCP (Phase 2) - agent-driven E2E testing"

# Push to trigger workflow availability
git push origin main
```

### Step 2: Set Supabase Secrets (3 min)

```bash
# Required secrets for Playwright MCP
npx supabase secrets set GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE --linked
npx supabase secrets set GITHUB_REPO_OWNER=YOUR_GITHUB_USERNAME --linked
npx supabase secrets set GITHUB_REPO_NAME=ReAgentOS_V1 --linked
npx supabase secrets set PLAYWRIGHT_WEBHOOK_SECRET=$(openssl rand -hex 32) --linked

# Save webhook secret for GitHub
echo "Copy the PLAYWRIGHT_WEBHOOK_SECRET from above and save it!"
npx supabase secrets list --linked | grep PLAYWRIGHT_WEBHOOK_SECRET
```

**GitHub Token Requirements:**
- Go to: https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Select scopes: `repo` + `workflow`
- Generate and copy token

### Step 3: Deploy Edge Functions (2 min)

```bash
# Deploy all MCP functions
npx supabase functions deploy mcp-gateway --linked
npx supabase functions deploy playwright-mcp --linked
npx supabase functions deploy playwright-webhook --linked

# Verify deployment
npx supabase functions list --linked
```

### Step 4: Apply Database Migrations (1 min)

```bash
# Push migrations to Supabase
npx supabase db push --linked

# Verify QA Agent created
npx supabase db query "SELECT id, name, is_active FROM ai_agents WHERE name = 'QA Agent';" --linked
```

### Step 5: Create Storage Bucket (1 min)

**Option A: Via CLI (if supported)**
```bash
npx supabase storage create test-artifacts --public --linked
```

**Option B: Via Dashboard (recommended)**
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to Storage
3. Click "New Bucket"
4. Name: `test-artifacts`
5. Make it **Public**
6. Click "Create"

### Step 6: Set GitHub Secrets (2 min)

Go to: https://github.com/YOUR_USERNAME/ReAgentOS_V1/settings/secrets/actions

Add these secrets:

```
SUPABASE_URL = https://sthnezuadfbmbqlxiwtq.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [Get from Supabase Dashboard → Settings → API]
VITE_SUPABASE_URL = https://sthnezuadfbmbqlxiwtq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = [From .env file]
PLAYWRIGHT_WEBHOOK_SECRET = [Same as Supabase secret from Step 2]
```

**Get Service Role Key:**
1. Supabase Dashboard → Project Settings → API
2. Copy the `service_role` key (NOT the `anon` key!)

---

## 🎯 Test Options

### Option A: Test via GitHub Workflow (Simplest)

```bash
# Trigger workflow manually
gh workflow run playwright.yml \
  --field test_run_id=$(uuidgen) \
  --field test_suite=smoke \
  --field project=chromium \
  --field callback_url=https://sthnezuadfbmbqlxiwtq.supabase.co/functions/v1/playwright-webhook

# Watch the run
gh run watch

# Or view in browser
gh workflow view playwright.yml --web
```

**Without gh CLI:**
1. Go to: https://github.com/YOUR_USERNAME/ReAgentOS_V1/actions
2. Click "Playwright Tests (Agent-Triggered)"
3. Click "Run workflow" button
4. Fill in:
   - `test_run_id`: Any UUID (or leave default)
   - `test_suite`: `smoke`
   - `project`: `chromium`
   - `callback_url`: `https://sthnezuadfbmbqlxiwtq.supabase.co/functions/v1/playwright-webhook`
5. Click "Run workflow"
6. Watch the test execution

### Option B: Test via MCP Gateway API

```bash
# You'll need a valid JWT token from your app
# Get it from: Browser DevTools → Application → Local Storage → Supabase auth token

JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

curl -X POST "https://sthnezuadfbmbqlxiwtq.supabase.co/functions/v1/mcp-gateway" \
  -H "Authorization: Bearer $JWT_TOKEN" \
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

### Option C: Test via QA Agent (Full Integration)

```bash
# Get your user ID from Supabase
USER_ID=$(npx supabase db query "SELECT id FROM auth.users LIMIT 1;" --linked | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)

# Get QA Agent ID
AGENT_ID=$(npx supabase db query "SELECT id FROM ai_agents WHERE name = 'QA Agent' LIMIT 1;" --linked | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)

echo "User ID: $USER_ID"
echo "Agent ID: $AGENT_ID"

# Now call the execute-agent API with your JWT token
curl -X POST "https://sthnezuadfbmbqlxiwtq.supabase.co/functions/v1/execute-agent" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_id\": \"$AGENT_ID\",
    \"context\": {
      \"additional_context\": \"Run smoke tests to validate the application\"
    },
    \"enable_actions\": true,
    \"auto_execute_actions\": true
  }"
```

---

## 📊 Verify Results

### Check Test Runs

```bash
# View recent test runs
npx supabase db query "
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
  LIMIT 5;
" --linked
```

### Check Notifications

```bash
# View test notifications
npx supabase db query "
  SELECT
    title,
    body,
    type,
    created_at,
    action_url
  FROM notifications
  WHERE type IN ('test_success', 'test_failure', 'test_cancelled')
  ORDER BY created_at DESC
  LIMIT 5;
" --linked
```

### Check MCP Call Logs

```bash
# View MCP calls
npx supabase db query "
  SELECT
    tool_name,
    status,
    duration_ms,
    error_message,
    created_at
  FROM mcp_call_logs
  WHERE mcp_type = 'playwright'
  ORDER BY created_at DESC
  LIMIT 5;
" --linked
```

### View Function Logs

```bash
# Real-time logs
npx supabase functions logs playwright-mcp --linked
npx supabase functions logs playwright-webhook --linked

# Recent logs
npx supabase functions logs playwright-mcp --linked --limit 50
```

---

## 🎯 Expected Test Flow

When you trigger a test:

1. **Test Run Created** (immediate)
   - Record appears in `test_runs` table
   - Status: `queued`

2. **GitHub Workflow Triggers** (~10 seconds)
   - Workflow starts on GitHub Actions
   - Status: `running`
   - `github_run_url` populated

3. **Tests Execute** (~5 minutes for smoke tests)
   - Playwright runs tests
   - Artifacts uploaded to Supabase Storage

4. **Webhook Called** (~5 seconds after tests complete)
   - Results posted to webhook
   - `test_runs` updated with results
   - Status: `passed` or `failed`

5. **Notification Created** (immediate)
   - User receives notification
   - Title: "✅ Tests Passed" or "❌ Tests Failed"

**Total time: ~5-6 minutes for smoke tests**

---

## 🐛 Troubleshooting

### "Workflow not found"
```bash
# Make sure workflow is committed and pushed
git add .github/workflows/playwright.yml
git commit -m "feat: add Playwright workflow"
git push origin main

# Wait 1-2 minutes for GitHub to index the workflow
```

### "401 Unauthorized" from webhook
```bash
# Verify webhook secret matches
npx supabase secrets list --linked | grep PLAYWRIGHT_WEBHOOK_SECRET
gh secret list | grep PLAYWRIGHT_WEBHOOK_SECRET

# If they don't match, update GitHub secret
```

### "test_runs table does not exist"
```bash
# Apply migrations
npx supabase db push --linked

# Verify tables
npx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_name IN ('test_runs', 'mcp_call_logs', 'visual_baselines');" --linked
```

### "QA Agent not found"
```bash
# Check if migration ran
npx supabase db query "SELECT * FROM ai_agents WHERE name = 'QA Agent';" --linked

# If not found, re-run migration
npx supabase db push --linked
```

### Tests fail with "Module not found"
- Check that `npm ci` runs in workflow (it does)
- Verify `package.json` is up to date
- Check GitHub Actions logs for the exact error

---

## 📈 Success Indicators

✅ **Workflow triggers successfully**
```bash
gh run list --workflow=playwright.yml
# Should show recent runs
```

✅ **Test run created in database**
```sql
SELECT COUNT(*) FROM test_runs;
-- Should be > 0
```

✅ **Webhook received results**
```sql
SELECT status FROM test_runs WHERE status IN ('passed', 'failed');
-- Should have completed runs
```

✅ **Notification created**
```sql
SELECT COUNT(*) FROM notifications WHERE type IN ('test_success', 'test_failure');
-- Should have notifications
```

✅ **Artifacts in storage**
- Go to Supabase Dashboard → Storage → test-artifacts
- Should see folders with test run IDs
- Each folder has reports/videos/screenshots

---

## 🎉 You're Ready!

If all steps complete successfully, you'll have:
- ✅ Agent-driven E2E testing
- ✅ Automated test execution via GitHub Actions
- ✅ Real-time result notifications
- ✅ Test artifacts stored in Supabase

**Next test:** Try triggering via the QA Agent for full automation!

---

## 📚 More Info

- **Full Guide:** `docs/MCP_PHASE2_IMPLEMENTATION.md`
- **Quick Reference:** `docs/PLAYWRIGHT_MCP_QUICKSTART.md`
- **Automated Script:** Run `./scripts/test-playwright-mcp.sh` for guided testing

---

**Need help?** Check function logs or GitHub Actions logs for detailed error messages.
