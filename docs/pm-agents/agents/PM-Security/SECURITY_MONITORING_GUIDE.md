# Security Monitoring System - Usage Guide

> **Created:** 2026-02-07 (Cycle 9)
> **Migration:** `20260207080000_sec006_security_monitoring.sql`
> **Status:** ✅ Production Ready

## Overview

The Security Monitoring System provides comprehensive threat detection, audit logging, and real-time security visibility for the Smart Agent platform. It automatically detects suspicious patterns (brute force attacks, privilege escalation, API abuse) and creates actionable alerts.

## Architecture

### Components

| Component | Purpose | Records |
|-----------|---------|---------|
| **security_events** | Audit log for all security events | 15 event types |
| **security_alerts** | Aggregated threat alerts | 11 alert types |
| **log_security_event()** | Helper function for event logging | - |
| **detect_brute_force_attempts()** | Automated threat detection trigger | - |
| **Security Views** | Real-time dashboards | 4 views |
| **Maintenance Functions** | Health scoring & archival | 2 functions |

### Event Types

| Category | Event Types |
|----------|-------------|
| **Authentication** | `auth_attempt`, `auth_token_refresh`, `auth_logout`, `token_validation_failed` |
| **Authorization** | `access_denied`, `rls_violation`, `admin_action` |
| **Data Access** | `data_access`, `data_modification` |
| **Threats** | `suspicious_activity`, `rate_limit_exceeded`, `api_abuse`, `cors_violation` |
| **System** | `security_config_change`, `service_role_usage` |

### Alert Types

| Alert Type | Severity | Trigger Condition |
|------------|----------|-------------------|
| `brute_force_attempt` | high/critical | 5+ failed auth attempts in 15 min |
| `account_takeover_risk` | high | Suspicious account activity pattern |
| `privilege_escalation` | critical | Unauthorized role access attempt |
| `data_exfiltration_risk` | high | Unusual data access volume |
| `api_abuse` | medium | Excessive API usage |
| `rls_bypass_attempt` | critical | Attempted RLS policy bypass |
| `credential_leak_detected` | critical | Potential credential exposure |
| `suspicious_ip_activity` | medium | Multiple violations from IP |
| `rate_limit_exceeded` | low | Rate limiting triggered |
| `security_misconfiguration` | high | Security setting issue |
| `anomalous_behavior` | medium | ML/heuristic-detected anomaly |

## Usage

### From Edge Functions

#### Basic Event Logging

```typescript
// Log failed authentication attempt
await supabaseServiceClient.rpc('log_security_event', {
  p_event_type: 'auth_attempt',
  p_severity: 'high',
  p_description: 'Failed login attempt - invalid password',
  p_details: {
    success: false,
    reason: 'invalid_password',
    username: 'user@example.com'
  },
  p_user_email: 'user@example.com',
  p_ip_address: clientIp,
  p_user_agent: req.headers.get('User-Agent'),
  p_edge_function: 'auth-login',
  p_tags: ['authentication', 'failure']
});
```

#### Log Access Denied

```typescript
// Log RLS policy violation
await supabaseServiceClient.rpc('log_security_event', {
  p_event_type: 'rls_violation',
  p_severity: 'high',
  p_description: 'User attempted to access cross-tenant data',
  p_details: {
    table: 'documents',
    attempted_tenant_id: attemptedTenantId,
    user_tenant_id: userTenantId,
    policy: 'tenant_isolation_policy'
  },
  p_user_id: userId,
  p_tenant_id: userTenantId,
  p_edge_function: 'index-document',
  p_tags: ['rls', 'tenant_isolation']
});
```

#### Log Admin Action

```typescript
// Log admin action (for audit trail)
await supabaseServiceClient.rpc('log_security_event', {
  p_event_type: 'admin_action',
  p_severity: 'info',
  p_description: 'Admin deleted user account',
  p_details: {
    action: 'delete_user',
    target_user_id: targetUserId,
    reason: 'User requested account deletion'
  },
  p_user_id: adminUserId,
  p_tenant_id: tenantId,
  p_edge_function: 'admin-delete-user',
  p_tags: ['admin', 'audit', 'gdpr']
});
```

#### Log Suspicious Activity

