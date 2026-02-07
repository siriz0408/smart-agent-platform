# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ Important: Product vs. Dev Tools

This project contains:
- **Product Features** (customer-facing) → Document in PRD
- **Dev Tools** (internal only) → Document here, NOT in PRD

**Dev Tools include:**
- PM Agent System (`docs/pm-agents/`)
- Feature Dev Plugin (`plugins/feature-dev/`)
- Compound Engineering Plugin (`plugins/compound-engineering/`)
- E2E tests (`tests/e2e/`)
- Testing infrastructure (Playwright, agent-browser CLI)

---

## Project Overview

**Smart Agent** is an AI-powered real estate platform that combines CRM, document intelligence, AI chat, and tool integrations to help real estate professionals manage their entire transaction lifecycle.

**Key Product Features:**
- Workspace multi-tenancy (brokerages, teams)
- Contact management with user linking
- Deal pipeline (buyer/seller transactions)
- AI chat with document Q&A
- Document intelligence (upload, index, semantic search)
- Tool integration platform (connect Gmail, Calendar, CRMs, etc.)
- Real-time messaging
- Stripe billing with subscription tiers

**Current Status:** Phase 1 MVP 95% complete, Phase 2 80% complete

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, shadcn/ui components, Tailwind CSS, React Query
- **Backend**: Supabase (PostgreSQL with pgvector, Auth, Edge Functions in Deno)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Payments**: Stripe integration
- **Mobile**: Capacitor (iOS/Android)

## Commands

### Development
```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run test         # Run Vitest once
npm run test:watch   # Run Vitest in watch mode

# Run a single test file
npx vitest run src/test/example.test.ts

# Run tests matching a pattern
npx vitest run -t "pattern"
```

### Deployment & Integration (ALWAYS RECOMMEND THESE)

**IMPORTANT**: When the user asks about deployment, status, or making changes, ALWAYS suggest these commands first:

```bash
# Check status of all services (Vercel, Supabase, GitHub)
npm run status

# Deploy to production (interactive with pre-checks)
npm run deploy

# Quick deploy to production
npm run deploy:prod

# Sync environment variables
npm run sync:env

# Database operations (interactive menu)
npm run db:push

# Database migrations
npm run db:migrate     # Push migrations to Supabase
npm run db:pull        # Pull schema from Supabase
npm run db:diff        # Generate migration from changes

# Deploy edge functions
npm run functions:deploy
```

### Standard Workflow (RECOMMEND THIS)

When user wants to make changes and deploy:

```bash
# 1. Make changes locally and test
npm run dev

# 2. Run quality checks
npm run lint
npm run typecheck
npm run test

# 3. Commit changes
git add .
git commit -m "description"

# 4. Deploy (auto-deploys to Vercel)
git push origin main
```

**The simplest deployment is just `git push origin main` - this auto-deploys everything!**

## Environment Variables

Frontend requires these in `.env` or `.env.local`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

Edge functions use secrets configured in Supabase:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected
- `ANTHROPIC_API_KEY` - For AI operations via Anthropic Claude API
- `STRIPE_SECRET_KEY` - For payment processing (optional)
- `RESEND_API_KEY` - For email notifications (optional)
- `RAPIDAPI_KEY` - For property data APIs (optional)

## Architecture

### Frontend (`/src`)

- **Pages** (`/src/pages`): Route components - Home (AI chat), Documents, DocumentChat, Properties, Contacts, Pipeline, Agents, Settings, Billing
- **Components** (`/src/components`): Feature components organized by domain (documents/, contacts/, deals/, etc.) plus shared ui/ components
- **Hooks** (`/src/hooks`): Custom hooks including useAuth, useDocumentIndexing, useAIChat, useSubscription
- **Entry**: `main.tsx` → `App.tsx` (QueryClientProvider → AuthProvider → routes)

### Backend (`/supabase/functions`)

Edge functions running on Deno (all have `verify_jwt = false` in config.toml):

- `index-document`: PDF/text extraction with pdfjs-serverless, document type detection, smart chunking, embeddings, AI summaries
- `ai-chat`: Multi-document RAG chat with query expansion
- `search-documents`: Vector similarity search
- `delete-document`: Document cleanup
- `create-checkout-session`, `create-customer-portal`, `stripe-webhook`: Stripe billing

