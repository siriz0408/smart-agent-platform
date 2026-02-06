# Cross-PM Handoffs

> **Owned by:** PM-Orchestrator  
> **Purpose:** Coordinate issues that span PM boundaries

---

## How Handoffs Work

1. **PM discovers cross-domain issue** → Logs here with priority
2. **PM-Orchestrator reviews** → Routes to appropriate PM
3. **Receiving PM acknowledges** → Updates status
4. **Issue resolved** → Moved to Resolved section

---

## Active Handoffs

*Issues requiring cross-PM coordination*

<!-- 
### [HO-XXX] Title
- **From:** PM-[X]
- **To:** PM-[Y]
- **Priority:** Critical / High / Medium / Low
- **Created:** YYYY-MM-DD

**Issue:**
[Description of the issue]

**Impact:**
[How this affects the receiving PM's domain]

**Suggested Action:**
[What the originating PM thinks should happen]

**Status:** PENDING / ACKNOWLEDGED / IN PROGRESS / RESOLVED

**Notes:**
[Any additional context]

---
-->

*No active handoffs at this time.*

---

## Acknowledged (In Progress)

*Handoffs that receiving PM has acknowledged and is working on*

*None currently.*

---

## Resolved Handoffs

*Completed handoffs for historical reference*

### [HO-000] PM System Bootstrap
- **From:** PM-Orchestrator
- **To:** All PMs
- **Priority:** High
- **Created:** 2026-02-05
- **Resolved:** 2026-02-05

**Issue:** Initialize PM system, establish baselines

**Resolution:** All PMs created, system operational

---

## Handoff Priority Definitions

| Priority | Response Time | Examples |
|----------|---------------|----------|
| **Critical** | Immediate | Production down, data loss risk |
| **High** | Same standup cycle | Feature blocked, user impact |
| **Medium** | Next standup cycle | Quality issue, improvement needed |
| **Low** | Within week | Nice-to-have coordination |

---

## Common Handoff Patterns

### PM-Intelligence → PM-Context
- RAG quality issues caused by indexing
- Missing document data
- Chunking problems

### PM-Context → PM-Intelligence  
- Data format changes affecting RAG
- New document types to support
- Indexing performance issues

### PM-Experience → PM-[Any]
- UI bugs that trace to backend
- Feature requests from user feedback
- Performance issues visible in UI

### PM-[Any] → PM-Infrastructure
- Performance problems
- Deployment issues
- Monitoring gaps

### PM-[Any] → PM-Security
- Potential vulnerabilities
- Access control issues
- Compliance concerns

---

## Handoff Template

Use this template when creating a new handoff:

```markdown
### [HO-XXX] [Brief title]
- **From:** PM-[X]
- **To:** PM-[Y]
- **Priority:** [Critical/High/Medium/Low]
- **Created:** [Date]

**Issue:**
[Clear description of the problem]

**Impact:**
[Why this matters to the receiving PM]

**Suggested Action:**
[Your recommendation]

**Status:** PENDING

**Notes:**
[Additional context]
```

---

*PM-Orchestrator reviews handoffs at each standup and ensures routing.*
