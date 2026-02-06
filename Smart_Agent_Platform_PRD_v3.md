# SMART AGENT
## AI-Powered Real Estate Platform

**Product Requirements Document**

Version 3.0 | February 2026

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | Product Team | Initial draft |
| 2.0 | Jan 2026 | Product Team | Phase 1 updates |
| 3.0 | Feb 2026 | Product Team | Current state alignment, workspace architecture, tool integrations |

---

## Current Implementation Status

> **Last Updated:** February 6, 2026
> **Phase 1 MVP:** 95% Complete | **Phase 2:** 80% Complete | **Phase 3:** 20% Complete

### Implementation Summary by Feature Area

| Area | Status | Completion | Notes |
|------|--------|------------|-------|
| **Authentication & Multi-Tenancy** | ✅ Complete | 100% | Email/password, workspace architecture, multi-workspace support |
| **AI Chat** | ✅ Complete | 100% | Streaming, multi-turn, document Q&A, usage limits |
| **Document Intelligence** | ✅ Complete | 100% | Upload, indexing, RAG, projects, semantic search |
| **Billing & Stripe** | ✅ Complete | 100% | Checkout, portal, webhooks, usage tracking |
| **Contacts CRM** | ✅ Complete | 100% | Full CRUD, contact-user linking, ownership management |
| **Properties** | ✅ Complete | 100% | List/grid views, detail views, saved searches, external properties |
| **Deal Pipeline** | ✅ Complete | 95% | Kanban board, milestones, stage transitions |
| **AI Agents** | 🚧 In Progress | 40% | Browse, favorite, execute; pre-built agents in development |
| **Settings & Preferences** | ✅ Complete | 95% | Profile, preferences, dark mode, notification controls |
| **Real-Time Messaging** | 🚧 In Progress | 60% | Backend complete, frontend UI in development |
| **Property Alerts** | 🚧 In Progress | 30% | Saved searches exist, automation pending |
| **Tool Integrations** | 🚧 In Progress | 20% | Framework ready, connectors in development |

### Phase Completion Status

**Phase 1 (MVP) - 95% Complete**
- ✅ Authentication & workspace management
- ✅ Core CRM (contacts, properties, deals)
- ✅ AI chat & document intelligence
- ✅ Billing & subscription management
- ⏳ Real-time messaging (frontend pending)

**Phase 2 (Core Features) - 80% Complete**
- ✅ Contact-user linking
- ✅ User preferences system
- ✅ Document projects
- ✅ Entity search
- ✅ Email campaigns
- ⏳ Property match alerts (automation pending)
- ⏳ NLP property search (planned)
- ⏳ Tool integrations (in development)

**Phase 3 (AI Enhancement) - 20% Complete**
- ✅ AI agent infrastructure
- ⏳ Pre-built agents (in development)
- ⏳ Multi-model AI support (planned)
- ⏳ Advanced document analysis (planned)

**Phase 4 (Scale & Enterprise) - 0% Complete**
- ⏳ MLS/IDX integration (planned)
- ⏳ Agent marketplace publishing (planned)
- ⏳ White-label options (planned)
- ⏳ Mobile app store releases (planned)

---

## 1. Executive Summary

### 1.1 Vision Statement

Smart Agent is an AI-first platform designed to revolutionize real estate transactions by providing agents, buyers, and sellers with intelligent tools that automate routine tasks, surface actionable insights, and streamline the entire buying/selling process. Unlike legacy CRMs that bolt on AI features as afterthoughts, Smart Agent is built from the ground up with AI at its core, with the ability to connect horizontally across all the tools real estate professionals use daily.

### 1.2 Problem Statement

Real estate professionals face significant challenges in today's market:

- **Fragmented Tools:** Agents juggle 5-10+ disconnected systems for CRM, documents, marketing, and communication
- **Manual Document Processing:** Contracts, disclosures, and inspections require hours of manual review
- **Data Ownership Concerns:** Recent industry consolidation (e.g., Zillow acquiring Follow Up Boss) raises concerns about data privacy and competitive use of agent data
- **Limited AI Capabilities:** Existing solutions offer basic automation but lack true AI intelligence and tool integration
- **Poor Client Experience:** Buyers and sellers lack self-service tools and real-time visibility into transactions
- **No Horizontal Integration:** AI cannot take actions across multiple platforms (Gmail, Calendar, CRM, etc.)

