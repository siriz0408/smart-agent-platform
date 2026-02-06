# Connector Framework Architecture

> **Version:** 1.0  
> **Last Updated:** February 6, 2026  
> **Status:** ✅ Architecture Complete, Implementation In Progress

## Overview

The Connector Framework is an extensible system for integrating Smart Agent with external services (Gmail, Google Calendar, Zoom, Outlook, CRMs, etc.). It provides a unified architecture for OAuth authentication, action execution, rate limiting, and audit logging.

## Design Principles

1. **Extensibility**: Easy to add new connectors without modifying core framework
2. **Security**: Encrypted credential storage, OAuth-based authentication
3. **Workspace Isolation**: All connectors are workspace-scoped with RLS
4. **Action Approval**: Integration with action queue for user approval workflow
5. **Auditability**: Complete logging of all connector actions
6. **Rate Limiting**: Per-workspace rate limits to prevent abuse

## Architecture Components

### 1. Database Schema

#### `connector_definitions`
Defines available connector types (Gmail, Calendar, Zoom, etc.).

**Key Fields:**
- `connector_key`: Unique identifier ('gmail', 'google_calendar')
- `oauth_provider`: OAuth provider type ('google', 'microsoft', 'zoom')
- `supported_actions`: Array of action types this connector supports
- `requires_approval_by_default`: Whether actions require user approval
- `rate_limit_per_hour`: Per-workspace rate limit
- `max_connections_per_workspace`: Connection limit (NULL = unlimited)

#### `workspace_connectors`
Tracks active connector instances per workspace.

**Key Fields:**
- `workspace_id`: Workspace this connector belongs to
- `connector_definition_id`: Reference to connector definition
- `status`: 'active', 'disconnected', 'error', 'expired'
- `auto_approve_actions`: Workspace-level override for auto-approval
- `config`: Workspace-specific connector configuration

#### `connector_credentials`
Stores encrypted OAuth tokens and credentials.

**Key Fields:**
- `workspace_connector_id`: Reference to connector instance
- `access_token`: Encrypted OAuth access token
- `refresh_token`: Encrypted OAuth refresh token
- `token_expires_at`: Token expiration timestamp

**Security:** Credentials are encrypted at the application level before storage. Only the service role can access this table.

#### `connector_actions`
Audit log of all connector actions.

**Key Fields:**
- `workspace_connector_id`: Which connector executed the action
- `action_queue_id`: Link to action queue (if queued for approval)
- `action_type`: Type of action ('send_email', 'create_event')
- `status`: 'pending', 'executing', 'completed', 'failed'
- `result`: Action result data
- `request_data` / `response_data`: Full request/response for debugging

### 2. TypeScript Interfaces

Located in `supabase/functions/_shared/connector-types.ts`:

- `IConnector`: Interface all connectors must implement
- `BaseConnector`: Abstract base class with common functionality
- `ConnectorDefinition`: Type for connector definitions
- `WorkspaceConnector`: Type for connector instances
- `ConnectorCredentials`: Type for decrypted credentials
- `ConnectorActionRequest` / `ConnectorActionResponse`: Action execution types

### 3. Connector Implementation

All connectors extend `BaseConnector` and implement:

```typescript
class GmailConnector extends BaseConnector {
  readonly connectorKey = 'gmail';

  async execute(
    actionType: string,
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    // Implementation
  }

  validateAction(
    actionType: string,
    params: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    // Validation logic
  }

  getSupportedActions(): string[] {
    return ['send_email', 'search_inbox', 'create_draft'];
  }
}
```

### 4. Connector Registry

The `ConnectorRegistry` manages all connector implementations:

```typescript
const registry = new ConnectorRegistry();
registry.register(new GmailConnector());
registry.register(new GoogleCalendarConnector());
// ... etc
```

### 5. Execution Engine

The connector execution engine (to be implemented in `execute-connector-action` edge function):

