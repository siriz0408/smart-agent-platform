# SMART AGENT

## AI-Powered Real Estate Platform

**Product Requirements Document**

Version 2.0 | January 2026

---

## Current Implementation Status

> **Last Updated:** January 28, 2026
> **Phase 1 MVP Completion:** ~95%

### Implementation Summary by Feature Area

| Area | Status | Completion | Notes |
|------|--------|------------|-------|
| **Authentication** | Complete | 100% | Email/password, session management, profile basics |
| **AI Chat** | Complete | 100% | Streaming, multi-turn conversations, persistence, usage limits |
| **Document RAG** | Complete | 100% | Multi-document Q&A, hybrid search, chunk browser |
| **Document Indexing** | Complete | 100% | Smart chunking, embeddings, extraction, AI summaries |
| **Billing/Stripe** | Complete | 100% | Checkout, customer portal, webhooks, plan enforcement |
| **Multi-tenancy** | Complete | 100% | RLS policies, tenant isolation on all tables |
| **Pipeline/Deals** | Complete | 95% | Kanban board, milestones, stage transitions, notes; drag-drop via dropdown |
| **AI Agents Browse** | Complete | 100% | Browse, favorite, execution UI, full execution engine with streaming |
| **Contacts CRM** | Complete | 100% | List, create, search, detail view/edit, add to pipeline, delete |
| **Properties** | Complete | 100% | List, grid/list toggle, detail view/edit, photo gallery, delete |
| **Settings** | Complete | 95% | Profile edit, avatar upload, all notification toggles, dark mode |

### Deployment Blockers (All Resolved)

~~1. **Contact & Property Detail Views** - Users cannot view/edit individual records.~~
   - **RESOLVED:** `ContactDetailSheet.tsx` and `PropertyDetailSheet.tsx` implemented with full view/edit/delete functionality.

~~2. **Settings Page Non-Functional** - Switch toggles have no handlers.~~
   - **RESOLVED:** `useUserPreferences.ts` hook and `EditProfileDialog.tsx` created. All switches wired to localStorage persistence.

~~3. **Agent Execution Incomplete** - The `execute-agent` edge function lacks execution logic.~~
   - **RESOLVED:** Full execution engine with SSE streaming, context gathering, and usage tracking implemented.

---

## Undocumented Features (Discovered in Codebase)

The following features exist in the codebase but are not documented in the original PRD:

### 1. Deterministic Hash-Based Embeddings

Instead of using OpenAI's text-embedding API, the system uses a deterministic hash-based algorithm for generating 1536-dimensional embeddings. This approach:
- Eliminates external API costs for embeddings
- Ensures consistency between indexing and search
- Uses character n-grams (unigrams, bigrams, trigrams) and word-level features
- Applies L2 normalization for cosine similarity

**Location:** `/supabase/functions/index-document/index.ts` and `/supabase/functions/search-documents/index.ts`

### 2. Smart Chunking by Document Type

The indexing pipeline uses document-type-specific chunking strategies:

| Document Type | Chunking Strategy |
|---------------|-------------------|
| Settlement/Contract | Section-aware, preserves document structure |
| Inspection Reports | System-based (HVAC, Plumbing, Electrical, etc.) |
| Default | Paragraph-aware with 200-char overlap |

**Configuration:** 2000 characters per chunk, max 100 chunks per document, 200 character overlap.

### 3. Query Expansion for Real Estate Terms

The AI chat system expands search queries with real estate domain synonyms:
- "inspection" → inspector, condition, defect, issue, repair
- "price" → cost, value, amount, dollar, payment
- "closing" → settlement, escrow, transaction

**Location:** `/supabase/functions/ai-chat/index.ts`

### 4. Hybrid Search (Vector + Keyword)

Document retrieval combines two search strategies:
1. **Full-text search** using PostgreSQL's FTS with English stemming
2. **ILIKE keyword fallback** when FTS returns insufficient results

Results are merged and ranked by text_rank score.

**RPC Function:** `search_documents_hybrid()`

### 5. Chunk Neighbors Retrieval

For context continuity, the system retrieves neighboring chunks (chunk_index ± 1) when a match is found, ensuring the LLM has surrounding context.

**RPC Function:** `get_chunk_neighbors()`

### 6. Document Indexing Progress Jobs

A dedicated table tracks indexing progress with batch processing:
- `document_indexing_jobs`: status, progress %, total_chunks, indexed_chunks, current_batch, total_batches
- Supports retry on failure
- Progress bars displayed in UI

### 7. AI Model: Lovable Gateway

The system uses the Lovable AI Gateway instead of direct OpenAI calls:
- **Endpoint:** `https://api.anthropic.com/v1/chat/completions`
- **Model:** `google/gemini-3-flash-preview`
- **Auth:** `ANTHROPIC_API_KEY` environment variable

---

## 1. Executive Summary

### 1.1 Vision Statement

Smart Agent is an AI-first platform designed to revolutionize real estate transactions by providing agents, buyers, and sellers with intelligent tools that automate routine tasks, surface actionable insights, and streamline the entire buying/selling process. Unlike legacy CRMs that bolt on AI features as afterthoughts, Smart Agent is built from the ground up with AI at its core.

