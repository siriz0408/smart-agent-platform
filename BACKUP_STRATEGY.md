# Backup & Rollback Strategy
## Contact-User Linking Implementation

**Date**: February 5, 2026
**Feature**: Contact-to-User Linking with User Preferences
**Risk Level**: Medium (RLS policy changes, schema changes)

---

## 🛡️ Pre-Implementation Backup Checklist

### 1. Git Repository Backup

**Current State**:
- **Branch**: `main`
- **Latest Commit**: `9fdd3dd` - "fix: update migrations for workspaces table rename and schema fixes"
- **Uncommitted Changes**: Minor tags field addition to ContactDetailSheet.tsx

**Backup Actions**:

```bash
# 1. Stash current uncommitted changes
git stash save "WIP: Tags field in ContactDetailSheet before contact-user linking"

# 2. Create backup branch from current clean state
git checkout -b backup/pre-contact-user-linking
git push origin backup/pre-contact-user-linking

# 3. Tag the current state for easy reference
git tag -a v1.0-pre-contact-linking -m "State before contact-user linking implementation"
git push origin v1.0-pre-contact-linking

# 4. Return to main and create feature branch
git checkout main
git checkout -b feature/contact-user-linking

# 5. Apply stashed changes if needed
git stash pop  # Only if you want to keep the tags field changes
```

**Rollback Command** (if feature breaks):
```bash
# Emergency rollback to pre-feature state
git checkout backup/pre-contact-user-linking
git checkout -b main-recovered
# Or use tag:
git checkout v1.0-pre-contact-linking
```

---

### 2. Database Backup

**Supabase Project**: [Your Project ID]
**Current Schema Version**: Latest migration `20260204200001_workspace_rls_policies.sql`

**Critical Tables to Backup**:
- `workspaces` (formerly tenants)
- `workspace_memberships`
- `profiles`
- `contacts` (50+ columns, critical CRM data)
- `deals`
- `contact_agents`
- `documents`
- `conversations` / `messages`

#### Option A: Supabase Dashboard Backup

1. Go to Supabase Dashboard → Database → Backups
2. Create manual backup: "Pre-Contact-User-Linking Backup - Feb 5, 2026"
3. Download backup file locally for safety
4. **Backup Retention**: Keep for at least 30 days

#### Option B: pg_dump Backup (More Control)

```bash
# Full database backup
supabase db dump -f backups/pre-contact-linking-$(date +%Y%m%d-%H%M%S).sql

# Schema-only backup (for quick rollback testing)
supabase db dump --schema-only -f backups/schema-pre-contact-linking.sql

# Data-only backup for critical tables
supabase db dump --data-only --table contacts --table profiles --table deals \
  -f backups/critical-data-pre-contact-linking.sql
```

**Verify Backup**:
```bash
# Check file size (should be > 1MB for active database)
ls -lh backups/*.sql

# Quick verification - count lines
wc -l backups/pre-contact-linking-*.sql
```

---

### 3. RLS Policies Documentation (Before Changes)

**Critical Policies to Document**:

```bash
# Export current RLS policies
supabase db dump --schema-only | grep -A 20 "CREATE POLICY" > backups/rls-policies-before.sql

# Or query directly
psql $DATABASE_URL -c "
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contacts', 'deals', 'profiles', 'workspace_memberships')
ORDER BY tablename, policyname;
" > backups/rls-policies-before.txt
```

**Snapshot Current Behavior**:
```sql
-- Test queries to validate current RLS behavior
-- Run BEFORE implementing changes, save results

-- 1. Agent sees only their contacts
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "<test-agent-uuid>"}';
SELECT COUNT(*) FROM contacts;  -- Record this number

-- 2. Admin sees all workspace contacts
SET request.jwt.claims TO '{"sub": "<test-admin-uuid>"}';
SELECT COUNT(*) FROM contacts;  -- Record this number

-- 3. Contact visibility for agent
SELECT id, first_name, last_name, created_by FROM contacts LIMIT 5;  -- Record results

RESET ROLE;
```

Save these baseline results to: `backups/rls-behavior-baseline.txt`

---

### 4. Environment Variables Backup

```bash
# Backup current .env file
cp .env .env.backup-$(date +%Y%m%d)

# Document current Supabase secrets
supabase secrets list > backups/supabase-secrets-$(date +%Y%m%d).txt
```

---

### 5. Frontend Build Backup

```bash
# Create production build of current working state
npm run build

# Archive the build
tar -czf backups/dist-pre-contact-linking-$(date +%Y%m%d).tar.gz dist/

# Backup package.json and package-lock.json
cp package.json backups/package.json.backup
cp package-lock.json backups/package-lock.json.backup
```

---

## 🔄 Rollback Procedures

### Level 1: Rollback Database Migration Only

**When to Use**: Migration causes RLS errors, but app still works.

```bash
# 1. Connect to Supabase
supabase db remote connect

# 2. Run rollback migration (created alongside main migration)
psql $DATABASE_URL -f supabase/migrations/20260206000001_rollback_contact_user_linking.sql

# 3. Verify rollback
psql $DATABASE_URL -c "
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contacts'
  AND column_name IN ('user_id', 'ownership_type', 'linked_from_user');
"
# Should return 0 rows if rollback successful

# 4. Check if user_preferences table exists
psql $DATABASE_URL -c "\dt user_preferences"
# Should return "Did not find any relation" if rollback successful
```

