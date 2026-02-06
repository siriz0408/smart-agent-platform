# Decisions Log

> **Owned by:** PM-Orchestrator  
> **Purpose:** Track decisions requiring human approval

---

## How This Works

1. **Sub-PM proposes** → PM-Orchestrator logs here
2. **PM-Orchestrator recommends** → Approve/Reject/Modify
3. **Human decides** → Update YOUR DECISION field
4. **PM-Orchestrator relays** → Sub-PM proceeds accordingly

---

## Pending Decisions

*Decisions awaiting human approval*

<!-- 
### [DECISION-XXX] Title
- **Proposed by:** PM-[X]
- **Date:** YYYY-MM-DD
- **Summary:** What is being proposed
- **Vision Alignment Score:** X/10
- **Effort Estimate:** Small / Medium / Large / XL
- **Risk Assessment:** Low / Medium / High
- **PM-Orchestrator Recommendation:** Approve / Reject / Modify
- **Recommendation Rationale:** Why this recommendation

---

**YOUR DECISION:** PENDING / APPROVED / REJECTED / NEEDS MORE INFO

**Your Notes:** 

---
-->

*No pending decisions at this time.*

---

## In Progress

*Approved decisions being implemented*

<!-- 
### [DECISION-XXX] Title
- **Decision:** APPROVED
- **Date Approved:** YYYY-MM-DD
- **Assigned to:** PM-[X]
- **Status:** In Progress
- **Expected Completion:** YYYY-MM-DD
- **Notes:** 

---
-->

*No decisions in progress.*

---

## Resolved Decisions

*Historical record of past decisions*

### [DECISION-000] PM Agent System Initial Setup
- **Proposed by:** PM-Orchestrator
- **Date:** 2026-02-05
- **Summary:** Create PM Agent System with 11 autonomous agents
- **Vision Alignment Score:** 10/10
- **Decision:** APPROVED
- **Date Resolved:** 2026-02-05
- **Outcome:** PM system created and operational

---

## Decision Guidelines

### What Requires Human Approval

- New features (not bug fixes)
- Vision or strategy changes
- External integrations
- Cost increases >20%
- Removing existing features
- Data retention policy changes
- Security-sensitive changes

### What PMs Can Decide Autonomously

- Bug fixes
- Performance optimizations
- Documentation updates
- Minor UI tweaks
- Testing improvements
- Internal refactoring

### Decision Priority Levels

| Level | Response Time | Examples |
|-------|---------------|----------|
| **Urgent** | Same day | Security issue, major bug |
| **High** | 1-2 days | Blocking feature work |
| **Normal** | 3-5 days | Standard feature proposal |
| **Low** | 1 week | Nice-to-have improvements |

---

*PM-Orchestrator updates this file after each standup. Human reviews and responds as needed.*
