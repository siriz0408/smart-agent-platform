# Configuration Files That Need Updates

This document lists all configuration files that need manual updates during migration.

## Critical Updates (Required)

### 1. supabase/config.toml

**File**: `/supabase/config.toml`

**Current value:**
```toml
project_id = "roxwxcyglpxkufvwfdcj"
```

**Update to:**
```toml
project_id = "<YOUR_NEW_PROJECT_ID>"
```

**When to update**: During Phase 2 (Supabase Setup), after creating new project

**How to get new project ID**:
- Supabase Dashboard → Settings → General → Project ID

---

### 2. .env (Local Development)

**File**: `/.env`

**Create or update with:**
```bash
VITE_SUPABASE_URL=https://<NEW_PROJECT_ID>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<NEW_PROJECT_ID>
```

**When to update**: During Phase 2 (Supabase Setup), before running `npm run dev`

**How to get values**:
- Supabase Dashboard → Settings → API
- Copy: Project URL, Anon/public key, Project ID

---

## Optional Updates

### 3. CLAUDE.md (Documentation)

**File**: `/CLAUDE.md`

**Update references to:**
- Old Supabase project ID → New project ID
- Old repository URL → New repository URL
- Lovable deployment info → Vercel deployment info

**When to update**: During Phase 6 (Cleanup), after migration is stable

---

### 4. package.json (Project Name)

**File**: `/package.json`

**Current:**
```json
{
  "name": "vite_react_shadcn_ts",
  ...
}
```

**Optional update:**
```json
{
  "name": "smart-agent-platform",
  ...
}
```

**When to update**: Anytime (cosmetic change)

---

## Already Completed ✅

These files have already been updated in Phase 1:

- ✅ `package.json` - Removed `lovable-tagger` dependency
- ✅ `vite.config.ts` - Removed `componentTagger` plugin
- ✅ `.gitignore` - Added `.vercel/` directory
- ✅ `README.md` - Completely rewritten for Vercel deployment

---

## Environment Variables Summary

### Frontend (Vercel)
Add these in Vercel dashboard → Project Settings → Environment Variables:

```bash
VITE_SUPABASE_URL=https://<NEW_PROJECT_ID>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<NEW_PROJECT_ID>
```

### Backend (Supabase Secrets)
Configure these via Supabase CLI:

```bash
ANTHROPIC_API_KEY=<your-key>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RAPIDAPI_KEY=<your-key>
APP_URL=https://smart-agent-platform.vercel.app
# AI_GATEWAY_URL no longer needed
# AI_MODEL no longer needed
```

---

## Quick Reference Checklist

Before each phase, verify these are updated:

**Phase 1 (GitHub):**
- ✅ No config changes needed (already done)

**Phase 2 (Supabase):**
- [ ] Update `supabase/config.toml` with new project ID
- [ ] Create/update `.env` with new Supabase credentials

**Phase 3 (Vercel):**
- [ ] Add 3 environment variables in Vercel dashboard

**Phase 4 (Testing):**
- [ ] No config changes needed

**Phase 5 (Cutover):**
- [ ] Update Supabase secret: `APP_URL` with Vercel production URL
- [ ] Update Supabase Auth redirect URLs

**Phase 6 (Cleanup):**
- [ ] Update documentation with new URLs (optional)

---

## Troubleshooting Config Issues

### "Cannot connect to Supabase"
- Check `.env` file has correct `VITE_SUPABASE_URL`
- Check `VITE_SUPABASE_PUBLISHABLE_KEY` is anon key (not service role key)
- Verify keys in Vercel environment variables match Supabase dashboard

### "Migration failed - project not found"
- Check `supabase/config.toml` has correct `project_id`
- Re-run: `supabase link --project-ref <NEW_PROJECT_ID>`

### "Edge functions not responding"
- Verify secrets are set: `supabase secrets list`
- Check function logs: `supabase functions logs <function-name>`

---

**For full migration steps**, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