### 1.2 Problem Statement

Real estate professionals face significant challenges in today's market:

- **Fragmented Tools:** Agents juggle 5-10+ disconnected systems for CRM, documents, marketing, and communication
- **Manual Document Processing:** Contracts, disclosures, and inspections require hours of manual review
- **Data Ownership Concerns:** Recent industry consolidation (e.g., Zillow acquiring Follow Up Boss) raises concerns about data privacy and competitive use of agent data
- **Limited AI Capabilities:** Existing solutions offer basic automation but lack true AI intelligence
- **Poor Client Experience:** Buyers and sellers lack self-service tools and real-time visibility into transactions

### 1.3 Solution Overview

Smart Agent delivers a unified platform combining:

- **AI Chat Interface:** Conversational AI trained as a real estate expert, capable of document Q&A, market analysis, and task automation
- **Document Intelligence:** NotebookLM-style document indexing with Glean-like enterprise search across all uploaded content
- **Full CRM:** Pipeline management for both buyer and seller transactions with AI-suggested next actions
- **Client Portals:** Dedicated buyer and seller experiences with property search, agent matching, and transaction tracking
- **AI Agent Marketplace:** Pre-built and custom autonomous agents for specialized tasks like listing creation, offer analysis, and follow-up automation
- **Data Ownership Guarantee:** Clear ToS ensuring users own their data with full export and deletion rights

### 1.4 Target Market

**Primary:** Real estate agents and small teams (1-10 agents) seeking modern, AI-powered tools

**Secondary:** Buyers and sellers who can access the platform independently or through agent invitation

**Future:** Large brokerages requiring white-label enterprise solutions

### 1.5 Market Opportunity

- AI in Real Estate Market: $2.9B (2024) growing to $41.5B by 2033 (30.5% CAGR)
- 75% of U.S. brokerages now using AI tools
- $34B in efficiency gains projected by 2030 (Morgan Stanley)
- Real Estate SaaS market: $4.25B (2021) to $13.29B (2029)
- 61% of real estate companies still rely on legacy systems

---

## 2. User Roles & Personas

### 2.1 Role Hierarchy

Users can hold multiple profiles simultaneously (e.g., an agent who is also selling their own home).

| Role | Description | Primary Use Cases | Access Level |
|------|-------------|-------------------|--------------|
| **Super Admin** | Platform operators | System config, global analytics, tenant management | Full system access |
| **Admin** | Brokerage/team administrators | Team mgmt, billing, reports | Tenant-wide access |
| **Agent** | Licensed real estate professionals | Full CRM, AI, docs, client mgmt | Own data + assigned clients |
| **Buyer** | Home buyers (invited or independent) | Property search, AI help, agent matching | Own data + shared docs |
| **Seller** | Property sellers (invited or independent) | Listing mgmt, offers, AI insights | Own data + shared docs |

### 2.2 Agent Capabilities (Full Feature Set)

#### 2.2.1 CRM & Pipeline Management
- Full contact management with custom fields and tags
- Separate buyer and seller pipelines with customizable stages
- Deal tracking with milestone automation and deadline alerts
- Task management with AI-suggested next actions
- Activity logging and complete communication history
- Team assignment and referral tracking between agents

#### 2.2.2 AI Chat & Assistance
- Conversational interface trained as real estate expert
- Document Q&A across all indexed content
- Market analysis and comparable property insights
- Automated MLS posting: address input triggers AI to find comps, analyze, and create listing
- Social media campaign generation
- Blog and marketing content creation
- Automated client messaging and follow-ups

#### 2.2.3 Document Intelligence
- Upload and index: contracts, agreements, amendments, disclosures
- Upload and index: inspection reports, appraisals, title documents
- Upload and index: marketing materials, photos, flyers
- Upload city/state-specific laws and regulations for AI context
- Create projects/folders to organize documents (NotebookLM-style)
- Chat with indexed documents using RAG
- Cross-document semantic search (Glean-style)
- AI analysis with recommendations AND summaries (with appropriate disclaimers)
- Document sharing with buyers/sellers (documents become part of their context)

#### 2.2.4 Property & Client Matching
- AI-powered property/seller matching engine
- Multi-property portfolio overview with AI insights
- Regular automated updates to clients
- Direct messaging with clients through platform

### 2.3 Buyer Capabilities
- NLP-powered property search (e.g., '3 bed house with pool under $500k near good schools')
- Save properties and create subscriptions for new matches
- Loan qualification assistance and mortgage estimates
- Agent matching and request system (can sign up independently)
- Direct messaging with assigned agent(s)
- AI contract review assistance (with legal disclaimers)
- Market analysis and neighborhood insights
- Offer strategy recommendations from AI
- Property comparisons and affordability calculators

### 2.4 Seller Capabilities
- List properties with AI-assisted descriptions
- Market evaluations and pricing suggestions (CMA-style)
- Property comparisons with similar listings
- AI insights on market timing and pricing strategy
- Direct messaging with assigned agent(s)
- Multiple offer analysis with AI recommendations
- Profile preferences to customize AI interactions
- Agent matching and request system (can sign up independently)

---

## 3. Subscription & Billing Model

### 3.1 Pricing Tiers

