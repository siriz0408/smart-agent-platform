# PM-Context Memory

> **Last Updated:** 2026-02-15 (Cycle 13)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Document Indexing Pattern:**
- Use pdfjs-serverless for PDF text extraction
- Multi-column layout detection improves parsing quality
- Preserve table structure in chunks
- Section-aware chunking (100+ RE section headers)

**Document Re-indexing Pattern:**
- Reuse existing `useDocumentIndexing` hook for re-indexing
- Show progress with batch tracking (currentBatch/totalBatches)
- Display chunksIndexed count for user feedback
- Handle three states: processing, failed, completed
- Provide retry option on failure with error message
- Auto-clear success state after 2 seconds (in hook)

**Data Completeness Pattern:**
- Track data completeness score (% of fields filled)
- Use real data queries for onboarding milestones
- Indexing success rate target: >98%

**Contact-User Linking Pattern:**
- `contacts.user_id` links to `profiles.user_id`
- Enables AI to access user data for context
- RLS policies enforce workspace isolation

### Common Issues & Solutions

**Issue:** PDF parsing misses multi-column layouts
- **Solution:** Implemented multi-column detection algorithm
- **Pattern:** Test with real estate documents (settlement statements, contracts)

**Issue:** Chunk metadata missing page numbers
- **Solution:** Add metadata JSONB column to document_chunks
- **Pattern:** Coordinate with PM-Intelligence on RAG citation needs

**Issue:** Document indexing failures
- **Solution:** Robust error handling for malformed PDFs
- **Pattern:** Log failures, retry with different strategies

**Issue:** Users need to re-index documents when content changes or indexing quality improves
- **Solution:** Added Re-index button to DocumentDetailsView and dropdown menus in Documents list
- **Pattern:**
  - Add prominent action button in document detail header
  - Add dropdown menu item in list views for quick access
  - Show dedicated progress card with batch/chunk details
  - Provide clear error messages and retry functionality
  - Use existing indexing hook to avoid code duplication

**Issue:** Users need to perform bulk operations on multiple documents
- **Solution:** Implemented bulk document operations with multi-select UI
- **Pattern:**
  - Use Set<string> for tracking selected document IDs (efficient add/delete/check)
  - Create dedicated `useBulkDocumentOperations` hook for bulk operations
  - Show floating toolbar at bottom when items selected (fixed position, centered)
  - Process operations sequentially with progress tracking
  - Provide visual feedback: progress bar, completed/failed counts, toast notifications
  - Handle partial failures gracefully (some succeed, some fail)
  - Mobile: Show checkbox in left column with "Select All" bar above list
  - Desktop: Add checkbox column to table with header checkbox for select all
  - Clear selection after operation completes
  - Auto-clear progress indicator after 3 seconds

### Domain-Specific Knowledge

**Document Types:**
- Settlement statements (financial data)
- Inspection reports (structured data)
- Contracts (legal text)
- Appraisals (property data)
- Disclosures (legal requirements)
- General (catch-all)

**Chunking Strategy:**
- Preserve semantic boundaries (page breaks, sections, tables)
- Don't split mid-sentence or mid-table
- Include page metadata for citations

**Data Import/Export:**
- Support CSV imports for contacts
- Export data for backup/portability
- Maintain data integrity during import

### Cross-PM Coordination Patterns

**With PM-Intelligence:**
- Document indexing quality affects RAG quality
- Chunk metadata needed for citations
- Document type detection affects AI prompts

**With PM-Discovery:**
- Search depends on document indexing
- Full-text search vs semantic search trade-offs
- Search performance affects user experience

**With PM-Transactions:**
- Deal documents need proper indexing
- Document associations with deals
- Document access permissions

---

## Recent Work Context

### Last Cycle (Cycle 13)
- **Worked on:** CTX-013 - Bulk document operations
- **Completed:** Full implementation of multi-select, bulk delete, bulk move to project, bulk re-index
- **Blocked by:** None
- **Handoffs created:** None
- **Files modified:**
  - `src/hooks/useBulkDocumentOperations.ts` - New hook for bulk delete, move, and re-index operations
  - `src/components/documents/BulkActionToolbar.tsx` - New component for bulk action UI
  - `src/pages/Documents.tsx` - Integrated multi-select checkboxes and bulk action toolbar

### Previous Cycles

**Cycle 12:**
- CTX-012 - Document re-indexing UI feature - Complete
- Added Re-index button to DocumentDetailsView and dropdown menus

**Cycle 9:**
- CTX-005/10 - Metadata column migration (pending)
- Discovered metadata column may not exist yet, needs migration

**Cycle 8:**
- Enhanced PDF parsing (multi-column, tables, sections)
- Added page metadata to chunks
- Improved error handling

**Cycle 7:**
- Established document indexing patterns
- Created contact-user linking system

---

## Preferences & Patterns

**Prefers:**
- Using `smart-agent-brainstorming` for UI improvements
- Coordinating with PM-Intelligence on data structure
- Testing indexing with real documents

**Avoids:**
- Breaking existing document structure
- Skipping error handling
- Hardcoding document type detection

**Works well with:**
- PM-Intelligence (RAG quality)
- PM-Discovery (search quality)
- PM-Transactions (deal documents)

---

*This memory is updated after each development cycle. PM-Context should read this before starting new work.*
