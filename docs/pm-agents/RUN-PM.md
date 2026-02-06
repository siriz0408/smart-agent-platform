# Running the PM System

> **Purpose:** How to invoke and operate the PM Agent System

---

## Quick Start

```
"Run PM morning standup"
```

That's it. The PM system will:
1. Load current state
2. Spawn all sub-PMs in parallel
3. Collect their reports
4. Synthesize into unified report
5. Save to `reports/YYYY-MM-DD/`
6. Update STATE.md

---

## Invocation Commands

### Full Standups (All 11 PMs)

| Command | When to Use | Report Location |
|---------|-------------|-----------------|
| `Run PM morning standup` | 8:00 AM EST daily | `reports/YYYY-MM-DD/08-00-morning.md` |
| `Run PM evening summary` | 8:00 PM EST daily | `reports/YYYY-MM-DD/20-00-evening.md` |

### Core Standups (5 Essential PMs)

| Command | When to Use | PMs Involved |
|---------|-------------|--------------|
| `Run PM midday check` | 12:00 PM EST | Orchestrator, Intelligence, Context, Experience, Growth |

### Quick Health Check

| Command | When to Use | What It Does |
|---------|-------------|--------------|
| `Run PM health check` | Anytime | PM-Orchestrator only, samples metrics |

### Single PM Deep Dive

| Command | When to Use | What It Does |
|---------|-------------|--------------|
| `Run PM-Intelligence deep dive` | Investigating AI issues | Full investigation by one PM |
| `Run PM-[Name] investigate [issue]` | Specific issue | Targeted investigation |

### Testing

| Command | When to Use | What It Does |
|---------|-------------|--------------|
| `Run PM test standup` | After changes | Validates system works |

---

## Run Tiers (Cost Management)

Different run types for different needs:

| Tier | PMs | Est. Cost | When |
|------|-----|-----------|------|
| **Full** | All 11 | $$$ | Morning, evening, major decisions |
| **Core** | 5 essential | $$ | Midday routine |
| **Quick** | 1 (sampling) | $ | Quick status checks |
| **Single** | 1 specific | $ | Deep investigation |

### Which PMs in Each Tier

**Full (11):**
- PM-Orchestrator
- PM-Intelligence
- PM-Context
- PM-Transactions
- PM-Experience
- PM-Growth
- PM-Integration
- PM-Discovery
- PM-Communication
- PM-Infrastructure
- PM-Security

**Core (5):**
- PM-Orchestrator
- PM-Intelligence
- PM-Context
- PM-Experience
- PM-Growth

---

## What Happens During a Run

### 1. Context Loading
PM-Orchestrator reads:
- `STATE.md` - Current system state
- `DECISIONS.md` - Pending decisions
- `HANDOFFS.md` - Active handoffs
- Recent reports for context

### 2. Sub-PM Spawning
Using Task tool, PM-Orchestrator spawns sub-PMs **in parallel**:
```
Task(
  prompt: "You are PM-Intelligence. Run your daily check...",
  subagent_type: "generalPurpose"
)
```

Each sub-PM:
- Reads their AGENT.md for instructions
- Performs health checks
- Reviews their domain
- Returns structured report

### 3. Result Collection
PM-Orchestrator waits for all sub-PMs, collecting:
- Health status
- Issues found
- Recommendations
- Metrics
- Handoffs

### 4. Report Synthesis
PM-Orchestrator creates unified report:
- Executive summary
- Per-PM highlights
- Decisions needing approval
- Active handoffs
- Tomorrow's priorities

### 5. State Update
- Report saved to `reports/YYYY-MM-DD/`
- STATE.md updated
- DECISIONS.md updated if new proposals
- HANDOFFS.md updated if new handoffs

---

## Report Schedule

### Recommended Daily Schedule

| Time (EST) | Command | Purpose |
|------------|---------|---------|
| 8:00 AM | `Run PM morning standup` | Start of day health, priorities |
| 12:00 PM | `Run PM midday check` | Progress update, catch issues |
| 8:00 PM | `Run PM evening summary` | Day summary, tomorrow planning |

### Adjusting Schedule

Run more frequently when:
- Major feature in development
- Production issues
- Approaching deadline

Run less frequently when:
- Stable period
- No active development
- Weekends/holidays

---

## Reading Reports

### Report Location

```
docs/pm-agents/reports/
├── 2026-02-05/
│   ├── 08-00-morning.md
│   ├── 12-00-midday.md
│   └── 20-00-evening.md
├── 2026-02-06/
│   └── ...
```

### Report Structure

```markdown
# PM Report - [Date] [Time]

## Status: 🟢/🟡/🔴

## Executive Summary
[2-3 sentences]

## PM Highlights
### PM-Intelligence
[Status, key findings]

### PM-Context
[Status, key findings]
...

## Decisions Needing Approval
[List from DECISIONS.md]

## Active Handoffs
[List from HANDOFFS.md]

## Tomorrow's Priorities
1. [Priority]
2. [Priority]
```

---

## Responding to Reports

### How to Approve Decisions

1. Open `DECISIONS.md`
2. Find the pending decision
3. Update `YOUR DECISION:` field
4. Add your notes
5. Save

Next PM run will pick up your response.

### How to Give Feedback

Options:
1. **Direct message:** "PM-Orchestrator, regarding [X]..."
2. **Update DECISIONS.md:** Add notes to pending items
3. **Create new request:** "PM-[X], please investigate [Y]"

---

## Troubleshooting

### PM Not Responding

1. Check if PM agent file exists
2. Check for errors in last run
3. Run: `Run PM-[Name] health check`

### Reports Not Saving

1. Check reports/ folder exists
2. Check file permissions
3. Look for errors in run output

### Stale Data

1. Run: `Run PM health check`
2. Verify STATE.md is updating
3. Check last run timestamp

### System Test

Run: `Run PM test standup`

This will:
1. Spawn each PM in test mode
2. Verify basic responses
3. Report any failures

---

## Advanced Usage

### Custom Investigations

```
"PM-Intelligence, investigate why RAG is returning irrelevant results for settlement statement queries"
```

### Cross-PM Tasks

```
"PM-Context and PM-Intelligence, coordinate on improving document chunking for legal documents"
```

### Research Requests

```
"PM-Growth, research competitor pricing for real estate AI tools and report findings"
```

### Sub-Agent Spawning

PMs can spawn their own sub-agents:
```
"PM-Intelligence, spawn a sub-agent to audit 50 AI conversations for quality"
```

---

## Maintenance

### Weekly
- Review resolved decisions
- Archive old reports (>30 days)
- Check PM backlog health

### Monthly
- Review PM effectiveness
- Update OWNERSHIP.md if needed
- Refine PM instructions based on learnings

### Quarterly
- Vision review
- PM scope adjustments
- OKR setting

---

*For technical details on the invocation skill, see `.claude/skills/pm-standup-runner/SKILL.md`*
