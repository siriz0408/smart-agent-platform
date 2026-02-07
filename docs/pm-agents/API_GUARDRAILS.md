# API Usage Guardrails

> **Purpose:** Light guardrails for API cost awareness (not strict budget management)
> **Philosophy:** Be cognizant of costs and maximize efficiency when possible, but don't stymie innovation
> **Last Updated:** 2026-02-07

---

## Cost Awareness (Not Strict Limits)

| Resource | Guidance | Action if Exceeded |
|----------|----------|-------------------|
| Claude API (per task) | Be aware of costs | If >$100 estimated, note in report |
| Code-explorer agents | 2-3 recommended | If more needed, explain why in report |
| Code-architect agents | 2-3 recommended | If more needed, explain why in report |
| Brainstorming questions | 10 recommended | If more needed, explain why in report |

---

## Tracking Requirements

All PMs should report in their work summary:

- **Estimated API costs** for task (rough estimate OK)
- **Number of agents spawned** (if using /feature-dev)
- **Cost optimization opportunities** (if any identified)

**Example:**
```
API Cost Estimate: $12 (2 code-explorer agents, 1 code-architect)
Cost Optimization: None identified - appropriate for task complexity
```

---

## Cost Optimization Principles

**When to optimize:**
- ✅ Use caching when possible (but don't over-optimize)
- ✅ Limit context window sizes (when reasonable)
- ✅ Consolidate similar queries (when it makes sense)
- ✅ Maximize efficiency when possible (but prioritize innovation)

**When NOT to optimize:**
- ❌ Don't skip necessary exploration
- ❌ Don't avoid using /feature-dev for big features
- ❌ Don't limit brainstorming questions if they're needed
- ❌ Don't sacrifice quality for cost savings

---

## Philosophy

**We want to:**
- Be aware of API costs
- Maximize efficiency when possible
- Report costs in work summaries

**We don't want to:**
- Stymie innovation with strict budget management
- Block necessary work due to cost concerns
- Over-optimize at the expense of quality
- Create bureaucratic cost approval processes

**Balance:** Innovation and quality first, efficiency awareness second.

---

## Cost Tracking in Performance Metrics

PM-Orchestrator tracks:
- Average API costs per PM
- Cost trends over time
- Cost optimization opportunities

This is for **awareness and learning**, not for enforcement or blocking.

---

*This document is maintained by PM-Orchestrator. Updated based on actual usage patterns.*
