# ReAgentOS_V1 File Reorganization Plan

**Date:** February 7, 2026
**Status:** Proposal — no changes made yet
**Guiding Principle:** Nothing breaks. Every move is safe, reversible, and verified.

---

## The Problem

Your project root has **53 markdown files**, **3 loose media/HTML files**, and **1 orphaned SQL file** sitting alongside your actual source code. Most of these are audit reports, deployment logs, and implementation summaries that were generated during development but never organized. The root directory has become a "junk drawer" that makes it harder to find what matters.

Meanwhile, you already have a well-structured `/docs` directory with 163 files and logical subdirectories — it's just underutilized for the newer documentation.

---

## What's Safe to Move (and What Isn't)

### DO NOT MOVE — Referenced by CI/CD
These files are checked by `.github/workflows/validate-config.yml` and would break your pipeline if relocated:

| File | Why It Must Stay |
|------|-----------------|
| `CLAUDE.md` | CI validates it exists and contains ANTHROPIC_API_KEY docs |
| `README.md` | CI validates it exists |
| `COMMON_COMMANDS.md` | CI validates it exists |

> **Option:** If you want to move these later, update lines 59 and 72 in `.github/workflows/validate-config.yml` first.

### SAFE TO MOVE — No Code References
Every other root-level markdown file has **zero references** in source code, scripts, CI/CD, or config files. They're purely documentation artifacts.

---

## Proposed Changes

### Phase 1: Clean the Root (Move 45 files into /docs)

**Create these new subdirectories inside `/docs/`:**

#### `/docs/security/` — 9 files
- `API_SECURITY_AUDIT_REPORT.md`
- `CODE_QUALITY_AUDIT_REPORT.md`
- `RLS_SECURITY_AUDIT_REPORT.md`
- `SECURITY_AUDIT_AUTH.md`
- `SECURITY_REVIEW_execute-agent.md`
- `QUALITY_REVIEW_REPORT.md`
- `ACTION_REGISTRY_SECURITY_REVIEW.md`
- `ACTION_QUEUE_UX_REVIEW.md`
- `MIGRATION_REVIEW_autonomous_agent_system.md`

#### `/docs/deployment/` — 9 files
- `DEPLOYMENT_CHECKLIST.md`
- `DEPLOYMENT_GUIDE_SEMANTIC_SEARCH.md`
- `DEPLOYMENT_LOG.md`
- `DEPLOYMENT_STATUS.md`
- `DEPLOYMENT_VERIFICATION_2026-02-06.md`
- `DEPLOY_NOW.md`
- `SETUP_COMPLETE.md`
- `SECURITY_FIXES_2026-02-06.md`
- `BACKUP_STRATEGY.md`

#### `/docs/testing/` — 9 files
- `TESTING_GUIDE.md`
- `TESTING_SETUP_COMPLETE.md`
- `TEST_PLAYWRIGHT_MCP_NOW.md`
- `TEST_RESULTS_FINAL.md`
- `TEST_RESULTS_SUMMARY.md`
- `QUICK_TEST_SETUP.md`
- `TEST_SEARCH_NOW.md`
- `TEST_SEARCH_SIMPLIFIED.md`
- `E2E_BROWSER_TESTING_REPORT.md`

#### `/docs/implementation/` — 8 files
- `IMPLEMENTATION_SUMMARY.md`
- `IMPLEMENTATION_SUMMARY_SEMANTIC_SEARCH.md`
- `IMPLEMENTATION_STATUS.md`
- `CONTACT_USER_LINKING_COMPLETE.md`
- `DOCUMENTATION_CONTACT_USER_LINKING.md`
- `FEATURE_COMPLETE_SUMMARY.md`
- `PHASE2_COMPLETE.md`
- `MIGRATION_SUMMARY.md`

#### `/docs/bug-fixes/` — 5 files
- `BUG_FIXES_COMPLETED.md`
- `BUG_FIX_VERIFICATION.md`
- `SEARCH_DEBUG_REPORT.md`
- `DEBUGGING_SESSION_SUMMARY.md`
- `SEARCH_FIX_COMPLETE.md`

#### `/docs/search/` — 3 files (candidates for archiving)
- `SEARCH_FIX_INSTRUCTIONS.md`
- `SEARCH_FIX_SIMPLIFIED.md`
- `SEARCH_SIMPLIFIED_FINAL.md`

#### `/docs/quality/` — 2 files
- `QUALITY_CHECK_RESULTS.md`
- `VERIFICATION_REPORT.md`

**Move loose non-doc files:**
- `QUICK_FIX.sql` → `/scripts/quick-fix.sql` (with the other SQL scripts)
- `login-page.png` → `/test-artifacts/screenshots/login-page.png`
- `smart-agent-roadmap.html` → `/docs/smart-agent-roadmap.html`
- `test-search.html` → `/test-artifacts/test-search.html` (update reference in `scripts/auto-diagnose-fix.py`)

**Move to /archive:**
- `Smart_Agent_Platform_PRD_v3.md` — keep in root? Or move to `/docs/` since v2 is already in `/archive/`

### After Phase 1 — Your Clean Root

