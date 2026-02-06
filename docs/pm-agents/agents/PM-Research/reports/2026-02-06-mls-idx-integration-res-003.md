# MLS/IDX Integration Options and Capabilities Research
**Report ID:** RES-003  
**Date:** February 6, 2026  
**Author:** PM-Research  
**Status:** Complete

---

## Executive Summary

This report evaluates MLS (Multiple Listing Service) and IDX (Internet Data Exchange) integration options for Smart Agent, analyzing technical approaches, provider capabilities, compliance requirements, and implementation considerations.

**Key Finding:** Smart Agent's Phase 1 manual entry approach is appropriate for MVP, but Phase 3 IDX integration will require careful provider selection and compliance management. RESO Web API is the modern standard (90%+ MLS adoption), with Bridge Interactive and Spark API as leading third-party providers. Integration complexity is high due to MLS-specific compliance rules, but third-party providers can significantly reduce implementation effort.

**Recommendation Priority:** P1 - High priority for Phase 3 roadmap planning

---

## Current State Analysis

### Smart Agent's Current Implementation (Phase 1)

**Approach:** Manual Property Entry
- Agents manually enter property information
- CSV/Excel import for bulk uploads
- External property tracking (Zillow, public records) via `external_properties` table
- No MLS dependency required for MVP

**Database Schema:**
- `properties` table: User-managed properties
- `external_properties` table: External listings (Zillow, Redfin, Realtor.com)
- `property_source` enum: `'zillow' | 'redfin' | 'realtor' | 'manual'`
- Schema designed to accommodate future MLS integration:
  - `mls_id` field ready for external reference
  - `mls_source` field for data origin tracking
  - `last_mls_sync` timestamp for sync management
  - `mls_raw_data` JSON field for preserving original MLS data

**Planned Integration (Phase 3):**
- IDX data feeds via RESO Web API
- Third-party providers: Bridge Interactive, Spark API
- Pricing: $49/month add-on (planned)
- One-way sync: MLS → Smart Agent

**Future Vision (Phase 4):**
- Two-way MLS integration
- Direct listing creation from Smart Agent → MLS
- AI-generated listings auto-submitted to MLS
- Real-time status sync

---

## MLS/IDX Integration Landscape

### Understanding MLS and IDX

**MLS (Multiple Listing Service):**
- Regional databases of property listings
- Managed by local real estate boards/associations
- Contains active, pending, and sold listings
- Access restricted to licensed real estate professionals

**IDX (Internet Data Exchange):**
- Framework allowing brokers to display other brokers' listings on their websites
- Requires MLS participant authorization
- Subject to strict compliance rules
- Data refresh requirements (typically 12-24 hours)

**Key Challenge:** There are 600+ MLSs in the U.S., each with different rules, data formats, and access requirements. Direct integration with each MLS is impractical.

---

## Integration Options Analysis

### Option 1: RESO Web API (Direct MLS Integration)

**Overview:**
- Modern RESTful API standard replacing deprecated RETS
- Industry standard for MLS data exchange
- Built on open technology standards (REST, JSON, OAuth)
- 90%+ of MLSs now have RESO-certified Web API services

**Technical Specifications:**
- **Format:** JSON (vs. RETS XML)
- **Architecture:** RESTful API
- **Security:** OAuth 2.0, TLS 1.2+
- **Data Standard:** RESO Data Dictionary 2.0/2.1
- **Processing:** Real-time, on-demand (vs. RETS batch)
- **Scalability:** High (vs. RETS limited)

**Advantages:**
- ✅ Direct relationship with MLS
- ✅ No third-party fees (beyond MLS licensing)
- ✅ Full control over data flow
- ✅ Industry standard (future-proof)
- ✅ Real-time data access

**Disadvantages:**
- ❌ Requires separate integration with each MLS
- ❌ Complex compliance management per MLS
- ❌ High implementation effort (600+ MLSs)
- ❌ Ongoing maintenance for each MLS relationship
- ❌ MLS-specific rule variations

**Implementation Effort:** Very Large (VL)
- Per-MLS integration: 2-4 weeks
- Compliance management: Ongoing
- Total effort for multi-MLS coverage: 6-12 months

**Cost:**
- MLS licensing fees: Varies by MLS ($0-$500+/month)
- Development: High (per-MLS integration)
- Maintenance: Ongoing per MLS

