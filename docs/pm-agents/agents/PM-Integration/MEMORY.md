# PM-Integration Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Connector Framework Pattern:**
- Base `Connector` class with `executeAction()` method
- OAuth flow: authorize → callback → store tokens
- Action executors: `create_event`, `list_events`, etc.
- Token refresh handled automatically

**MCP-Style Pattern:**
- Settings-based connector enable/disable
- Toggle switches per connector
- AI chat can access enabled connectors
- Clear permissions and data access visibility

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

### Cross-PM Coordination Patterns

**With PM-Intelligence:**
- Connector data feeds AI chat
- MCP pattern affects agent execution
- AI can query enabled connectors

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

### Last Cycle (Cycle 9)
- **Worked on:** INT-015/16/17/18 - Architecture refactor
- **Discovered:** Integrations page broken, wrong location, needs MCP redesign
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

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