### 1.3 Solution Overview

Smart Agent delivers a unified platform combining:

- **AI Chat Interface:** Conversational AI trained as a real estate expert, capable of document Q&A, market analysis, and taking actions across connected tools
- **Document Intelligence:** Upload contracts, inspections, disclosures with automatic indexing, semantic search, and AI analysis
- **Full CRM:** Contact and deal management with AI-powered insights, contact-user linking, and collaborative features
- **Tool Integration Platform:** Connect external tools (Gmail, Google Calendar, Zoom, CRMs, etc.) so AI can take actions across platforms
- **Client Experiences:** Dedicated buyer and seller portals with property search, preferences management, and agent collaboration
- **AI Agent Marketplace:** Pre-built and custom autonomous agents that can execute multi-step workflows across connected tools
- **Data Ownership Guarantee:** Clear ToS ensuring users own their data with full export and deletion rights

### 1.4 Target Market

**Primary:** Real estate agents and small teams (1-10 agents) seeking modern, AI-powered tools

**Secondary:** Buyers and sellers who can access the platform independently or through agent invitation

**Tertiary:** Brokerages and teams (10-30+ agents) requiring workspace management and collaboration features

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

Users can belong to multiple workspaces and hold different roles in each workspace.

| Role | Description | Primary Use Cases | Access Level |
|------|-------------|-------------------|--------------|
| **Super Admin** | Platform operators | System config, global analytics, workspace management | Full system access |
| **Workspace Admin** | Brokerage/team administrators | Team mgmt, billing, workspace settings, reports | Workspace-wide access |
| **Agent** | Licensed real estate professionals | Full CRM, AI, docs, client mgmt, tool integrations | Own data + workspace resources |
| **Buyer** | Home buyers (invited or independent) | Property search, preferences, AI help, agent collaboration | Own data + shared resources |
| **Seller** | Property sellers (invited or independent) | Listing mgmt, preferences, AI insights, agent collaboration | Own data + shared resources |

**New in v3.0:** Workspace architecture allows users to belong to multiple brokerages/teams simultaneously, with seamless workspace switching.

### 2.2 Agent Capabilities (Full Feature Set)

#### 2.2.1 CRM & Contact Management

**Contact Management**
- Full contact CRUD with custom fields, tags, and rich notes
- Contact ownership: personal vs. workspace contacts
- Contact-user linking: Link CRM contacts to platform users (buyers/sellers with accounts)
- View user preferences: When contacts are linked to users, agents see their real-time search preferences (budget, beds, baths, areas, timeline)
- Multi-agent collaboration: Multiple agents can work with the same client

**Deal Pipeline**
- Separate buyer and seller pipelines with customizable stages
- Deal milestones with automatic deadline tracking
- Stage transition automation
- Activity logging and communication history
- Add deals directly from contact records

**Collaboration**
- Team assignment and role-based access
- Referral tracking between agents
- Shared workspace resources
- Private vs. workspace contact ownership

**New in v3.0:** Contact-user linking enables agents to see buyer/seller preferences in real-time, separate from agent CRM notes.

#### 2.2.2 AI Chat & Assistance

**Conversational AI**
- Chat interface trained as real estate expert
- Multi-turn conversations with context retention
- Streaming responses for immediate feedback
- Usage-based limits tied to subscription tier

**Document Q&A**
- Ask questions about uploaded documents
- Multi-document context (chat with all indexed content simultaneously)
- AI provides citations to source material
- Handles contracts, inspections, appraisals, disclosures

**Tool Integration & Actions** ⭐ NEW
- Connect external tools: Gmail, Google Calendar, Zoom, CRMs, etc.
- AI can take actions across connected platforms:
  - "Schedule a showing for this Friday" → Creates Google Calendar event
  - "Send Susan an email about the property" → Drafts and sends Gmail
  - "Check my calendar for next week" → Retrieves and summarizes availability
  - "Add this lead to my CRM" → Creates record in connected CRM
- Horizontal integration across all connected tools
- Action approval workflow for sensitive operations

**Content Creation** (Planned Phase 3)
- Automated MLS listing generation from property data
- Social media campaign generation
- Blog and marketing content creation
- Market analysis reports

#### 2.2.3 Document Intelligence

