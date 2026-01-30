# Smart Agent Infrastructure Migration Guide

**Master guide for migrating Smart Agent from Lovable to GitHub + Supabase + Vercel**

## Quick Reference

| Phase | Guide | Estimated Time | Status |
|-------|-------|----------------|---------|
| **Phase 1** | [GitHub Setup](./GITHUB_SETUP.md) | 30 min | ⏸️ Ready |
| **Phase 2** | [Supabase Setup](./SUPABASE_SETUP.md) | 45 min | ⏸️ Pending |
| **Phase 3** | [Vercel Deployment](./VERCEL_DEPLOYMENT.md) | 40 min | ⏸️ Pending |
| **Phase 4** | [Testing Checklist](./TESTING_CHECKLIST.md) | 3-4 hours | ⏸️ Pending |
| **Phase 5** | Cutover & Monitoring | 2 hours | ⏸️ Pending |
| **Phase 6** | Cleanup (after 1-2 weeks) | 1 hour | ⏸️ Pending |

**Total estimated time:** 8-10 hours active work over 2 weeks

## Overview

### Current State
- **Repository**: `https://github.com/siriz0408/reagent-os.git` (1 commit)
- **Database**: Supabase project `roxwxcyglpxkufvwfdcj` (32 migrations, 22 functions)
- **Hosting**: Lovable platform
- **Status**: Development/testing, no production users

### Target State
- **Repository**: New `smart-agent-platform` repo with clean history
- **Database**: New Supabase project with fresh schema
- **Hosting**: Vercel with auto-deploy from GitHub
- **URL**: `https://smart-agent-platform.vercel.app`

### Migration Strategy
- ✅ Fresh start (no data migration needed - no production users)
- ✅ Vercel subdomain (custom domain later)
- ✅ Stripe test mode
- ✅ Low risk (can rollback if needed)

## Prerequisites

### Accounts Required
- [x] GitHub account (for repository)
- [ ] Supabase account (free tier)
- [ ] Vercel account (free tier)
- [ ] Stripe account (test mode)

### Tools Required
- [x] Git installed and configured
- [ ] Node.js 20+ and npm
- [ ] GitHub CLI (optional): `brew install gh`
- [ ] Supabase CLI: `npm install -g supabase`
- [ ] Vercel CLI (optional): `npm install -g vercel`

### API Keys/Credentials Needed
- [ ] Lovable AI API key (for AI operations)
- [ ] Stripe test mode keys (secret key, webhook secret)
- [ ] Resend API key (for emails)
- [ ] RapidAPI key (for Zillow integration)

## Phase-by-Phase Execution

### Phase 1: GitHub Repository Setup ⏸️

**Duration**: ~30 minutes

**What you'll do:**
1. Create new GitHub repository `smart-agent-platform`
2. Codebase is already cleaned (Lovable dependencies removed)
3. Push code with single clean commit
4. Configure repository settings

**Deliverables:**
- ✅ New GitHub repo with code
- ✅ Clean commit history
- ✅ README updated for Vercel deployment

**Detailed Guide**: [GITHUB_SETUP.md](./GITHUB_SETUP.md)

**Quick Commands:**
```bash
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1

# Option 1: GitHub CLI
gh repo create smart-agent-platform --public --source=. --remote=new-origin

# Option 2: Manual
# 1. Create repo at github.com/new
# 2. git remote add new-origin https://github.com/<username>/smart-agent-platform.git

# Push code
git add .
git reset $(git commit-tree HEAD^{tree} -m "Initial commit: Smart Agent platform

Complete React + TypeScript + Vite + Supabase stack")
git push new-origin main --force
git remote remove origin && git remote rename new-origin origin
```

---

### Phase 2: Supabase Project Setup ⏸️

**Duration**: ~45 minutes

**What you'll do:**
1. Create new Supabase project
2. Configure auth settings and storage buckets
3. Run all 32 database migrations
4. Deploy all 22 edge functions
5. Configure 8 required secrets

**Deliverables:**
- ✅ New Supabase project provisioned
- ✅ Database schema migrated (32 migrations)
- ✅ Edge functions deployed (22 functions)
- ✅ Secrets configured
- ✅ Local development working

**Detailed Guide**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

**Quick Commands:**
```bash
# Create project at app.supabase.com (manual step)

# Link CLI
supabase login
supabase link --project-ref <new-project-id>

# Deploy migrations and functions
supabase db push
supabase functions deploy

# Configure secrets
supabase secrets set LOVABLE_API_KEY=<key>
supabase secrets set STRIPE_SECRET_KEY=<key>
supabase secrets set STRIPE_WEBHOOK_SECRET=<key>
supabase secrets set RESEND_API_KEY=<key>
supabase secrets set RAPIDAPI_KEY=<key>
supabase secrets set APP_URL=http://localhost:8080
supabase secrets set AI_GATEWAY_URL=https://ai.gateway.lovable.dev
supabase secrets set AI_MODEL=google/gemini-3-flash-preview

# Update local config
# Edit supabase/config.toml: project_id = "<new-project-id>"
```

