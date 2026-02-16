# PM-Integration Memory

> **Last Updated:** 2026-02-15 (Cycle 12 - INT-017 Complete)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Connector Framework Pattern:**
- Base `Connector` class with `executeAction()` method
- OAuth flow: authorize → callback → store tokens
- Action executors: `create_event`, `list_events`, etc.
- Token refresh handled automatically

**MCP-Style Pattern (INT-017 Implemented):**
- Settings-based connector enable/disable for AI access
- Toggle switches per connector (AIConnectorToggle component)
- AI chat can access enabled connectors via `ai_enabled` column
- Clear permissions and data access visibility with permission dialog
- "AI Chat Data Sources" summary card shows enabled connectors
- Read vs Write action permissions displayed in confirmation dialog

**OAuth Pattern:**
- Supabase OAuth callback handler
- Store tokens in `integration_tokens` table
- RLS policies enforce workspace isolation
- Token refresh before expiration

### Common Issues & Solutions

**Issue:** Integrations page broken
- **Solution:** Removed duplicate AdminDataSources page, fixed UI
- **Pattern:** Single source of truth for integration management

**Issue:** Integrations in wrong location (main nav)
- **Solution:** Moved to Settings tab (INT-015)
- **Pattern:** Information architecture - integrations are settings, not primary nav

**Issue:** OAuth flows not working after move
- **Solution:** Updated redirect URLs to Settings#integrations
- **Pattern:** Test OAuth flows after UI changes

**Issue:** Duplicate data sources page
- **Solution:** Removed duplicate, linked to Settings
- **Pattern:** Consolidate duplicate functionality

### Domain-Specific Knowledge

**Connector Types:**
- Email (Gmail, Outlook)
- Calendar (Google Calendar, Outlook)
- MLS/IDX (Bridge Interactive, RESO Web API)
- Notes (future)
- CRMs (future)

**OAuth Scopes:**
- Gmail: `gmail.readonly`, `gmail.send`
- Google Calendar: `calendar.readonly`, `calendar.events`
- Outlook: `Mail.Read`, `Calendars.Read`

**Action Patterns:**
- `create_*`: Create resource
- `list_*`: List resources
- `get_*`: Get single resource
- `update_*`: Update resource
- `delete_*`: Delete resource

### AI Toggle UI Pattern (INT-017)

**Permission Dialog Flow:**
1. User clicks toggle to enable AI access
2. Dialog shows read vs write permissions (grouped by action type)
3. User confirms, toggle updates `ai_enabled` column
4. Summary card updates to show connector as AI-accessible

**Action Type Classification:**
- Read actions: `read_*`, `list_*`, `get_*`, `search_*`, `availability`
- Write actions: `create_*`, `update_*`, `delete_*`, `send_*`, `draft`

**Component Relationships:**
- `AIConnectorToggle` - Standalone toggle with dialog (reusable)
- `IntegrationCard` - Hosts the toggle when connected
- `IntegrationsSettings` - Contains mutation logic and summary card

### Cross-PM Coordination Patterns

**With PM-Intelligence:**
- Connector data feeds AI chat
- MCP pattern affects agent execution
- AI can query enabled connectors via `get_ai_enabled_connectors()` function
- AI chat should call this function to know available data sources

**With PM-Experience:**
- Settings UI for integrations
- OAuth flow UI components
- Connector toggle interfaces

**With PM-Context:**
- Integration data stored in workspace
- RLS policies enforce isolation
- Data import/export support

---

## Recent Work Context

### Last Cycle (Cycle 12)
- **Worked on:** INT-017 - MCP-style connector experience (100% complete)
- **Completed:**
  - Database migration: `ai_enabled` column on `workspace_connectors`
  - SQL function: `get_ai_enabled_connectors()` for AI chat queries
  - TypeScript types: Added `ai_enabled` to `WorkspaceConnector`, new `AIEnabledConnector` type
  - New component: `AIConnectorToggle` with permission dialog
  - Updated `IntegrationCard` with AI toggle
  - Updated `IntegrationsSettings` with AI summary card and toggle mutation
- **Key Files Modified:**
  - `supabase/migrations/20260215150000_add_ai_enabled_to_workspace_connectors.sql`
  - `src/types/connector.ts`
  - `src/components/integrations/AIConnectorToggle.tsx` (new)
  - `src/components/integrations/IntegrationCard.tsx`
  - `src/components/settings/IntegrationsSettings.tsx`
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 9:**
- INT-015/16 - Architecture refactor (moved to Settings, removed duplicates)

**Cycle 8:**
- Completed Google Calendar connector (5 actions)
- Implemented get_availability action (FreeBusy API)
- Updated OAuth scopes

**Cycle 7:**
- Designed connector framework
- Implemented Gmail connector
- Built integration management UI

---

## Preferences & Patterns

**Prefers:**
- Using `/feature-dev` for connector architecture (complex)
- Using `smart-agent-brainstorming` for UI improvements
- Coordinating with PM-Intelligence on AI integration

**Avoids:**
- Duplicating connector patterns
- Hardcoding OAuth scopes
- Skipping token refresh logic

**Works well with:**
- PM-Intelligence (AI chat integration)
- PM-Experience (Settings UI)
- PM-Context (data storage)

---

*This memory is updated after each development cycle. PM-Integration should read this before starting new work.*