**Upload & Organization**
- Upload contracts, agreements, amendments, disclosures
- Upload inspection reports, appraisals, title documents
- Upload marketing materials, photos, flyers
- Upload city/state-specific laws and regulations for AI context
- Create projects/folders to organize documents (NotebookLM-style)

**AI Analysis**
- Automatic document indexing and semantic search
- Cross-document search (find information across all documents)
- AI summaries of key points
- Entity extraction (dates, prices, names, addresses)
- AI analysis with recommendations (with legal disclaimers)

**Sharing**
- Share documents with buyers/sellers
- Shared documents become part of recipient's AI context
- Permission-based access control

**Search Capabilities**
- Hybrid search: combines semantic (meaning-based) and keyword matching
- Query expansion: AI understands real estate terminology
- Chunk neighbors: retrieves surrounding context for better answers

#### 2.2.4 Property & Client Matching

**Property Management**
- Manual property entry with photo galleries
- Saved property searches
- Property comparison tools
- External property integration (future: Zillow, MLS feeds)

**Client Matching** (Phase 2-3)
- AI-powered property matching based on user preferences
- Multi-property portfolio overview with AI insights
- Automated property alerts to clients
- Direct messaging with clients through platform

### 2.3 Buyer Capabilities

**Property Search & Discovery** (Phase 2-3)
- NLP-powered search: "3 bed house with pool under $500k near good schools"
- Save properties and create match subscriptions
- Property comparison tools (side-by-side analysis)
- Affordability calculator with mortgage estimates

**Preferences Management**
- Set and update search preferences (price, beds, baths, areas, property types)
- Financial information (pre-approval status, budget, lender)
- Timeline and urgency indicators
- Preferred contact methods and availability
- Preferences automatically visible to linked agents

**Agent Collaboration**
- Agent matching: request agents or be invited by agents
- Direct messaging with assigned agent(s)
- View shared documents
- Track transaction progress

**AI Assistance** (Phase 2-3)
- AI contract review (with legal disclaimers)
- Market analysis and neighborhood insights (school ratings, crime stats, etc.)
- Offer strategy recommendations
- Property comparison analysis

**New in v3.0:** User preferences are user-controlled and separate from agent CRM notes. Agents see preferences read-only.

### 2.4 Seller Capabilities

**Listing Management** (Phase 2-3)
- List properties with AI-assisted descriptions
- Upload property photos and virtual tour links
- Track listing performance
- Manage showing schedules

**Market Insights**
- CMA (Comparative Market Analysis) with AI pricing suggestions
- Property comparisons with similar listings
- AI pricing strategy recommendations
- Market timing insights

**Agent Collaboration**
- Agent matching: request agents or be invited by agents
- Direct messaging with assigned agent(s)
- View shared documents (contracts, disclosures, offers)

**Offer Management** (Phase 2-3)
- Multiple offer analysis with AI rankings
- Offer comparison tools
- AI recommendations based on terms, not just price

---

## 3. Subscription & Billing Model

### 3.1 Pricing Tiers

| Tier | Monthly | Annual | Users | Key Features |
|------|---------|--------|-------|--------------|
| **Free** | $0 | $0 | 1 | Limited AI (25 queries/mo), 5 contacts, no doc upload, basic search |
| **Starter** | $29 | $24/mo | 1 agent | 100 AI queries/mo, 50 doc uploads, basic CRM, standard support |
| **Professional** | $79 | $66/mo | 1-3 agents | 500 AI queries/mo, unlimited docs, full CRM, tool integrations (3 connections) |
| **Team** | $199 | $166/mo | 4-10 agents | 2000 AI queries/mo, workspace features, unlimited tool connections, priority support |
| **Brokerage** | $499 | $416/mo | 10-30 agents | Unlimited AI, white-label options, API access, dedicated support |

### 3.2 Add-Ons (Available on Paid Tiers)

- **Additional Agent Seats:** $29-49/user/month (varies by tier)
- **AI Query Packs:** $10 for 100 additional queries
- **Individual AI Agents:** $19-49/month each (marketplace agents)
- **Document Analysis Premium:** $29/month (advanced contract analysis)
- **MLS Integration:** $49/month (when available)
- **Additional Tool Connections:** $10/month per connection (Professional tier)
- **Additional Storage:** $10/100GB/month