**Storage Buckets to Create:**
1. `documents` (private, 50MB limit)
2. `avatars` (public, 2MB limit)
3. `profile-covers` (public, 5MB limit)
4. `profile-gallery` (public, 10MB limit)

---

### Phase 3: Vercel Deployment ⏸️

**Duration**: ~40 minutes

**What you'll do:**
1. Import GitHub repo to Vercel
2. Configure environment variables
3. Deploy to production
4. Update Supabase with Vercel URL
5. Configure Stripe webhook

**Deliverables:**
- ✅ Vercel project deployed
- ✅ Production URL live
- ✅ Auto-deploy configured
- ✅ Supabase updated with new URL

**Detailed Guide**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

**Quick Steps:**
1. **Import to Vercel**: https://vercel.com/new
   - Select GitHub repo: `smart-agent-platform`
   - Framework: Vite (auto-detected)

2. **Add Environment Variables**:
   ```
   VITE_SUPABASE_URL=https://<new-project-id>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
   VITE_SUPABASE_PROJECT_ID=<new-project-id>
   ```

3. **Deploy**

4. **Update Supabase**:
   ```bash
   # Update APP_URL secret
   supabase secrets set APP_URL=https://smart-agent-platform.vercel.app

   # Update Auth redirect URLs in dashboard:
   # Navigate to: Authentication → URL Configuration
   # Add: https://smart-agent-platform.vercel.app/*
   ```

5. **Update Stripe Webhook**:
   - URL: `https://<project-id>.supabase.co/functions/v1/stripe-webhook`
   - Copy signing secret
   - Update: `supabase secrets set STRIPE_WEBHOOK_SECRET=<secret>`

---

### Phase 4: Testing & Validation ⏸️

**Duration**: 3-4 hours

**What you'll test:**
1. ✅ Infrastructure (database, functions, deployment)
2. ✅ Authentication (signup, login, password reset)
3. ✅ Document management (upload, processing, search)
4. ✅ AI chat (single doc, multi-doc, streaming)
5. ✅ CRM (contacts, properties, deals)
6. ✅ Billing (Stripe checkout, webhooks)
7. ✅ Performance (Lighthouse scores >90)
8. ✅ Security (RLS, storage permissions)
9. ✅ Cross-browser compatibility
10. ✅ Error handling

**Deliverables:**
- ✅ Complete testing report
- ✅ All tests passing
- ✅ Approval for cutover

**Detailed Guide**: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)

**Critical Tests:**
```bash
# 1. Homepage loads
curl -I https://smart-agent-platform.vercel.app
# Expected: 200 OK

# 2. Sign up and upload document
# (manual testing via UI)

# 3. Run Lighthouse
npx lighthouse https://smart-agent-platform.vercel.app --preset=desktop --view
# Target: Performance >90

# 4. Test AI chat
# (manual testing via UI)

# 5. Test billing
# Use Stripe test card: 4242 4242 4242 4242
```

---

### Phase 5: Cutover & Go-Live ⏸️

**Duration**: 2 hours (+ 24-48 hour monitoring)

**What you'll do:**
1. Complete pre-cutover checklist
2. Announce new URL
3. Monitor logs for 24-48 hours
4. Verify stability

**Pre-Cutover Checklist:**
```markdown
Infrastructure:
- [ ] GitHub repo active with code
- [ ] Supabase fully configured (32 migrations, 22 functions, 8 secrets)
- [ ] Vercel deployment successful
- [ ] All environment variables set

Testing:
- [ ] All critical features tested and working
- [ ] Performance acceptable (Lighthouse >90)
- [ ] Security validated (RLS, storage)

External Services:
- [ ] Stripe webhook URL updated
- [ ] Supabase Auth redirect URLs configured
- [ ] APP_URL secret updated
```

**Go-Live Steps:**
1. Share new URL: `https://smart-agent-platform.vercel.app`
2. Update documentation with new URLs
3. Monitor for 24 hours:
   ```bash
   # Vercel logs
   vercel logs --follow

   # Supabase function logs
   supabase functions logs --tail
   ```

**Rollback Plan** (if needed):
- Keep old Lovable deployment active during monitoring period
- Can revert Stripe webhook if issues arise
- Document any issues and resolution steps

---