| Tier | Monthly | Annual | Users | Key Features |
|------|---------|--------|-------|--------------|
| **Free** | $0 | $0 | 1 | Limited AI (25 queries/mo), 5 contacts, no doc upload, basic search |
| **Starter** | $29 | $24/mo | 1 agent | 100 AI queries/mo, 50 doc uploads, basic CRM, standard support |
| **Professional** | $79 | $66/mo | 1-3 agents | 500 AI queries/mo, unlimited docs, full CRM, doc indexing, MLS (when available) |
| **Team** | $199 | $166/mo | 4-10 agents | 2000 AI queries/mo, 3 pre-built agents, team features, priority support |
| **Brokerage** | $499 | $416/mo | 10-30 agents | Unlimited AI, all agents, white-label option, API access, dedicated support |

### 3.2 Add-Ons (Available on All Paid Tiers)
- **Additional Agent Seats:** $29-49/user/month (varies by tier)
- **AI Query Packs:** $10 for 100 additional queries
- **Individual AI Agents:** $19-49/month each
- **Document Analysis Premium:** $29/month (advanced contract analysis)
- **MLS Integration:** $49/month (when available)
- **Additional Storage:** $10/100GB/month

### 3.3 Free Tier Strategy

Both agents AND buyers/sellers can access free tiers with carefully planned limitations:

#### 3.3.1 Agent Free Tier Limits
- 25 AI queries per month
- 5 active contacts in CRM
- No document upload/indexing
- Basic property search only
- Smart Agent branding on all shared content
- No AI agents access

#### 3.3.2 Buyer/Seller Free Tier Limits
- 10 AI queries per month
- 3 saved properties maximum
- Basic property search
- Agent matching requests limited to 2 per month
- No document analysis
- Standard email notifications only

### 3.4 Trial & Upgrade Flow

#### 3.4.1 Trial Mechanics
Users can start a 7 or 14-day trial of any paid tier:
- Credit card required at trial start (Stripe setup intent)
- Full access to selected tier features during trial
- Clear countdown in UI showing days remaining
- Automated charge at end of trial unless cancelled
- Can cancel anytime during trial with no charge
- Can upgrade mid-trial (prorated billing)

#### 3.4.2 Upgrade/Downgrade Flow
- Upgrade: Immediate access, prorated charge for remaining period
- Downgrade: Changes take effect at next billing cycle
- Data preserved on downgrade but access restricted
- 7-day grace period for failed payments before downgrade

### 3.5 Subscription Management Architecture

#### 3.5.1 Stripe Integration
- Stripe Billing for all subscription management
- Stripe Checkout for initial signup and upgrades
- Stripe Customer Portal for self-service billing management
- Stripe Connect for Agent Marketplace payouts (future)
- Metered billing for AI query overages

#### 3.5.2 Supabase Edge Functions for Webhooks
Edge functions handle Stripe webhooks to update user permissions in real-time:
- customer.subscription.created - Initialize subscription record
- customer.subscription.updated - Update tier, handle upgrades/downgrades
- customer.subscription.deleted - Handle cancellation, set to free tier
- invoice.payment_succeeded - Update payment status, reset usage counters
- invoice.payment_failed - Start grace period, send notifications
- customer.subscription.trial_will_end - Send reminder notifications

#### 3.5.3 Database Schema for Subscriptions
Key tables for subscription management:
- **subscriptions:** id, tenant_id, user_id, stripe_subscription_id, tier, status, current_period_start, current_period_end, trial_end, cancel_at_period_end
- **subscription_addons:** subscription_id, addon_type, stripe_subscription_item_id, quantity, active
- **usage_records:** user_id, tenant_id, period_start, period_end, ai_queries_used, ai_queries_limit, docs_uploaded, storage_used_bytes
- **invoices:** id, tenant_id, stripe_invoice_id, amount_due, amount_paid, status, paid_at

#### 3.5.4 UI Components Required
- Tier badge in profile header showing current plan
- Usage dashboard showing queries/docs/storage used vs limits
- Upgrade prompts when approaching limits (80%, 100%)
- Trial countdown banner during trial period
- Billing history and invoice download
- Payment method management
- Plan comparison modal for upgrade decisions

### 3.6 Agent Marketplace Revenue Model
Flat listing fee for custom agents published to marketplace:
- $99 one-time fee to publish an agent
- Agent creators set their own monthly pricing ($19-199/mo range)
- Platform handles all billing and customer support
- No revenue share - creators keep 100% of subscription revenue
- Quality review required before publishing

---

## 4. Deal Orchestration & Pipeline Stages

### 4.1 Buyer Pipeline Stages

| Stage | Description | Key Actions | Typical Duration |
|-------|-------------|-------------|------------------|
| **Lead** | Initial contact, not yet qualified | Capture info, initial outreach | 1-7 days |
| **Active Buyer** | Pre-approved, actively searching | Verify loan docs, set preferences | Ongoing |
| **Property Search** | Viewing properties, open houses | Schedule tours, track feedback | 4-12 weeks avg |
| **Making Offers** | Submitting and negotiating offers | Draft offers, counteroffers | 1-4 weeks |
| **Under Contract** | Offer accepted, in escrow | Earnest money, inspections, appraisal | 30-60 days |
| **Closing** | Final walkthrough and closing | Final docs, wire transfer, keys | 1-3 days |
| **Closed Won** | Transaction complete | Commission, follow-up | N/A |
| **Closed Lost** | Deal fell through | Document reason, nurture | N/A |

