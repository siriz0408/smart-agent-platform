# PM-Discovery Backlog

> **Last Updated:** 2026-02-14 (Cycle 12)

## In Progress

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| - | None | - | DIS-015 blocked until migration deployed |

## Ready

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| DIS-011 | Search analytics alerts | P2 | Alert when success rate drops below 95% threshold |
| DIS-012 | CTR-based ranking feedback loop | P2 | Use click-through data to improve search ranking weights |
| DIS-013 | Search analytics dashboard widget | P3 | Surface CTR/MRR metrics in admin settings |

---

## Task Details

### DIS-014: 🚨 CRITICAL - Fix global search numeric query failure ✅ COMPLETED
**Priority:** P0 | **Effort:** M | **Source:** Issue Tracker 2026-02-07 | **Completed:** 2026-02-07

**Problem:** User reports searching "922" (numeric query) returns "no results found". This is a critical search failure.

**Root Cause (IDENTIFIED):**
PostgreSQL's `websearch_to_tsquery('english', p_query)` filters out pure numeric queries because English text search considers numbers as non-searchable stop words. The ILIKE fallback existed BUT was combined with AND logic: both full-text search AND ILIKE had to pass, so numeric queries failed the full-text check and never reached ILIKE.

**Files Investigated:**
- ❌ Frontend components - Not the issue
- ❌ Query expansion (DIS-010) - Not the issue
- ✅ `supabase/migrations/20260207000000_improve_search_ranking.sql` - **ROOT CAUSE HERE**

**The Fix (Migration: 20260207080000_fix_numeric_search.sql):**

1. **Numeric Query Detection:**
   - Added `v_is_numeric_query` boolean flag
   - Regex pattern: `^\s*\d+[\s\-]*\d*\s*$` (detects "922", "922 Main", "922-5555")

2. **Conditional Routing:**
   - **Numeric queries** → Skip `websearch_to_tsquery`, use ILIKE-only path
   - **Text queries** → Use `websearch_to_tsquery` OR ILIKE (changed AND to OR)

