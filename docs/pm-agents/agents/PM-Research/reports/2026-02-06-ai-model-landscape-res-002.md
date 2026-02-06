# AI Model Landscape Evaluation: Real Estate Use Cases
**Report ID:** RES-002  
**Date:** February 6, 2026  
**Author:** PM-Research  
**Status:** Complete

---

## Executive Summary

This report evaluates the current AI model landscape (Claude Sonnet 4, GPT-4 Turbo, Gemini 2.0 Flash) for real estate use cases, analyzing performance, cost, and capabilities across Smart Agent's core features: document intelligence, AI chat, content generation, and agent automation.

**Key Finding:** Smart Agent's current single-model approach (Claude Sonnet 4) is appropriate for Phase 1, but a multi-model strategy optimized by use case would provide 40-60% cost savings and improved performance for specific tasks. Gemini 2.0 Flash offers exceptional value for content generation, while GPT-4 Turbo provides strong fallback capabilities.

**Recommendation Priority:** P0 - Critical for cost optimization and roadmap planning

---

## Current State Analysis

### Smart Agent's Current Implementation

**Primary Model:** Anthropic Claude Sonnet 4 (`claude-sonnet-4-20250514`)

**Usage:**
- AI chat interface (conversational real estate expert)
- Document analysis and RAG (Retrieval-Augmented Generation)
- Content generation (social posts, listing descriptions)
- Intent detection and tool calling
- Agent execution

**Current Architecture:**
- Single-model approach (Phase 1)
- Streaming support for real-time responses
- Token usage tracking and limits
- Hash-based embeddings (not semantic) - identified as improvement opportunity

**Planned Multi-Model Approach (Phase 3):**
- Gemini: Content creation
- Perplexity: Research and market analysis
- OpenAI: Specific use cases requiring GPT-4 capabilities
- Model Router: Automatic selection based on task type

---

## Model Comparison Matrix

| Feature | Claude Sonnet 4 | GPT-4 Turbo | Gemini 2.0 Flash |
|---------|----------------|-------------|------------------|
| **Input Cost (per 1M tokens)** | $3.00 | $10.00 | $0.10 |
| **Output Cost (per 1M tokens)** | $15.00 | $30.00 | $0.40 |
| **Context Window** | 1.0M tokens | 128K tokens | 1.0M tokens |
| **Max Output Tokens** | 8,192 | 4,096 | 8,192 |
| **Speed (tokens/sec)** | 58 | ~50-60 | Fastest |
| **Latency (TTFT)** | 1.25s | ~1-2s | <1s |
| **Multimodal** | ✅ (text, images) | ✅ (text, images) | ✅ (text, images, audio, video) |
| **Tool Calling** | ✅ (parallel) | ✅ | ✅ |
| **Document Analysis** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Writing Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Cost Efficiency** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Real Estate Knowledge** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

**Cost Comparison (Relative to Claude):**
- Gemini 2.0 Flash: **97% cheaper** input, **97% cheaper** output
- GPT-4 Turbo: **233% more expensive** input, **100% more expensive** output

---

## Use Case Analysis

### 1. Document Intelligence & RAG

**Current Use:** Claude Sonnet 4 for all document analysis

**Requirements:**
- Contract analysis (purchase agreements, leases)
- Inspection report parsing
- Multi-document comparison
- Legal clause extraction
- Risk identification

**Model Performance:**

| Model | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| **Claude Sonnet 4** | ⭐⭐⭐⭐⭐ Excellent legal document parsing, multimodal document interpretation, 1M context for long contracts | Higher cost for simple extractions | Complex contract analysis, multi-document workflows |
| **GPT-4 Turbo** | ⭐⭐⭐⭐ Strong accuracy, good at structured extraction | 128K context limit, higher cost | Structured data extraction, fallback option |
| **Gemini 2.0 Flash** | ⭐⭐⭐⭐ Multimodal vision, 1M context, very fast | Less specialized for legal text | Image-heavy documents, bulk processing |

**Recommendation:** 
- **Primary:** Claude Sonnet 4 (current) - best for complex legal analysis
- **Secondary:** Gemini 2.0 Flash for image-heavy documents (inspection photos, property images)
- **Fallback:** GPT-4 Turbo for structured extraction tasks

**Cost Impact:** Using Gemini for image-heavy documents could save 97% on processing costs.

---

### 2. AI Chat Interface

