# PM-Intelligence Backlog

> **Last Updated:** 2026-02-07 12:00:00

---

## In Progress

_No tasks currently in progress_

---

## Ready

_No tasks currently ready_

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
| HO-009 | Fix tenant isolation in action executors | 2026-02-07 | Critical security fix: hardened add_note contact/deal/property validation, hardened assign_tags with UUID validation + tenant warning logs, added callerTenantId defense-in-depth to execute-actions, forwarded tenant_id to MCP gateway, added tenant_id filter to action approval, added validateTenantAccess/validateUserInTenant helpers, added executeAction UUID gate |
| INT-007 | Add confidence indicators to AI responses | 2026-02-07 | Frontend confidence scoring: `confidenceScoring.ts` utility (extracts citations, computes High/Medium/Low), `ConfidenceIndicator.tsx` component (color-coded badge + tooltip), integrated into Chat.tsx streaming pipeline |

---

## Research Items

| Topic | Status | Findings |
|-------|--------|----------|
| Anthropic vs OpenAI comparison | ✅ Complete | ANTHROPIC_VS_OPENAI.md - Claude optimal primary, GPT-4 valuable fallback |
| Claude 4 capabilities | In Progress | Documented in ANTHROPIC_VS_OPENAI.md |
| Competitor AI features | Pending | - |
| RAG best practices 2026 | Pending | - |