```typescript
// Log suspicious API usage
await supabaseServiceClient.rpc('log_security_event', {
  p_event_type: 'api_abuse',
  p_severity: 'medium',
  p_description: 'Excessive API requests detected',
  p_details: {
    endpoint: '/api/search',
    request_count: 500,
    time_window: '1 minute',
    rate_limit: 100
  },
  p_ip_address: clientIp,
  p_edge_function: 'universal-search',
  p_tags: ['rate_limiting', 'api_abuse']
});
```

### Context Auto-Resolution

The `log_security_event()` function automatically resolves context when not provided:

- **user_id**: Uses `auth.uid()` if not provided
- **user_email**: Looks up from `auth.users` if user_id known
- **tenant_id**: Looks up from `profiles` if user_id known

This means minimal logging code is needed when called from authenticated edge functions:

```typescript
// Minimal logging - auto-resolves user context
await supabaseServiceClient.rpc('log_security_event', {
  p_event_type: 'data_access',
  p_severity: 'info',
  p_description: 'User accessed document',
  p_details: { document_id: docId }
  // user_id, user_email, tenant_id auto-resolved!
});
```

### Dashboard Queries

#### View Critical Events

```sql
-- Last 7 days of unresolved critical/high severity events
SELECT * FROM security_dashboard_critical;
```

#### Check Authentication Failures

```sql
-- Users with 3+ failed logins in last 24 hours
SELECT * FROM auth_failure_summary;
```

#### Identify Suspicious IPs

```sql
-- IPs with 5+ high/critical events in last 24 hours
SELECT * FROM suspicious_ips;
```

#### Monitor Open Alerts

```sql
-- All open alerts ordered by severity
SELECT * FROM security_alerts_dashboard;
```

#### Get Security Health Score

```sql
-- Get overall security health (A+ to F grade)
SELECT * FROM get_security_health_score();

-- Example response:
{
  "score": 85,
  "grade": "B+",
  "critical_events": 1,
  "high_severity_events": 3,
  "open_alerts": 2,
  "recent_incidents_24h": 4,
  "status": "warning",
  "calculated_at": "2026-02-07T10:30:00Z"
}
```

### Alert Management

#### Acknowledge Alert

```sql
UPDATE security_alerts
SET status = 'acknowledged',
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid()
WHERE id = 'alert-uuid';
```

#### Resolve Alert

```sql
UPDATE security_alerts
SET status = 'resolved',
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    resolution_notes = 'Confirmed false positive - legitimate user from new location'
WHERE id = 'alert-uuid';
```

#### Mark as False Positive

```sql
UPDATE security_alerts
SET status = 'false_positive',
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    resolution_notes = 'Automated alert triggered by load testing'
WHERE id = 'alert-uuid';
```

## Automated Threat Detection

### Brute Force Detection

The system automatically detects brute force attacks:

- **Threshold**: 5 failed auth attempts
- **Window**: 15 minutes
- **Tracking**: By user email OR IP address
- **Alert**: Auto-created when threshold exceeded
- **Severity**: High (5-10 attempts), Critical (10+ attempts)

**What it does:**
1. Monitors all `auth_attempt` events with `success: false`
2. Counts recent failures from same user/IP
3. Creates alert if threshold exceeded
4. Prevents duplicate alerts for same user/IP in time window

**Recommendation in alert:**
> "Consider temporarily blocking this user/IP and notifying the account owner if legitimate user."

### Future Automated Detections (Roadmap)

| Detection | Description | Status |
|-----------|-------------|--------|
| **Account Takeover** | Login from unusual location + high-value actions | 🔄 Planned |
| **Data Exfiltration** | Unusual volume of data access | 🔄 Planned |
| **Privilege Escalation** | Role change + immediate admin actions | 🔄 Planned |
| **Anomalous Behavior** | ML-based pattern recognition | 🔄 Planned |

## Maintenance

### Archive Old Events

```sql
-- Auto-archives low/info events older than 90 days
SELECT archive_old_security_events();
-- Returns: Number of events archived
```

**Recommended Schedule:** Run daily via cron or scheduled edge function

### Data Retention

| Severity | Retention | Auto-Archive |
|----------|-----------|--------------|
| Critical | Indefinite | Manual only |
| High | Indefinite | Manual only |
| Medium | 90 days | Review then archive |
| Low | 90 days | Auto-archive |
| Info | 90 days | Auto-archive |