**Current Use:** Claude Sonnet 4 for conversational real estate expert

**Requirements:**
- Natural conversation flow
- Real estate domain knowledge
- Tool calling (property search, calculators)
- Intent detection
- Multi-turn conversations

**Model Performance:**

| Model | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| **Claude Sonnet 4** | ⭐⭐⭐⭐⭐ Excellent conversation quality, parallel tool use, strong reasoning | Higher cost for simple queries | Complex multi-step conversations, tool orchestration |
| **GPT-4 Turbo** | ⭐⭐⭐⭐ Good conversation, reliable tool calling | Higher cost, 128K context limit | Fallback for Claude, specific use cases |
| **Gemini 2.0 Flash** | ⭐⭐⭐ Fast responses, cost-effective | Less nuanced conversation, weaker reasoning | Simple queries, high-volume interactions |

**Recommendation:**
- **Primary:** Claude Sonnet 4 (current) - best conversation quality
- **Router Logic:** Use Gemini 2.0 Flash for simple queries (property lookups, basic questions)
- **Fallback:** GPT-4 Turbo on Claude rate limits

**Cost Impact:** Routing 30% of simple queries to Gemini could reduce chat costs by 25-30%.

---

### 3. Content Generation

**Current Use:** Claude Sonnet 4 for all content generation

**Requirements:**
- Listing descriptions from photos
- Social media posts
- Email templates
- Marketing materials
- SEO-optimized content

**Model Performance:**

| Model | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| **Claude Sonnet 4** | ⭐⭐⭐⭐⭐ Premium writing quality, natural tone | Higher cost for bulk generation | High-value content (listings, marketing) |
| **GPT-4 Turbo** | ⭐⭐⭐⭐ Good writing, reliable output | Higher cost | Fallback option |
| **Gemini 2.0 Flash** | ⭐⭐⭐ Fast, cost-effective, multimodal | Lower writing quality | Bulk generation, social posts, drafts |

**Recommendation:**
- **High-Value:** Claude Sonnet 4 for listing descriptions, marketing materials
- **Bulk:** Gemini 2.0 Flash for social media posts, email drafts, bulk content
- **Fallback:** GPT-4 Turbo

**Cost Impact:** Using Gemini for 50% of content generation could reduce costs by 40-50%.

---

### 4. Agent Automation & Tool Calling

**Current Use:** Claude Sonnet 4 for agent execution and tool calling

**Requirements:**
- Multi-step task execution
- Tool orchestration
- Error handling
- Complex reasoning

**Model Performance:**

| Model | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| **Claude Sonnet 4** | ⭐⭐⭐⭐⭐ Parallel tool use, interleaved thinking, complex reasoning | Higher cost | Complex multi-step agents, critical workflows |
| **GPT-4 Turbo** | ⭐⭐⭐⭐ Reliable tool calling, good reasoning | Higher cost | Fallback, specific agent types |
| **Gemini 2.0 Flash** | ⭐⭐⭐ Fast, cost-effective | Weaker complex reasoning | Simple single-step agents, high-volume tasks |

**Recommendation:**
- **Complex Agents:** Claude Sonnet 4 (CMA Analyst, Contract Reviewer, Offer Analyzer)
- **Simple Agents:** Gemini 2.0 Flash (Social Media Manager, basic Follow-Up Assistant)
- **Fallback:** GPT-4 Turbo

**Cost Impact:** Routing simple agents to Gemini could reduce agent execution costs by 30-40%.

---

### 5. Research & Market Analysis

**Current Use:** Not implemented (planned: Perplexity)

**Requirements:**
- Neighborhood data
- School ratings
- Market trends
- Comparable sales research

**Model Performance:**

| Model | Strengths | Weaknesses | Best For |
|-------|-----------|------------|----------|
| **Claude Sonnet 4** | ⭐⭐⭐⭐ Good analysis, reasoning | No real-time data access | Analysis of provided data |
| **GPT-4 Turbo** | ⭐⭐⭐⭐ Good analysis | No real-time data access | Analysis of provided data |
| **Gemini 2.0 Flash** | ⭐⭐⭐⭐ Google Search grounding, cost-effective | Less specialized | Research tasks with web access |
| **Perplexity** | ⭐⭐⭐⭐⭐ Real-time web search, citations | Not evaluated in this report | Research and market analysis (planned) |