1. **Validate Request**: Check workspace, connector, action type
2. **Check Rate Limits**: Verify workspace hasn't exceeded rate limit
3. **Load Credentials**: Fetch and decrypt credentials
4. **Get Connector**: Retrieve connector from registry
5. **Validate Action**: Validate parameters
6. **Check Approval**: If required, queue for approval
7. **Execute**: Run connector action
8. **Log**: Record action in `connector_actions` table
9. **Update Sync**: Update connector last sync time

## Workflow

### Connecting a Connector

1. User navigates to Settings → Integrations
2. Clicks "Connect" on a connector (e.g., Gmail)
3. Redirected to OAuth provider (Google)
4. User authorizes Smart Agent
5. OAuth callback stores encrypted credentials
6. `workspace_connectors` record created with status 'active'

### Executing an Action

1. **AI Agent** or **User** requests action: "Send email to john@example.com"
2. **Action Queue** (if approval required):
   - Action queued with `requires_approval = true`
   - User approves in Action Queue UI
   - Action status changes to 'approved'
3. **Connector Execution**:
   - Load connector instance and credentials
   - Validate action parameters
   - Execute action via connector
   - Log result in `connector_actions`
4. **Result**:
   - Success: Action completed, result stored
   - Failure: Error logged, connector error count incremented

### Auto-Approval

If `auto_approve_actions = true` on `workspace_connectors`:
- Actions bypass approval queue
- Executed immediately (still logged)

## Security

### Credential Encryption

- Credentials encrypted before storage using application-level encryption
- Decryption only happens in edge functions (service role)
- Never exposed to client-side code

### OAuth Flow

1. User initiates OAuth flow
2. Redirected to provider (Google, Microsoft, etc.)
3. Provider redirects back with authorization code
4. Edge function exchanges code for tokens
5. Tokens encrypted and stored
6. Refresh tokens used to maintain access

### Rate Limiting

- Per-workspace rate limits (configurable per connector)
- Tracked in `connector_actions` table
- Rate limit headers from external APIs respected
- Automatic retry-after handling

### Row-Level Security (RLS)

- `connector_definitions`: Public read (anyone can see available connectors)
- `workspace_connectors`: Workspace members can view, admins can manage
- `connector_credentials`: Service role only (never exposed to client)
- `connector_actions`: Workspace members can view their connector actions

## Integration Points

### Action Queue Integration

Connector actions integrate with the existing `action_queue` system:

- If `requires_approval = true`: Action queued, user approves in UI
- If `auto_approve = true`: Action executed immediately
- `action_queue_id` links connector action to approval workflow

### MCP Gateway Integration

The connector framework can integrate with the MCP gateway:

- Connectors can be exposed as MCP tools
- MCP calls can trigger connector actions
- Unified logging via `mcp_call_logs` and `connector_actions`

### AI Agent Integration

AI agents can use connectors via:

1. **Direct Action**: Agent requests connector action
2. **Action Queue**: Agent queues action for approval
3. **Tool Calling**: Connector exposed as AI tool

## Adding a New Connector

### Step 1: Create Connector Class

```typescript
// supabase/functions/_shared/connectors/gmail-connector.ts
import { BaseConnector } from '../base-connector.ts';
import { ConnectorCredentials, ConnectorActionResult } from '../connector-types.ts';

export class GmailConnector extends BaseConnector {
  readonly connectorKey = 'gmail';

  getSupportedActions(): string[] {
    return ['send_email', 'search_inbox', 'create_draft'];
  }

  validateAction(actionType: string, params: Record<string, unknown>) {
    // Validation logic
  }

  async execute(
    actionType: string,
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    // Implementation
  }
}
```

### Step 2: Register Connector

```typescript
// supabase/functions/execute-connector-action/index.ts
import { GmailConnector } from '../_shared/connectors/gmail-connector.ts';
import { ConnectorRegistry } from '../_shared/connector-types.ts';

const registry = new ConnectorRegistry();
registry.register(new GmailConnector());
```

### Step 3: Add Connector Definition

The connector definition is seeded in the migration. To add a new one:

```sql
INSERT INTO public.connector_definitions (
  connector_key, name, description, category,
  oauth_provider, oauth_scopes,
  supported_actions, requires_approval_by_default
) VALUES (
  'new_connector',
  'New Connector',
  'Description',
  'communication',
  'custom',
  ARRAY['scope1', 'scope2'],
  ARRAY['action1', 'action2'],
  true
);
```

