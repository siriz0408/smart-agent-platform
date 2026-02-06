# PM-Intelligence Backlog

> **Last Updated:** 2026-02-05

---

## In Progress

| ID | Item | Priority | Status |
|----|------|----------|--------|
| INT-001 | Initial domain discovery audit | P0 | In Progress |

---

## Ready

These tasks are ready for autonomous execution:

### INT-003: Document current prompt templates
**Priority:** P0 | **Effort:** S | **Vision:** 8

**Objective:** Create documentation of all AI prompts used in the system.

**Files to Read:**
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/execute-agent/index.ts`
- `supabase/functions/generate-agent-prompt/index.ts`

**Deliverable:**
Create `docs/pm-agents/agents/PM-Intelligence/PROMPTS.md` documenting:
- System prompts
- User prompt templates
- Agent prompt structures
- Variables/placeholders used

**Acceptance Criteria:**
- [ ] All prompts documented
- [ ] Variables explained
- [ ] Examples provided
- [ ] File committed

---

### INT-006: Improve citation formatting in responses
**Priority:** P2 | **Effort:** S | **Vision:** 8

**Objective:** Improve how AI responses cite source documents.

**Files to Edit:**
- `supabase/functions/ai-chat/index.ts`

**Current State:** Citations may be inconsistent or hard to read.

**Desired State:** Citations should be:
- Formatted as `[Source: filename, page X]`
- Clickable/linkable when possible
- Grouped at end of relevant paragraph

**Acceptance Criteria:**
- [ ] Citation format standardized
- [ ] Tests pass
- [ ] Example response reviewed

---

### INT-002: Audit RAG retrieval quality
**Priority:** P0 | **Effort:** M | **Vision:** 9

**Objective:** Audit the quality of RAG (retrieval) responses.

**Steps:**
1. Read `supabase/functions/search-documents/index.ts`
2. Document the current retrieval parameters
3. Create `docs/pm-agents/agents/PM-Intelligence/RAG_AUDIT.md`
4. Note: chunk size, overlap, similarity threshold, max results
5. Identify potential improvements

**Acceptance Criteria:**
- [ ] Current parameters documented
- [ ] Improvement recommendations listed

---

## Backlog

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| INT-004 | Set up AI quality monitoring | P1 | Dashboard |
| INT-005 | Research Anthropic vs OpenAI | P1 | R&D |
| INT-007 | Add confidence indicators | P2 | Feature |
| INT-008 | Contract Reviewer agent | P3 | New agent type |
| INT-009 | Multi-model fallback | P3 | Reliability |
| INT-010 | Query expansion improvements | P3 | RAG enhancement |

---

## Completed

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| INT-000 | PM-Intelligence setup | 2026-02-05 | Initial |

---

## Research Items

| Topic | Status | Findings |
|-------|--------|----------|
| Claude 4 capabilities | Pending | - |
| Competitor AI features | Pending | - |
| RAG best practices 2026 | Pending | - |