### 4.2 Seller Pipeline Stages

| Stage | Description | Key Actions | Typical Duration |
|-------|-------------|-------------|------------------|
| **Prospect** | Considering selling | CMA presentation, pricing strategy | 1-4 weeks |
| **Pre-Listing** | Agreement signed, preparing | Property prep, disclosures, photos | 1-3 weeks |
| **Active Listing** | Live on MLS | Marketing, showings, open houses | 2-8 weeks avg |
| **Offer Review** | Evaluating offers | Multiple offer analysis, negotiate | 3-10 days |
| **Under Contract** | Buyer due diligence period | Inspections, repairs, appraisal | 30-60 days |
| **Closing Prep** | Final documents and coordination | Payoff auth, final walkthrough | 3-7 days |
| **Closed** | Transaction complete | Proceeds distributed, reviews | N/A |

### 4.3 Key Transaction Milestones

The system tracks these critical milestones with automated reminders and task generation:
- **Earnest Money Deposit:** 1-3% of sale price, due within 1-3 days of contract
- **Option/Inspection Period:** 7-10 days for buyer due diligence (can back out)
- **Home Inspection:** Professional inspection, typically within first week
- **Appraisal:** Lender-ordered property valuation, 1-2 weeks after contract
- **Title Search:** Verify clear ownership, identify liens
- **Closing Disclosure:** Must be provided 3 business days before closing
- **Final Walkthrough:** 24-48 hours before closing
- **Closing Day:** Wire transfer, document signing, key handover

### 4.4 Automation Triggers

AI-powered automation based on stage transitions:
- Stage change triggers task creation for next milestone
- Deadline approaching triggers reminder to agent and client
- Document upload triggers AI analysis and notification
- Missed deadline triggers escalation workflow
- Closing triggers post-close follow-up sequence

---

## 5. Data Model & Multi-Tenancy Architecture

### 5.1 Multi-Tenancy Strategy

Smart Agent uses a shared-schema multi-tenant architecture with PostgreSQL Row-Level Security (RLS) for data isolation. This approach balances cost-efficiency with enterprise-grade security.

#### 5.1.1 Design Principles
- **Shared Database:** Single Supabase instance with tenant_id column on all tenant-specific tables
- **RLS Enforcement:** Database-level security policies ensure tenants can only access their own data
- **Tenant Context:** Store tenant_id in user app_metadata (not user_metadata) for security
- **Index Optimization:** All tenant_id columns indexed for query performance
- **Defense in Depth:** Application-level checks in addition to database RLS

#### 5.1.2 RLS Policy Pattern

Standard RLS policy applied to all tenant-specific tables:

```sql
CREATE POLICY tenant_isolation ON [table_name]
FOR ALL TO authenticated
USING (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid))
WITH CHECK (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));
```

#### 5.1.3 Future Scaling Path
- **Phase 1 (MVP):** Shared schema with RLS for all customers
- **Phase 2 (Growth):** Schema-per-tenant option for premium enterprise customers
- **Phase 3 (Enterprise):** Dedicated database instances for white-label deployments

### 5.2 Core Entities

#### 5.2.1 Authentication & Users

**auth.users** (Supabase managed):
- id, email, phone, created_at, last_sign_in_at, app_metadata, user_metadata

**profiles:**
- id, user_id (FK auth.users), tenant_id, first_name, last_name, phone, avatar_url
- role (enum: super_admin, admin, agent, buyer, seller)
- subscription_tier (enum: free, starter, professional, team, brokerage)
- stripe_customer_id, onboarding_completed_at, created_at, updated_at

**tenants:**
- id, name, slug (unique), logo_url, settings_json
- subscription_tier, stripe_subscription_id
- created_at, updated_at

**user_roles** (supports multiple roles per user):
- id, user_id, role_type, tenant_id, permissions_json, created_at

#### 5.2.2 Contacts & Relationships

**contacts:**
- id, tenant_id, type (enum: buyer, seller, both), source
- first_name, last_name, email, phone, address_json
- tags (text[]), custom_fields_json, notes
- preferred_contact_method, created_at, updated_at

**contact_agents:**
- id, contact_id (FK), agent_id (FK profiles)
- assignment_type (enum: primary, team, referral)
- assigned_at, assigned_by

**referrals:**
- id, tenant_id, referring_agent_id, receiving_agent_id, contact_id
- referral_fee_percent, status (enum: pending, accepted, paid)
- deal_id, notes, created_at

#### 5.2.3 Deals & Transactions

**deals:**
- id, tenant_id, contact_id (FK), property_id (FK), agent_id (FK)
- deal_type (enum: buy, sell), stage (enum: see pipeline stages)
- expected_close_date, actual_close_date
- list_price, sale_price, commission_percent, commission_amount
- notes, metadata_json, created_at, updated_at