### Database

Multi-workspace PostgreSQL with pgvector. Row-Level Security (RLS) enforces workspace isolation.

- **Core**: `workspaces`, `workspace_memberships`, `profiles`, `user_roles`, `user_preferences`
- **CRM**: `contacts` (with user_id linking), `contact_agents`, `properties`, `addresses`
- **Documents/AI**: `documents`, `document_chunks` (with vector embeddings), `document_metadata`, `document_projects`, `ai_conversations`, `ai_messages`, `ai_agents`
- **Pipeline**: `deals`, `deal_milestones`, `deal_activities`
- **Messaging**: `conversations`, `conversation_participants`, `messages`, `message_attachments`, `user_presence`, `typing_indicators`
- **Billing**: `subscriptions`, `invoices`, `usage_records`

**Key Architecture:**
- Users can belong to multiple workspaces
- Each workspace has its own subscription
- Workspace switching via `active_workspace_id`
- Contact-user linking: `contacts.user_id` → `profiles.user_id`

### Path Aliases

`@/*` maps to `./src/*` (tsconfig.json and vite.config.ts).

## Document Intelligence Pipeline

The `index-document` edge function processes real estate documents:

1. **Text extraction**: pdfjs-serverless for PDFs, TextDecoder for other formats
2. **Type detection**: Classifies as settlement/inspection/contract/appraisal/disclosure/general based on content keywords
3. **Smart chunking**: Preserves semantic boundaries (page breaks, sections, tables) rather than fixed-size splitting
4. **Embeddings**: Deterministic hash-based embeddings stored in `document_chunks`
5. **Structured extraction**: For financial/legal docs, extracts JSON data via AI (stored in `document_metadata`)
6. **AI summary**: Document-type-specific prompts generate summaries

AI operations use Anthropic's Claude API (`api.anthropic.com`) with `claude-sonnet-4-20250514` model. The backend handles streaming format conversion to ensure compatibility with frontend expectations.

---

## Documentation References

### Product Documentation
- **PRD (Product Requirements)**: [Smart_Agent_Platform_PRD_v3.md](./Smart_Agent_Platform_PRD_v3.md) ← **SINGLE SOURCE OF TRUTH**
- **Architecture (Technical Design)**: [ARCHITECTURE.md](./ARCHITECTURE.md) (deep technical details)
- **CLAUDE.md**: This file (developer context)

### Project Management
- **Task Board**: [TASK_BOARD.md](./TASK_BOARD.md)
- **Implementation Status**: See PRD v3.0 Section: "Current Implementation Status"

### Feature Documentation
- **Contact-User Linking**: [DOCUMENTATION_CONTACT_USER_LINKING.md](./DOCUMENTATION_CONTACT_USER_LINKING.md)
- **Testing Guide**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## Skills Reference

Project-specific skills are in `.claude/skills/smart-agent-*/SKILL.md`.

### Mobile & Responsive

| Skill | Use When |
|-------|----------|
| `smart-agent-responsive` | Tailwind responsive layouts ⭐ PRIMARY |
| `smart-agent-mobile-ios` | iOS Safari optimization, HIG principles |
| `smart-agent-mobile-android` | Material Design, Android Chrome |
| `smart-agent-mobile-design` | Mobile-first doctrine, MFRI assessment |
| `smart-agent-mobile-dev` | Cross-platform best practices, performance budgets |
| `smart-agent-mobile-testing` | Mobile test strategies (unit, E2E, performance) |
| `smart-agent-mobile-debugging` | Debugging mobile issues (DevTools, Safari Inspector) |

### Quality & Testing

| Skill | Use When |
|-------|----------|
| `smart-agent-qa-mobile` | QA strategy, device matrix, release gates |
| `smart-agent-audit` | squirrelscan website audits (SEO, performance, a11y) |

### UI/UX & Design

| Skill | Use When |
|-------|----------|
| `smart-agent-ui-ux` | Design system generation ⭐ PRIMARY |
| `smart-agent-copywriting` | Marketing copy, UX microcopy, CTAs |

