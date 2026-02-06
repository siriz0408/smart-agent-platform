# Gmail Connector Implementation Example

This document shows a complete example implementation of the Gmail connector using the connector framework.

## File Structure

```
supabase/functions/
  _shared/
    connectors/
      gmail-connector.ts    # Gmail connector implementation
  execute-connector-action/
    index.ts                # Connector execution engine
```

## Gmail Connector Implementation

```typescript
// supabase/functions/_shared/connectors/gmail-connector.ts

import { BaseConnector } from '../base-connector.ts';
import {
  ConnectorCredentials,
  ConnectorActionResult,
  ConnectorAuthError,
} from '../connector-types.ts';

export class GmailConnector extends BaseConnector {
  readonly connectorKey = 'gmail';

  private readonly GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

  getSupportedActions(): string[] {
    return [
      'send_email',
      'search_inbox',
      'create_draft',
      'get_thread',
      'get_message',
    ];
  }

  validateAction(
    actionType: string,
    params: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (actionType) {
      case 'send_email':
        {
          const required = ['to', 'subject', 'body'];
          const requiredCheck = this.validateRequiredParams(params, required);
          errors.push(...requiredCheck.errors);

          // Validate email format
          if (params.to && typeof params.to === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(params.to)) {
              errors.push('Invalid email address format');
            }
          }
        }
        break;

      case 'search_inbox':
        {
          // Query is optional, but if provided must be string
          if (params.query && typeof params.query !== 'string') {
            errors.push('Query must be a string');
          }
          // Max results validation
          if (params.max_results) {
            if (typeof params.max_results !== 'number' || params.max_results < 1 || params.max_results > 100) {
              errors.push('max_results must be between 1 and 100');
            }
          }
        }
        break;

      case 'create_draft':
        {
          const required = ['to', 'subject', 'body'];
          const requiredCheck = this.validateRequiredParams(params, required);
          errors.push(...requiredCheck.errors);
        }
        break;

      case 'get_thread':
      case 'get_message':
        {
          const required = ['id'];
          const requiredCheck = this.validateRequiredParams(params, required);
          errors.push(...requiredCheck.errors);
        }
        break;

      default:
        errors.push(`Unsupported action type: ${actionType}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async execute(
    actionType: string,
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    // Validate action
    const validation = this.validateAction(actionType, params);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        error_code: 'VALIDATION_ERROR',
      };
    }

    try {
      switch (actionType) {
        case 'send_email':
          return await this.sendEmail(params, credentials);
        case 'search_inbox':
          return await this.searchInbox(params, credentials);
        case 'create_draft':
          return await this.createDraft(params, credentials);
        case 'get_thread':
          return await this.getThread(params, credentials);
        case 'get_message':
          return await this.getMessage(params, credentials);
        default:
          return {
            success: false,
            error: `Unsupported action type: ${actionType}`,
            error_code: 'UNSUPPORTED_ACTION',
          };
      }
    } catch (error) {
      return this.createErrorResult(error, actionType);
    }
  }

  async refreshToken(
    credentials: ConnectorCredentials
  ): Promise<ConnectorCredentials> {
    if (!credentials.refresh_token) {
      throw new ConnectorAuthError(
        'No refresh token available',
        this.connectorKey
      );
    }

    // Exchange refresh token for new access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new ConnectorAuthError(
        `Token refresh failed: ${response.statusText}`,
        this.connectorKey
      );
    }

    const tokenData = await response.json();

    // Return updated credentials
    return {
      ...credentials,
      access_token: tokenData.access_token,
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      last_refreshed_at: new Date().toISOString(),
    };
  }

  private async sendEmail(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const { to, subject, body, cc, bcc } = params;

    // Create email message
    const email = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      `Subject: ${subject}`,
      '',
      typeof body === 'string' ? body : JSON.stringify(body),
    ]
      .filter(Boolean)
      .join('\n');

    // Encode to base64url
    const encodedMessage = btoa(email)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await this.makeRequest(
      `${this.GMAIL_API_BASE}/users/me/messages/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      },
      credentials
    );

    const result = await this.parseJsonResponse<{ id: string; threadId: string }>(
      response
    );

    return this.createSuccessResult({
      message_id: result.id,
      thread_id: result.threadId,
    });
  }

  private async searchInbox(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const query = (params.query as string) || '';
    const maxResults = (params.max_results as number) || 10;

    const searchParams = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString(),
    });

    const response = await this.makeRequest(
      `${this.GMAIL_API_BASE}/users/me/messages?${searchParams}`,
      {
        method: 'GET',
      },
      credentials
    );

    const result = await this.parseJsonResponse<{
      messages: Array<{ id: string; threadId: string }>;
    }>(response);

    return this.createSuccessResult({
      messages: result.messages || [],
      count: result.messages?.length || 0,
    });
  }

  private async createDraft(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const { to, subject, body } = params;

    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      typeof body === 'string' ? body : JSON.stringify(body),
    ].join('\n');

    const encodedMessage = btoa(email)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await this.makeRequest(
      `${this.GMAIL_API_BASE}/users/me/drafts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            raw: encodedMessage,
          },
        }),
      },
      credentials
    );

    const result = await this.parseJsonResponse<{ id: string }>(response);

    return this.createSuccessResult({
      draft_id: result.id,
    });
  }

  private async getThread(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const threadId = params.id as string;

    const response = await this.makeRequest(
      `${this.GMAIL_API_BASE}/users/me/threads/${threadId}`,
      {
        method: 'GET',
      },
      credentials
    );

    const result = await this.parseJsonResponse(response);

    return this.createSuccessResult({
      thread: result,
    });
  }

  private async getMessage(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const messageId = params.id as string;

    const response = await this.makeRequest(
      `${this.GMAIL_API_BASE}/users/me/messages/${messageId}`,
      {
        method: 'GET',
      },
      credentials
    );

    const result = await this.parseJsonResponse(response);

    return this.createSuccessResult({
      message: result,
    });
  }
}
```

## Registering the Connector

```typescript
// supabase/functions/execute-connector-action/index.ts

import { GmailConnector } from '../_shared/connectors/gmail-connector.ts';
import { ConnectorRegistry } from '../_shared/connector-types.ts';

const registry = new ConnectorRegistry();
registry.register(new GmailConnector());

// ... rest of execution engine
```

## Usage Example

```typescript
// Execute Gmail action
const result = await executeConnectorAction({
  connector_key: 'gmail',
  action_type: 'send_email',
  action_params: {
    to: 'john@example.com',
    subject: 'Hello',
    body: 'This is a test email',
  },
  workspace_id: 'workspace-uuid',
  user_id: 'user-uuid',
});
```

## Testing

```typescript
// Test Gmail connector
const connector = new GmailConnector();

// Test validation
const validation = connector.validateAction('send_email', {
  to: 'test@example.com',
  subject: 'Test',
  body: 'Test body',
});
console.log(validation); // { valid: true, errors: [] }

// Test execution (requires valid credentials)
const result = await connector.execute(
  'send_email',
  {
    to: 'test@example.com',
    subject: 'Test',
    body: 'Test body',
  },
  credentials
);
console.log(result); // { success: true, data: { message_id: '...' } }
```