### 3.3 Free Tier Strategy

**Agent Free Tier Limits**
- 25 AI queries per month
- 5 active contacts in CRM
- No document upload/indexing
- Basic property search only
- Smart Agent branding on all shared content
- No AI agents access
- No tool integrations

**Buyer/Seller Free Tier Limits** (Phase 2-3)
- 10 AI queries per month
- 3 saved properties maximum
- Basic property search
- Agent matching requests limited to 2 per month
- No document analysis
- Standard email notifications only

### 3.4 Trial & Upgrade Flow

**Trial Mechanics**
- 14-day trial of any paid tier
- Credit card required at trial start
- Full access to selected tier features during trial
- Clear countdown in UI showing days remaining
- Automated charge at end of trial unless cancelled
- Can cancel anytime during trial with no charge
- Can upgrade mid-trial (prorated billing)

**Upgrade/Downgrade Flow**
- Upgrade: Immediate access, prorated charge for remaining period
- Downgrade: Changes take effect at next billing cycle
- Data preserved on downgrade but access restricted
- 7-day grace period for failed payments before downgrade

### 3.5 Workspace Billing Model ⭐ NEW

**Workspace-Based Subscriptions**
- Each workspace has its own subscription
- Users can belong to multiple workspaces
- Workspace admin manages billing for their workspace
- Agent seats count toward workspace subscription
- Usage (AI queries, storage) tracked per workspace

**Workspace Admin Controls**
- Invite/remove agents
- Upgrade/downgrade workspace tier
- Manage add-ons
- View workspace usage analytics
- Assign roles and permissions

---

## 4. Tool Integration Platform ⭐ NEW

### 4.1 Vision: Horizontal AI Integration

The future of AI is the ability to connect horizontally across all tools a professional uses. Smart Agent enables AI to not just provide information, but to **take actions** across connected platforms.

**Examples:**
- "Go look at my Google Calendar and schedule a showing for this Friday"
- "Send Susan an email about the 123 Main St property"
- "Check my Zillow leads and add new ones to my CRM"
- "Create a Zoom meeting for my client consultation next week"
- "Add this property to my Follow Up Boss pipeline"

### 4.2 Supported Tool Categories

**Communication**
- Gmail (send/draft emails, search inbox)
- Outlook (email integration)
- Zoom (schedule meetings, get meeting links)
- Slack (send messages, channel integration)

**Calendar & Scheduling**
- Google Calendar (view availability, create events, reschedule)
- Outlook Calendar
- Calendly (check availability, share booking links)

**CRM & Contact Management**
- Existing CRMs (Follow Up Boss, kvCORE, LionDesk, etc.)
- Import/export contacts
- Sync contact updates

**Property Data**
- Zillow (property search, price history, market data)
- MLS feeds (when available)
- Property APIs for market insights

**Marketing**
- Canva (create marketing materials)
- Mailchimp (email campaign integration)
- Social media platforms (scheduled posting)

**Document Management**
- Google Drive (store/retrieve documents)
- Dropbox (file sync)
- DocuSign (e-signature integration)

### 4.3 Integration Architecture

**Connector Framework**
- OAuth-based authentication for secure tool connections
- Extensible connector system (add new tools over time)
- Per-workspace connection limits (Professional: 3, Team: unlimited)
- Centralized connection management in Settings

**Action Approval Workflow**
- Sensitive actions require user approval (emails, calendar events, payments)
- View pending actions in Action Queue
- One-click approve/reject
- Configurable auto-approval for trusted actions

**Rate Limiting & Security**
- Per-tool rate limits to prevent abuse
- Connection audit logs
- Revocable permissions
- Encrypted credential storage

---

## 5. AI & Agent System

### 5.1 AI Model Strategy

**Current Implementation (Phase 1)**
- **Primary Model:** Anthropic Claude (claude-sonnet-4-20250514)
- All AI chat, document analysis, and content generation use Claude
- Streaming support for real-time responses
- Token usage tracking and limits

**Future Multi-Model Approach (Phase 3)**
- **Gemini:** Content creation (social posts, listing descriptions, marketing materials)
- **Perplexity:** Research and market analysis (neighborhood data, school ratings, market trends)
- **OpenAI:** Specific use cases requiring GPT-4 capabilities
- **Model Router:** Automatic selection based on task type and cost optimization
- **User Preference:** Premium users can override model selection