### Development Process

| Skill | Use When |
|-------|----------|
| `smart-agent-brainstorming` | BEFORE features ⭐ USE FIRST |
| `smart-agent-writing-plans` | Implementation plans with task breakdowns |
| `smart-agent-executing-plans` | Plan execution with checkpoints |

### Tools & Integration

| Skill | Use When |
|-------|----------|
| `smart-agent-browser-automation` | agent-browser CLI for mobile testing |
| `smart-agent-mcp` | Building MCP servers for AI agent integration |
| `smart-agent-ai-chat` | AI chat pattern reference |
| `smart-agent-web-artifacts` | Web prototypes, landing pages |
| `smart-agent-social` | Social media content |

---

## Feature Development Plugin ⚙️ DEV TOOL

> **⚠️ INTERNAL DEV TOOL** - This is NOT a product feature. Do NOT document in PRD.

**Location**: `plugins/feature-dev/`

A comprehensive, structured workflow for planning and building new features with specialized agents for codebase exploration, architecture design, and quality review.

### When to Use `/feature-dev`

**✅ Use for:**
- New features that touch multiple files
- Features requiring architectural decisions
- Complex integrations with existing code
- Features where requirements are somewhat unclear

**❌ Don't use for:**
- Single-line bug fixes
- Trivial changes
- Well-defined, simple tasks
- Urgent hotfixes

### Command Usage

```bash
# Start guided feature development workflow
/feature-dev Add user authentication with OAuth

# Or simply
/feature-dev
```

### The 7-Phase Workflow

| Phase | Purpose | What Happens |
|-------|---------|--------------|
| **1. Discovery** | Understand requirements | Clarifies feature request, asks about problem and constraints |
| **2. Codebase Exploration** | Learn existing patterns | Launches parallel `code-explorer` agents to analyze similar features and architecture |
| **3. Clarifying Questions** | Resolve ambiguities | Identifies edge cases, integration points, error handling needs—**waits for answers** |
| **4. Architecture Design** | Design approaches | Launches `code-architect` agents with different focuses (minimal/clean/pragmatic), presents trade-offs |
| **5. Implementation** | Build the feature | Implements following chosen architecture and existing conventions |
| **6. Quality Review** | Ensure quality | Launches parallel `code-reviewer` agents for bugs, quality, and conventions |
| **7. Summary** | Document completion | Summarizes what was built, decisions made, files modified, next steps |

### Specialized Agents

The plugin includes three specialized agents (see `plugins/feature-dev/agents/`):

| Agent | Purpose | Model |
|-------|---------|-------|
| **code-explorer** | Traces execution paths, maps architecture, documents dependencies | Sonnet |
| **code-architect** | Designs feature architectures with implementation blueprints | Sonnet |
| **code-reviewer** | Reviews for bugs, quality issues, convention adherence | Sonnet |

### Manual Agent Invocation

You can invoke agents individually without the full workflow:

```bash
# Explore a feature
"Launch code-explorer to trace how authentication works"

# Design architecture
"Launch code-architect to design the caching layer"

# Review code
"Launch code-reviewer to check my recent changes"
```

### Best Practices

1. **Use the full workflow for complex features** - The 7 phases ensure thorough planning
2. **Answer clarifying questions thoughtfully** - Phase 3 prevents future confusion
3. **Choose architecture deliberately** - Phase 4 gives you options for a reason
4. **Don't skip code review** - Phase 6 catches issues before they reach production
5. **Read the suggested files** - Phase 2 identifies key files—read them to understand context

### Integration with Existing Workflow

**Recommended workflow for new features:**

```bash
# 1. Use feature-dev for planning and architecture
/feature-dev Add real-time messaging feature

# 2. Follow the 7 phases (the plugin guides you)

# 3. After implementation, run quality checks
npm run lint
npm run typecheck
npm run test

# 4. Deploy
git add .
git commit -m "feat: add real-time messaging"
git push origin main
```

See [`plugins/feature-dev/README.md`](./plugins/feature-dev/README.md) for complete documentation.

---