**deal_milestones:**
- id, deal_id (FK), milestone_type (enum: earnest_money, inspection, appraisal, etc.)
- due_date, completed_at, completed_by, notes

**deal_activities:**
- id, deal_id (FK), activity_type, description, created_by, created_at

**tasks:**
- id, tenant_id, deal_id (FK), assigned_to (FK profiles)
- title, description, due_date, priority, status
- ai_generated (boolean), created_at, completed_at

#### 5.2.4 Properties

**properties:**
- id, tenant_id, mls_id (nullable)
- address_line1, address_line2, city, state, zip, county
- latitude, longitude (for map display)
- property_type (enum: single_family, condo, townhouse, etc.)
- beds, baths, sqft, lot_size, year_built
- price, price_per_sqft, status (enum: active, pending, sold, etc.)
- listing_agent_id (FK), listing_date, sold_date
- description, features_json, created_at, updated_at

**property_images:**
- id, property_id (FK), storage_path, filename
- is_primary (boolean), display_order, alt_text
- created_at

**saved_properties:**
- id, user_id (FK), property_id (FK), notes, saved_at

**property_searches** (saved search criteria):
- id, user_id (FK), name, criteria_json
- notification_frequency (enum: instant, daily, weekly, none)
- last_notified_at, created_at

#### 5.2.5 Documents

**documents:**
- id, tenant_id, uploaded_by (FK profiles)
- storage_path, filename, mime_type, size_bytes
- doc_type (enum: contract, disclosure, inspection, appraisal, marketing, other)
- deal_id (FK, nullable), property_id (FK, nullable)
- indexing_status (enum: pending, processing, completed, failed)
- metadata_json, created_at

**document_chunks** (for RAG):
- id, document_id (FK), chunk_index
- content (text), embedding vector(1536)
- metadata_json (page number, section, etc.)

**document_projects:**
- id, tenant_id, name, description
- created_by (FK), created_at, updated_at

**document_project_members:**
- id, project_id (FK), document_id (FK), added_at

**document_shares:**
- id, document_id (FK), shared_with_user_id (FK)
- permission_level (enum: view, download, edit)
- shared_by, shared_at, expires_at

#### 5.2.6 Messaging

**conversations:**
- id, tenant_id, type (enum: direct, group, ai)
- subject (nullable), created_at, updated_at

**conversation_participants:**
- id, conversation_id (FK), user_id (FK)
- joined_at, last_read_at, muted (boolean)

**messages:**
- id, conversation_id (FK), sender_id (FK profiles)
- content, message_type (enum: text, file, system)
- file_url (nullable), sent_at, edited_at

#### 5.2.7 AI & Agents

**ai_conversations:**
- id, user_id (FK), tenant_id
- title, context_type (enum: general, document, property, deal)
- context_id (nullable - FK to relevant entity)
- model_used, created_at, updated_at

**ai_messages:**
- id, conversation_id (FK), role (enum: user, assistant, system)
- content, tokens_used, latency_ms
- sources_json (document chunks referenced), created_at

**ai_agents:**
- id, name, slug (unique), description
- system_prompt, tools_config_json
- is_public (boolean), is_premium (boolean)
- price_monthly (nullable), created_by (FK)
- category, rating_avg, rating_count
- created_at, updated_at

**user_agents** (agent subscriptions):
- id, user_id (FK), agent_id (FK)
- activated_at, expires_at, stripe_subscription_item_id

**ai_usage:**
- id, user_id, tenant_id
- period_start, period_end
- queries_used, queries_limit
- tokens_used, cost_usd

#### 5.2.8 Subscriptions & Billing

**subscriptions:**
- id, tenant_id, user_id
- stripe_subscription_id, stripe_customer_id
- tier (enum), status (enum: active, past_due, canceled, trialing)
- current_period_start, current_period_end
- trial_start, trial_end
- cancel_at_period_end (boolean), canceled_at
- created_at, updated_at

**subscription_addons:**
- id, subscription_id (FK)
- addon_type (enum: extra_seats, ai_queries, storage, agent)
- stripe_subscription_item_id, quantity, unit_price
- active (boolean), created_at

**invoices:**
- id, tenant_id, stripe_invoice_id
- amount_due, amount_paid, currency
- status (enum: draft, open, paid, void, uncollectible)
- invoice_pdf_url, hosted_invoice_url
- period_start, period_end, paid_at

#### 5.2.9 User Connections & Discovery

**user_connections:**
- id, requester_id (FK profiles), recipient_id (FK profiles)
- status (enum: pending, accepted, declined, blocked)
- requested_at, responded_at, created_at

**profile_settings:**
- id, user_id (FK profiles)
- is_discoverable (boolean, default true)
- allow_connection_requests (boolean, default true)
- allow_mentions (boolean, default true)
- updated_at

**Connection Flow:**
1. User searches profiles (only discoverable users returned)
2. Send connection request → status = pending
3. Recipient approves → status = accepted
4. Connected users can: message, @ mention in AI chat

**Platform Invite Logic (Updated):**
- Before sending invite, check if email exists in auth.users
- If exists → prompt to send connection request instead
- If not exists → send standard mail

**@ Mentions in AI Chat:**
- Connected users can be @mentioned in AI conversations
- Mentioned user's indexed profile data included in AI context
- Requires allow_mentions = true in profile_settings