**Why Multi-Model**
- Different models excel at different tasks
- Cost optimization (use cheaper models for simple tasks)
- Redundancy and fallback capabilities
- Best-in-class performance for each use case

### 5.2 AI Agent System

**Pre-Built Agents** (Phase 2-3)
- **Listing Writer:** Generate property descriptions from photos and data, optimize for SEO
- **CMA Analyst:** Analyze comparable properties, suggest pricing, generate reports
- **Contract Reviewer:** Extract key terms, identify unusual clauses, flag potential issues (with disclaimers)
- **Follow-Up Assistant:** Draft personalized follow-up messages based on CRM context
- **Social Media Manager:** Create property posts, market updates, engagement content
- **Offer Analyzer:** Compare multiple offers, highlight strengths/weaknesses, rank by quality
- **Market Reporter:** Generate weekly/monthly market reports for geographic areas

**Agent Infrastructure (Phase 1 - Complete)**
- Browse and favorite agents in marketplace
- Execute agents with input parameters
- Real-time streaming execution results
- Usage tracking and limits
- Agent favorites per user

**Enhanced Agent Capabilities** ⭐ NEW (Phase 2-3)
- **Action-Taking Agents:** Agents can execute tasks across connected tools
  - Send emails, create calendar events, update CRMs, etc.
  - Multi-step workflows (e.g., "Find comps, create listing, post to MLS")
- **Tool Connector Integration:** Agents can be configured with specific tool connections
- **Autonomous Execution:** Event-triggered agents (e.g., "When new lead arrives, run Follow-Up Assistant")
- **Scheduled Agents:** Cron-based scheduling (e.g., "Run Market Reporter every Monday at 9am")
- **Custom Agents:** Users can build custom agents with instructions and tool connections (Phase 4)

### 5.3 AI Safety & Disclaimers

All AI features include appropriate safeguards:
- **Legal Disclaimer:** Clear messaging that AI is not a substitute for legal advice
- **Financial Disclaimer:** AI recommendations are informational, not financial advice
- **Human Review:** Encourage human review of all AI-generated content before use
- **Source Attribution:** Citations to source documents for all RAG responses
- **Confidence Indicators:** Show confidence levels for recommendations
- **Feedback Loop:** Allow users to rate AI responses for continuous improvement

---

## 6. Real-Time Features

### 6.1 Messaging System

**Status:** Phase 2 (Backend Complete, Frontend In Development)

**Features**
- Direct messaging between agents and clients
- Group conversations for team collaboration
- Typing indicators
- Read receipts (optional, user can disable)
- Message threading for context
- File and image sharing
- Message reactions

**Implementation**
- Real-time message delivery via Supabase Realtime
- Presence tracking (online/offline/away status)
- Push notifications for mobile (future)
- Message search and archive

### 6.2 Property Alerts & Notifications

**Status:** Phase 2 (Partial - Backend Ready, Automation Pending)

**Alert Types**
- **New Match:** Property matches saved search criteria
- **Price Change:** Saved property price updated
- **Status Change:** Property goes pending, back on market, sold
- **New Listing in Area:** New property in watched neighborhood

**Delivery Options**
- In-app notifications (real-time)
- Email digests (configurable: instant, daily, weekly)
- Push notifications (mobile app)
- SMS alerts (premium feature, future)

**Implementation**
- Saved searches stored with notification preferences
- Background job matches new properties against saved searches
- Notification delivery respects user preferences

### 6.3 Presence & Activity

**Features**
- Online/offline/away status
- Typing indicators in conversations
- "Last seen" timestamps
- Active users in workspace

---

## 7. Workspace Architecture ⭐ NEW

### 7.1 Multi-Workspace Model

**What Changed in v3.0**
- Users can belong to multiple workspaces (brokerages, teams)
- Seamless workspace switching from UI
- Each workspace has its own subscription, settings, and data
- Workspace-level role assignments (Admin, Agent)

**Use Cases**
- Agent works for multiple brokerages
- Agent has personal workspace + team workspace
- Team collaboration within brokerage
- White-label deployments for enterprise clients

### 7.2 Workspace Management