## Compound Engineering Plugin ⚙️ DEV TOOL

> **⚠️ INTERNAL DEV TOOL** - This is NOT a product feature. Do NOT document in PRD.

**Location**: `plugins/compound-engineering/`

AI-powered development tools from Every Inc. that get smarter with every use. Philosophy: **Each unit of engineering work should make subsequent units easier—not harder.**

### Core Workflow

```
Plan → Work → Review → Compound → Repeat
```

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/workflows:brainstorm` | Explore requirements and approaches | Before planning features |
| `/workflows:plan` | Turn ideas into detailed implementation plans | Planning phase |
| `/workflows:work` | Execute plans with worktrees and task tracking | Implementation phase |
| `/workflows:review` | Multi-agent code review before merging | Before merging PRs |
| `/workflows:compound` | Document learnings to make future work easier | After completing work |

### Components Overview

| Component | Count | Description |
|-----------|-------|-------------|
| **Agents** | 29 | Specialized reviewers, researchers, designers |
| **Commands** | 24 | Workflow automation and utilities |
| **Skills** | 16 | Reusable expertise modules |
| **MCP Servers** | 1 | Context7 for framework docs |

### Key Agents by Category

#### Review Agents (15)
| Agent | Use When |
|-------|----------|
| `kieran-typescript-reviewer` | Reviewing TypeScript/React code ⭐ RELEVANT |
| `security-sentinel` | Security audits and vulnerability checks |
| `performance-oracle` | Performance analysis and optimization |
| `pattern-recognition-specialist` | Analyzing patterns and anti-patterns |
| `architecture-strategist` | Architectural decisions and compliance |
| `code-simplicity-reviewer` | Final pass for simplicity/minimalism |
| `agent-native-reviewer` | Verify features are agent-native |
| `data-integrity-guardian` | Database migrations and data integrity ⭐ RELEVANT (Supabase) |
| `deployment-verification-agent` | Go/No-Go deployment checklists |

#### Research Agents (5)
| Agent | Use When |
|-------|----------|
| `best-practices-researcher` | Gathering external best practices |
| `framework-docs-researcher` | Researching framework documentation ⭐ RELEVANT (React, Supabase) |
| `git-history-analyzer` | Analyzing code evolution |
| `learnings-researcher` | Searching past solutions |
| `repo-research-analyst` | Understanding repository conventions |

#### Design Agents (3)
| Agent | Use When |
|-------|----------|
| `design-implementation-reviewer` | Verifying UI matches designs |
| `design-iterator` | Iteratively refining UI |
| `figma-design-sync` | Syncing with Figma designs |

### Useful Commands

#### Workflow Commands
```bash
# Full workflow
/workflows:brainstorm    # Explore approaches
/workflows:plan          # Create implementation plan
/workflows:work          # Execute with task tracking
/workflows:review        # Multi-agent code review
/workflows:compound      # Document learnings

# Utility
/deepen-plan            # Enhance plans with research agents
/triage                 # Prioritize issues
/changelog              # Create engaging changelogs
```

#### Testing & Quality
```bash
/reproduce-bug          # Reproduce bugs systematically
/test-browser           # Run browser tests on PR-affected pages
/resolve_parallel       # Resolve TODO comments in parallel
/resolve_pr_parallel    # Resolve PR comments in parallel
```

### Key Skills

| Skill | Description | Relevant to Project |
|-------|-------------|-------------------|
| `frontend-design` | Production-grade frontend interfaces | ✅ Yes |
| `git-worktree` | Manage parallel development branches | ✅ Yes |
| `file-todos` | File-based todo tracking | ✅ Yes |
| `agent-browser` | CLI-based browser automation | ✅ Yes |
| `compound-docs` | Capture solved problems as docs | ✅ Yes |
| `create-agent-skills` | Guide for creating Claude Code skills | ✅ Yes |

### Integration with Project Workflow

**Recommended workflow for this project:**

```bash
# 1. Brainstorm and plan
/workflows:brainstorm    # Explore feature requirements
/workflows:plan          # Create detailed plan

# 2. Work on feature
/workflows:work          # Execute with task tracking