---

## 6. AI Integration Architecture

### 6.1 Multi-Model Support

#### 6.1.1 Primary: OpenAI
- **GPT-4o:** Main chat interface, complex reasoning, document analysis
- **GPT-4o-mini:** Simple tasks, quick responses, cost optimization
- **text-embedding-3-small:** Document embeddings for RAG (1536 dimensions)

#### 6.1.2 Secondary: Anthropic Claude
- **Claude 3.5 Sonnet:** Fallback for complex document analysis, long-form content
- **Use cases:** Contract review requiring careful reasoning, nuanced recommendations

#### 6.1.3 Model Router Logic
- Default to GPT-4o for chat interactions
- Auto-select GPT-4o-mini for simple queries (cost optimization)
- Fallback to Claude on OpenAI rate limits or errors
- User preference override (premium feature)
- A/B testing infrastructure for model comparison

### 6.2 Document Intelligence Pipeline

#### 6.2.1 Ingestion Flow
1. Upload: User uploads document to Supabase Storage via signed URL
2. Trigger: Storage webhook triggers Edge Function
3. Extract: Parse document text (PDF.js for PDFs, mammoth for DOCX, etc.)
4. Chunk: Split into semantic chunks with overlap (500 tokens, 50 overlap)
5. Embed: Generate embeddings via OpenAI API (batch processing)
6. Store: Save chunks and embeddings to document_chunks table
7. Index: Update search indexes, mark document as indexed

#### 6.2.2 Retrieval (RAG)
1. Query: User asks question in AI chat
2. Embed: Generate query embedding
3. Search: Vector similarity search in pgvector (cosine distance)
4. Filter: Apply permission filtering (user can only see docs they have access to)
5. Rank: Re-rank results by relevance score
6. Context: Inject top-k chunks into LLM context
7. Generate: LLM generates response with citations

#### 6.2.3 Document Analysis Features
- **Summarization:** Extract key points from contracts and reports
- **Entity Extraction:** Pull dates, prices, names, addresses automatically
- **Risk Identification:** Flag unusual clauses or potential issues (with disclaimers)
- **Comparison:** Compare multiple documents for differences
- **Q&A:** Answer specific questions about document content

### 6.3 Pre-Built AI Agents

| Agent | Capabilities | Tier Availability |
|-------|--------------|-------------------|
| **Listing Writer** | Generate property descriptions from photos and basic info, optimize for SEO | Professional+ |
| **CMA Analyst** | Analyze comparable properties, suggest pricing strategies, generate reports | Professional+ |
| **Contract Reviewer** | Extract key terms, identify unusual clauses, flag potential issues | Team+ or Add-on |
| **Follow-Up Assistant** | Draft personalized follow-up messages based on CRM context | Professional+ |
| **Social Media Manager** | Create property posts, market updates, engagement content for multiple platforms | Team+ or Add-on |
| **Offer Analyzer** | Compare multiple offers, highlight strengths/weaknesses, rank recommendations | Team+ or Add-on |
| **Market Reporter** | Generate weekly/monthly market reports for geographic areas | Brokerage or Add-on |

### 6.4 AI Safety & Disclaimers

All AI features include appropriate safeguards:
- **Legal Disclaimer:** Clear messaging that AI is not a substitute for legal advice
- **Financial Disclaimer:** AI recommendations are informational, not financial advice
- **Human Review:** Encourage human review of all AI-generated content before use
- **Source Attribution:** Citations to source documents for all RAG responses
- **Confidence Indicators:** Show confidence levels for recommendations
- **Feedback Loop:** Allow users to rate AI responses for continuous improvement

---

## 7. Real-Time Features

### 7.1 Technology Stack
- **Supabase Realtime:** WebSocket-based real-time updates via PostgreSQL LISTEN/NOTIFY
- **Presence:** Track online users for messaging features
- **Broadcast:** Room-based messaging for group chats

### 7.2 Chat Messaging

#### 7.2.1 Features
- Instant message delivery between agents and clients
- Typing indicators
- Read receipts (optional, user can disable)
- Message threading for context
- File and image sharing
- Message reactions

#### 7.2.2 Implementation
- Subscribe to messages table changes filtered by conversation_id
- Optimistic UI updates for sent messages
- Presence tracking for online/offline status
- Push notifications for mobile (via Firebase Cloud Messaging)

### 7.3 Property Alerts & Notifications

#### 7.3.1 Alert Types
- **New Match:** Property matches saved search criteria
- **Price Change:** Saved property price updated
- **Status Change:** Property goes pending, back on market, sold
- **New Listing in Area:** New property in watched neighborhood

#### 7.3.2 Delivery Options
- In-app notifications (real-time via Supabase Realtime)
- Email digests (configurable: instant, daily, weekly)
- Push notifications (mobile app)
- SMS alerts (premium feature, using Twilio)

#### 7.3.3 Implementation
- Database triggers on property changes
- Edge Function to match against saved searches
- Queue notifications for batch processing
- Respect user notification preferences

### 7.4 Deal Updates
- Real-time stage change notifications
- Milestone reminder notifications
- Document upload notifications
- Task assignment notifications

