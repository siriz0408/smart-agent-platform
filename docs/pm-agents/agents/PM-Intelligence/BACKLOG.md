# PM-Intelligence Backlog

> **Last Updated:** 2026-02-06 17:30:00

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
| INT-002 | Audit RAG retrieval quality | 2026-02-06 | RAG_AUDIT.md created with full analysis |
| INT-003 | Document current prompt templates | 2026-02-06 | PROMPTS.md created |
| INT-006 | Improve citation formatting in responses | 2026-02-06 | Standardized to [Source: filename, page X], RAG_IMPROVEMENT_PROPOSAL.md created |

---

## Research Items

| Topic | Status | Findings |
|-------|--------|----------|
| Claude 4 capabilities | Pending | - |
| Competitor AI features | Pending | - |
| RAG best practices 2026 | Pending | - |