## RLS Security

### Permissions Matrix

| Role | security_events | security_alerts |
|------|-----------------|-----------------|
| **Super Admin** | Read all, Update all | Full access |
| **Tenant Admin** | Read own tenant only | Read own tenant only |
| **Service Role** | Insert only | Insert only |
| **User** | No access | No access |

### RLS Policies

```sql
-- Super admins see everything
"Super admins can view all security events" (SELECT)
"Super admins can manage security events" (UPDATE)
"Super admins can view all security alerts" (ALL)

-- Tenant admins see their tenant only
"Tenant admins can view their security events" (SELECT)
"Tenant admins can view their security alerts" (SELECT)

-- Service role can insert (for automated systems)
"Service role can insert security events" (INSERT)
"Service role can insert security alerts" (INSERT)
```

## Performance

### Indexes

**security_events (9 indexes):**
- `idx_security_events_created_at` - Time-based queries
- `idx_security_events_event_type` - Filter by type
- `idx_security_events_severity` - Critical/high events
- `idx_security_events_user_id` - User tracking
- `idx_security_events_tenant_id` - Tenant isolation
- `idx_security_events_ip_address` - IP-based queries
- `idx_security_events_unresolved` - Open events dashboard
- `idx_security_events_details` (GIN) - JSONB searches
- `idx_security_events_tags` (GIN) - Tag searches
- `idx_security_events_auth_failures` (composite) - Auth failure tracking
- `idx_security_events_ip_threats` (composite) - IP threat detection

**security_alerts (5 indexes):**
- `idx_security_alerts_created_at` - Time-based queries
- `idx_security_alerts_status` (composite) - Open alerts dashboard
- `idx_security_alerts_affected_user` - User-specific alerts
- `idx_security_alerts_source_ip` - IP-specific alerts
- `idx_security_alerts_unnotified` - Pending notifications

### Query Performance

| Query | Expected Time | Notes |
|-------|---------------|-------|
| Recent events (7 days) | <100ms | Uses `idx_security_events_created_at` |
| Unresolved critical events | <50ms | Uses `idx_security_events_severity` |
| User auth failures | <50ms | Uses `idx_security_events_auth_failures` |
| Suspicious IPs | <100ms | Uses `idx_security_events_ip_threats` |
| Open alerts | <50ms | Uses `idx_security_alerts_status` |

## Integration Points

### Where to Add Security Logging

| Edge Function | Events to Log |
|---------------|---------------|
| **ai-chat** | `auth_attempt`, `data_access`, `api_abuse` |
| **index-document** | `auth_attempt`, `data_modification`, `rls_violation` |
| **execute-agent** | `admin_action`, `suspicious_activity` |
| **create-workspace** | `admin_action`, `data_modification` |
| **invite-to-workspace** | `admin_action`, `data_access` |
| **zillow-search** | `api_abuse`, `data_access` |
| **stripe-webhook** | `security_config_change` (billing) |

### Frontend Integration (Future)

Create a Security Dashboard page at `/security` (super admin only):

**Components needed:**
- `SecurityEventsList` - Real-time event stream
- `SecurityAlertsPanel` - Open alerts with actions
- `SecurityHealthWidget` - Health score visualization
- `AuthFailureChart` - Auth failure trends
- `SuspiciousIPList` - Flagged IP addresses

**API endpoints needed:**
- `GET /api/security/events` - Paginated events
- `GET /api/security/alerts` - Open alerts
- `GET /api/security/health` - Health score
- `POST /api/security/alerts/:id/acknowledge` - Acknowledge alert
- `POST /api/security/alerts/:id/resolve` - Resolve alert

## Best Practices

### When to Log

✅ **DO log:**
- All authentication attempts (success and failure)
- Authorization failures (access denied, RLS violations)
- Admin actions (for audit trail)
- Sensitive data access (documents, financial data)
- Security configuration changes
- Rate limiting events
- Suspicious patterns detected

❌ **DON'T log:**
- Regular successful operations (creates noise)
- PII in description field (use JSONB details field)
- Passwords or tokens (NEVER)
- Excessive low-severity events (performance impact)

