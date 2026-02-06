/**
 * Google Calendar Connector Implementation
 * 
 * Implements the BaseConnector interface for Google Calendar integration.
 * Supports: create events, list events, update events, delete events.
 */

import { BaseConnector } from '../base-connector.ts';
import {
  ConnectorCredentials,
  ConnectorActionResult,
  ConnectorAuthError,
} from '../connector-types.ts';

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  recurrence?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

interface GoogleCalendarEventsResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export class GoogleCalendarConnector extends BaseConnector {
  readonly connectorKey = 'google_calendar';

  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

  getSupportedActions(): string[] {
    return [
      'create_event',
      'list_events',
      'update_event',
      'delete_event',
    ];
  }

  validateAction(
    actionType: string,
    params: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (actionType) {
      case 'create_event':
        {
          const required = ['summary', 'start', 'end'];
          const requiredCheck = this.validateRequiredParams(params, required);
          errors.push(...requiredCheck.errors);

          // Validate start/end structure
          if (params.start && typeof params.start === 'object') {
            const start = params.start as Record<string, unknown>;
            if (!start.dateTime && !start.date) {
              errors.push('start must have either dateTime or date');
            }
            if (start.dateTime && typeof start.dateTime !== 'string') {
              errors.push('start.dateTime must be a string (ISO 8601)');
            }
            if (start.date && typeof start.date !== 'string') {
              errors.push('start.date must be a string (YYYY-MM-DD)');
            }
          }
          if (params.end && typeof params.end === 'object') {
            const end = params.end as Record<string, unknown>;
            if (!end.dateTime && !end.date) {
              errors.push('end must have either dateTime or date');
            }
            if (end.dateTime && typeof end.dateTime !== 'string') {
              errors.push('end.dateTime must be a string (ISO 8601)');
            }
            if (end.date && typeof end.date !== 'string') {
              errors.push('end.date must be a string (YYYY-MM-DD)');
            }
          }
        }
        break;

      case 'list_events':
        {
          // Optional parameters validation
          if (params.calendar_id && typeof params.calendar_id !== 'string') {
            errors.push('calendar_id must be a string');
          }
          if (params.time_min && typeof params.time_min !== 'string') {
            errors.push('time_min must be a string (ISO 8601)');
          }
          if (params.time_max && typeof params.time_max !== 'string') {
            errors.push('time_max must be a string (ISO 8601)');
          }
          if (params.max_results) {
            if (typeof params.max_results !== 'number' || params.max_results < 1 || params.max_results > 2500) {
              errors.push('max_results must be between 1 and 2500');
            }
          }
        }
        break;

      case 'update_event':
        {
          const required = ['event_id'];
          const requiredCheck = this.validateRequiredParams(params, required);
          errors.push(...requiredCheck.errors);

          // Summary, start, end are optional for updates but must be valid if provided
          if (params.start && typeof params.start === 'object') {
            const start = params.start as Record<string, unknown>;
            if (start.dateTime && typeof start.dateTime !== 'string') {
              errors.push('start.dateTime must be a string (ISO 8601)');
            }
            if (start.date && typeof start.date !== 'string') {
              errors.push('start.date must be a string (YYYY-MM-DD)');
            }
          }
          if (params.end && typeof params.end === 'object') {
            const end = params.end as Record<string, unknown>;
            if (end.dateTime && typeof end.dateTime !== 'string') {
              errors.push('end.dateTime must be a string (ISO 8601)');
            }
            if (end.date && typeof end.date !== 'string') {
              errors.push('end.date must be a string (YYYY-MM-DD)');
            }
          }
        }
        break;

      case 'delete_event':
        {
          const required = ['event_id'];
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
        case 'create_event':
          return await this.createEvent(params, credentials);
        case 'list_events':
          return await this.listEvents(params, credentials);
        case 'update_event':
          return await this.updateEvent(params, credentials);
        case 'delete_event':
          return await this.deleteEvent(params, credentials);
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

    // Exchange refresh token for new access token (same as Gmail)
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
      const errorText = await response.text();
      throw new ConnectorAuthError(
        `Token refresh failed: ${response.statusText} - ${errorText}`,
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

  private async createEvent(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const calendarId = (params.calendar_id as string) || 'primary';
    const event: GoogleCalendarEvent = {
      summary: params.summary as string,
      description: params.description as string | undefined,
      start: params.start as GoogleCalendarEvent['start'],
      end: params.end as GoogleCalendarEvent['end'],
      location: params.location as string | undefined,
      attendees: params.attendees as GoogleCalendarEvent['attendees'],
      recurrence: params.recurrence as string[] | undefined,
      reminders: params.reminders as GoogleCalendarEvent['reminders'],
    };

    const response = await this.makeRequest(
      `${this.CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
      credentials
    );

    const result = await this.parseJsonResponse<GoogleCalendarEvent>(response);

    return this.createSuccessResult({
      event_id: result.id,
      html_link: result.id ? `https://www.google.com/calendar/event?eid=${result.id}` : null,
      summary: result.summary,
      start: result.start,
      end: result.end,
    });
  }

  private async listEvents(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const calendarId = (params.calendar_id as string) || 'primary';
    const timeMin = (params.time_min as string) || new Date().toISOString();
    const timeMax = params.time_max as string | undefined;
    const maxResults = (params.max_results as number) || 10;
    const singleEvents = params.single_events !== false; // Default true
    const orderBy = (params.order_by as string) || 'startTime';

    const searchParams = new URLSearchParams({
      timeMin,
      maxResults: maxResults.toString(),
      singleEvents: singleEvents.toString(),
      orderBy,
    });

    if (timeMax) {
      searchParams.set('timeMax', timeMax);
    }

    const response = await this.makeRequest(
      `${this.CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${searchParams}`,
      {
        method: 'GET',
      },
      credentials
    );

    const result = await this.parseJsonResponse<GoogleCalendarEventsResponse>(response);

    return this.createSuccessResult({
      events: result.items.map((event) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees,
        html_link: event.id ? `https://www.google.com/calendar/event?eid=${event.id}` : null,
      })),
      count: result.items.length,
      next_page_token: result.nextPageToken,
      next_sync_token: result.nextSyncToken,
    });
  }

  private async updateEvent(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const calendarId = (params.calendar_id as string) || 'primary';
    const eventId = params.event_id as string;

    // Build update object with only provided fields
    const updates: Partial<GoogleCalendarEvent> = {};
    if (params.summary !== undefined) updates.summary = params.summary as string;
    if (params.description !== undefined) updates.description = params.description as string;
    if (params.start !== undefined) updates.start = params.start as GoogleCalendarEvent['start'];
    if (params.end !== undefined) updates.end = params.end as GoogleCalendarEvent['end'];
    if (params.location !== undefined) updates.location = params.location as string;
    if (params.attendees !== undefined) updates.attendees = params.attendees as GoogleCalendarEvent['attendees'];
    if (params.recurrence !== undefined) updates.recurrence = params.recurrence as string[];
    if (params.reminders !== undefined) updates.reminders = params.reminders as GoogleCalendarEvent['reminders'];

    const response = await this.makeRequest(
      `${this.CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      },
      credentials
    );

    const result = await this.parseJsonResponse<GoogleCalendarEvent>(response);

    return this.createSuccessResult({
      event_id: result.id,
      html_link: result.id ? `https://www.google.com/calendar/event?eid=${result.id}` : null,
      summary: result.summary,
      start: result.start,
      end: result.end,
    });
  }

  private async deleteEvent(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const calendarId = (params.calendar_id as string) || 'primary';
    const eventId = params.event_id as string;
    const sendUpdates = (params.send_updates as string) || 'none'; // 'all', 'externalOnly', 'none'

    const searchParams = new URLSearchParams();
    if (sendUpdates !== 'none') {
      searchParams.set('sendUpdates', sendUpdates);
    }

    const url = `${this.CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
    const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url;

    await this.makeRequest(
      fullUrl,
      {
        method: 'DELETE',
      },
      credentials
    );

    return this.createSuccessResult({
      event_id: eventId,
      deleted: true,
    });
  }
}