**Workspace Admin Capabilities**
- Create workspace and set branding
- Invite agents to workspace
- Manage workspace subscription and billing
- Assign roles and permissions
- View workspace-wide analytics
- Manage shared resources (documents, templates)

**Workspace Membership**
- Users invited via email
- Accept/decline workspace invitations
- Switch between workspaces via dropdown
- Leave workspace if no longer needed

**Data Isolation**
- Workspace data is completely isolated (RLS policies enforce)
- Users only see data from their active workspace
- Switching workspaces changes context and visible data

### 7.3 Contact Ownership Model

**Personal vs. Workspace Contacts**
- Agents can mark contacts as "personal" or "workspace"
- Personal contacts: Only visible to the agent who created them
- Workspace contacts: Visible to all agents in workspace (if workspace admin)
- Workspace admins can view all workspace contacts
- Ownership can be toggled (permission-based)

**Why This Matters**
- Agents maintain privacy for personal clients
- Team collaboration for workspace clients
- Prevents data loss when agent leaves brokerage

---

## 8. Deal Orchestration & Pipeline Stages

### 8.1 Buyer Pipeline Stages

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

### 8.2 Seller Pipeline Stages

| Stage | Description | Key Actions | Typical Duration |
|-------|-------------|-------------|------------------|
| **Prospect** | Considering selling | CMA presentation, pricing strategy | 1-4 weeks |
| **Pre-Listing** | Agreement signed, preparing | Property prep, disclosures, photos | 1-3 weeks |
| **Active Listing** | Live on MLS | Marketing, showings, open houses | 2-8 weeks avg |
| **Offer Review** | Evaluating offers | Multiple offer analysis, negotiate | 3-10 days |
| **Under Contract** | Buyer due diligence period | Inspections, repairs, appraisal | 30-60 days |
| **Closing Prep** | Final documents and coordination | Payoff auth, final walkthrough | 3-7 days |
| **Closed** | Transaction complete | Proceeds distributed, reviews | N/A |

### 8.3 Key Transaction Milestones

The system tracks critical milestones with automated reminders:
- **Earnest Money Deposit:** 1-3% of sale price, due within 1-3 days of contract
- **Option/Inspection Period:** 7-10 days for buyer due diligence
- **Home Inspection:** Professional inspection, typically within first week
- **Appraisal:** Lender-ordered property valuation, 1-2 weeks after contract
- **Title Search:** Verify clear ownership, identify liens
- **Closing Disclosure:** Must be provided 3 business days before closing
- **Final Walkthrough:** 24-48 hours before closing
- **Closing Day:** Wire transfer, document signing, key handover

---

## 9. MLS Integration Strategy (Phase 3-4)

### 9.1 Current Approach (Phase 1)

**Manual Entry**
- Agents manually enter property information
- CSV/Excel import for bulk uploads
- External property tracking (Zillow, public records)

**No MLS Dependency**
- Product works without MLS integration
- Agents can manage deals and clients independently

### 9.2 Future: IDX Integration (Phase 3)

**MLS Data Feeds**
- RESO Web API (modern RESTful API standard)
- Bridge Interactive (third-party IDX provider)
- Spark API (alternative IDX provider)
- Pricing: $49/month add-on

**Capabilities**
- Import MLS listings automatically
- Display MLS data in property search
- Compliance with MLS rules and attributions

### 9.3 Future: Direct Posting (Phase 4)

**Two-Way MLS Integration**
- Create listings in Smart Agent → Automatically post to MLS
- AI-generated listings submitted directly
- Status updates synced in real-time
- Compliance with MLS regulations

---

## 10. Agent Marketplace (Phase 4 Vision) ⭐ UPDATED

### 10.1 North Star Vision

A robust marketplace where users can discover, purchase, and publish AI agents.

**For Users:**
- Browse agent marketplace by category
- Read reviews and ratings
- Try agents before buying (trial runs)
- Subscribe to agents monthly OR pay per run

**For Creators:**
- Build custom agents with instructions and tool connectors
- Publish agents to marketplace
- Monetize: users pay subscription OR per-run
- Quality review process before publishing
- Creator dashboard with analytics and earnings

### 10.2 Revenue Models

**Option 1: Subscription Model**
- User pays $19-199/month to unlock agent
- Unlimited runs during subscription
- Creator receives 70-80% of subscription revenue