**Best For:**
- Large brokerages with single MLS focus
- Platforms targeting specific geographic markets
- Organizations with dedicated MLS compliance team

---

### Option 2: Bridge Interactive (Third-Party Aggregator)

**Overview:**
- Platinum Certified RESO Web API provider
- Aggregates data from multiple MLSs via single API
- Handles MLS relationships and compliance
- Access to U.S. and Canadian MLSs

**Key Features:**
- Single query access to multiple MLSs
- RESO Data Dictionary compliance
- Data replication options (query or replicate)
- Centralized dashboard for MLS access requests
- No Bridge service fees (MLS fees handled separately)

**Technical Approach:**
- **API Type:** RESO Web API (certified)
- **Data Format:** RESO Data Dictionary standardized
- **Access Method:** Query Bridge database or replicate to own infrastructure
- **Authentication:** OAuth 2.0, API keys
- **Coverage:** Multiple MLSs via single integration

**Advantages:**
- ✅ Single integration for multiple MLSs
- ✅ Bridge handles MLS relationships
- ✅ RESO-certified (industry standard)
- ✅ No Bridge service fees
- ✅ Centralized access management
- ✅ Data replication options

**Disadvantages:**
- ⚠️ Still requires MLS approval (via Bridge)
- ⚠️ MLS licensing fees still apply
- ⚠️ Dependent on Bridge's MLS coverage
- ⚠️ Less control than direct integration

**Implementation Effort:** Medium (M)
- Single API integration: 2-4 weeks
- MLS access requests: 1-2 weeks per MLS
- Compliance: Managed by Bridge

**Cost:**
- Bridge service fees: $0 (no additional fees)
- MLS licensing fees: Varies by MLS ($0-$500+/month)
- Development: Medium (single API)

**Getting Started:**
- Contact local MLS and request Bridge API access
- Or contact Bridge directly: api@bridgeinteractive.com
- Bridge facilitates MLS approval process

**Best For:**
- Platforms targeting multiple MLS markets
- Startups needing quick MLS access
- Organizations wanting to avoid per-MLS integration complexity

---

### Option 3: Spark API (Flex MLS Platform)

**Overview:**
- Developer platform by Flex MLS
- Modern API alternative to RETS
- IDX data access and management
- Multiple service categories (IDX, contacts, leads, etc.)

**Key Features:**
- IDX data access and preferences
- Contact and account management
- Developer tools (API keys, billing, usage tracking, webhooks)
- Broker distributions and tours
- Lead management through consumer portals
- Email links and listing metadata translation

**Technical Approach:**
- **API Type:** RESTful API (modern)
- **Authentication:** OpenID Connect, SAML
- **Coverage:** Flex MLS markets (not all MLSs)
- **Integration Tools:** Flexmls WordPress Plugin, SmartFrames

**Advantages:**
- ✅ Modern API (not RETS)
- ✅ Developer-friendly tools
- ✅ Multiple service categories beyond IDX
- ✅ Webhook support for real-time updates
- ✅ Usage tracking and billing tools

**Disadvantages:**
- ❌ Limited to Flex MLS markets (not universal)
- ⚠️ Pricing varies by MLS and application type
- ⚠️ Requires MLS-specific approval
- ⚠️ Less coverage than Bridge Interactive

**Implementation Effort:** Medium (M)
- API integration: 2-4 weeks
- MLS approval: 1-2 weeks per MLS
- Flex MLS markets only

**Cost:**
- Pricing: Varies by MLS and data plan type
- Development: Medium (single API)
- Subscription: Per MLS, per application type

**Best For:**
- Platforms targeting Flex MLS markets
- Organizations needing lead management features
- Developers wanting comprehensive developer tools

---

### Option 4: MLS IDX API (Third-Party Service)

**Overview:**
- Service providing real-time MLS property data access
- RESTful API with five core transactions
- Handles data ownership and storage options

**Key Features:**
- Real-time data access
- Download and store data on own servers
- Customizable integration
- Scalable from startups to enterprises
- Comprehensive property data (descriptions, photos, pricing, location)

**Technical Specifications:**
- **Architecture:** REST (5 core transactions: Login, Metadata, Search, GetObject, Logout)
- **Security:** TLS v1.2+, HTTPS required
- **Data Formats:** COMPACT, COMPACT-DECODED, STANDARD-XML
- **Authentication:** HTTP Basic, API keys