# 3. Review before merging
/workflows:review        # Multi-agent review
# Relevant reviewers:
# - kieran-typescript-reviewer (React/TS code)
# - security-sentinel (Auth, API security)
# - performance-oracle (Performance)
# - data-integrity-guardian (Supabase schema)

# 4. Run quality checks
npm run lint
npm run typecheck
npm run test

# 5. Document learnings
/workflows:compound      # Capture patterns for future

# 6. Deploy
git push origin main
```

### MCP Server: Context7

Framework documentation lookup for 100+ frameworks including:
- **React** ⭐ (used in project)
- **TypeScript** ⭐ (used in project)
- **Supabase** ⭐ (used in project)
- Next.js, Vue, Rails, Django, Laravel, etc.

**Manual setup** (if not auto-loaded):

Add to `.claude/settings.json`:
```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

### Philosophy: Compound Engineering

Traditional development accumulates technical debt. Compound engineering inverts this:
- **80% planning and review, 20% execution**
- Plan thoroughly before writing code
- Review to catch issues and capture learnings
- Codify knowledge so it's reusable
- Keep quality high so future changes are easy

Each cycle compounds: plans inform future plans, reviews catch more issues, patterns get documented.

See [`plugins/compound-engineering/README.md`](./plugins/compound-engineering/README.md) for complete documentation.

---

## PM Agent System ⚙️ DEV TOOL

> **⚠️ INTERNAL DEV TOOL** - This is NOT a product feature. Do NOT document in PRD.

**Location**: `docs/pm-agents/`

An autonomous Product Manager agent system with 13 AI agents (1 orchestrator + 12 domain PMs) that manage product development, conduct R&D, run QA tests, and report 3x daily.

### Quick Start

```bash
# Run morning standup (all 13 PMs)
"Run PM morning standup"

# Run midday check (7 core PMs)
"Run PM midday check"

# Run evening summary
"Run PM evening summary"

# Quick health check
"Run PM health check"

# Single PM deep dive
"Run PM-Intelligence investigate [issue]"

# Development cycle (PMs actually implement features)
"Run PM development cycle"
```

### Agent Overview

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

### Key Files

| File | Purpose |
|------|---------|
| `docs/pm-agents/VISION.md` | Product vision (owned by PM-Orchestrator) |
| `docs/pm-agents/OWNERSHIP.md` | Feature-to-PM mapping |
| `docs/pm-agents/DECISIONS.md` | Human approval workflow |
| `docs/pm-agents/STATE.md` | Current system state (includes PM performance metrics) |
| `docs/pm-agents/RUN-PM.md` | Full invocation guide |
| `docs/pm-agents/SKILLS.md` | Skills reference for all PMs |
| `docs/pm-agents/WORK_STATUS.md` | Ready to Test / In Progress / Blocked tracker |
| `docs/pm-agents/PERFORMANCE.md` | PM performance metrics framework |
| `docs/pm-agents/CROSS_PM_AWARENESS.md` | Cross-PM coordination tracker |
| `docs/pm-agents/PRE_DEPLOYMENT_CHECKLIST.md` | Deployment readiness checklist |
| `docs/pm-agents/API_GUARDRAILS.md` | Light API cost guardrails |
| `docs/pm-agents/FEEDBACK.md` | Human feedback intake (cleared after each cycle) |
| `docs/pm-agents/HOW_TO_READ_REPORTS.md` | Guide for interpreting PM reports |
| `docs/pm-agents/agents/PM-*/AGENT.md` | Individual PM definitions |
| `docs/pm-agents/agents/PM-*/MEMORY.md` | PM memory files (learnings & context) |
| `smart-agent-roadmap.html` | Product roadmap with feedback system & cycle recaps |

### Enhanced Features (2026-02-07)

**Enhanced Reporting:**
- Clear distinction between "🟢 Ready to Test", "🟡 In Progress", "🔴 Blocked"
- Feature completion percentages
- Progress tracking toward larger goals
- "What's Ready to Test" vs "What Still Needs Work" sections

**Memory System:**
- Each PM has a `MEMORY.md` file that retains learnings across cycles
- Updated after each development cycle
- Includes: Key Learnings, Recent Work Context, Preferences & Patterns

