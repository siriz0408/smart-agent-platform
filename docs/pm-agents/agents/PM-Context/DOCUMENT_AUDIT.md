# Document Indexing Audit System

> **Created:** 2026-02-06  
> **Owner:** PM-Context  
> **Status:** ✅ Implemented

## Overview

The document indexing audit system provides comprehensive health checks for the document indexing pipeline. It identifies failed jobs, stuck processes, incomplete chunks, missing metadata, and other indexing issues.

## Edge Function

**Location:** `supabase/functions/audit-document-indexing/index.ts`

**Endpoint:** `POST /functions/v1/audit-document-indexing`

**Authentication:** Requires service role key (edge function uses service role internally)

## What It Audits

### 1. Unindexed Documents
- Documents without `indexed_at` timestamp
- Documents with failed indexing jobs
- Severity based on age (older = higher priority)

### 2. Stuck Jobs
- Jobs in "processing" state for >30 minutes
- Indicates potential timeout or crash issues

### 3. Incomplete Chunks
- Documents where `indexed_chunks < total_chunks`
- May indicate partial failures during chunk insertion

### 4. Missing Chunks
- Documents marked as indexed (`indexed_at` set) but have zero chunks
- Critical issue - document appears indexed but isn't searchable

### 5. Missing Metadata
- Documents of types that should have structured metadata (contract, inspection, closing)
- Low priority - metadata is optional but improves search quality

### 6. Failed Jobs
- All jobs with `status = 'failed'`
- Includes error messages for debugging

## Usage

### Via Script (Recommended)

```bash
# Set service role key
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'

# Run audit
./scripts/run-document-audit.sh
```

The script will:
- Call the edge function
- Display summary statistics
- Show issues grouped by severity
- Display recommendations
- Optionally save full JSON report

### Via curl

```bash
curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://your-project.supabase.co/functions/v1/audit-document-indexing" \
  -d '{}'
```

### Via Supabase Dashboard

1. Go to Edge Functions → `audit-document-indexing`
2. Click "Invoke"
3. View logs and response

## Response Format

```json
{
  "timestamp": "2026-02-06T12:00:00Z",
  "summary": {
    "totalDocuments": 150,
    "indexedDocuments": 142,
    "unindexedDocuments": 8,
    "failedJobs": 3,
    "stuckJobs": 1,
    "incompleteChunks": 2,
    "missingMetadata": 5,
    "successRate": 94.7
  },
  "issues": [
    {
      "type": "failed_indexing",
      "severity": "high",
      "documentId": "uuid",
      "documentName": "contract.pdf",
      "message": "Indexing failed: PDF extraction error",
      "details": {
        "errorMessage": "PDF extraction failed: ...",
        "startedAt": "2026-02-06T10:00:00Z"
      }
    }
  ],
  "recommendations": [
    "Review 3 failed indexing jobs and investigate root causes",
    "Clean up 1 stuck job - they may need manual intervention",
    "Index 8 unindexed documents"
  ]
}
```

## Issue Severity Levels

- **Critical**: Documents marked indexed but have no chunks (not searchable)
- **High**: Failed jobs, stuck jobs, old unindexed documents (>24h)
- **Medium**: Recent unindexed documents, incomplete chunks
- **Low**: Missing metadata for documents that should have it

## Recommendations

The audit generates actionable recommendations based on findings:

- Failed jobs → Investigate root causes
- Stuck jobs → Clean up or retry
- Missing chunks → Re-index documents
- Incomplete chunks → Review and fix
- Low success rate → Overall system health review

## Integration with PM Workflow

### Daily Health Check

PM-Context should run this audit daily at 6am (per AGENT.md):

```bash
# Add to cron or scheduled task
0 6 * * * cd /path/to/project && ./scripts/run-document-audit.sh >> logs/audit-$(date +\%Y\%m\%d).log
```

### Weekly Report

Include audit results in weekly PM reports:
- Success rate trend
- Issue counts by type
- Top recommendations

### Alert Thresholds

Consider alerts for:
- Success rate < 95%
- Critical issues > 0
- Stuck jobs > 5
- Failed jobs > 10

## Next Steps

1. **Deploy Function**: Deploy `audit-document-indexing` to production
2. **Schedule**: Set up daily automated runs
3. **Dashboard**: Consider adding audit results to admin dashboard
4. **Alerts**: Set up alerts for critical issues

## Related Files

- `supabase/functions/audit-document-indexing/index.ts` - Audit function
- `scripts/run-document-audit.sh` - Convenience script
- `docs/pm-agents/agents/PM-Context/AGENT.md` - PM-Context definition
- `docs/pm-agents/agents/PM-Context/BACKLOG.md` - Task tracking