**Option 2: Pay-Per-Run Model**
- User pays $1-10 per agent execution
- Charged to credit card or account balance
- Creator receives 70-80% of per-run fee

**Hybrid Model** (Most Likely)
- Some agents are subscription-based (high frequency use)
- Some agents are pay-per-run (occasional use)
- Creator chooses pricing model when publishing

### 10.3 Marketplace Features

- Agent discovery by category and use case
- Ratings and reviews from users
- Featured agents curated by Smart Agent team
- Search and filtering
- Agent preview (see inputs/outputs before purchase)
- Free tier agents (platform-provided)

### 10.4 Quality & Safety

- Quality review before publishing (manual review of agent prompts)
- User reporting system for problematic agents
- Performance monitoring (success rate, error rate)
- Refund policy for non-functional agents
- Creator reputation scores

---

## 11. Security & Compliance

### 11.1 Data Security

- **Encryption at Rest:** All data encrypted in database
- **Encryption in Transit:** TLS 1.3 for all API communications
- **Row-Level Security:** Database-enforced workspace isolation
- **API Key Management:** Service keys never exposed to client, rotated regularly
- **Input Validation:** All inputs validated and sanitized
- **Rate Limiting:** API rate limits to prevent abuse

### 11.2 Data Ownership & Portability

**Key Differentiator vs. Competitors**
- **Full Ownership:** Users own their data - we are custodians, not owners
- **Export Anytime:** One-click export of all data in standard formats (CSV, JSON)
- **No Data Mining:** We do not use customer data for our own purposes or sell to third parties
- **Deletion Rights:** Complete data deletion upon request within 30 days
- **Transparent ToS:** Clear terms with no hidden data sharing clauses
- **Audit Trail:** Log of all data access and exports

### 11.3 Compliance Considerations

- **SOC 2 Type II:** Planned for enterprise tier
- **GDPR:** Data processing agreements, deletion workflows, consent management
- **CCPA:** California Consumer Privacy Act compliance
- **RESPA:** Real Estate Settlement Procedures Act awareness
- **Fair Housing:** AI trained to avoid discriminatory language or recommendations

### 11.4 Authentication & Authorization

- **Authentication:** Email/password, magic link (OAuth providers planned)
- **MFA:** Optional two-factor authentication (future)
- **Session Management:** JWT tokens with configurable expiry
- **Role-Based Access:** Permissions enforced at database and application level
- **Workspace Isolation:** Users only see data from active workspace

---

## 12. Development Phases

### 12.1 Phase 1: Foundation (MVP) - ✅ 95% COMPLETE

**Completed Features:**
- ✅ Authentication with workspace management
- ✅ Multi-workspace architecture with seamless switching
- ✅ Contact management with user linking
- ✅ Property management and saved searches
- ✅ Deal pipeline with milestones
- ✅ AI chat with document Q&A
- ✅ Document upload, indexing, and semantic search
- ✅ Stripe billing with all tiers
- ✅ Usage tracking and limits
- ✅ AI agent infrastructure (browse, favorite, execute)

**Remaining:**
- ⏳ Real-time messaging frontend (backend complete)

### 12.2 Phase 2: Core Features - 🚧 80% COMPLETE

**Completed:**
- ✅ Contact-user linking system
- ✅ User preferences management
- ✅ Document projects (NotebookLM-style)
- ✅ Entity search and embeddings
- ✅ Email campaign system
- ✅ External property integration

**In Progress:**
- 🚧 Real-time messaging UI
- 🚧 Property match alerts (automation)
- 🚧 Tool integration framework
- 🚧 Trial period UI enhancements

**Planned:**
- ⏳ NLP property search
- ⏳ OAuth providers (Google, Apple)

### 12.3 Phase 3: AI Enhancement - 🚧 20% COMPLETE

**In Progress:**
- 🚧 Pre-built AI agents (7 agents in development)
- 🚧 Action-taking agents with tool connectors

**Planned:**
- ⏳ Multi-model AI support (Gemini, Perplexity, OpenAI)
- ⏳ Advanced document analysis with recommendations
- ⏳ Automated MLS posting
- ⏳ Social media campaign generation
- ⏳ Market analysis and CMA automation
- ⏳ Buyer/seller onboarding flows
- ⏳ Agent matching system

### 12.4 Phase 4: Scale & Enterprise - ⏳ NOT STARTED

