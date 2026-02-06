# RAG Retrieval Quality Audit

> **Date:** 2026-02-06  
> **Auditor:** PM-Intelligence  
> **Task:** INT-002  
> **Status:** ✅ Complete

---

## Executive Summary

This audit documents the current RAG (Retrieval-Augmented Generation) implementation parameters and identifies improvement opportunities. The system uses a hybrid search approach combining full-text search with keyword matching, but **does not currently leverage vector similarity search** despite embeddings being generated.

**Key Finding:** The system generates hash-based embeddings but the primary retrieval path (`ai-chat`) uses full-text/keyword search only, not vector similarity. This represents a significant opportunity to improve retrieval quality.

---

## Current Implementation Parameters

### 1. Chunking Configuration

**Location:** `supabase/functions/index-document/index.ts`

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Chunk Size** | 2000 characters | Target size, but smart chunking preserves semantic boundaries |
| **Chunk Overlap** | 200 characters | Applied when forced splits are needed (rare with smart chunking) |
| **Max Chunks** | 100 per document | Hard limit to prevent excessive indexing |
| **Min Chunk Size** | 50 characters | Filters out tiny fragments |

**Chunking Strategy:**
- **Smart chunking** preserves semantic boundaries:
  - Settlement/Contract docs: Split by page breaks, then by section headers
  - Inspection reports: Split by inspection sections (ROOF, HVAC, etc.)
  - General docs: Paragraph-aware chunking
- Chunks respect document structure rather than fixed-size splits
- Overlap only applied when a single sentence exceeds chunk size

**Assessment:** ✅ **Good** - Semantic boundary preservation is excellent for real estate documents.

---

### 2. Embedding Generation

**Location:** `supabase/functions/index-document/index.ts` (lines 357-404)  
**Location:** `supabase/functions/search-documents/index.ts` (lines 15-67)

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Embedding Dimensions** | 1536 | Matches database schema `vector(1536)` |
| **Embedding Type** | Hash-based (deterministic) | **Not a semantic embedding model** |
| **Algorithm** | Character n-grams + word frequencies | Creates consistent vectors for similar text |

**Embedding Algorithm Details:**
- Character-level features: Unigrams, bigrams, trigrams
- Word-level features: Word hashes, word length, first character
- Normalization: L2 normalization applied
- Deterministic: Same text always produces same embedding

**Assessment:** ⚠️ **Limitation** - Hash-based embeddings capture lexical similarity but not semantic meaning. This is a significant constraint for RAG quality.

**Why Hash-Based?**
- Comment in code: "Since dedicated embedding models aren't available via Lovable AI"
- This suggests a workaround rather than optimal solution

---

### 3. Retrieval Parameters

#### 3.1 Vector Similarity Search (search-documents function)

**Location:** `supabase/functions/search-documents/index.ts`

| Parameter | Default | Notes |
|-----------|--------|-------|
| **matchThreshold** | 0.1 | Cosine similarity threshold (1 - distance) |
| **matchCount** | 5 | Maximum results returned |
| **Similarity Metric** | Cosine distance (`<=>`) | PostgreSQL pgvector operator |

**Database Function:** `match_documents` (migration `20260128181403_*.sql`)
- Uses pgvector cosine distance
- Filters: `similarity > match_threshold`
- Orders by: `embedding <=> query_embedding` (ascending distance)
- Returns: chunk content, document name, similarity score

**Assessment:** ⚠️ **Not Used** - This function exists but `ai-chat` does not call it.

---

#### 3.2 Hybrid Search (Primary Retrieval Path)

**Location:** `supabase/functions/ai-chat/index.ts` (lines 3403-3411)  
**Database Function:** `search_documents_hybrid` (migration `20260128195720_*.sql`)

| Parameter | Value | Notes |
|-----------|-------|-------|
| **p_limit** | 20 | Maximum chunks returned |
| **Search Type** | Full-text + Keyword | **No vector similarity** |
| **Full-Text** | PostgreSQL `tsvector` | English language, on-the-fly generation |
| **Keyword Fallback** | `ILIKE '%query%'` | Partial word matching |

**Hybrid Search Logic:**
1. **Primary:** Full-text search using `tsvector` + `tsquery`
   - Ranks by `ts_rank()` score
   - Requires exact word matches (with stemming)
2. **Fallback:** Keyword search using `ILIKE`
   - Only if no full-text matches
   - Fixed rank: 0.3
3. **Deduplication:** `DISTINCT ON (chunk_id)`
4. **Ordering:** By text_rank DESC

**Assessment:** ⚠️ **Missing Vector Search** - Hybrid search combines full-text + keyword but ignores embeddings entirely.