**Advantages:**
- ✅ Real-time data access
- ✅ Data ownership (store on own servers)
- ✅ Customizable integration
- ✅ Scalable architecture
- ✅ Quick onboarding (24-hour verification)

**Disadvantages:**
- ⚠️ Requires MLS authorization and licensed REALTOR/brokerage
- ⚠️ Pricing not publicly disclosed
- ⚠️ Less established than Bridge/Spark
- ⚠️ Limited information available

**Implementation Effort:** Medium (M)
- API integration: 2-4 weeks
- MLS authorization: Required
- Onboarding: 24 hours after verification

**Cost:**
- Pricing: Not publicly disclosed (contact for quote)
- Development: Medium (REST API)

**Best For:**
- Organizations needing real-time data
- Platforms wanting data ownership
- Startups needing quick setup

---

## Compliance Requirements & Challenges

### MLS IDX Compliance Standards

**Data Display Requirements:**
- Display MLS data exactly as provided (no alterations to descriptions, photos, prices)
- Always show listing brokerage name and required disclaimers
- Keep listings updated within 24-48 hours for status changes
- Refresh all MLS downloads and IDX displays at least every 12 hours

**Authorization & Access:**
- Obtain written participant consent for displaying listings through IDX
- Notify MLS of intent to display IDX information
- Provide direct access for compliance monitoring
- Participants who refuse consent cannot display other participants' data

**Data Usage Restrictions:**
- Use IDX listings only for display purposes (not for other purposes)
- Cannot distribute MLS database to unauthorized persons
- Select listings based only on objective criteria (geography, price, property type, listing type)

**Violation Penalties:**
- Fines up to $15,000
- Loss of MLS access privileges

### Compliance Best Practices

1. **Quarterly Compliance Audits:** MLS rules evolve, regular audits required
2. **MLS-Approved Tools:** Use MLS-approved IDX plugins/services
3. **Required Data Fields:** Ensure all required fields and broker details display correctly
4. **Attribution:** Always display listing brokerage information
5. **Refresh Frequency:** Maintain 12-24 hour refresh cadence

### Implementation Challenges

**Challenge 1: MLS Fragmentation**
- 600+ MLSs in the U.S., each with different rules
- Direct integration requires per-MLS work
- **Solution:** Third-party aggregators (Bridge, Spark) reduce complexity

**Challenge 2: Compliance Management**
- Each MLS has unique compliance requirements
- Rules change frequently
- Violations can result in fines or access loss
- **Solution:** Use certified providers, implement compliance monitoring

**Challenge 3: Data Standardization**
- MLSs use different field names and formats
- RESO Data Dictionary helps but not universal
- **Solution:** RESO-certified providers normalize data

**Challenge 4: Access Authorization**
- Requires licensed REALTOR/brokerage
- MLS approval process varies (1-4 weeks)
- Some MLSs require office/association sign-off
- **Solution:** Third-party providers facilitate approval process

**Challenge 5: Cost Variability**
- MLS fees vary widely ($0-$500+/month)
- Some MLSs charge per user, others flat fee
- Development costs vary by approach
- **Solution:** Third-party aggregators provide cost predictability

---

## Cost Analysis

### Cost Comparison Matrix

| Provider | Service Fees | MLS Fees | Development Effort | Total First Year (Est.) |
|----------|--------------|----------|-------------------|------------------------|
| **RESO Web API (Direct)** | $0 | $0-$500/mo per MLS | Very Large (VL) | $50K-$200K+ dev + MLS fees |
| **Bridge Interactive** | $0 | $0-$500/mo per MLS | Medium (M) | $20K-$40K dev + MLS fees |
| **Spark API** | Varies | Varies by MLS | Medium (M) | $20K-$40K dev + fees |
| **MLS IDX API** | Contact | Contact | Medium (M) | $20K-$40K dev + fees |

**Assumptions:**
- Development: $100K/year engineering cost
- MLS fees: Average $100/month per MLS (varies widely)
- Multi-MLS coverage: 5-10 MLSs for national platform

### Cost Breakdown by Approach

**Direct RESO Web API:**
- Development: $50K-$200K+ (per-MLS integration)
- MLS fees: $0-$500/month per MLS
- Maintenance: $20K-$50K/year (ongoing per-MLS support)
- **Total Year 1:** $70K-$250K+ (excluding MLS fees)