3. **Ranking for Numeric Queries:**
   - Set `base_rank = 0` for numeric queries (since full-text doesn't apply)
   - Calculate rank using: `exact_boost * position_boost * field_weight`
   - Ensures numeric matches still rank appropriately

4. **Enhanced Field Coverage:**
   - **Contacts:** Added `phone` field to ILIKE search (critical for numeric queries)
   - **Properties:** Added `zip_code` field to ILIKE search (critical for numeric queries)

**Backward Compatibility:**
- ✅ Text queries still use full-text search (no performance regression)
- ✅ Fuzzy matching unchanged
- ✅ Ranking algorithm intact for text queries
- ✅ Only adds new path for numeric queries

**Test Plan (For DIS-015):**
- [ ] Test "922" → Should return documents/contacts/properties with "922"
- [ ] Test "123 Main St" → Should work (alphanumeric)
- [ ] Test "555-1234" → Should match phone numbers
- [ ] Test "12345" → Should match zip codes
- [ ] Test "John" → Text queries still work
- [ ] Test "john smith" → Multi-word text queries still work
- [ ] Test typo "johhn" → Fuzzy matching still works

**Acceptance Criteria:**
- [x] Root cause identified (websearch_to_tsquery filters numbers)
- [x] Fix implemented (numeric query detection + ILIKE-only routing)
- [x] Migration created (20260207080000_fix_numeric_search.sql)
- [x] Backward compatibility maintained
- [x] Enhanced coverage (phone, zip_code fields)
- [ ] Migration deployed to Supabase (PENDING)
- [ ] Manual testing completed (DIS-015)
- [ ] E2E tests updated (PENDING)

---

### DIS-015: Test all search types comprehensively
**Priority:** P0 | **Effort:** M | **Source:** Issue Tracker 2026-02-07

**Objective:** Run comprehensive test suite across all entity types to identify scope of search failures.

**Search Types to Test:**
1. **Documents** - Test: file names, content, metadata
2. **Contacts** - Test: names, emails, phone numbers, addresses
3. **Properties** - Test: addresses, property IDs, zip codes
4. **Deals** - Test: deal names, amounts, stages
5. **Agents** - Test: agent names, capabilities

**Test Matrix:**
| Query Type | Documents | Contacts | Properties | Deals | Agents |
|------------|-----------|----------|------------|-------|--------|
| Numeric | ❓ | ❓ | ❓ | ❓ | ❓ |
| Alphanumeric | ❓ | ❓ | ❓ | ❓ | ❓ |
| Email | N/A | ❓ | N/A | N/A | N/A |
| Phone | N/A | ❓ | N/A | N/A | N/A |
| Address | ❓ | ❓ | ❓ | N/A | N/A |

**Task:**
1. Create test queries for each entity type
2. Execute searches manually or via E2E tests
3. Document which work and which fail
4. Identify patterns (e.g., all numeric queries fail)
5. Report findings

**Acceptance Criteria:**
- [ ] All 5 entity types tested
- [ ] Test matrix filled out
- [ ] Failures documented
- [ ] Root causes identified
- [ ] Report created

---

### DIS-016: Fix search input matching discrepancy
**Priority:** P0 | **Effort:** S | **Source:** Issue Tracker 2026-02-07

**Problem:** "Search doesn't match what I input in the input message bar" - user confusion about what's being searched.

**Files to Investigate:**
- `src/components/search/GlobalSearch.tsx`
- `src/components/search/SearchResultsDropdown.tsx`
- Query transformation logic

**Task:**
1. Verify search input UI shows what user types
2. Check if query is being transformed before execution
3. Add debug logging to show: user input → transformed query
4. Ensure UI reflects actual search query
5. If transformation is necessary, show it to user

**Possible Issues:**
- Query expansion modifying input without user knowledge
- Typo correction changing query silently
- Synonym expansion not visible to user

**Acceptance Criteria:**
- [ ] Search input matches query execution
- [ ] If query is transformed, user sees it
- [ ] Clear visual feedback on what's being searched
- [ ] Tests pass

---

## Completed

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| **DIS-015** | **Test plan creation for comprehensive search testing** | **2026-02-07** | **Created comprehensive test matrix with 30+ queries across 5 entity types. Report: pm-discovery-dis015-comprehensive-search-test.md. BLOCKED: Awaiting migration deployment** |
| DIS-000 | PM-Discovery setup | 2026-02-05 | - |
| DIS-001 | Initial domain audit | 2026-02-06 |
| DIS-002 | Test 20 common searches | 2026-02-06 |
| DIS-003 | Measure success rate | 2026-02-06 |
| DIS-004 | Analyze zero results | 2026-02-06 |
| DIS-005 | Improve ranking | 2026-02-07 |
| DIS-006 | Implement fuzzy matching | 2026-02-06 |
| DIS-007 | Add search suggestions/autocomplete | 2026-02-06 |
| DIS-008 | Comprehensive search metrics tracking | 2026-02-07 | Tracks all searches, calculates success rate, latency metrics |
| DIS-009 | Search result click-through tracking | 2026-02-07 | DB table, RLS, CTR analytics RPC, hook, integrated in GlobalSearch dropdown + SearchResults page |
| DIS-010 | Search query expansion suggestions | 2026-02-07 | Typo correction (Levenshtein), RE synonym expansion, partial match, recent queries, entity type suggestions |
| **DIS-016** | **Fix search input matching discrepancy** | **2026-02-14** | **Fixed: Removed debug logging code, added "Searching for: X" visual indicator in dropdown. Users now see exactly what query is being searched. Files: useGlobalSearch.ts, GlobalSearch.tsx, SearchResultsDropdown.tsx** |
| **DIS-014** | **🚨 Fix global search numeric query failure** | **2026-02-07** | **Fixed: Added numeric query detection, ILIKE-only path for numbers. Migration: 20260207080000_fix_numeric_search.sql** |