---

## 8. MLS Integration Strategy

### 8.1 MVP Approach (Manual Entry)

For MVP, property data is managed manually to minimize complexity and cost:
- Agents manually enter property information
- AI assists with description generation from photos
- CSV/Excel import for bulk property uploads
- Public data from Zillow/Redfin APIs for market context (read-only, with attribution)

### 8.2 Phase 2: IDX Integration

Future MLS integration via IDX data feeds:
- **RESO Web API:** Modern RESTful API standard for MLS data
- **Bridge Interactive:** Third-party IDX provider for broader MLS coverage
- **Spark API:** Alternative IDX provider option
- **Pricing:** MLS integration as $49/month add-on

### 8.3 Phase 3: Direct Posting

Advanced integration allowing direct listing creation:
- Two-way sync with supported MLS systems
- AI-generated listing auto-submitted to MLS
- Status updates synced in real-time
- Compliance with MLS rules and regulations

### 8.4 Data Architecture for MLS

Schema designed to accommodate future MLS integration:
- mls_id field on properties for external reference
- mls_source field to track data origin
- last_mls_sync timestamp for sync management
- mls_raw_data JSON field for preserving original MLS data

---

## 9. Security & Compliance

### 9.1 Data Security
- **Encryption at Rest:** All data encrypted in Supabase (AES-256)
- **Encryption in Transit:** TLS 1.3 for all API communications
- **Row-Level Security:** Database-enforced tenant isolation
- **API Key Management:** Service keys never exposed to client, rotated regularly
- **Input Validation:** All inputs validated and sanitized
- **Rate Limiting:** API rate limits to prevent abuse

### 9.2 Data Ownership & Portability

Key differentiator addressing Follow Up Boss/Zillow concerns:
- **Full Ownership:** Users own their data - we are custodians, not owners
- **Export Anytime:** One-click export of all data in standard formats (CSV, JSON)
- **No Data Mining:** We do not use customer data for our own purposes or sell to third parties
- **Deletion Rights:** Complete data deletion upon request within 30 days
- **Transparent ToS:** Clear terms with no hidden data sharing clauses
- **Audit Trail:** Log of all data access and exports

### 9.3 Compliance Considerations
- **SOC 2 Type II:** Planned for enterprise tier (via Supabase compliance)
- **GDPR:** Data processing agreements, deletion workflows, consent management
- **CCPA:** California Consumer Privacy Act compliance
- **RESPA:** Real Estate Settlement Procedures Act awareness
- **Fair Housing:** AI trained to avoid discriminatory language or recommendations

### 9.4 Authentication & Authorization
- **Authentication:** Supabase Auth with email/password, magic link, OAuth (Google, Apple)
- **MFA:** Optional two-factor authentication
- **Session Management:** JWT tokens with configurable expiry
- **Role-Based Access:** Permissions enforced at database and application level

---

## 10. Development Phases

### 10.1 Phase 1: Foundation (MVP) - ~95% COMPLETE

Estimated: 8-12 sprints

**Sprint Goals (Status):**
- [x] Authentication system with Supabase Auth
- [x] Multi-tenant database schema with RLS
- [x] Basic user profiles (Agent, Buyer, Seller roles)
- [x] Simple property listing CRUD (complete - full view/edit/delete)
- [x] Basic property search (not NLP yet)
- [x] Basic AI chat interface (using Lovable AI Gateway)
- [x] Document upload and storage
- [x] Stripe subscription setup (Free + Starter tiers)
- [x] Basic UI shell with navigation

**Success Criteria (Status):**
- [x] Users can sign up, log in, manage profile (complete - EditProfileDialog with avatar)
- [x] Agents can add contacts and properties (complete - full detail views)
- [x] Users can chat with AI assistant
- [x] Users can upload documents
- [x] Subscription billing works end-to-end

### 10.2 Phase 2: Core Features - ~80% COMPLETE

Estimated: 10-14 sprints

**Sprint Goals (Status):**
- [x] Full CRM with buyer/seller pipelines (complete - contacts, properties, deals with detail views)
- [x] Deal tracking with milestones (complete - notes/activities support added)
- [x] Document indexing and semantic search (pgvector RAG)
- [x] Chat with documents feature
- [ ] Real-time messaging between agents and clients
- [ ] Property alerts and saved searches
- [x] Professional and Team tier implementation
- [ ] Trial period and upgrade flows
- [x] Usage tracking and limit enforcement

**Success Criteria:**
- [x] Agents can manage full deal lifecycle (complete - view/edit/notes)
- [x] AI can answer questions about uploaded documents
- [ ] Real-time chat works reliably
- [x] Subscription upgrades/downgrades work correctly

### 10.3 Phase 3: AI Enhancement - NOT STARTED

Estimated: 8-12 sprints

**Sprint Goals:**
- [ ] Pre-built AI agents (Listing Writer, CMA Analyst, etc.)
- [ ] Multi-model support with fallback
- [ ] Document analysis with recommendations
- [ ] NLP property search
- [ ] Agent marketplace foundation
- [ ] Add-on billing integration
- [ ] AI usage analytics

**Success Criteria:**
- [ ] AI agents provide measurable value
- [ ] Users actively use document analysis
- [ ] NLP search improves property discovery