### Phase 6: Cleanup & Archive ⏸️

**Duration**: 1 hour (execute 1-2 weeks after cutover)

**What you'll do:**
1. Archive old Lovable project
2. Pause/delete old Supabase project
3. Archive old GitHub repo
4. Update all documentation
5. Set up cost monitoring

**Only execute after confirming:**
- [ ] New infrastructure stable for 1-2 weeks
- [ ] No critical issues or rollbacks needed
- [ ] All data successfully migrated (if any was needed)
- [ ] Team comfortable with new setup

**Cleanup Steps:**
```bash
# 1. Archive old GitHub repo
# Navigate to: https://github.com/siriz0408/reagent-os/settings
# Scroll to "Danger Zone" → Archive repository

# 2. Pause old Supabase project
# Navigate to: app.supabase.com → Project Settings → General
# Pause project (can delete after 30 days)

# 3. Archive Lovable project
# Navigate to Lovable dashboard → Settings
# Pause or delete project

# 4. Update documentation
# Update CLAUDE.md, README.md, TASK_BOARD.md with new URLs
```

## Monitoring & Cost Management

### Usage Monitoring

**Vercel:**
- Free tier limits:
  - 100 GB bandwidth/month
  - 100 GB-hours build time
  - Unlimited requests
- Upgrade to Pro ($20/mo) when needed

**Supabase:**
- Free tier limits:
  - 500 MB database size
  - 2 GB file storage
  - 50,000 monthly active users
- Upgrade to Pro ($25/mo) when needed

**Cost Alerts:**
- Set up billing alerts in both platforms
- Monitor usage weekly during first month
- Typical monthly cost (small scale): $0-20

### Performance Monitoring

**Key Metrics:**
- Page load time: <2s
- API response time: <500ms
- Edge function execution: <1s
- Database queries: <100ms

**Tools:**
- Vercel Analytics (built-in)
- Supabase Dashboard (built-in)
- Lighthouse CI (weekly audits)
- Sentry (error tracking - optional)

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails on Vercel | Check environment variables, run `npm run build` locally |
| Database connection error | Verify Supabase URL and keys in Vercel env vars |
| Edge function timeout | Check function logs, verify secrets configured |
| Stripe webhook fails | Verify webhook URL, check signing secret |
| RLS denies access | Check policies, verify user has correct tenant_id |
| Document upload fails | Check storage bucket permissions, verify LOVABLE_API_KEY |

### Getting Help

**Vercel Support:**
- Dashboard → Help → Contact Support
- Community: vercel.com/community

**Supabase Support:**
- Dashboard → Help → Support Ticket
- Discord: discord.supabase.com

**GitHub Issues:**
- Repository issues tab (for code-related problems)

## Success Criteria

Migration is complete when:
- ✅ All code in new GitHub repository
- ✅ All 32 migrations applied to new Supabase
- ✅ All 22 edge functions deployed and working
- ✅ Vercel deployment successful and stable
- ✅ All critical features tested and working
- ✅ 24-48 hours of stable operation
- ✅ Documentation updated
- ✅ Old infrastructure archived

## Project Contacts & Resources

**New Infrastructure URLs:**
- GitHub: `https://github.com/<username>/smart-agent-platform`
- Supabase: `https://<new-project-id>.supabase.co`
- Vercel: `https://smart-agent-platform.vercel.app`

**Documentation:**
- Architecture: [CLAUDE.md](../CLAUDE.md)
- PRD: [Smart_Agent_Platform_PRD_v2.md](../Smart_Agent_Platform_PRD_v2.md)
- Task Board: [TASK_BOARD.md](../TASK_BOARD.md)

**API Keys Storage:**
- Store securely in password manager
- Never commit to version control
- Rotate keys every 90 days

## Next Steps

**To begin migration:**

1. **Review this guide** and all phase-specific guides
2. **Gather all API keys and credentials**
3. **Schedule time blocks** for each phase:
   - Weekend 1: Phases 1-3 (setup)
   - Week: Phase 4 (testing)
   - Weekend 2: Phase 5 (cutover)
4. **Start with Phase 1**: [GITHUB_SETUP.md](./GITHUB_SETUP.md)

**Recommended schedule:**
- **Day 1-2**: Phases 1-3 (GitHub, Supabase, Vercel setup)
- **Day 3-5**: Phase 4 (comprehensive testing)
- **Day 6-7**: Phase 5 (cutover and monitoring)
- **Week 3-4**: Monitor stability
- **Week 4+**: Phase 6 (cleanup after stability confirmed)

---

**Good luck with the migration! 🚀**

Questions or issues? Refer to phase-specific guides or create an issue in the repository.