**Bridge Interactive:**
- Development: $20K-$40K (single API integration)
- Bridge fees: $0
- MLS fees: $0-$500/month per MLS
- Maintenance: $5K-$10K/year
- **Total Year 1:** $25K-$50K (excluding MLS fees)

**Spark API:**
- Development: $20K-$40K (single API integration)
- Spark fees: Varies (contact for pricing)
- MLS fees: Varies by MLS
- Maintenance: $5K-$10K/year
- **Total Year 1:** $25K-$50K+ (excluding MLS fees)

**Recommendation:** Bridge Interactive offers best cost/effort ratio for multi-MLS coverage.

---

## Technical Implementation Considerations

### Data Architecture

**Current Smart Agent Schema:**
```sql
-- External properties table (already exists)
CREATE TABLE external_properties (
  id UUID PRIMARY KEY,
  source property_source NOT NULL, -- 'zillow' | 'redfin' | 'realtor' | 'manual'
  external_id TEXT NOT NULL,
  mls_id TEXT, -- Ready for MLS integration
  mls_source TEXT, -- MLS identifier
  last_mls_sync TIMESTAMPTZ,
  mls_raw_data JSONB, -- Preserve original MLS data
  -- ... property fields
);
```

**MLS Integration Schema Additions:**
```sql
-- Add MLS source to enum
ALTER TYPE property_source ADD VALUE 'mls';

-- MLS sync tracking table
CREATE TABLE mls_sync_logs (
  id UUID PRIMARY KEY,
  mls_source TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'full' | 'incremental'
  records_processed INTEGER,
  records_added INTEGER,
  records_updated INTEGER,
  records_deleted INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  status TEXT -- 'success' | 'failed' | 'partial'
);
```

### Sync Strategy

**Option 1: Scheduled Full Sync**
- Daily full sync of all listings
- Simple but resource-intensive
- Good for initial implementation

**Option 2: Incremental Sync**
- Sync only changed listings
- More efficient but requires change tracking
- Requires MLS support for change feeds

**Option 3: Real-Time Webhooks**
- Receive updates as they happen
- Most efficient but requires webhook support
- Available via Spark API, some MLSs

**Recommendation:** Start with scheduled full sync (daily), evolve to incremental/real-time.

### Data Mapping

**RESO Data Dictionary Fields:**
- Standardized field names across MLSs
- Bridge Interactive maps to RESO automatically
- Direct RESO requires manual mapping per MLS

**Key Property Fields:**
- `ListingKey` → `mls_id`
- `ListPrice` → `price`
- `BedroomsTotal` → `bedrooms`
- `BathroomsTotalInteger` → `bathrooms`
- `LivingArea` → `square_feet`
- `PropertyType` → `property_type`
- `StandardStatus` → `status`
- `PublicRemarks` → `description`
- `Media` → `photos[]`

---

## Provider Comparison Summary

| Criteria | RESO Web API (Direct) | Bridge Interactive | Spark API | MLS IDX API |
|----------|---------------------|-------------------|-----------|-------------|
| **Coverage** | All RESO-certified MLSs | Multiple MLSs (U.S./Canada) | Flex MLS markets | Contact for details |
| **Integration Effort** | Very Large (per-MLS) | Medium (single API) | Medium (single API) | Medium (single API) |
| **Service Fees** | $0 | $0 | Varies | Contact |
| **Compliance Management** | Self-managed | Bridge handles | Self-managed | Self-managed |
| **Data Standardization** | RESO (per MLS) | RESO (normalized) | Flex MLS format | Custom |
| **Real-Time Updates** | Depends on MLS | Supported | Webhooks available | Supported |
| **Developer Tools** | Varies by MLS | Centralized dashboard | Comprehensive | Basic |
| **Best For** | Single MLS focus | Multi-MLS coverage | Flex MLS markets | Real-time needs |

---

## Recommendations for PM-Orchestrator

### REC-009: Prioritize Bridge Interactive for Phase 3 IDX Integration (P1 - High)

**Recommendation:**
Select Bridge Interactive as the primary IDX integration provider for Phase 3, with RESO Web API direct integration as a future option for specific MLS markets.

