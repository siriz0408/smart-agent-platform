# Quick Start Migration Checklist

**Fast-track guide for experienced developers**

## Pre-Flight Check ✈️

```bash
# Verify tools installed
git --version
node --version
npm --version
supabase --version
gh --version  # optional but recommended

# Navigate to project
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1

# Verify current state
git status
ls supabase/migrations  # Should show 32 files
ls supabase/functions   # Should show 22 directories
```

## Phase 1: GitHub (15 min) ⏱️

```bash
# Create repo via CLI
gh repo create smart-agent-platform --public --source=. --remote=new-origin

# OR manually at github.com/new, then:
git remote add new-origin https://github.com/<username>/smart-agent-platform.git

# Push with clean commit
git add .
git reset $(git commit-tree HEAD^{tree} -m "Initial commit: Smart Agent platform")
git push new-origin main --force
git remote remove origin && git remote rename new-origin origin
```

✅ **Verify**: Visit `https://github.com/<username>/smart-agent-platform`

## Phase 2: Supabase (30 min) ⏱️

### Step 1: Create Project (5 min)
1. Go to https://app.supabase.com/
2. Click "New project"
3. Name: `smart-agent-platform`
4. Generate strong password → **SAVE IT**
5. Region: `us-east-1`
6. Create

**Record these** (Settings → API):
```
Project URL: https://<NEW_PROJECT_ID>.supabase.co
Project ID: <NEW_PROJECT_ID>
Anon Key: eyJhbGc...
Service Role Key: eyJhbGc... (KEEP SECRET)
```

### Step 2: Configure Storage (5 min)
Create 4 buckets in Storage section:
- `documents` (private, 50MB)
- `avatars` (public, 2MB)
- `profile-covers` (public, 5MB)
- `profile-gallery` (public, 10MB)

### Step 3: Deploy Database & Functions (10 min)
```bash
# Link project
supabase login
supabase link --project-ref <NEW_PROJECT_ID>
# Enter database password when prompted

# Deploy everything
supabase db push
supabase functions deploy

# Verify
supabase migration list  # All should say "Applied"
supabase functions list  # All should say "deployed"
```

### Step 4: Configure Secrets (5 min)
```bash
supabase secrets set ANTHROPIC_API_KEY=<your-key>
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RAPIDAPI_KEY=<your-key>
supabase secrets set APP_URL=http://localhost:8080
supabase secrets set # AI_GATEWAY_URL no longer needed
supabase secrets set # AI_MODEL no longer needed

# Verify
supabase secrets list
```

### Step 5: Update Local Config (2 min)
```bash
# Edit supabase/config.toml
# Change: project_id = "<NEW_PROJECT_ID>"

# Update .env
cat > .env << EOF
VITE_SUPABASE_URL=https://<NEW_PROJECT_ID>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<NEW_PROJECT_ID>
EOF
```

✅ **Verify**: Run `npm run dev` → App loads at http://localhost:8080

## Phase 3: Vercel (20 min) ⏱️

### Step 1: Import Project (5 min)
1. Go to https://vercel.com/new
2. Import Git Repository → GitHub → `smart-agent-platform`
3. Framework: Vite (auto-detected)
4. **Don't deploy yet!**

### Step 2: Add Environment Variables (5 min)
Add these 3 variables (enable for Production, Preview, Development):
```
VITE_SUPABASE_URL=https://<NEW_PROJECT_ID>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<NEW_PROJECT_ID>
```

### Step 3: Deploy (5 min)
1. Click "Deploy"
2. Wait ~2-3 minutes
3. Get production URL (e.g., `https://smart-agent-platform.vercel.app`)

### Step 4: Update Supabase (5 min)
```bash
# Update APP_URL
supabase secrets set APP_URL=https://smart-agent-platform.vercel.app
```

**In Supabase Dashboard**:
- Navigate to: Authentication → URL Configuration
- Site URL: `https://smart-agent-platform.vercel.app`
- Add redirect URL: `https://smart-agent-platform.vercel.app/*`

**In Stripe Dashboard** (if using):
- Webhooks → Add endpoint
- URL: `https://<NEW_PROJECT_ID>.supabase.co/functions/v1/stripe-webhook`
- Copy signing secret
- `supabase secrets set STRIPE_WEBHOOK_SECRET=<new-secret>`

✅ **Verify**: Visit `https://smart-agent-platform.vercel.app` → homepage loads

## Phase 4: Quick Smoke Test (15 min) 🧪

### Test 1: Sign Up
1. Visit `/login` on Vercel URL
2. Sign up with test email
3. Check email for confirmation
4. Click confirm link
5. ✅ Should redirect to app, logged in

### Test 2: Upload Document
1. Navigate to Documents page
2. Upload a PDF
3. Wait ~30 seconds
4. ✅ Document appears with "Ready" status

### Test 3: AI Chat
1. Navigate to Chat page
2. Select uploaded document
3. Ask: "What is this document about?"
4. ✅ AI responds with relevant answer

### Test 4: Lighthouse
```bash
npx lighthouse https://smart-agent-platform.vercel.app --preset=desktop --view
# Target: All scores >90
```

## Phase 5: Go Live ✅

If all tests pass:
1. ✅ Infrastructure is ready
2. ✅ All features working
3. ✅ Performance acceptable
4. ✅ No critical errors

**Monitor for 24-48 hours:**
```bash
# Watch Vercel logs
vercel logs --follow

# Watch Supabase logs
supabase functions logs --tail
```

## Phase 6: Cleanup (After 1-2 weeks)

```bash
# Archive old GitHub repo
# Navigate to: github.com/siriz0408/reagent-os/settings
# Danger Zone → Archive repository

# Pause old Supabase project
# Navigate to: app.supabase.com → Old Project → Settings
# Pause project

# Update documentation with new URLs
# Edit CLAUDE.md, README.md with new Supabase project ID
```

## Emergency Rollback 🚨

If critical issues arise:
1. Keep old infrastructure running (don't delete)
2. Revert Stripe webhook to old Supabase
3. Debug new infrastructure
4. Re-test and re-deploy

## Common Issues & Fixes 🔧

| Issue | Fix |
|-------|-----|
| Build fails | Check env vars in Vercel, run `npm run build` locally |
| Can't connect to DB | Verify Supabase URL and keys in Vercel |
| Functions timeout | Check `supabase functions logs <function-name>` |
| Auth redirect fails | Verify redirect URLs in Supabase Auth settings |
| Stripe webhook 404 | Verify webhook URL includes correct project ID |

## New URLs to Remember 📌

```
GitHub: https://github.com/<username>/smart-agent-platform
Supabase: https://<NEW_PROJECT_ID>.supabase.co
Vercel: https://smart-agent-platform.vercel.app
```

## Total Time: ~2 hours 🎯

- Phase 1: 15 min
- Phase 2: 30 min
- Phase 3: 20 min
- Phase 4: 15 min
- Phase 5: Monitoring (ongoing)

**For full details**, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

---

**Ready to start? Begin with Phase 1! 🚀**