### Level 2: Rollback Git + Database

**When to Use**: Frontend changes break existing functionality.

```bash
# 1. Rollback git
git checkout backup/pre-contact-user-linking

# 2. Rollback database (see Level 1)

# 3. Rebuild frontend
npm install
npm run build

# 4. Redeploy
# (Your deployment process here)
```

### Level 3: Full Restore from Backup

**When to Use**: Complete disaster, data corruption.

```bash
# 1. Restore database from pg_dump backup
supabase db reset  # Warning: Destructive!
psql $DATABASE_URL -f backups/pre-contact-linking-YYYYMMDD-HHMMSS.sql

# 2. Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM contacts;"
# Compare with pre-backup count

# 3. Restore git
git checkout backup/pre-contact-user-linking
git branch -D feature/contact-user-linking  # Delete broken branch

# 4. Restart from scratch
git checkout main
git pull origin main
```

---

## ✅ Pre-Implementation Validation Checklist

Before running ANY migration or making ANY code changes:

- [ ] **Git backup branch created**: `backup/pre-contact-user-linking`
- [ ] **Git tag created**: `v1.0-pre-contact-linking`
- [ ] **Database backup created** (Supabase Dashboard or pg_dump)
- [ ] **Database backup verified** (file exists, size > 1MB)
- [ ] **RLS policies documented** (export to file)
- [ ] **RLS baseline behavior captured** (test queries saved)
- [ ] **Environment variables backed up** (.env, Supabase secrets)
- [ ] **Production build archived** (dist/ folder)
- [ ] **Rollback procedure documented** (this file!)
- [ ] **Rollback migration created** (before running main migration)
- [ ] **Testing environment ready** (staging database available)

---

## 🧪 Testing Checkpoints

**After each phase, verify these still work**:

### Checkpoint 1: After Database Migration
- [ ] Existing contacts still load in UI
- [ ] Existing deals still load in UI
- [ ] Agent can create new contact (existing flow)
- [ ] Agent can view contact detail (existing flow)
- [ ] Workspace admin can see all contacts
- [ ] RLS: Agent A cannot see Agent B's contacts
- [ ] No console errors in browser
- [ ] No Supabase errors in logs

### Checkpoint 2: After RLS Policy Changes
- [ ] Run ALL tests from Checkpoint 1 again
- [ ] Specifically test: Agent views contact they created
- [ ] Specifically test: Agent views contact assigned via contact_agents
- [ ] Specifically test: Workspace admin views all contacts
- [ ] Specifically test: Super admin (Sam) views all contacts across workspaces
- [ ] Run RLS baseline queries again, compare results

### Checkpoint 3: After Frontend Changes
- [ ] All existing pages still render
- [ ] Contact list page loads without errors
- [ ] Contact detail sheet opens without errors
- [ ] Contact creation form works
- [ ] Contact editing works
- [ ] Deal creation still works (with contact selection)
- [ ] Messages still work
- [ ] No TypeScript errors in build

---

## 📞 Emergency Contacts

**If something goes wrong**:

1. **Stop immediately** - Don't make more changes
2. **Take screenshot** of error
3. **Check Supabase logs** (Dashboard → Logs)
4. **Run rollback procedure** (Level 1, 2, or 3 depending on severity)
5. **Document what broke** for post-mortem

**Rollback Decision Matrix**:

| Symptom | Rollback Level | Command |
|---------|---------------|---------|
| RLS errors in Supabase logs | Level 1 (DB only) | Run rollback migration |
| UI errors, but data intact | Level 2 (Git + DB) | `git checkout backup/...` |
| Data corruption or loss | Level 3 (Full restore) | Restore from pg_dump |
| Can't reproduce locally | Test on staging first | - |

---

## 📝 Post-Implementation Verification

**After successful implementation**:

- [ ] All Checkpoint 3 tests pass
- [ ] New features work: Contact linking, user preferences
- [ ] No regression: All old features still work
- [ ] Performance: Contact list loads in < 2 seconds
- [ ] RLS: No unauthorized data access
- [ ] Documentation: Help system accessible in app
- [ ] User testing: At least 1 agent, 1 admin, 1 client tested
- [ ] Monitoring: No errors in Supabase logs for 24 hours

**Clean up after 30 days** (if stable):
- Archive backup files to long-term storage
- Delete local backup branch (keep remote)
- Keep database backup for 90 days minimum

---

## 🎯 Success Criteria

**This implementation is successful if**:

1. ✅ All existing functionality works exactly as before
2. ✅ New features work as designed (contact linking, user preferences)
3. ✅ No data loss or corruption
4. ✅ RLS policies maintain security (agents can't see other agents' data)
5. ✅ Users can understand how to use new features (via help system)
6. ✅ Rollback can be executed in < 15 minutes if needed
7. ✅ No production incidents for 7 days post-deployment

**This implementation has failed if**:

1. ❌ Existing contacts/deals/users are lost or corrupted
2. ❌ RLS security breach (unauthorized data access)
3. ❌ App is down for > 5 minutes
4. ❌ Cannot rollback within 30 minutes
5. ❌ Users report broken core functionality (create contact, view deal, send message)

---

**Created by**: Claude (Sonnet 4.5)
**Date**: February 5, 2026
**Feature**: Contact-User Linking Implementation
**Risk Assessment**: Medium
**Estimated Rollback Time**: 15 minutes (Level 1), 30 minutes (Level 2), 2 hours (Level 3)