### Step 4: Implement OAuth Flow

Create edge function for OAuth callback:

```typescript
// supabase/functions/oauth-callback/index.ts
// Handle OAuth callback, exchange code for tokens, store encrypted credentials
```

## Example: Gmail Connector

See `docs/examples/GMAIL_CONNECTOR_EXAMPLE.md` for a complete Gmail connector implementation example.

## Database Functions

### `get_workspace_connectors(workspace_id)`
Returns all active connectors for a workspace.

### `can_add_connector(workspace_id, connector_definition_id)`
Checks if workspace can add more connectors (based on subscription limits).

### `update_connector_sync(workspace_connector_id)`
Updates connector last sync time and clears error count.

### `record_connector_error(workspace_connector_id, error_message)`
Records connector error and updates error count/status.

## Rate Limiting

Rate limits are enforced at multiple levels:

1. **Per-Connector**: `rate_limit_per_hour` in `connector_definitions`
2. **Per-Workspace**: Tracked per workspace-connector combination
3. **External API**: Respect external API rate limits (429 responses)

Rate limit tracking:
- Stored in `connector_actions.rate_limit_remaining`
- Reset times tracked in `rate_limit_reset_at`
- Automatic retry-after handling

## Error Handling

### Connector Errors

- `ConnectorAuthError`: Authentication failed (401, 403)
- `ConnectorRateLimitError`: Rate limit exceeded (429)
- `ConnectorValidationError`: Invalid action parameters
- `ConnectorError`: Generic connector error

### Error Recovery

- **Auth Errors**: Trigger token refresh, retry once
- **Rate Limit Errors**: Queue action for later execution
- **Validation Errors**: Return error immediately (no retry)
- **Transient Errors**: Retry with exponential backoff

### Error Tracking

- `workspace_connectors.error_count`: Incremented on errors
- `workspace_connectors.last_error`: Last error message
- `workspace_connectors.status`: Set to 'error' after 5 consecutive errors
- `connector_actions.error_message`: Detailed error for each action

## Monitoring & Analytics

### Key Metrics

- **Integration Adoption**: % of workspaces with active connectors
- **Action Success Rate**: % of successful connector actions
- **Average Action Duration**: Performance tracking
- **Error Rate**: % of failed actions
- **Rate Limit Hits**: Frequency of rate limit errors

### Logging

All connector actions are logged in `connector_actions`:
- Request/response data for debugging
- Duration tracking
- Rate limit information
- Error details

## Future Enhancements

1. **Webhook Support**: Receive events from external services
2. **Sync Jobs**: Scheduled sync for bidirectional connectors
3. **Connector Marketplace**: User-installable connectors
4. **Custom Connectors**: User-defined connectors via API
5. **Multi-User Connectors**: Shared connectors across workspace
6. **Connector Templates**: Pre-configured connector setups

## Related Documentation

- **PRD Section 4.3**: Tool Integration Platform (Product Requirements)
- **ARCHITECTURE.md Section 10.3**: Tool Connector Framework (Technical Design)
- **Action Queue System**: `supabase/functions/_shared/agentActions.ts`
- **MCP Gateway**: `supabase/functions/mcp-gateway/index.ts`

## Implementation Status

- ✅ Database schema (migration `20260206120000_connector_framework.sql`)
- ✅ TypeScript interfaces (`connector-types.ts`)
- ✅ Base connector class (`base-connector.ts`)
- ⏳ Connector execution engine (`execute-connector-action` edge function)
- ⏳ OAuth callback handler (`oauth-callback` edge function)
- ⏳ Example connectors (Gmail, Calendar, Zoom)
- ⏳ Frontend integration UI (Settings → Integrations)
- ⏳ Action queue integration

## Next Steps

1. **INT-007**: Implement Gmail connector (first integration)
2. **INT-008**: Build integration management UI
3. Create `execute-connector-action` edge function
4. Create OAuth callback handlers
5. Add connector usage analytics
