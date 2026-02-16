# PM-Research Memory

> **Last Updated:** 2026-02-15 (RES-011 complete - AI Pricing Research)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Research Pattern:**
- Comprehensive research reports (500-1000 lines)
- Market intelligence synthesis
- Competitive analysis
- Technology evaluation
- Schema recommendations with SQL examples

**Recommendation Pattern:**
- Submit recommendations to PM-Orchestrator
- Score using prioritization framework
- Track in RECOMMENDATIONS.md
- Get response (adopt/defer/reject)
- Include implementation roadmap with phases

**Research Topics:**
- Competitive analysis
- AI model landscape
- MLS/IDX integration options
- Email/calendar APIs
- Agent pain points
- Team/brokerage management features
- SaaS billing models
- AI pricing and cost optimization (NEW - RES-011)

### Common Issues & Solutions

**Issue:** Recommendations not triaged
- **Solution:** PM-Orchestrator reviews within 1 cycle
- **Pattern:** Every recommendation gets a response

**Issue:** Research reports too long
- **Solution:** Use executive summaries, detailed appendices
- **Pattern:** Lead with key findings, details follow

**Issue:** Recommendations stale
- **Solution:** Track recommendation status
- **Pattern:** Revisit deferred recommendations in 30 days

### Domain-Specific Knowledge

**Research Areas:**
- Competitive landscape
- Technology trends
- Market intelligence
- User needs research
- Tool/API evaluation
- AI pricing and economics (NEW)

**Recommendation Types:**
- Feature recommendations
- Technology recommendations
- Process recommendations
- Strategic recommendations
- Cost optimization recommendations (NEW)

**Research Outputs:**
- Research reports (detailed)
- Recommendations (actionable)
- Market intelligence (synthesis)
- Pricing model analysis (NEW)

**AI Pricing Knowledge (RES-011):**
- Claude API pricing tiers: Opus ($5/$25), Sonnet ($3/$15), Haiku ($1/$5) per million tokens
- AI SaaS margins: 50-60% vs 80-90% for traditional SaaS
- Prompt caching: 90% savings on cached content, 5-minute cache window
- Model routing: use cheaper models for simple queries (40-50% savings)
- Batch API: 50% discount for non-urgent workloads
- Industry trend: 61% of SaaS companies use usage-based pricing (up from 45% in 2021)
- Hybrid model (base + overage) is 2026 industry standard

### Cross-PM Coordination Patterns

**With PM-Orchestrator:**
- Submit recommendations
- Get feedback on research priorities
- Coordinate on strategic research
- Schema proposals for team features

**With PM-Integration:**
- Research integration options
- Evaluate APIs and tools
- Assess technical feasibility

**With PM-Intelligence:**
- Research AI models
- Evaluate AI capabilities
- Assess cost/quality trade-offs
- Lead scoring model design

**With PM-Transactions:**
- Lead distribution requirements
- Deal pipeline enhancements

**With PM-Experience:**
- Seat management UI requirements
- Agent performance dashboard specs

**With PM-Security:**
- Workspace privacy modes
- RLS policy considerations

---

## Recent Work Context

### Last Cycle (2026-02-15)
- **Worked on:** RES-011 - AI Pricing Research (complete)
- **Discovered:** AI economics fundamentally different from traditional SaaS (50-60% margins vs 80-90%)
- **Key findings:**
  - Claude Sonnet 4.5 costs: $3 input / $15 output per million tokens
  - Smart Agent's estimated AI cost: ~$5.25/user/month at 500 messages
  - Prompt caching can save 60-80% on repeated context
  - Model routing (Haiku for simple, Sonnet for complex) saves 40-50%
  - Batch API provides 50% discount for non-urgent workloads
  - Industry trend: hybrid pricing (base + usage) is 2026 standard
- **Blocked by:** None
- **Handoffs created:** 6 new recommendations (REC-039 to REC-044)

### Previous Cycles

**Cycle 10 (2026-02-15):**
- Completed team/brokerage management research (RES-009)
- Submitted 6 recommendations (REC-033 to REC-038)
- Key gaps: lead distribution, agent analytics, team hierarchy

**Cycle 9 (2026-02-07):**
- Completed email/calendar API research
- Submitted 6 recommendations (REC-027 to REC-032)
- Identified Google OAuth verification as critical blocker

**Cycle 8:**
- Completed agent pain points research (955 lines)
- Submitted 10 new recommendations (REC-017 through REC-026)
- Identified top 10 pain points

**Cycle 7:**
- Completed competitive analysis
- Completed AI model landscape research
- Completed MLS/IDX integration research

---

## Preferences & Patterns

**Prefers:**
- Using `smart-agent-brainstorming` for research planning
- Comprehensive research reports
- Actionable recommendations

**Avoids:**
- Shallow research
- Recommendations without evidence
- Stale research

**Works well with:**
- PM-Orchestrator (recommendation intake)
- PM-Integration (API research)
- PM-Intelligence (AI research)

---

*This memory is updated after each development cycle. PM-Research should read this before starting new work.*
