# PM-Orchestrator Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Coordination Pattern:**
- Spawn PMs in parallel for efficiency
- Collect results and synthesize
- Route handoffs between PMs
- Verify backlog sync after each cycle

**Decision Pattern:**
- Score proposals using prioritization framework
- Recommend approve/reject/modify
- Route to human for final decision
- Track in DECISIONS.md

**Reporting Pattern:**
- 3x daily reports (8am, 12pm, 8pm EST)
- Synthesize all PM reports
- Highlight critical issues
- Update STATE.md with system health

### Common Issues & Solutions

**Issue:** PMs work in silos
- **Solution:** Created CROSS_PM_AWARENESS.md
- **Pattern:** Weekly cross-PM sync, shared context

**Issue:** Work status unclear (ready vs in-progress)
- **Solution:** Enhanced reporting with status taxonomy
- **Pattern:** Always report completion %, test readiness

**Issue:** PMs don't retain learnings
- **Solution:** Created MEMORY.md files for all PMs
- **Pattern:** Update memories after each cycle

**Issue:** No user feedback loop
- **Solution:** Added Feedback & Tasks tab to roadmap
- **Pattern:** Read roadmap before each cycle, process feedback

### Domain-Specific Knowledge

**Prioritization Framework:**
- User Impact (1-5)
- Effort (S/M/L)
- Vision Alignment (1-10)
- Priority: P0 (high impact + high alignment), P1 (high impact OR high alignment), P2 (everything else)

**QA Gate Process:**
- Post-cycle gate after development
- PM-QA runs browser tests
- PASS → merge, WARN → merge with notes, FAIL → block

**Research Intake:**
- PM-Research submits recommendations
- Score using prioritization framework
- Adopt/defer/reject within 1 cycle
- Assign to domain PMs

### Cross-PM Coordination Patterns

**With All PMs:**
- Coordinate priorities
- Resolve conflicts
- Route handoffs
- Share context

**With PM-Research:**
- Review recommendations
- Score and route
- Provide feedback

**With PM-QA:**
- Run QA gate
- Block merges on critical bugs
- Track quality metrics

---

## Recent Work Context

### Last Cycle (Cycle 9)
- **Worked on:** Coordinating critical fixes (search, AI chat buttons)
- **Discovered:** 13 P0 issues from user testing
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 8:**
- Coordinated 12 PMs successfully
- Verified backlog sync (100%)
- QA gate: PASS

**Cycle 7:**
- Established coordination patterns
- Created reporting templates

---

## Preferences & Patterns

**Prefers:**
- Strategic thinking over operational execution
- Proactive planning
- Clear communication
- Vision alignment

**Avoids:**
- Letting PMs work in silos
- Skipping quality gates
- Making decisions without human approval
- Ignoring blockers

**Works well with:**
- All PMs (coordination)
- Human (decision routing)
- PM-Research (recommendation intake)
- PM-QA (quality gates)

---

## Strategic Insights

**Trends Identified:**
- High development velocity (130+ commits)
- Strong vision alignment (>7.5 average)
- Quality scores high (>90%)
- Some PMs need support (PM-Growth blocked)

**Opportunities:**
- Reduce silos with better coordination
- Improve test readiness tracking
- Enhance strategic reporting
- Build metrics infrastructure

**Risks:**
- PM-Growth blocked on metrics
- Search broken (critical)
- AI chat buttons broken (critical)
- 26 research recommendations untriaged

---

*This memory is updated after each development cycle. PM-Orchestrator should read this before starting new work.*