### 10.4 Phase 4: Scale & Enterprise - NOT STARTED

Estimated: 12-16 sprints

**Sprint Goals:**
- [ ] Brokerage tier with team management
- [ ] White-label options
- [ ] MLS/IDX integration
- [ ] Agent referral tracking
- [ ] Advanced analytics and reporting
- [ ] API access for third-party integrations
- [ ] Custom agent creation and marketplace publishing
- [ ] Mobile app (React Native)

**Success Criteria:**
- [ ] Enterprise customers onboarded successfully
- [ ] MLS integration working for pilot markets
- [ ] Agent marketplace has active creators

---

## 11. Test Scenarios & Acceptance Criteria

### 11.1 Authentication & Authorization

**Test: User Registration**
- Given a new user visits the signup page
- When they enter valid email/password and submit
- Then account is created, verification email sent, user redirected to onboarding

**Test: Role-Based Access**
- Given a user with Buyer role
- When they attempt to access Agent-only features (CRM, etc.)
- Then access is denied with appropriate message

**Test: Multi-Tenant Isolation**
- Given two tenants A and B
- When user from tenant A queries contacts
- Then only tenant A contacts are returned (RLS enforced)

### 11.2 Subscription & Billing

**Test: Free Tier Limits**
- Given a user on Free tier with 25 AI query limit
- When they make their 26th query
- Then query is blocked, upgrade prompt displayed

**Test: Trial to Paid Conversion**
- Given a user on 14-day trial
- When trial expires and payment succeeds
- Then subscription activates, tier access continues

**Test: Failed Payment Handling**
- Given a user with failed payment
- When 7-day grace period expires
- Then user downgraded to Free tier, data preserved

### 11.3 AI Features

**Test: Document Q&A**
- Given an agent with uploaded contract
- When they ask 'What is the closing date?'
- Then AI extracts and returns correct date with citation

**Test: RAG Permission Filtering**
- Given agent A and agent B with separate documents
- When agent A searches documents
- Then only agent A's documents appear in results

**Test: Model Fallback**
- Given OpenAI API is rate limited
- When user sends chat message
- Then system falls back to Claude, response delivered

### 11.4 Real-Time Features

**Test: Message Delivery**
- Given two users in a conversation
- When user A sends a message
- Then user B receives it within 2 seconds

**Test: Property Alert**
- Given a buyer with saved search for '3 bed under $400k'
- When matching property is listed
- Then buyer receives notification per their preferences

### 11.5 Deal Workflow

**Test: Stage Transition**
- Given a deal in 'Making Offers' stage
- When agent moves to 'Under Contract'
- Then milestone tasks auto-created, notifications sent

**Test: Milestone Reminder**
- Given a milestone due in 24 hours
- When reminder job runs
- Then agent receives reminder notification

---

## 12. Appendices

### 12.1 Competitive Analysis Summary

| Competitor | Pricing | Strengths | Gaps (Our Opportunity) |
|------------|---------|-----------|------------------------|
| **Follow Up Boss** | $69-1000/mo | 250+ integrations, market leader | Data ownership concerns, limited AI |
| **Placester** | $59-599/mo | Website + CRM integrated | Basic AI, limited doc management |
| **Wise Agent** | $29-99/mo flat | Affordable, simple | No AI, dated interface |
| **kvCORE** | $499+/mo | Full suite for teams | Complex, expensive, limited AI |

### 12.2 Glossary

- **CMA:** Comparative Market Analysis - evaluation of similar properties to determine market value
- **IDX:** Internet Data Exchange - system for sharing MLS listings on websites
- **MLS:** Multiple Listing Service - database of property listings
- **RAG:** Retrieval Augmented Generation - AI technique combining search with generation
- **RLS:** Row-Level Security - database access control at the row level
- **pgvector:** PostgreSQL extension for vector similarity search
- **Earnest Money:** Deposit showing buyer's good faith (typically 1-3% of sale price)
- **Option Period:** Time buyer can back out of contract (typically 7-10 days)
- **Closing Disclosure:** Document detailing final loan terms and closing costs

### 12.3 API Endpoints Overview (Future Reference)

Core API structure for future development:
- /api/auth/* - Authentication endpoints (handled by Supabase)
- /api/profiles/* - User profile management
- /api/contacts/* - CRM contact operations
- /api/deals/* - Deal CRUD and stage management
- /api/properties/* - Property listing operations
- /api/documents/* - Document upload and management
- /api/ai/chat - AI chat completions
- /api/ai/search - Document semantic search
- /api/ai/agents/* - AI agent operations
- /api/subscriptions/* - Subscription management
- /api/webhooks/stripe - Stripe webhook handler

### 12.4 Environment Variables Reference

Required environment variables for deployment:
- NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous key
- SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server only)
- OPENAI_API_KEY - OpenAI API key
- ANTHROPIC_API_KEY - Anthropic API key (for Claude fallback)
- STRIPE_SECRET_KEY - Stripe secret key
- STRIPE_WEBHOOK_SECRET - Stripe webhook signing secret
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY - Stripe publishable key

---

*Smart Agent Platform PRD v2.0 | January 2026*