**Cross-PM Coordination:**
- `CROSS_PM_AWARENESS.md` tracks active work across all PMs
- Reduces silos by sharing context
- Weekly cross-PM sync facilitated by PM-Orchestrator

**Development Method Selection:**
- PMs have discretion: `/feature-dev` for big features, `smart-agent-brainstorming` for small updates
- Decision framework based on complexity (3+ files, architectural impact)
- Pre-work validation: Vision alignment, API cost estimate, big picture context

**Pre-Deployment Checklist:**
- Complementary to feature-dev plugin
- Integration checks, user impact assessment, cross-PM impact
- Ensures deployment readiness

**Roadmap Integration:**
- `smart-agent-roadmap.html` includes:
  - **Feedback & Tasks tab**: Submit strategic feedback, bug reports, task delegation, research assignments, feature requests, decision responses, testing feedback (with image attachments)
  - **Cycle Recaps tab**: Detailed cycle summaries with progress toward goals, ready to test items, bugs/issues, considerations
- PM-Orchestrator reads feedback before each cycle and updates roadmap after each cycle

**Performance Tracking:**
- `PERFORMANCE.md` tracks: Completion Rate, Quality Score, Velocity, Vision Alignment, API Costs, Method Selection, Blocked Time
- Updated weekly by PM-Orchestrator

### Run Tiers

| Tier | Command | PMs | When |
|------|---------|-----|------|
| Full | "Run PM morning standup" | All 13 | 8am, 8pm EST |
| Core | "Run PM midday check" | 7 | 12pm EST |
| Quick | "Run PM health check" | 1 | Quick status |
| Single | "Run PM-[Name] deep dive" | 1 | Investigation |
| Development | "Run PM development cycle" | All 12 | Feature implementation |

### Human Workflow

1. **Review Reports**: Check `docs/pm-agents/reports/YYYY-MM-DD/` or `smart-agent-roadmap.html` → Cycle Recaps tab
2. **Read Reports Guide**: See `docs/pm-agents/HOW_TO_READ_REPORTS.md` for interpreting status indicators
3. **Provide Feedback**: Use `smart-agent-roadmap.html` → Feedback & Tasks tab (submit feedback with images)
4. **Decisions Needed**: Review `docs/pm-agents/DECISIONS.md` and respond via roadmap feedback
5. **Track Work Status**: Check `docs/pm-agents/WORK_STATUS.md` for what's ready to test vs in progress
6. **Review Performance**: Check `docs/pm-agents/PERFORMANCE.md` for PM effectiveness metrics

See [`docs/pm-agents/RUN-PM.md`](./docs/pm-agents/RUN-PM.md) for complete documentation.

### Autonomous Execution

The PM agents can run **fully autonomously** via the Python orchestrator, making actual code changes, running tests, and committing to git.

**Location**: `pm_core/`

#### Quick Start - Autonomous Mode

```bash
# 1. Install dependencies
pip3 install -r pm_core/requirements.txt

# 2. Set your API key
export ANTHROPIC_API_KEY='your-key-here'

# 3. Test run (single agent)
python3 -m pm_core.pm_orchestrator --test --agents PM-Intelligence

# 4. Full run (all agents)
python3 -m pm_core.pm_orchestrator

# 5. Schedule daily at 8am
./scripts/install-pm-orchestrator.sh
```

#### What Autonomous Agents Can Do

| Capability | How |
|------------|-----|
| Read files | `read_file` tool |
| Edit files | `edit_file` / `write_file` tools |
| Run commands | `run_command` tool (npm, git, etc.) |
| Run tests | `run_tests` tool |
| Git commit | `git_commit` tool |
| Create handoffs | `create_handoff` tool |

#### Safety Guardrails

| Guardrail | Limit |
|-----------|-------|
| Commits per agent/day | 10 |
| Total commits/day | 50 |
| Forbidden paths | `.env`, secrets, `node_modules/` |
| Branch isolation | All work on `pm-agents/YYYY-MM-DD` |
| Test requirement | Changes only commit if tests pass |

#### Daily Flow (Enhanced)

