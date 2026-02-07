# PM Agent System

> **⚠️ INTERNAL DEV TOOL** - This is NOT a product feature. Do NOT document in PRD.

An autonomous Product Manager agent system with 13 AI agents (1 orchestrator + 12 domain PMs) that manage product development, conduct R&D, run QA tests, and report 3x daily.

---

## Quick Start

```bash
# Run morning standup (all 13 PMs)
"Run PM morning standup"

# Run development cycle (PMs implement features)
"Run PM development cycle"

# Run midday check (7 core PMs)
"Run PM midday check"

# Quick health check
"Run PM health check"
```

---

## System Overview

### 13 Agents

| Agent | Domain | North Star Metric |
|-------|--------|------------------|
| **PM-Orchestrator** | Vision, coordination | Report delivery 100% |
| **PM-Intelligence** | AI chat, RAG, agents | AI Task Completion >90% |
| **PM-Context** | Documents, CRM, data | Data Completeness >90% |
| **PM-Transactions** | Deals, pipeline | Deal Velocity +20% |
| **PM-Experience** | UI/UX, accessibility | NPS >50 |
| **PM-Growth** | Billing, onboarding | MRR Growth >15% |
| **PM-Integration** | External APIs, MLS | Integration Adoption >60% |
| **PM-Discovery** | Search, findability | Search Success >95% |
| **PM-Communication** | Messaging, notifications | Response Time <4hr |
| **PM-Infrastructure** | DevOps, performance | Uptime 99.9% |
| **PM-Security** | Auth, compliance | 0 Incidents |
| **PM-Research** | R&D, market intelligence | Recommendation Adoption >40% |
| **PM-QA** | Testing, browser automation | Bug Escape Rate <5% |

---

## Key Documentation

### Getting Started
- **[RUN-PM.md](./RUN-PM.md)** - How to invoke and operate the PM system
- **[HOW_TO_READ_REPORTS.md](./HOW_TO_READ_REPORTS.md)** - Guide for interpreting PM reports

### Core Files
- **[VISION.md](./VISION.md)** - Product vision (owned by PM-Orchestrator)
- **[STATE.md](./STATE.md)** - Current system state (includes PM performance metrics)
- **[OWNERSHIP.md](./OWNERSHIP.md)** - Feature-to-PM mapping
- **[DECISIONS.md](./DECISIONS.md)** - Human approval workflow

### Enhanced Features (2026-02-07)
- **[SKILLS.md](./SKILLS.md)** - Skills reference for all PMs
- **[WORK_STATUS.md](./WORK_STATUS.md)** - Ready to Test / In Progress / Blocked tracker
- **[PERFORMANCE.md](./PERFORMANCE.md)** - PM performance metrics framework
- **[CROSS_PM_AWARENESS.md](./CROSS_PM_AWARENESS.md)** - Cross-PM coordination tracker
- **[PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md)** - Deployment readiness checklist
- **[API_GUARDRAILS.md](./API_GUARDRAILS.md)** - Light API cost guardrails
- **[FEEDBACK.md](./FEEDBACK.md)** - Human feedback intake (cleared after each cycle)

### Agent Definitions
- **[agents/PM-*/AGENT.md](./agents/)** - Individual PM definitions
- **[agents/PM-*/MEMORY.md](./agents/)** - PM memory files (learnings & context)
- **[agents/PM-*/BACKLOG.md](./agents/)** - PM backlogs

### Roadmap Integration
- **[smart-agent-roadmap.html](../../smart-agent-roadmap.html)** - Product roadmap with:
  - **Feedback & Tasks tab**: Submit feedback with image attachments
  - **Cycle Recaps tab**: Detailed cycle summaries with progress tracking
  - PM-Orchestrator reads feedback before cycles and updates roadmap after cycles

---

## Enhanced Features

### Enhanced Reporting
- Clear distinction between "🟢 Ready to Test", "🟡 In Progress", "🔴 Blocked"
- Feature completion percentages
- Progress tracking toward larger goals
- "What's Ready to Test" vs "What Still Needs Work" sections

### Memory System
- Each PM has a `MEMORY.md` file that retains learnings across cycles
- Updated after each development cycle
- Includes: Key Learnings, Recent Work Context, Preferences & Patterns

### Cross-PM Coordination
- `CROSS_PM_AWARENESS.md` tracks active work across all PMs
- Reduces silos by sharing context
- Weekly cross-PM sync facilitated by PM-Orchestrator

### Development Method Selection
- PMs have discretion: `/feature-dev` for big features, `smart-agent-brainstorming` for small updates
- Decision framework based on complexity (3+ files, architectural impact)
- Pre-work validation: Vision alignment, API cost estimate, big picture context

### Pre-Deployment Checklist
- Complementary to feature-dev plugin
- Integration checks, user impact assessment, cross-PM impact
- Ensures deployment readiness

### Roadmap Integration
- `smart-agent-roadmap.html` includes:
  - **Feedback & Tasks tab**: Submit strategic feedback, bug reports, task delegation, research assignments, feature requests, decision responses, testing feedback (with image attachments)
  - **Cycle Recaps tab**: Detailed cycle summaries with progress toward goals, ready to test items, bugs/issues, considerations
- PM-Orchestrator reads feedback before each cycle and updates roadmap after each cycle

### Performance Tracking
- `PERFORMANCE.md` tracks: Completion Rate, Quality Score, Velocity, Vision Alignment, API Costs, Method Selection, Blocked Time
- Updated weekly by PM-Orchestrator

---

## Human Workflow

1. **Review Reports**: 
   - Check `reports/YYYY-MM-DD/` for detailed reports
   - Or check `smart-agent-roadmap.html` → Cycle Recaps tab for visual summaries
   - See `HOW_TO_READ_REPORTS.md` for interpreting status indicators

2. **Track Work Status**:
   - Check `WORK_STATUS.md` for what's ready to test vs in progress
   - Review "Ready to Test 🟢" section for features you can test in UI
   - Check "In Progress 🟡" to see what's still being worked on

3. **Provide Feedback**:
   - Use `smart-agent-roadmap.html` → Feedback & Tasks tab
   - Submit: Strategic feedback, bug reports, task delegation, research assignments, feature requests, decision responses, testing feedback
   - Attach images for visual reference
   - PM-Orchestrator processes feedback before each cycle

4. **Decisions Needed**: 
   - Review `DECISIONS.md`
   - Respond via roadmap feedback tab or directly in DECISIONS.md
   - PMs pick up decisions in next run

5. **Review Performance**:
   - Check `PERFORMANCE.md` for PM effectiveness metrics
   - Review trends and identify PMs needing support

---

## Development Cycles

PMs can run in **development mode** where they actually implement features:

```bash
# Run full development cycle (all PMs)
"Run PM development cycle"

# Run single PM development
"Run PM-Intelligence development"

# Run specific task
"PM-Security, fix JWT verification"
```

**See [RUN-PM.md](./RUN-PM.md) for complete documentation.**

---

*This system is maintained by PM-Orchestrator. For questions or issues, check `docs/pm-agents/STATE.md` or submit feedback via `smart-agent-roadmap.html`.*