**Rationale:**
- Single API integration covers multiple MLSs (reduces development effort by 80%+)
- Bridge handles MLS relationships and compliance (reduces operational overhead)
- RESO-certified (industry standard, future-proof)
- No Bridge service fees (only MLS licensing fees apply)
- Centralized access management simplifies onboarding
- Data replication options provide flexibility

**Impact:**
- **User Impact:** 5/5 (transformative - enables MLS property search)
- **Vision Alignment:** 5/5 (core Phase 3 feature)
- **Effort:** Medium (M) - Single API integration vs. per-MLS
- **Owner:** PM-Integration
- **Timeline:** Q2-Q3 2026 (Phase 3)

**Implementation:**
1. Contact Bridge Interactive: api@bridgeinteractive.com
2. Request MLS access via Bridge dashboard
3. Integrate Bridge API (RESO Web API)
4. Map RESO fields to Smart Agent schema
5. Implement sync job (daily full sync initially)
6. Add MLS compliance UI (attribution, disclaimers)
7. Test with pilot MLS markets

**Cost Estimate:**
- Development: $20K-$40K (single API vs. $50K-$200K+ per-MLS)
- Bridge fees: $0
- MLS fees: $0-$500/month per MLS (varies)
- Maintenance: $5K-$10K/year

**Competitive Context:**
- Follow Up Boss: Limited MLS integration (200+ integrations but not comprehensive)
- Chime: Includes IDX website builder (competitive feature)
- Smart Agent: Phase 3 IDX integration will enable competitive MLS search

---

### REC-010: Implement MLS Compliance Framework (P1 - High)

**Recommendation:**
Build MLS compliance framework alongside IDX integration to ensure ongoing adherence to MLS rules and prevent violations.

**Rationale:**
- MLS compliance violations can result in $15K fines or access loss
- MLS rules vary and change frequently
- Compliance is required for IDX display
- Automated compliance reduces risk

**Impact:**
- **User Impact:** 3/5 (moderate - enables MLS integration)
- **Vision Alignment:** 5/5 (required for Phase 3)
- **Effort:** Small (S) - Framework implementation
- **Owner:** PM-Integration + PM-Experience (UI)
- **Timeline:** Q2 2026 (alongside IDX integration)

**Implementation:**
1. MLS compliance checklist system
2. Required attribution display (listing brokerage, disclaimers)
3. Data refresh monitoring (12-24 hour requirement)
4. Quarterly compliance audit process
5. MLS rule change tracking
6. Compliance dashboard for admins

**Competitive Context:**
- All MLS-integrated platforms must maintain compliance
- Automated compliance provides competitive advantage
- Reduces risk of fines/access loss

---

### REC-011: Evaluate Direct RESO Web API for High-Value MLS Markets (P2 - Medium)

**Recommendation:**
Consider direct RESO Web API integration for specific high-value MLS markets where Bridge Interactive coverage is limited or costs are prohibitive.

**Rationale:**
- Some MLSs may not be available via Bridge
- Direct integration provides more control
- May be cost-effective for single large MLS markets
- Provides fallback if Bridge coverage gaps exist

**Impact:**
- **User Impact:** 3/5 (moderate - extends MLS coverage)
- **Vision Alignment:** 4/5 (supports Phase 3 goals)
- **Effort:** Large (L) - Per-MLS integration
- **Owner:** PM-Integration
- **Timeline:** Q3-Q4 2026 (after Bridge integration)

**Implementation:**
1. Identify high-value MLS markets not covered by Bridge
2. Evaluate direct RESO Web API integration cost/benefit
3. Prioritize MLSs with large agent populations
4. Implement per-MLS integration for selected markets
5. Maintain alongside Bridge integration

**Competitive Context:**
- Provides coverage for markets Bridge doesn't serve
- Enables competitive positioning in specific regions

---

## Implementation Roadmap

### Phase 3: IDX Integration (Q2-Q3 2026)

**Sprint 1: Provider Selection & Setup (2 weeks)**
- Evaluate Bridge Interactive vs. alternatives
- Contact Bridge Interactive for access
- Request MLS access via Bridge dashboard
- Set up development environment

**Sprint 2: API Integration (3-4 weeks)**
- Integrate Bridge API (RESO Web API)
- Implement authentication (OAuth 2.0)
- Build data sync job (daily full sync)
- Map RESO fields to Smart Agent schema