**Planned:**
- ⏳ MLS/IDX integration (read-only feeds)
- ⏳ Direct MLS posting (two-way sync)
- ⏳ Agent marketplace publishing
- ⏳ Custom agent builder
- ⏳ White-label options
- ⏳ Advanced analytics and reporting
- ⏳ API access for third-party integrations
- ⏳ Mobile app store releases (iOS, Android)

---

## 13. Success Metrics & KPIs

### 13.1 Product Metrics

**Engagement**
- Daily Active Users (DAU) / Monthly Active Users (MAU)
- AI queries per user per month
- Documents uploaded per user per month
- Average session duration
- Feature adoption rates

**CRM Usage**
- Contacts created per agent per month
- Deals in pipeline per agent
- Deal velocity (time to close)
- Contact-user linking adoption rate

**AI Performance**
- AI query success rate (user satisfaction)
- Document Q&A relevance (citation quality)
- Agent execution success rate
- Tool integration usage frequency

**Retention & Growth**
- Monthly Recurring Revenue (MRR) growth rate >15%
- Churn rate <5% monthly
- Net Promoter Score (NPS) >50
- Customer Acquisition Cost (CAC) payback period <12 months

### 13.2 Business Metrics

**Revenue**
- MRR by tier (Free, Starter, Professional, Team, Brokerage)
- Average Revenue Per User (ARPU)
- Upgrade rate (Free → Paid)
- Add-on adoption rate

**Customer Success**
- Time to first value (onboarding to first AI query)
- Feature activation rates
- Support ticket volume and resolution time
- User satisfaction (CSAT) scores

---

## 14. Competitive Differentiation

### 14.1 vs. Follow Up Boss
- **AI-First:** Built for AI from ground up, not bolted on
- **Data Ownership:** Clear data ownership guarantees vs. Zillow acquisition concerns
- **Tool Integration:** Horizontal integration across all tools, not just real estate-specific
- **Document Intelligence:** Advanced RAG with semantic search
- **Modern UX:** Clean, mobile-first design

### 14.2 vs. kvCORE / Placester
- **Simplicity:** Focused product vs. overwhelming feature bloat
- **AI Quality:** State-of-the-art models (Claude, Gemini) vs. basic automation
- **Pricing:** Transparent, affordable pricing vs. complex enterprise pricing
- **Innovation:** Action-taking AI agents vs. static automation

### 14.3 vs. Wise Agent
- **AI Capabilities:** Advanced AI vs. no AI
- **Modern Stack:** Real-time features, mobile-first vs. dated interface
- **Tool Integration:** Extensible platform vs. closed system
- **Document Intelligence:** Semantic search and RAG vs. simple file storage

---

## 15. Appendices

### 15.1 Glossary

- **CMA:** Comparative Market Analysis - evaluation of similar properties to determine market value
- **IDX:** Internet Data Exchange - system for sharing MLS listings on websites
- **MLS:** Multiple Listing Service - database of property listings
- **RAG:** Retrieval Augmented Generation - AI technique combining search with generation
- **RLS:** Row-Level Security - database access control at the row level
- **Workspace:** Organization unit (brokerage, team) that contains users and data
- **Contact-User Linking:** Connecting a CRM contact record to a platform user account
- **Tool Connector:** Integration that enables AI to take actions in external platforms

### 15.2 Document Changelog

**v3.0 (Feb 2026):**
- Added workspace architecture and multi-workspace support
- Added contact-user linking and user preferences system
- Added tool integration platform (MCP framework reframed)
- Updated AI model strategy (Anthropic current, multi-model future)
- Enhanced AI agents with action-taking capabilities
- Removed all references to deprecated systems
- Updated implementation status to reflect Phase 1/2/3 completion
- Added Agent Marketplace vision for Phase 4
- Clarified buyer/seller features as Phase 2-3 priorities

**v2.0 (Jan 2026):**
- Added implementation status section
- Updated completion percentages for Phase 1 MVP
- Documented undocumented features

**v1.0 (Jan 2025):**
- Initial product requirements document

---

**Document Owner:** Product Team
**Last Reviewed:** February 6, 2026
**Next Review:** March 2026 or upon major feature releases

---

*This PRD is a living document and should be updated as features are implemented, priorities shift, or market conditions change.*