**Recommendation:**
- **Primary:** Perplexity (as planned) - best for real-time research
- **Secondary:** Gemini 2.0 Flash with Google Search grounding
- **Analysis:** Claude Sonnet 4 for analyzing research results

---

## Cost Analysis

### Current Monthly Cost Estimate (Single Model)

**Assumptions:**
- 1,000 active users
- Average: 50 chat messages/user/month
- Average: 10 document analyses/user/month
- Average: 20 content generations/user/month
- Average: 5 agent executions/user/month

**Token Estimates:**
- Chat: 2,000 tokens/query (input) + 500 tokens (output) = 2,500 tokens
- Document Analysis: 10,000 tokens (input) + 2,000 tokens (output) = 12,000 tokens
- Content Generation: 1,000 tokens (input) + 1,500 tokens (output) = 2,500 tokens
- Agent Execution: 3,000 tokens (input) + 1,000 tokens (output) = 4,000 tokens

**Monthly Usage:**
- Chat: 1,000 users × 50 queries × 2,500 tokens = 125M tokens
- Documents: 1,000 users × 10 analyses × 12,000 tokens = 120M tokens
- Content: 1,000 users × 20 generations × 2,500 tokens = 50M tokens
- Agents: 1,000 users × 5 executions × 4,000 tokens = 20M tokens
- **Total: 315M tokens/month**

**Claude Sonnet 4 Cost:**
- Input: 315M × 70% = 220.5M tokens × $3/1M = **$661.50**
- Output: 315M × 30% = 94.5M tokens × $15/1M = **$1,417.50**
- **Total: $2,079/month**

### Optimized Multi-Model Cost Estimate

**Routing Strategy:**
- 30% of chat queries → Gemini (simple queries)
- 50% of content generation → Gemini (bulk content)
- 30% of agent executions → Gemini (simple agents)
- Document analysis → Claude (complex) + Gemini (image-heavy, 20%)

**Optimized Usage:**
- Chat (Claude): 87.5M tokens → $131.25 input + $262.50 output = **$393.75**
- Chat (Gemini): 37.5M tokens → $3.75 input + $15.00 output = **$18.75**
- Documents (Claude): 96M tokens → $144 input + $288 output = **$432**
- Documents (Gemini): 24M tokens → $2.40 input + $9.60 output = **$12**
- Content (Claude): 25M tokens → $37.50 input + $56.25 output = **$93.75**
- Content (Gemini): 25M tokens → $2.50 input + $10 output = **$12.50**
- Agents (Claude): 14M tokens → $21 input + $42 output = **$63**
- Agents (Gemini): 6M tokens → $0.60 input + $2.40 output = **$3**

**Total Optimized: $1,029/month**

**Savings: $1,050/month (50.5% reduction)**

---

## Model-Specific Recommendations

### Claude Sonnet 4 (Current Primary)

**Keep For:**
- ✅ Complex document analysis (contracts, legal documents)
- ✅ High-value content generation (listing descriptions, marketing)
- ✅ Complex multi-step agent workflows
- ✅ Critical AI chat conversations requiring reasoning
- ✅ Tool orchestration and parallel tool calling

**Strengths:**
- Best writing quality
- Excellent legal document parsing
- Strong reasoning capabilities
- 1M token context window
- Parallel tool use

**Cost Optimization:**
- Use prompt caching (up to 90% savings on repeated prompts)
- Batch processing for non-real-time tasks (50% savings)

---

### Gemini 2.0 Flash (Recommended Addition)

**Use For:**
- ✅ Bulk content generation (social posts, email drafts)
- ✅ Simple chat queries (property lookups, basic questions)
- ✅ Image-heavy document analysis (inspection photos, property images)
- ✅ High-volume agent executions (simple workflows)
- ✅ Research tasks with Google Search grounding

**Strengths:**
- 97% cost reduction vs Claude
- Fastest response times
- 1M token context window
- Multimodal (text, images, audio, video)
- Google Search integration

**Limitations:**
- Lower writing quality than Claude
- Weaker complex reasoning
- Less specialized for legal text

**Implementation Priority:** P0 - Highest ROI for cost optimization

---

### GPT-4 Turbo (Fallback Option)

**Use For:**
- ✅ Fallback when Claude rate limits hit
- ✅ Specific use cases requiring GPT-4 capabilities
- ✅ Structured data extraction tasks
- ✅ A/B testing against Claude

