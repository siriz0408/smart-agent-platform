# Pre-Deployment Checklist

Use this checklist before deploying to production to ensure everything is configured correctly.

## Environment Variables

### Frontend (.env or Vercel)
- [ ] `VITE_SUPABASE_URL` - Supabase project URL
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- [ ] `VITE_SUPABASE_PROJECT_ID` - Project reference ID

**Verify:**
```bash
# Check local
cat .env | grep VITE_SUPABASE

# Check Vercel
vercel env ls
```

### Backend (Supabase Secrets)

**Required for AI Features:**
- [ ] `ANTHROPIC_API_KEY` - Anthropic Claude API key
- [ ] `SUPABASE_URL` - Auto-injected by Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected by Supabase

**Required for Payments:**
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

**Optional:**
- [ ] `RESEND_API_KEY` - For email notifications
- [ ] `RAPIDAPI_KEY` - For property data APIs
- [ ] `APP_URL` - Application URL (for callbacks)

**Verify:**
```bash
supabase secrets list --project-ref sthnezuadfbmbqlxiwtq
```

## Code Quality

- [ ] All tests pass: `npm run test`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

**Run all checks:**
```bash
npm run verify-build
```

## Edge Functions

- [ ] All functions deployed
- [ ] Functions healthy

**Deploy & Verify:**
```bash
# Deploy all functions
npm run functions:deploy

# Check function health
supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq
```

## Post-Deployment Verification

- [ ] App loads at production URL
- [ ] Login works
- [ ] AI chat responds
- [ ] Document upload works
- [ ] No errors in logs

**Check logs:**
```bash
# Vercel logs
vercel logs https://smart-agent-platform.vercel.app

# Supabase logs  
supabase functions logs --project-ref sthnezuadfbmbqlxiwtq
```