---

#### 3.3 Context Expansion (Neighbor Chunks)

**Location:** `supabase/functions/ai-chat/index.ts` (lines 3419-3447)  
**Database Function:** `get_chunk_neighbors` (migration `20260128195720_*.sql`)

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Neighbor Range** | ±1 chunk | Retrieves chunk-1, chunk, chunk+1 |
| **Purpose** | Context continuity | Ensures surrounding context for matched chunks |

**Logic:**
- For each matched chunk, retrieves adjacent chunks from same document
- Filters out duplicates (chunks already in results)
- Adds neighbor chunks with `text_rank: 0.1`

**Assessment:** ✅ **Good** - Context expansion improves answer quality by preserving document flow.

---

#### 3.4 Fallback Retrieval

**Location:** `supabase/functions/ai-chat/index.ts` (lines 3450-3482)

**Trigger:** When hybrid search returns 0 results AND specific documents are selected

**Behavior:**
- Direct query: `SELECT * FROM document_chunks WHERE document_id IN (...)`
- Orders by `chunk_index` (sequential)
- Limits to 30 chunks
- Assigns `text_rank: 0.5` to all results

**Assessment:** ✅ **Reasonable** - Provides fallback when search fails, but sequential ordering may not be optimal.

---

## Retrieval Flow Summary

```
User Query
    ↓
Query Expansion (synonyms, related terms)
    ↓
search_documents_hybrid()
    ├─ Full-text search (tsvector) → Ranked results
    └─ Keyword search (ILIKE) → Fallback results
    ↓
get_chunk_neighbors() → Add ±1 chunks for context
    ↓
Format chunks → Build context string
    ↓
Send to LLM with context
```

**Missing:** Vector similarity search (despite embeddings being generated)

---

## Current Limitations & Issues

### 🔴 Critical Issues

1. **Vector Search Not Used**
   - Embeddings are generated but not used for retrieval
   - `search-documents` function exists but `ai-chat` doesn't call it
   - Hash-based embeddings have limited semantic value anyway

2. **Low Semantic Understanding**
   - Hash-based embeddings don't capture meaning
   - Full-text search requires exact word matches (with stemming)
   - Misses semantic relationships (e.g., "purchase price" vs "sale amount")

### 🟡 Moderate Issues

3. **No Reranking Step**
   - Results ordered by text_rank only
   - No cross-encoder reranking for relevance
   - No diversity filtering (may return multiple chunks from same section)

4. **Fixed Retrieval Limits**
   - Hard limit of 20 chunks from hybrid search
   - No adaptive retrieval based on query complexity
   - May miss relevant chunks for complex queries

5. **No Query Understanding**
   - No query classification (factual vs analytical)
   - No query expansion beyond simple synonyms
   - Doesn't adapt retrieval strategy to query type

### 🟢 Minor Issues

6. **Chunk Size May Be Too Large**
   - 2000 characters ≈ 300-400 words
   - May include irrelevant context within chunks
   - Consider smaller chunks (1000-1500) for better precision

7. **No Chunk Quality Scoring**
   - All chunks treated equally
   - No filtering of low-quality chunks (headers, footers, boilerplate)

---

## Improvement Recommendations

### Priority 1: Implement True Semantic Embeddings (P0)

**Current:** Hash-based embeddings (lexical similarity only)  
**Target:** Semantic embedding model (e.g., OpenAI `text-embedding-3-small`, Cohere `embed-english-v3.0`)

**Benefits:**
- Captures semantic meaning, not just word overlap
- Better handling of synonyms and related concepts
- Improved retrieval for complex queries

**Implementation:**
1. Replace `generateEmbedding()` with API call to embedding service
2. Update `index-document` to use semantic embeddings
3. Update `search-documents` to use semantic embeddings
4. Consider caching embeddings to reduce API costs

**Effort:** Large | **Impact:** High | **Risk:** Medium

---

### Priority 2: Integrate Vector Search into Hybrid Approach (P0)

**Current:** Hybrid search uses full-text + keyword only  
**Target:** True hybrid: Vector + Full-text + Keyword

**Benefits:**
- Leverages semantic similarity (once embeddings are semantic)
- Better recall for queries with semantic intent
- Combines strengths of multiple retrieval methods

**Implementation:**
1. Modify `search_documents_hybrid` to include vector similarity
2. Combine scores: `final_score = 0.5 * vector_sim + 0.3 * text_rank + 0.2 * keyword_match`
3. Or use reciprocal rank fusion (RRF) for score combination
4. Update `ai-chat` to use enhanced hybrid search

**Effort:** Medium | **Impact:** High | **Risk:** Low

---