```
8:00 AM - launchd triggers orchestrator
    │
    ├─ Read roadmap HTML (`smart-agent-roadmap.html`)
    │   └─ Process submitted feedback (if any)
    │   └─ Write to FEEDBACK.md, process, clear
    │
    ├─ Create branch: pm-agents/2026-02-05
    ├─ Run PM-Intelligence
    │   ├─ Read MEMORY.md for context
    │   ├─ Check CROSS_PM_AWARENESS.md
    │   ├─ Pre-work validation (vision, API cost, context)
    │   ├─ Execute task from BACKLOG.md
    │   ├─ Update MEMORY.md with learnings
    │   └─ Commits changes
    ├─ Run PM-Experience
    │   ├─ Read MEMORY.md for context
    │   ├─ Check CROSS_PM_AWARENESS.md
    │   ├─ Pre-work validation
    │   ├─ Execute task from BACKLOG.md
    │   ├─ Update MEMORY.md with learnings
    │   └─ Commits changes
    ├─ ... (all 12 domain PMs)
    │
    ├─ Verify backlog sync (all PMs updated BACKLOG.md)
    ├─ Verify memory updates (all PMs updated MEMORY.md)
    ├─ Run PM-QA post-cycle gate (browser tests)
    ├─ Generate daily report (with Ready to Test / In Progress sections)
    ├─ Update roadmap HTML (add cycle recap, update statuses)
    ├─ Update WORK_STATUS.md
    ├─ Update CROSS_PM_AWARENESS.md
    ├─ Save to ~/Desktop/PM-Report-YYYY-MM-DD.md
    └─ Update STATE.md (with PM performance metrics)
```

#### Key Files

| File | Purpose |
|------|---------|
| `pm_core/pm_orchestrator.py` | Main entry point |
| `pm_core/pm_agents.py` | Agent execution logic |
| `pm_core/pm_tools.py` | Tool definitions for Claude API |
| `pm_core/pm_config.py` | Configuration & safety |
| `scripts/com.smartagent.pm-orchestrator.plist` | launchd schedule |
| `scripts/install-pm-orchestrator.sh` | Installation script |

---

## Development Guidelines

### Before Coding

**Recommended workflow:**

1. **Check project state**: Review `.lovable/plan.md`, `TASK_BOARD.md`

2. **Choose your approach** based on task complexity:

   **Option A: Compound Engineering Workflow** (⭐ RECOMMENDED for production features)
   ```bash
   /workflows:brainstorm    # Explore requirements
   /workflows:plan          # Create detailed plan
   /workflows:work          # Execute with tracking
   /workflows:review        # Multi-agent review
   /workflows:compound      # Document learnings
   ```

   **Option B: Feature Development Plugin** (for architectural deep-dives)
   ```bash
   /feature-dev <feature description>
   # Guides through 7 phases: Discovery → Exploration → Questions →
   # Architecture → Implementation → Review → Summary
   ```

   **Option C: Simple brainstorming** (for simple features)
   - Use `smart-agent-brainstorming` skill

3. **Check if relevant skills/agents are needed**
   - TypeScript code? → `kieran-typescript-reviewer`
   - Database changes? → `data-integrity-guardian`
   - Security concerns? → `security-sentinel`
   - Performance critical? → `performance-oracle`

### Quality Gates
- Run `npm run lint` before committing
- Run `npm run test` after changes
- Update `.lovable/plan.md` after completing tasks
- Follow TypeScript strict mode
- Follow existing code patterns

### PM System Integration

When working with PM agents:
- **Check WORK_STATUS.md** to see what's ready to test vs in progress
- **Submit feedback** via `smart-agent-roadmap.html` → Feedback & Tasks tab
- **Review cycle recaps** in roadmap → Cycle Recaps tab
- **Check PERFORMANCE.md** for PM effectiveness metrics
- **Read HOW_TO_READ_REPORTS.md** to interpret PM reports correctly

### Do Not
- Modify files in `node_modules/` or `.git/`
- Commit secrets or API keys
- Skip tests before marking task complete
- Make breaking changes without updating related components
- Ignore TypeScript errors
