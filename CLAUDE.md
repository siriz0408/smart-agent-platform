# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Agent is a real estate AI assistant SaaS application. It provides AI-powered document analysis, CRM features (contacts, properties, deals), and multi-document chat capabilities for real estate professionals.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, shadcn/ui components, Tailwind CSS, React Query
- **Backend**: Supabase (PostgreSQL with pgvector, Auth, Edge Functions in Deno)
- **Payments**: Stripe integration

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

Multi-tenant PostgreSQL with pgvector. All tables use `tenant_id` for RLS isolation.

- **Core**: `tenants`, `profiles`, `user_roles`
- **CRM**: `contacts`, `contact_agents`, `properties`
- **Documents/AI**: `documents`, `document_chunks` (with vector embeddings), `document_metadata` (structured extraction), `ai_conversations`, `ai_messages`
- **Pipeline**: Deal and milestone tracking tables

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

See `.lovable/plan.md` for the document extraction enhancement plan.

---

## Documentation References

- **PRD**: [Smart_Agent_Platform_PRD_v2.md](./Smart_Agent_Platform_PRD_v2.md)
- **Task Board**: [TASK_BOARD.md](./TASK_BOARD.md)
- **Development Plan**: `.lovable/plan.md`

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

## Feature Development Plugin

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

## Compound Engineering Plugin

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

### Do Not
- Modify files in `node_modules/` or `.git/`
- Commit secrets or API keys
- Skip tests before marking task complete
- Make breaking changes without updating related components
- Ignore TypeScript errors