### Severity Guidelines

| Severity | Use When | Example |
|----------|----------|---------|
| **Critical** | Immediate threat, data breach risk | RLS bypass attempt, credential leak |
| **High** | Significant security concern | Brute force attack, unauthorized admin access |
| **Medium** | Suspicious but not immediately threatening | Unusual data access, API abuse |
| **Low** | Tracking for patterns | Single failed login, rate limit hit |
| **Info** | Audit trail only | Successful admin action |

### JSONB Details Best Practices

Use structured details for rich context:

```typescript
// ✅ Good - structured, searchable
p_details: {
  action: 'delete',
  resource_type: 'document',
  resource_id: '123e4567-e89b-12d3-a456-426614174000',
  affected_tenant: 'acme-corp',
  reason: 'user_requested'
}

// ❌ Bad - unstructured, not searchable
p_details: {
  message: 'User deleted document 123e4567 from acme-corp because user requested'
}
```

### Tagging Strategy

Use tags for categorization and filtering:

```typescript
// Authentication events
p_tags: ['authentication', 'failure', 'brute_force']

// Admin events
p_tags: ['admin', 'audit', 'critical_action']

// Compliance events
p_tags: ['gdpr', 'data_deletion', 'compliance']

// Security events
p_tags: ['security', 'rls_violation', 'tenant_isolation']
```

## Troubleshooting

### Common Issues

#### Events not appearing in dashboard

**Check:**
1. RLS policies - Are you super admin or tenant admin?
2. Time range - Events older than 7 days excluded from some views
3. Severity filter - Critical dashboard shows only high/critical events

#### Alerts not triggering

**Check:**
1. Trigger enabled: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_detect_brute_force';`
2. Threshold met: Check event count in time window
3. Duplicate suppression: Existing alert may prevent new one

#### Performance degradation

**Check:**
1. Event volume: `SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours';`
2. Unresolved events: `SELECT COUNT(*) FROM security_events WHERE NOT resolved;`
3. Missing indexes: `SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public' AND relname = 'security_events';`

**Solutions:**
- Run `archive_old_security_events()` to clean up old events
- Adjust retention policy (currently 90 days)
- Review logging verbosity (reduce low/info events)

## Metrics & KPIs

### Security Health Score

| Score | Grade | Status | Action |
|-------|-------|--------|--------|
| 95-100 | A+ | Healthy | Monitor |
| 90-94 | A | Healthy | Monitor |
| 85-89 | B+ | Warning | Review weekly |
| 80-84 | B | Warning | Review daily |
| 75-79 | C+ | Concerning | Immediate review |
| 70-74 | C | Concerning | Investigate |
| 60-69 | D | Critical | Urgent action |
| 0-59 | F | Critical | Emergency response |

### Score Calculation

```
Score = 100
  - (critical_events × 20)
  - (high_severity_events × 5)
  - (open_alerts × 3)
  - (recent_incidents_24h × 2)

Minimum: 0 (floor)
```

### Monitoring Alerts

**Set up alerts for:**
- Score < 70 (Critical status)
- 3+ unresolved critical events
- 5+ open high-severity alerts
- Brute force alert created
- RLS bypass attempt detected

## Next Steps

### Phase 2 Enhancements (Roadmap)

1. **Notification System**
   - Email alerts for critical events
   - Slack integration
   - PagerDuty for on-call escalation

2. **ML-Based Anomaly Detection**
   - Baseline normal behavior per user/tenant
   - Detect deviations from baseline
   - Auto-create alerts for anomalies

3. **Frontend Security Dashboard**
   - Real-time event stream
   - Interactive alert management
   - Security metrics visualizations
   - Compliance reports (GDPR, SOC2)

4. **Advanced Threat Detection**
   - Account takeover detection
   - Data exfiltration monitoring
   - Privilege escalation detection
   - Coordinated attack identification

5. **SIEM Integration**
   - Export to Splunk, DataDog, Elastic
   - Standardized log format (JSON)
   - Automated incident response

6. **IP Blocking & Rate Limiting**
   - Automatic IP blocking based on alerts
   - Dynamic rate limiting per threat level
   - Allowlist/blocklist management

---

**Documentation Complete**
PM-Security | Cycle #9 | 2026-02-07
