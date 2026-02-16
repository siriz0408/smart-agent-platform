# PM-Intelligence Memory

> **Last Updated:** 2026-02-15 (Cycle 12)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**RAG Pipeline Pattern:**
- Use deterministic hash-based embeddings for consistency
- Chunk documents preserving semantic boundaries (page breaks, sections)
- Store embeddings in `document_chunks` table with metadata
- Citation support requires page numbers and section headers in chunk metadata

**AI Chat Pattern:**
- Use Anthropic Claude API (`claude-sonnet-4-20250514`)
- Stream responses using SSE format
- Include document citations in responses
- Handle rate limits gracefully with retries

**Agent Execution Pattern:**
- All CRM action executors must validate tenant_id before data access
- Use defense-in-depth: validate at entry point AND in each executor
- Centralized `validateTenantAccess()` helper prevents data leaks

**Connector Integration Pattern (INT-018):**
- Fetch AI-enabled connectors via `get_ai_enabled_connectors(_workspace_id)` RPC
- Note: `tenant_id = workspace_id` in the database schema
- Build connector context using `buildConnectorContext()` helper
- Add connector context to system prompt BEFORE mention context
- Send `active_connectors` via embedded_components for UI display
- Frontend `ActiveConnectorsBadge` component shows which sources are active

### Common Issues & Solutions

**Issue:** AI chat buttons not working
- **Solution:** Need full audit of chat page interactions
- **Pattern:** Always test UI interactions after refactoring

**Issue:** RAG citations missing page numbers
- **Solution:** Add metadata column to document_chunks table
- **Pattern:** Coordinate with PM-Context on data structure changes

**Issue:** Tenant isolation gaps in action executors
- **Solution:** Added centralized validation helpers
- **Pattern:** Security checks at multiple layers (defense-in-depth)

### Domain-Specific Knowledge

**AI Model Selection:**
- Claude Sonnet 4 is primary model
- Consider Gemini Flash for content generation (cost optimization)
- GPT-4 Turbo as fallback for rate limits

**Prompt Engineering:**
- Document-type-specific prompts improve summary quality
- Real estate domain keywords help with document classification
- Citation format: [Document Name, Page X, Section Y]

**RAG Quality:**
- Search success rate target: >95%
- Citation accuracy critical for user trust
- Chunk size affects retrieval quality (preserve semantic boundaries)

### Cross-PM Coordination Patterns

**With PM-Context:**
- Document indexing quality affects RAG quality
- Coordinate on chunk metadata structure
- Share document type detection patterns

**With PM-Experience:**
- Chat UI components need real-time updates
- Thinking indicators require streaming state integration
- Button interactions need proper event handlers

**With PM-Integration:**
- Connector data feeds AI chat via `get_ai_enabled_connectors()` SQL function
- MCP pattern affects agent execution - connectors have `ai_enabled` toggle
- OAuth flows need error handling
- PM-Integration added database infrastructure (INT-017), PM-Intelligence consumes it (INT-018)
- Next: PM-Intelligence should implement action execution using connector actions

---

## Recent Work Context

### Last Cycle (Cycle 12)
- **Worked on:** INT-018 - AI chat connector integration
- **Completed:**
  - Backend: Added `AIEnabledConnector` interface and fetch logic in ai-chat/index.ts
  - Backend: Created `buildConnectorContext()` to format connector info for system prompt
  - Backend: Integrated connector context into both streaming and non-streaming code paths
  - Backend: Added `active_connectors` to embedded_components response
  - Frontend: Created `ActiveConnectorsBadge.tsx` component with tooltip
  - Frontend: Added `active_connectors` to `EmbeddedComponents` type
  - Frontend: Integrated badge display in Chat.tsx assistant messages
- **Key Files Modified:**
  - `supabase/functions/ai-chat/index.ts` (connector fetch, prompt context, embedded components)
  - `src/components/ai-chat/ActiveConnectorsBadge.tsx` (new)
  - `src/components/ai-chat/index.ts` (export)
  - `src/types/property.ts` (active_connectors type)
  - `src/pages/Chat.tsx` (badge display)
- **Blocked by:** None
- **Handoffs created:** None
- **Next Step:** INT-024 - Add connector action execution (allow AI to actually execute actions)

### Previous Cycles

**Cycle 9:**
- Investigated INT-014/15/16 - AI chat button fixes
- Created BUTTON_AUDIT_REPORT.md with comprehensive findings

**Cycle 8:**
- Completed HO-009: Tenant isolation across all 10 CRM action executors
- Added defense-in-depth pattern
- Fixed previously undetected gap in `assign_tags` executor

**Cycle 7:**
- Documented prompt templates (PROMPTS.md)
- Established prompt engineering patterns

---

## Preferences & Patterns

**Prefers:**
- Using `/feature-dev` for complex AI features (multi-file, architectural)
- Coordinating with PM-Context on data structure changes
- Testing AI features end-to-end before marking complete

**Avoids:**
- Making assumptions about document structure
- Skipping tenant isolation checks
- Hardcoding AI model selection

**Works well with:**
- PM-Context (document data)
- PM-Experience (UI components)
- PM-Integration (connector data)

---

## Development Method Preferences

**Big Features:** Use `/feature-dev` (e.g., multi-model AI support, agent marketplace)
**Small Updates:** Use `smart-agent-brainstorming` (e.g., prompt tweaks, UI improvements)
**Bug Fixes:** Direct implementation (e.g., button handler fixes)

---

*This memory is updated after each development cycle. PM-Intelligence should read this before starting new work.*
