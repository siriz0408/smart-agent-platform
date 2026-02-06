# RAG System Improvement Proposal

> **Date:** 2026-02-06  
> **Author:** PM-Intelligence  
> **Status:** Proposal  
> **Based on:** RAG_AUDIT.md (INT-002)

---

## Executive Summary

Based on the comprehensive RAG audit completed in INT-002, this proposal outlines concrete improvements to enhance retrieval quality, answer accuracy, and user experience. The current system uses hash-based embeddings and full-text/keyword search only, missing significant opportunities for semantic understanding.

**Key Opportunity:** Implement true semantic embeddings and integrate vector similarity search into the hybrid retrieval approach.

---

## Current State Analysis

### Strengths ✅
- Smart chunking preserves semantic boundaries (page breaks, sections)
- Context expansion via neighbor chunks improves continuity
- Fallback retrieval ensures responses even when search fails
- Query expansion with domain synonyms

### Critical Gaps 🔴
1. **Hash-based embeddings** don't capture semantic meaning
2. **Vector search not integrated** - embeddings generated but unused
3. **No reranking** - single-pass retrieval may include irrelevant chunks
4. **Fixed retrieval limits** - doesn't adapt to query complexity

---

## Proposed Improvements

### Priority 1: Implement Semantic Embeddings (P0) ⭐ HIGHEST IMPACT

**Current:** Hash-based deterministic embeddings (lexical similarity only)  
**Target:** Semantic embedding model (OpenAI `text-embedding-3-small` or Cohere `embed-english-v3.0`)

**Benefits:**
- Captures semantic meaning, not just word overlap
- Better handling of synonyms ("purchase price" vs "sale amount")
- Improved retrieval for complex queries
- Better cross-document understanding

**Implementation Plan:**

1. **Phase 1: Embedding Service Integration** (Week 1)
   - Add embedding API client to `supabase/functions/_shared/`
   - Support both OpenAI and Cohere (configurable)
   - Implement caching layer to reduce API costs
   - Update `index-document` to use semantic embeddings

2. **Phase 2: Migration Strategy** (Week 2)
   - Backfill existing documents with semantic embeddings
   - Run parallel indexing (hash + semantic) during transition
   - A/B test retrieval quality improvement
   - Monitor API costs and performance

3. **Phase 3: Full Migration** (Week 3)
   - Switch primary retrieval to semantic embeddings
   - Remove hash-based embedding code
   - Update monitoring dashboards

**Effort:** Large (3 weeks) | **Impact:** High | **Risk:** Medium  
**Cost Estimate:** ~$50-200/month at current scale (depends on document volume)

**Success Metrics:**
- Chunk relevance score >85% (from current ~70%)
- Answer quality rating >4.5/5 (from current ~4.0/5)
- Retrieval precision >80% (from current ~65%)

---

### Priority 2: Integrate Vector Search into Hybrid Approach (P0) ⭐ HIGHEST IMPACT

**Current:** Hybrid search = Full-text + Keyword only  
**Target:** True hybrid = Vector + Full-text + Keyword

**Benefits:**
- Leverages semantic similarity (once embeddings are semantic)
- Better recall for queries with semantic intent
- Combines strengths of multiple retrieval methods
- Reduces false negatives

**Implementation Plan:**

1. **Modify `search_documents_hybrid` function** (Migration)
   ```sql
   -- Add vector similarity component
   -- Combine scores: final_score = 0.5 * vector_sim + 0.3 * text_rank + 0.2 * keyword_match
   -- Or use Reciprocal Rank Fusion (RRF) for better score combination
   ```

2. **Update `ai-chat/index.ts` retrieval logic**
   - Generate query embedding
   - Call enhanced hybrid search
   - Combine results with weighted scoring

3. **Testing & Tuning**
   - Test on 20 sample queries
   - Tune score weights based on results
   - Measure precision/recall improvement

**Effort:** Medium (1 week) | **Impact:** High | **Risk:** Low

**Success Metrics:**
- Retrieval recall >70% (from current ~55%)
- Combined precision/recall F1 >75% (from current ~60%)

---

### Priority 3: Add Reranking Step (P1)

**Current:** Single-pass retrieval, ordered by text_rank  
**Target:** Two-stage: Retrieve candidates → Rerank by relevance

**Benefits:**
- Better precision (top results more relevant)
- Can use cross-encoder model for fine-grained relevance
- Reduces irrelevant chunks in context
- Improves answer quality

**Implementation Plan:**

1. **Retrieve broad candidate set** (50-100 chunks)
2. **Rerank using cross-encoder** (e.g., `ms-marco-MiniLM-L-6-v2`)
3. **Select top 20 reranked chunks**
4. **Add neighbor chunks for context**

**Effort:** Medium (1-2 weeks) | **Impact:** Medium | **Risk:** Low  
**Cost Estimate:** ~$20-50/month (reranking API calls)

**Success Metrics:**
- Top-5 precision >90% (from current ~75%)
- Answer quality rating improvement +0.3 points

---

### Priority 4: Optimize Chunk Size (P1)

**Current:** 2000 characters per chunk  
**Target:** 1000-1500 characters with 300-char overlap

**Benefits:**
- Better precision (less irrelevant context per chunk)
- More granular retrieval
- Overlap ensures context continuity
- Reduces token usage for LLM