**Sprint 3: Compliance & UI (2-3 weeks)**
- Implement MLS compliance framework
- Add required attribution/disclaimers
- Build MLS property search UI
- Add MLS sync status dashboard

**Sprint 4: Testing & Launch (2 weeks)**
- Test with pilot MLS markets
- Compliance audit
- Performance testing
- Launch to beta users

**Total Timeline:** 9-11 weeks (2.5-3 months)

---

## Risk Assessment

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **MLS approval delays** | Medium | High | Start approval process early, use Bridge to facilitate |
| **Compliance violations** | Low | Critical | Implement compliance framework, regular audits |
| **Bridge coverage gaps** | Low | Medium | Evaluate direct RESO for uncovered markets |
| **Cost overruns (MLS fees)** | Medium | Medium | Research MLS fees upfront, budget per-market |
| **Data sync failures** | Low | Medium | Implement error handling, retry logic, monitoring |
| **Performance issues (large datasets)** | Medium | Medium | Implement pagination, incremental sync, caching |

### Mitigation Strategies

1. **Early MLS Engagement:** Start MLS approval process 4-6 weeks before development
2. **Compliance First:** Build compliance framework before data integration
3. **Pilot Markets:** Start with 2-3 MLS markets, expand gradually
4. **Monitoring:** Implement comprehensive sync monitoring and alerting
5. **Fallback Plans:** Maintain manual entry option during integration

---

## Research Methodology

### Sources Used

1. **Web Search:** MLS/IDX integration providers, RESO Web API documentation, compliance requirements
2. **Codebase Analysis:** Smart Agent current implementation, database schema, PRD
3. **Industry Standards:** RESO Web API specifications, MLS compliance guidelines
4. **Provider Documentation:** Bridge Interactive, Spark API, MLS IDX API websites

### Research Limitations

- Pricing information not publicly available for all providers (contact required)
- MLS-specific requirements vary widely (general guidance provided)
- Compliance rules evolve (regular updates needed)
- Bridge Interactive coverage not fully documented (contact required)

### Confidence Level

- **High Confidence:** RESO Web API standards, compliance requirements, Bridge Interactive approach
- **Medium Confidence:** Spark API coverage, MLS IDX API capabilities, cost estimates
- **Low Confidence:** Specific MLS fee structures (varies widely), Bridge coverage gaps

---

## Next Steps

1. **Update Backlog:** Mark RES-003 as complete
2. **Create Recommendations:** Submit REC-009, REC-010, REC-011 to PM-Orchestrator
3. **Handoff to PM-Integration:** Share Bridge Interactive contact and integration roadmap
4. **MLS Research:** Identify target MLS markets for Phase 3 launch
5. **Compliance Planning:** Begin MLS compliance framework design
6. **Re-evaluate:** Quarterly review of MLS integration landscape and provider options

---

## Appendix: Key Resources

### RESO Web API
- **Website:** https://www.reso.org/reso-web-api/
- **Specifications:** https://www.reso.org/specs/
- **Transition Guide:** https://www.reso.org/api-guide/
- **Developer Reference Server:** https://www.reso.org/web-api-developer-reference-server/

### Bridge Interactive
- **Website:** https://www.bridgeinteractive.com/
- **Developer Portal:** https://www.bridgeinteractive.com/developers/
- **Contact:** api@bridgeinteractive.com
- **Bridge API Docs:** https://www.bridgeinteractive.com/developers/bridge-api/

### Spark API
- **Website:** https://sparkplatform.com/
- **Documentation:** https://sparkplatform.com/docs/
- **IDX Services:** https://alpha.sparkplatform.com/docs/api_services/idx

### MLS IDX API
- **Website:** https://mlsidxapi.com/
- **Documentation:** https://mlsidxapi.com/documentation/
- **Support:** https://mlsidxapi.com/support/

### Compliance Resources
- **IDX Integration Best Practices:** https://contempothemes.com/idx-integration-best-practices-for-mls-rules
- **MLS Compliance Guide:** https://repliers.com/mls-data-integration-compliance-guide/
- **NAR MLS Policy:** https://www.nar.realtor/about-nar/policies/summary-of-2025-mls-changes

---

*Report prepared by PM-Research | The Scout*  
*Next Review:** Quarterly (April 2026)*
