# Documentation Update Checklist

**Generated:** 2026-02-01
**Purpose:** Track documentation updates during AI fix implementation

## Issues Found by Validation Script

### ❌ Critical Issues (4 found)

- [ ] **LOVABLE_API_KEY references** → Change to ANTHROPIC_API_KEY
  - [ ] Smart_Agent_Platform_PRD_v3.md
  - [ ] docs/CONFIG_UPDATES_NEEDED.md
  - [ ] docs/MIGRATION_GUIDE.md
  - [ ] docs/TESTING_CHECKLIST.md
  - [ ] docs/SUPABASE_SETUP.md
  - [ ] docs/QUICK_START.md
  - [ ] supabase/functions/execute-agent/index.ts (CODE)
  - [ ] README.md
  - [ ] CLAUDE.md

- [ ] **lovable.dev gateway references** → Change to api.anthropic.com
  - [ ] Smart_Agent_Platform_PRD_v3.md
  - [ ] docs/CONFIG_UPDATES_NEEDED.md
  - [ ] docs/MIGRATION_GUIDE.md
  - [ ] docs/SUPABASE_SETUP.md
  - [ ] docs/QUICK_START.md
  - [ ] README.md
  - [ ] CLAUDE.md
  - Note: index.html OpenGraph images can stay (branding)
  - Note: Stripe function fallback origins can stay (fallback)

- [ ] **Missing ANTHROPIC_API_KEY documentation**
  - [ ] CLAUDE.md - Add environment variables section
  - [ ] SUPABASE_SETUP.md - Add to secrets section
  - [ ] README.md - Add to setup instructions

- [ ] **Missing Supabase commands**
  - [ ] COMMON_COMMANDS.md - Add function deployment commands

### ⚠️  Warnings (informational)
- README.md missing ANTHROPIC_API_KEY (will add)
- COMMON_COMMANDS.md missing Supabase function deployment (will add)

## Files to Update (Phase 4)

### Core Documentation
- [ ] CLAUDE.md
  - [ ] Remove all Lovable references
  - [ ] Add ANTHROPIC_API_KEY to environment variables section
  - [ ] Update AI operations description
  - [ ] Add AI troubleshooting section

- [ ] README.md
  - [ ] Update tech stack description
  - [ ] Update environment variables section
  - [ ] Add ANTHROPIC_API_KEY setup
  - [ ] Remove Lovable gateway references

- [ ] COMMON_COMMANDS.md
  - [ ] Add health check commands
  - [ ] Add AI troubleshooting commands
  - [ ] Add Supabase function deployment commands

### Setup Guides
- [ ] docs/SUPABASE_SETUP.md
  - [ ] Update secrets section with ANTHROPIC_API_KEY
  - [ ] Remove LOVABLE_API_KEY and AI_GATEWAY_URL
  - [ ] Update setup instructions

- [ ] docs/CONFIG_UPDATES_NEEDED.md
  - [ ] Update backend secrets list
  - [ ] Add ANTHROPIC_API_KEY
  - [ ] Remove Lovable references

- [ ] docs/QUICK_START.md
  - [ ] Update quick start commands
  - [ ] Add troubleshooting section
  - [ ] Update secret setup

- [ ] docs/MIGRATION_GUIDE.md
  - [ ] Update secret migration commands
  - [ ] Update troubleshooting section

- [ ] docs/TESTING_CHECKLIST.md
  - [ ] Update error simulation tests
  - [ ] Update secret validation tests

### Product Documentation
- [ ] Smart_Agent_Platform_PRD_v3.md
  - [ ] Update AI service references
  - [ ] Mark completed features
  - [ ] Update technical implementation notes

- [ ] .lovable/plan.md
  - [ ] Mark AI debugging as complete
  - [ ] Add implementation notes
  - [ ] Update next tasks

## New Documentation to Create (Phase 5)

- [ ] docs/DEPLOYMENT_CHECKLIST.md
  - [ ] Pre-deployment validation steps
  - [ ] Environment variable checklist
  - [ ] Secret verification steps
  - [ ] Health check verification

- [ ] docs/AI_TROUBLESHOOTING.md
  - [ ] Common AI errors and solutions
  - [ ] API key validation
  - [ ] Debugging steps
  - [ ] Health check commands

- [ ] .github/workflows/validate-config.yml
  - [ ] GitHub Actions workflow for validation
  - [ ] Run docs/validate-docs.sh on PRs
  - [ ] Check for Lovable references

## Commit Message Template

```
fix: migrate from Lovable to Anthropic API

**Code Changes:**
- Update execute-agent to use ANTHROPIC_API_KEY
- Fix API call format to match Anthropic spec
- Add startup validation helpers
- Improve error handling

**Documentation Updates:**
- Update CLAUDE.md with AI configuration section
- Update SUPABASE_SETUP.md secrets list
- Update README.md tech stack
- Remove all Lovable gateway references
- Add AI troubleshooting guide
- Create deployment checklist

**Files Updated:** [list specific files]

Closes: [issue number if applicable]
```

## Validation Steps

After all updates:

1. Run validation script:
   ```bash
   ./docs/validate-docs.sh
   ```

2. Verify no Lovable references:
   ```bash
   grep -r "LOVABLE_API_KEY" . --exclude-dir=node_modules --exclude-dir=.git
   grep -r "lovable.dev" . --exclude-dir=node_modules --exclude-dir=.git
   ```

3. Verify Anthropic consistency:
   ```bash
   grep -r "ANTHROPIC_API_KEY" CLAUDE.md docs/SUPABASE_SETUP.md README.md
   ```

4. Check all documentation files exist and are up to date

## Status

**Phase 0:** ✅ Setup complete
**Phase 1:** ⏳ In progress
**Phase 2:** ⏳ Pending
**Phase 3:** ⏳ Pending
**Phase 4:** ⏳ Pending
**Phase 5:** ⏳ Pending
**Phase 6:** ⏳ Pending