### Priority 3: Add Reranking Step (P1)

**Current:** Single-pass retrieval, ordered by text_rank  
**Target:** Two-stage: Retrieve candidates → Rerank by relevance

**Benefits:**
- Better precision (top results more relevant)
- Can use cross-encoder model for fine-grained relevance
- Reduces irrelevant chunks in context

**Implementation:**
1. Retrieve 50-100 candidate chunks (broad recall)
2. Use cross-encoder model (e.g., `ms-marco-MiniLM`) to rerank
3. Select top 20 reranked chunks
4. Add neighbor chunks for context

**Effort:** Medium | **Impact:** Medium | **Risk:** Low

---

### Priority 4: Optimize Chunk Size (P1)

**Current:** 2000 characters  
**Target:** 1000-1500 characters with better overlap

**Benefits:**
- Better precision (less irrelevant context per chunk)
- More granular retrieval
- Overlap ensures context continuity

**Implementation:**
1. Reduce `CHUNK_SIZE` to 1200
2. Increase `CHUNK_OVERLAP` to 300
3. Test on sample documents
4. Measure retrieval quality improvement

**Effort:** Small | **Impact:** Medium | **Risk:** Low

---

### Priority 5: Query Expansion Improvements (P2)

**Current:** Simple synonym expansion  
**Target:** Domain-aware query expansion

**Benefits:**
- Better handling of real estate terminology
- Captures domain-specific synonyms (e.g., "closing" = "settlement")
- Improves recall for specialized queries

**Implementation:**
1. Build real estate domain synonym dictionary
2. Add query classification (factual vs analytical)
3. Expand queries based on document type (contract vs inspection)
4. Consider LLM-based query expansion

**Effort:** Medium | **Impact:** Medium | **Risk:** Low

---

### Priority 6: Adaptive Retrieval (P2)

**Current:** Fixed limit of 20 chunks  
**Target:** Adaptive based on query complexity and document count

**Benefits:**
- Better handling of complex multi-document queries
- Reduces token usage for simple queries
- Improves quality for analytical questions

**Implementation:**
1. Classify query complexity (simple vs complex)
2. Adjust retrieval limit: 10 (simple) to 40 (complex)
3. Consider document count in selection
4. Add diversity filtering (max chunks per document)

**Effort:** Small | **Impact:** Medium | **Risk:** Low

---

## Testing Recommendations

### Quality Metrics to Track

1. **Chunk Relevance Score**
   - Manual review: Rate each retrieved chunk (1-5)
   - Target: >85% chunks rated 4+ (from AGENT.md metric)

2. **Answer Quality**
   - User feedback: Thumbs up/down on AI responses
   - Target: >4.5/5 helpfulness rating

3. **Retrieval Precision**
   - % of retrieved chunks that are relevant to query
   - Target: >80%

4. **Retrieval Recall**
   - % of relevant chunks that were retrieved
   - Target: >70% (balance with precision)

### Test Queries

Create a test suite with 20-30 representative queries:

**Factual Queries:**
- "What is the purchase price?"
- "When is the closing date?"
- "What are the major inspection issues?"

**Analytical Queries:**
- "Compare the inspection findings across properties"
- "Summarize the financial terms of this deal"
- "What contingencies are in the contract?"

**Complex Queries:**
- "What repairs are needed and what's the estimated cost?"
- "What are the key dates and deadlines I need to track?"

---

## Next Steps

1. **Immediate (This Week):**
   - [ ] Research embedding API options (OpenAI, Cohere, local models)
   - [ ] Estimate cost impact of semantic embeddings
   - [ ] Design hybrid search integration plan

2. **Short-term (Next 2 Weeks):**
   - [ ] Implement semantic embeddings (Priority 1)
   - [ ] Integrate vector search into hybrid approach (Priority 2)
   - [ ] Test on 20 sample conversations

3. **Medium-term (Next Month):**
   - [ ] Add reranking step (Priority 3)
   - [ ] Optimize chunk size (Priority 4)
   - [ ] Implement quality monitoring dashboard

---

## References

- **Chunking Code:** `supabase/functions/index-document/index.ts` (lines 27-351)
- **Embedding Code:** `supabase/functions/index-document/index.ts` (lines 357-404)
- **Search Function:** `supabase/functions/search-documents/index.ts`
- **Hybrid Search:** `supabase/migrations/20260128195720_*.sql`
- **AI Chat Retrieval:** `supabase/functions/ai-chat/index.ts` (lines 3395-3535)
- **Database Function:** `match_documents` in migration `20260128181403_*.sql`

---

**Audit Complete** ✅  
**Next Review:** After implementing Priority 1 & 2 improvements