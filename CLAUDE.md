# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Agent is a real estate AI assistant SaaS application. It provides AI-powered document analysis, CRM features (contacts, properties, deals), and multi-document chat capabilities for real estate professionals.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, shadcn/ui components, Tailwind CSS, React Query
- **Backend**: Supabase (PostgreSQL with pgvector, Auth, Edge Functions in Deno)
- **Payments**: Stripe integration

## Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run Vitest once
npm run test:watch   # Run Vitest in watch mode

# Run a single test file
npx vitest run src/test/example.test.ts

# Run tests matching a pattern
npx vitest run -t "pattern"
```

## Environment Variables

Frontend requires these in `.env` or `.env.local`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

Edge functions use secrets configured in Supabase:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected
- `LOVABLE_API_KEY` - For AI operations via Lovable gateway

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

AI operations use the Lovable AI Gateway (`ai.gateway.lovable.dev`) with `google/gemini-3-flash-preview` model.

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

## Development Guidelines

### Before Coding
1. Check current project state (`.lovable/plan.md`, `TASK_BOARD.md`)
2. Use brainstorming skill for new features
3. Check if relevant skills are installed

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