```
ReAgentOS_V1/
├── README.md                  (project entry point)
├── CLAUDE.md                  (AI assistant context)
├── ARCHITECTURE.md            (system architecture — useful to keep visible)
├── COMMON_COMMANDS.md         (CI-referenced)
├── CLI_QUICKSTART.md          (developer onboarding)
├── INTEGRATION_GUIDE.md       (API integration guide)
├── TASK_BOARD.md              (active work tracking)
├── .env / .env.example        (environment config)
├── package.json               (dependencies)
├── index.html                 (app entry)
├── vite.config.ts             (build config)
├── tsconfig*.json             (TypeScript config)
├── vercel.json                (deployment config)
├── tailwind.config.ts         (styling config)
├── ... other standard configs
├── src/                       (source code)
├── docs/                      (all documentation, neatly organized)
├── scripts/                   (automation scripts)
├── tests/                     (test suites)
├── supabase/                  (backend)
└── ... other standard dirs
```

That's **8 essential docs + standard config files** instead of 53+ docs drowning out the code.

---

### Phase 2: Organize the /scripts Directory (52 files)

The scripts directory is flat with 52 files of mixed purpose. Suggested subfolders:

```
scripts/
├── db/                        (database diagnostics & migrations)
│   ├── check-tenant-mapping.sql
│   ├── test-search-sql.sql
│   ├── verify-search-fix.sql
│   ├── seed-test-data.ts
│   ├── seed-simple-test-data.sql
│   └── ... other DB scripts
├── search/                    (search testing & debugging)
│   ├── debug-search.ts
│   ├── diagnose-search-simple.ts
│   ├── test-search-api-directly.ts
│   └── ... other search scripts
├── deploy/                    (deployment & verification)
│   ├── deploy.sh
│   ├── verify-deployment.sh
│   ├── verify-pending-migrations.sh
│   └── ... other deploy scripts
├── qa/                        (quality assurance)
│   ├── qa-gate.ts
│   ├── pm-context-audit-crm-completeness.ts
│   ├── run-performance-tests.ts
│   └── ... other QA scripts
├── setup/                     (environment setup)
│   ├── setup-integrations.sh
│   ├── sync-env.sh
│   └── db-sync.sh
└── pm/                        (PM agent tools)
    ├── pm-daily-report.sh
    ├── pm-discovery-search-verification.ts
    └── ... other PM scripts
```

> **Caution:** Check if any scripts reference other scripts by relative path before reorganizing. Run: `grep -r "scripts/" scripts/` to verify.

---

### Phase 3: Clean Up /test-artifacts (30+ items)

This directory has grown organically. Consider:
- **Archive old reports** — move completed QA reports to `/docs/qa/`
- **Gitignore generated output** — add `test-artifacts/playwright-output/`, `test-artifacts/screenshots/`, and `test-artifacts/*.json` to `.gitignore` (some already are)
- **Keep only the test plan and active checklists** in version control

---

### Phase 4: Source Code Minor Cleanup (Optional, Low Risk)

These are smaller improvements inside `/src/`:

1. **Move orphaned root components:**
   - `src/components/ErrorFallback.tsx` → `src/components/layout/ErrorFallback.tsx`
   - `src/components/NavLink.tsx` → `src/components/navigation/NavLink.tsx`

2. **Consider grouping hooks by domain** (60 hooks in flat structure):
   ```
   src/hooks/
   ├── ai/          (useAIChat, useAIStreaming, useAIChatMetrics, useMentionSearch)
   ├── messaging/   (useConversation, useRealtimeMessages, useTypingIndicator, useReadReceipts)
   ├── analytics/   (useSearchMetrics, useGrowthMetrics, useProductionMetrics, etc.)
   ├── contacts/    (useContacts, useContactImport, useContactUserLink)
   ├── properties/  (usePropertySearch, useSavedProperties, useZillowSearch)
   └── ... remaining hooks stay at root
   ```
   > **Risk note:** This requires updating every import path. Only do this if you have good IDE refactoring support or are comfortable with find-and-replace across the codebase. You'd need to update barrel exports too.

3. **Add missing barrel exports** — 14 component subdirectories lack `index.ts` files, making imports inconsistent.

---

## Execution Safety Checklist

For each phase:

- [ ] **Git commit before starting** — create a clean snapshot you can revert to
- [ ] **Move files with `git mv`** — preserves history, not `mv`
- [ ] **Search for references first** — `grep -r "FILENAME" src/ scripts/ .github/` before each move
- [ ] **Run the build after each batch** — `npm run build` to catch broken imports
- [ ] **Run tests** — `npm run test` to verify nothing is broken
- [ ] **Check CI** — push to a branch and verify the pipeline passes before merging

---

## Priority Order

| Priority | Phase | Risk | Impact |
|----------|-------|------|--------|
| 1 | Phase 1: Clean root docs | Very Low | Huge clarity improvement |
| 2 | Phase 3: Gitignore test artifacts | None | Cleaner git history |
| 3 | Phase 2: Organize scripts | Low | Better script discovery |
| 4 | Phase 4: Src cleanup | Medium | Better code organization |

---

## What I Recommend Starting With

**Phase 1 is the biggest win with the lowest risk.** Moving 45 markdown files into organized `/docs/` subdirectories involves zero code changes, zero import updates, and zero build risk. The only thing to watch is the 3 CI-referenced files (which we leave in place).

Want me to execute Phase 1? I can do it step by step with git mv commands so everything is tracked and reversible.