**Strengths:**
- Reliable performance
- Good tool calling
- Strong structured output

**Limitations:**
- Higher cost than Claude
- 128K context limit (vs 1M for Claude/Gemini)
- Less specialized for real estate

**Implementation Priority:** P1 - Fallback and redundancy

---

## Implementation Roadmap

### Phase 1: Cost Optimization (Q1 2026) - P0

**Goal:** Reduce AI costs by 40-50% through intelligent routing

**Tasks:**
1. **Implement Model Router** (PM-Intelligence)
   - Simple query detection (intent classification)
   - Route simple queries to Gemini 2.0 Flash
   - Keep complex queries on Claude Sonnet 4
   - Estimated effort: Medium (M)

2. **Content Generation Routing** (PM-Intelligence)
   - Route bulk content (social posts, drafts) to Gemini
   - Keep high-value content (listings, marketing) on Claude
   - Estimated effort: Small (S)

3. **Cost Monitoring Dashboard** (PM-Intelligence)
   - Track costs per model
   - Monitor routing effectiveness
   - Alert on cost anomalies
   - Estimated effort: Small (S)

**Expected Impact:**
- 40-50% cost reduction
- Maintain quality for critical use cases
- Faster responses for simple queries

---

### Phase 2: Multimodal Enhancement (Q2 2026) - P1

**Goal:** Leverage Gemini's multimodal capabilities for image-heavy workflows

**Tasks:**
1. **Image-Heavy Document Analysis** (PM-Intelligence)
   - Route inspection photos, property images to Gemini
   - Keep legal documents on Claude
   - Estimated effort: Medium (M)

2. **Listing Description Generation** (PM-Intelligence)
   - Use Gemini for photo analysis
   - Use Claude for final writing
   - Hybrid approach for best results
   - Estimated effort: Medium (M)

**Expected Impact:**
- Improved image analysis capabilities
- Cost savings on image-heavy documents
- Better listing descriptions from photos

---

### Phase 3: Advanced Routing & Fallback (Q2-Q3 2026) - P1

**Goal:** Implement GPT-4 Turbo fallback and advanced routing logic

**Tasks:**
1. **GPT-4 Turbo Integration** (PM-Intelligence)
   - Fallback when Claude rate limits hit
   - Specific use cases requiring GPT-4
   - Estimated effort: Small (S)

2. **Advanced Routing Logic** (PM-Intelligence)
   - User preference overrides (premium feature)
   - A/B testing infrastructure
   - Performance-based routing
   - Estimated effort: Medium (M)

**Expected Impact:**
- Redundancy and reliability
- Premium user customization
- Data-driven model selection

---

## Risk Assessment

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Quality degradation** from routing to Gemini | Medium | High | Careful intent classification, A/B testing, fallback to Claude |
| **API reliability** (Gemini/OpenAI outages) | Low | Medium | Multi-model redundancy, fallback chains |
| **Cost overruns** if routing logic fails | Low | Medium | Cost monitoring dashboard, alerts, manual overrides |
| **Complexity increase** (multi-model management) | High | Medium | Clear routing rules, monitoring, documentation |

### Mitigation Strategies

1. **Gradual Rollout:** Start with low-risk use cases (bulk content), expand gradually
2. **A/B Testing:** Compare Claude vs Gemini on same queries, measure quality metrics
3. **Fallback Chains:** Always have Claude as fallback, GPT-4 as secondary fallback
4. **Cost Monitoring:** Real-time cost tracking, alerts on anomalies
5. **User Feedback:** Monitor user satisfaction, adjust routing based on feedback

---

## Recommendations for PM-Orchestrator

### REC-006: Implement Multi-Model Cost Optimization (P0 - Critical)

**Recommendation:**
Implement intelligent model routing to reduce AI costs by 40-50% while maintaining quality for critical use cases.

**Rationale:**
- Gemini 2.0 Flash offers 97% cost reduction vs Claude
- Smart routing can maintain quality while reducing costs
- Estimated savings: $1,050/month at 1,000 users scale
- Aligns with Phase 3 multi-model roadmap

**Impact:**
- **User Impact:** 3/5 (moderate - faster responses for simple queries)
- **Vision Alignment:** 5/5 (supports cost-effective scaling)
- **Effort:** Medium (M)
- **Owner:** PM-Intelligence
- **Timeline:** Q1 2026

