# Feature Ownership Map

> **Owned by:** PM-Orchestrator  
> **Last Updated:** 2026-02-05

This document maps every feature and system area to its owning PM. When in doubt about who owns something, check here.

---

## Ownership Matrix

### PM-Intelligence (The Brain)
*AI capabilities and intelligence layer*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| AI Chat System | `src/components/ai-chat/*`, `src/hooks/useAIChat.tsx` | Conversation flow, context |
| AI Chat Backend | `supabase/functions/ai-chat/*` | LLM calls, RAG retrieval |
| RAG Pipeline | `supabase/functions/search-documents/*` | Vector search, ranking |
| AI Agents | `src/pages/Agents.tsx`, `src/pages/AgentCreate.tsx` | Agent definitions, execution |
| Agent Execution | `supabase/functions/execute-agent/*` | Agent runtime |
| Prompt Engineering | System prompts, templates | Quality of AI responses |
| Model Selection | LLM configuration | Cost/quality tradeoffs |

---

### PM-Context (The Memory)
*Data storage, indexing, and organization*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| Documents | `src/components/documents/*`, `src/pages/Documents.tsx` | Upload, list, view |
| Document Indexing | `supabase/functions/index-document/*` | Text extraction, chunking |
| Document Metadata | `document_metadata` table | Structured extraction |
| Contacts CRM | `src/components/contacts/*`, `src/pages/Contacts.tsx` | Contact CRUD |
| Properties | `src/components/properties/*`, `src/pages/Properties.tsx` | Property CRUD |
| Data Import/Export | Import/export utilities | Data portability |
| Database Schema | Core tables: `documents`, `document_chunks`, `contacts`, `properties` | Data structure |

---

### PM-Transactions (The Navigator)
*Deal lifecycle and pipeline management*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| Pipeline/Kanban | `src/pages/Pipeline.tsx`, `src/components/pipeline/*` | Deal board |
| Deals | `src/components/deals/*` | Deal CRUD |
| Milestones | `deal_milestones` table, milestone UI | Tracking deadlines |
| Tasks | Task management system | Deal-related tasks |
| Stage Automation | Stage transition triggers | Auto-task creation |
| Deal Activities | `deal_activities` table | Activity logging |

---

### PM-Experience (The Artisan)
*UI/UX and user interface*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| Layout/Navigation | `src/components/layout/*` | Sidebar, header, routing |
| UI Components | `src/components/ui/*` | Shared components |
| Responsive Design | Tailwind breakpoints | Mobile responsiveness |
| Accessibility | a11y compliance | Screen readers, keyboard nav |
| Auth UI | `src/components/auth/*`, `src/pages/Login.tsx` | Login, signup flows |
| Settings UI | `src/pages/Settings.tsx`, `src/components/settings/*` | User preferences |
| Error States | Error boundaries, loading states | User feedback |
| Styling | `src/index.css`, Tailwind config | Design system |

---

### PM-Growth (The Cultivator)
*Business metrics and monetization*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| Billing | `src/pages/Billing.tsx` | Subscription management |
| Stripe Integration | `supabase/functions/create-checkout-session/*`, `stripe-webhook/*` | Payments |
| Pricing | Pricing page, tier logic | Plan definitions |
| Usage Tracking | `ai_usage`, `usage_records` tables | Limits enforcement |
| Onboarding | Onboarding flow | New user experience |
| Analytics | Usage analytics | Business metrics |
| Conversion | Trial, upgrade flows | Monetization |

---

### PM-Integration (The Bridge Builder)
*External connections and APIs*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| MLS/IDX | Future integration | Property data feeds |
| Email Sync | Future integration | Gmail, Outlook |
| Calendar | Future integration | Google, Outlook |
| API | `/api/v1/*` | Public API |
| Webhooks | Webhook infrastructure | Event notifications |
| OAuth | External service auth | Third-party connections |

---

### PM-Discovery (The Finder)
*Search and findability*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| Universal Search | Search bar, search results | Find anything |
| Search Ranking | Relevance algorithms | Result quality |
| Filters/Facets | Filter UI | Narrow results |
| Recent Items | Quick access | Recent activity |
| Search Analytics | Search metrics | Improvement data |

---

### PM-Communication (The Messenger)
*Messaging and notifications*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| Direct Messaging | `src/components/messaging/*` | Agent-client chat |
| Conversations | `conversations`, `messages` tables | Message storage |
| Notifications | Notification system | In-app alerts |
| Email Notifications | Email templates | Transactional email |
| Push Notifications | Future feature | Mobile push |
| Read Receipts | Presence, typing | Real-time indicators |

---

### PM-Infrastructure (The Foundation)
*Platform reliability and performance*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| CI/CD | `.github/workflows/*` | Deployment pipelines |
| Monitoring | Performance monitoring | Uptime, latency |
| Error Tracking | Error logging | Bug detection |
| Database Performance | Query optimization | Speed |
| Edge Functions | `supabase/functions/*` deployment | Function reliability |
| Cost Management | Cloud costs | Resource efficiency |

---

### PM-Security (The Guardian)
*Security and compliance*

| Feature/System | Files/Paths | Notes |
|----------------|-------------|-------|
| Authentication | `src/hooks/useAuth.tsx`, Supabase Auth | Login security |
| Authorization | RLS policies | Access control |
| RLS Policies | All table policies | Tenant isolation |
| Data Encryption | At-rest, in-transit | Protection |
| Compliance | GDPR, CCPA | Privacy regulations |
| Security Auditing | Audit logs | Access tracking |
| API Security | Rate limiting, auth | API protection |

---

## Shared Ownership (Multiple PMs)

Some areas require coordination:

| Area | Primary | Secondary | Notes |
|------|---------|-----------|-------|
| Chat UI | PM-Experience | PM-Intelligence | UI vs AI logic |
| Document Upload UI | PM-Experience | PM-Context | UI vs processing |
| Deal Documents | PM-Transactions | PM-Context | Workflow vs storage |
| AI Pricing | PM-Growth | PM-Intelligence | Business vs cost |
| Search UI | PM-Experience | PM-Discovery | UI vs ranking |
| Notification UI | PM-Experience | PM-Communication | UI vs delivery |

---

## Ownership Rules

### When ownership is unclear:

1. Check this document first
2. If not listed, ask PM-Orchestrator
3. PM-Orchestrator assigns ownership
4. Update this document

### When PMs disagree:

1. Each PM states their case
2. PM-Orchestrator mediates
3. Decision logged in DECISIONS.md
4. Ownership updated here if needed

### Adding new features:

1. Feature proposed by sub-PM
2. PM-Orchestrator assigns ownership
3. Add to this document before implementation

---

*Update this document whenever ownership changes or new features are added.*
