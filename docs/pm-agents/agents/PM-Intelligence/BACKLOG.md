# PM-Intelligence Backlog

> **Last Updated:** 2026-02-06 20:00:00

---

## In Progress

_No tasks currently in progress_

---

## Ready

These tasks are ready for autonomous execution:

### INT-007: Add confidence indicators
**Priority:** P2 | **Effort:** M | **Vision:** 6

**Objective:** Add confidence scores/indicators to AI responses to help users understand AI certainty.

**Deliverable:**
- Confidence scoring logic in AI responses
- UI indicators (visual badges, percentages)
- Documentation of confidence calculation

**Acceptance Criteria:**
- [ ] Confidence scores calculated for responses
- [ ] UI displays confidence indicators
- [ ] Documentation explains scoring method
- [ ] Tests verify confidence accuracy

---

## Backlog

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| INT-009 | Multi-model fallback | P3 | Reliability - Implement GPT-4 fallback per INT-005 |
| INT-010 | Query expansion improvements | P3 | RAG enhancement |
| INT-012 | Implement GPT-4 Turbo fallback | P1 | Based on INT-005 recommendations |
| INT-013 | Route structured extraction to GPT-4 | P2 | JSON mode for critical extractions |

---

## Completed

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| INT-000 | PM-Intelligence setup | 2026-02-05 | Initial |
| INT-001 | Initial domain discovery audit | 2026-02-06 | DOMAIN_AUDIT.md created with full system mapping |
| INT-002 | Audit RAG retrieval quality | 2026-02-06 | RAG_AUDIT.md created with full analysis |
| INT-003 | Document current prompt templates | 2026-02-06 | PROMPTS.md created |
| INT-004 | Set up AI quality monitoring | 2026-02-06 | ai_chat_metrics table created, tracking integrated into Chat.tsx, dashboard ready |
| INT-005 | Research Anthropic vs OpenAI | 2026-02-06 | ANTHROPIC_VS_OPENAI.md created with comprehensive comparison, 3 recommendations submitted |
| INT-006 | Improve citation formatting in responses | 2026-02-06 | Standardized to [Source: filename, page X], RAG_IMPROVEMENT_PROPOSAL.md created |
| INT-011 | Create AgentDetail.tsx page | 2026-02-06 | Created missing AgentDetail.tsx page with full agent details view, added route, linked from Agents.tsx |

---

## Research Items

| Topic | Status | Findings |
|-------|--------|----------|
| Anthropic vs OpenAI comparison | ✅ Complete | ANTHROPIC_VS_OPENAI.md - Claude optimal primary, GPT-4 valuable fallback |
| Claude 4 capabilities | In Progress | Documented in ANTHROPIC_VS_OPENAI.md |
| Competitor AI features | Pending | - |
| RAG best practices 2026 | Pending | - |
