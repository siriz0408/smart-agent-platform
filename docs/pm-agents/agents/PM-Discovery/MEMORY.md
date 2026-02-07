# PM-Discovery Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Search Pattern:**
- Universal search across all entities (documents, contacts, properties, deals)
- PostgreSQL full-text search (`websearch_to_tsquery`)
- ILIKE fallback for exact matches
- Hybrid search (full-text + exact + fuzzy) for best results

**Search Ranking Pattern:**
- Relevance scoring based on multiple factors
- Click-through tracking improves ranking
- Position tracking for CTR analytics
- Search success rate target: >95%

**Numeric Search Issue:**
- PostgreSQL `websearch_to_tsquery('english')` filters out standalone numbers
- Need numeric-specific search path with regex matching
- ILIKE fallback should be evaluated independently (OR not AND)

### Common Issues & Solutions

**Issue:** Numeric queries return no results (e.g., "922")
- **Root Cause:** PostgreSQL full-text search filters out numbers
- **Solution:** Add numeric query detection, route through ILIKE-only path
- **Pattern:** Test all query types (text, numeric, mixed)

**Issue:** Search input matching discrepancy
- **Solution:** Investigate query transformation pipeline
- **Pattern:** Verify search matches what user actually types

**Issue:** Zero results for valid queries
- **Solution:** Improve ranking algorithm, add fuzzy matching
- **Pattern:** Track zero results rate, analyze failing patterns

### Domain-Specific Knowledge

**Search Types:**
- Text search (full-text)
- Numeric search (zip codes, IDs, MLS numbers)
- Mixed search (text + numbers)
- Exact match (ILIKE)

**Search Entities:**
- Documents (name, content)
- Contacts (name, email, phone)
- Properties (address, MLS number)
- Deals (name, address)
- Agents (name, email)

**Search Analytics:**
- Click-through rate (CTR)
- Average click position
- Zero results rate
- Search latency

### Cross-PM Coordination Patterns

**With PM-Context:**
- Search depends on document indexing
- Search quality affects user experience
- Full-text search vs semantic search trade-offs

**With PM-Intelligence:**
- Search feeds RAG retrieval
- Search quality affects AI responses
- Citation support needs search integration

**With PM-Experience:**
- Search UI components
- Search result cards
- Search filters/facets

---

## Recent Work Context

### Last Cycle (Cycle 10)
- **Worked on:** DIS-015 - Comprehensive search testing (P0)
- **Delivered:** Complete test plan with 30+ test queries, 5 entity types, 6 query types
- **Blocked by:** Migration 20260207080000_fix_numeric_search.sql not deployed
- **Handoffs created:** To PM-Infrastructure (INF-016) - deploy migration first
- **Learning:** Always verify migration deployment status before planning tests

### Previous Cycle (Cycle 9)
- **Worked on:** DIS-014/15/16 - Fix numeric search (CRITICAL)
- **Discovered:** Root cause identified (PostgreSQL filters numbers)
- **Delivered:** Migration with numeric query detection and ILIKE-only routing
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 8:**
- Implemented search click-through tracking
- Added CTR analytics RPC function
- Created search_click_events table

**Cycle 7:**
- Established search patterns
- Created universal search function

---

## Preferences & Patterns

**Prefers:**
- Using `/feature-dev` for search architecture changes
- Using `smart-agent-brainstorming` for UI improvements
- Testing with real queries (zip codes, MLS numbers)

**Avoids:**
- Breaking existing search functionality
- Skipping numeric query testing
- Hardcoding search ranking

**Works well with:**
- PM-Context (document indexing)
- PM-Intelligence (RAG retrieval)
- PM-Experience (search UI)

---

*This memory is updated after each development cycle. PM-Discovery should read this before starting new work.*