**Implementation Plan:**

1. Update `CHUNK_SIZE` to 1200 in `index-document/index.ts`
2. Increase `CHUNK_OVERLAP` to 300
3. Test on sample documents
4. Measure retrieval quality improvement
5. Backfill existing documents if improvement confirmed

**Effort:** Small (3-5 days) | **Impact:** Medium | **Risk:** Low

**Success Metrics:**
- Chunk relevance score improvement +5-10%
- Token usage reduction ~15-20%

---

### Priority 5: Query Expansion Improvements (P2)

**Current:** Simple synonym expansion  
**Target:** Domain-aware query expansion

**Benefits:**
- Better handling of real estate terminology
- Captures domain-specific synonyms ("closing" = "settlement")
- Improves recall for specialized queries
- LLM-based expansion for complex queries

**Implementation Plan:**

1. Build real estate domain synonym dictionary
2. Add query classification (factual vs analytical)
3. Expand queries based on document type (contract vs inspection)
4. Consider LLM-based query expansion for complex queries

**Effort:** Medium (1 week) | **Impact:** Medium | **Risk:** Low

**Success Metrics:**
- Query expansion coverage >80% (from current ~60%)
- Recall improvement +5-10%

---

### Priority 6: Adaptive Retrieval (P2)

**Current:** Fixed limit of 20 chunks  
**Target:** Adaptive based on query complexity and document count

**Benefits:**
- Better handling of complex multi-document queries
- Reduces token usage for simple queries
- Improves quality for analytical questions
- Better diversity (max chunks per document)

**Implementation Plan:**

1. Classify query complexity (simple vs complex)
2. Adjust retrieval limit: 10 (simple) to 40 (complex)
3. Consider document count in selection
4. Add diversity filtering (max chunks per document)

**Effort:** Small (3-5 days) | **Impact:** Medium | **Risk:** Low

**Success Metrics:**
- Token usage reduction ~10-15% for simple queries
- Answer quality improvement +0.2 points for complex queries

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
- ✅ **Week 1:** Semantic embedding service integration
- ✅ **Week 2:** Migration strategy and backfill
- ✅ **Week 3:** Full migration to semantic embeddings

### Phase 2: Enhancement (Weeks 4-5)
- ✅ **Week 4:** Integrate vector search into hybrid approach
- ✅ **Week 5:** Add reranking step

### Phase 3: Optimization (Weeks 6-7)
- ✅ **Week 6:** Optimize chunk size
- ✅ **Week 7:** Query expansion improvements + Adaptive retrieval

### Phase 4: Monitoring (Ongoing)
- Set up quality monitoring dashboard
- Track metrics weekly
- Iterate based on user feedback

---

## Cost-Benefit Analysis

| Improvement | Monthly Cost | Expected Impact | ROI |
|------------|--------------|-----------------|-----|
| Semantic Embeddings | $50-200 | High (relevance +20%) | High |
| Vector Search Integration | $0 (uses existing) | High (recall +15%) | Very High |
| Reranking | $20-50 | Medium (precision +10%) | Medium |
| Chunk Optimization | $0 | Medium (precision +5%) | Very High |
| Query Expansion | $0-30 | Medium (recall +5%) | High |
| Adaptive Retrieval | $0 | Medium (quality +0.2) | Very High |

**Total Monthly Cost:** ~$70-280  
**Expected Quality Improvement:** +25-30% overall

---

## Risk Mitigation

### Risk 1: API Cost Overruns
**Mitigation:** 
- Implement caching layer
- Set usage limits and alerts
- Monitor costs weekly
- Consider self-hosted models for high-volume scenarios

### Risk 2: Performance Degradation
**Mitigation:**
- Benchmark before/after performance
- Use async processing for embeddings
- Implement request queuing if needed
- Monitor latency metrics

### Risk 3: Quality Regression
**Mitigation:**
- A/B test changes before full rollout
- Maintain fallback to current system
- Gradual rollout (10% → 50% → 100%)
- User feedback collection

---

## Success Criteria

### Quantitative Metrics
- **Chunk Relevance Score:** >85% (from ~70%)
- **Answer Quality Rating:** >4.5/5 (from ~4.0/5)
- **Retrieval Precision:** >80% (from ~65%)
- **Retrieval Recall:** >70% (from ~55%)
- **F1 Score:** >75% (from ~60%)

### Qualitative Metrics
- User feedback: "More accurate answers"
- Reduced "I don't know" responses
- Better cross-document synthesis
- Improved citation accuracy

---

## Next Steps

1. **Approve proposal** - Review with team
2. **Allocate resources** - Assign developer(s)
3. **Set up monitoring** - Dashboard for metrics
4. **Begin Phase 1** - Start semantic embedding integration
5. **Weekly reviews** - Track progress and adjust

---

## References

- **RAG Audit:** `docs/pm-agents/agents/PM-Intelligence/RAG_AUDIT.md`
- **Current Implementation:** `supabase/functions/ai-chat/index.ts`
- **Chunking Logic:** `supabase/functions/index-document/index.ts`
- **Search Function:** `supabase/functions/search-documents/index.ts`

---

**Proposal Status:** Ready for Review  
**Next Review:** After Phase 1 completion