**Implementation:**
1. Model router with intent classification
2. Route simple queries to Gemini
3. Route bulk content to Gemini
4. Keep complex tasks on Claude
5. Cost monitoring dashboard

**Competitive Context:**
- Most competitors use single-model approach
- Cost optimization provides competitive advantage
- Enables more aggressive pricing or higher margins

---

### REC-007: Add Gemini 2.0 Flash for Content Generation (P0 - Critical)

**Recommendation:**
Use Gemini 2.0 Flash for bulk content generation (social posts, email drafts) while keeping high-value content (listings, marketing) on Claude.

**Rationale:**
- 97% cost reduction for bulk content
- Fast response times
- Good enough quality for drafts and social posts
- High-value content still uses premium Claude quality

**Impact:**
- **User Impact:** 3/5 (moderate - faster content generation)
- **Vision Alignment:** 5/5 (cost-effective scaling)
- **Effort:** Small (S)
- **Owner:** PM-Intelligence
- **Timeline:** Q1 2026

**Implementation:**
- Content type classification
- Route bulk content to Gemini
- Route high-value content to Claude
- User preference override (premium)

---

### REC-008: Evaluate GPT-4 Turbo as Fallback (P1 - High)

**Recommendation:**
Integrate GPT-4 Turbo as fallback option for Claude rate limits and specific use cases.

**Rationale:**
- Redundancy improves reliability
- Fallback for rate limits
- Specific use cases may benefit from GPT-4
- A/B testing capabilities

**Impact:**
- **User Impact:** 4/5 (high - improved reliability)
- **Vision Alignment:** 4/5 (supports reliability goals)
- **Effort:** Small (S)
- **Owner:** PM-Intelligence
- **Timeline:** Q2 2026

**Implementation:**
- GPT-4 Turbo API integration
- Fallback chain: Claude → GPT-4 → Error
- Rate limit detection and routing
- A/B testing infrastructure

---

## Research Methodology

### Sources Used
1. **Web Search:** Model comparison articles, pricing pages, capability assessments
2. **Codebase Analysis:** Current Smart Agent implementation, PRD, architecture docs
3. **Cost Analysis:** API pricing pages, token usage estimates
4. **Use Case Analysis:** Real estate document processing benchmarks, AI chat evaluation

### Research Limitations
- Token usage estimates are approximations based on typical patterns
- Cost savings projections assume successful routing implementation
- Quality comparisons based on general benchmarks, not Smart Agent-specific testing
- Gemini 2.0 Flash is newer, less real-world data available

### Confidence Level
- **High Confidence:** Claude Sonnet 4 capabilities (current implementation), pricing data
- **Medium Confidence:** Gemini 2.0 Flash performance (newer model), cost savings projections
- **Low Confidence:** GPT-4 Turbo real estate-specific performance (limited data)

---

## Next Steps

1. **Update Backlog:** Mark RES-002 as complete
2. **Create Recommendations:** Submit REC-006, REC-007, REC-008 to PM-Orchestrator
3. **Handoff to PM-Intelligence:** Share implementation roadmap for model router
4. **Monitor:** Track model pricing changes, new model releases
5. **Re-evaluate:** Quarterly review of model landscape and routing effectiveness

---

## Appendix: Model Pricing Reference

### Claude Sonnet 4
- **Input:** $3.00 per 1M tokens
- **Output:** $15.00 per 1M tokens
- **Cached Input:** $0.30 per 1M tokens (90% savings)
- **Batch Processing:** 50% savings
- **Context:** 1.0M tokens
- **Source:** Anthropic API Pricing (2026)

### GPT-4 Turbo
- **Input:** $10.00 per 1M tokens
- **Output:** $30.00 per 1M tokens
- **Batch API:** 50% savings
- **Context:** 128K tokens
- **Source:** OpenAI API Pricing (2026)

### Gemini 2.0 Flash
- **Input:** $0.10 per 1M tokens (Developer API)
- **Output:** $0.40 per 1M tokens (Developer API)
- **Long Context (>200K):** $0.20/$2.00 per 1M tokens (Vertex AI)
- **Batch API:** 50% savings
- **Context:** 1.0M tokens
- **Source:** Google Gemini API Pricing (2026)

---

*Report prepared by PM-Research | The Scout*  
*Next Review:** Quarterly (April 2026)*
