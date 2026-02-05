/**
 * Agent Actions Registry
 * 
 * Defines the actions that agents can request, validates parameters,
 * and provides executors for each action type.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logger } from "./logger.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_REGEX.test(value) && value.length <= 320;
}

const CONTACT_TYPE_VALUES = ["lead", "buyer", "seller", "agent", "vendor"];
const DEAL_STAGE_VALUES = ["lead", "contacted", "showing", "offer", "under_contract", "pending", "closed", "lost"];

// ============================================================================
// TYPES
// ============================================================================

export type ActionType =
  | 'create_contact'
  | 'update_contact'
  | 'create_deal'
  | 'move_deal_stage'
  | 'send_email'
  | 'add_note'
  | 'schedule_task'
  | 'enroll_drip'
  | 'notify_user'
  | 'assign_tags'
  // MCP Actions
  | 'playwright_run_test'
  | 'playwright_run_suite'
  | 'playwright_compare_visual'
  | 'zillow_enrich_property'
  | 'zillow_check_price_change'
  | 'zillow_search_properties'
  | 'mls_search'
  | 'vercel_deploy_status'
  | 'supabase_query';

export interface ActionRequest {
  type: ActionType;
  params: Record<string, unknown>;
  reason?: string;
}

export interface ActionContext {
  tenant_id: string;
  user_id: string;
  agent_run_id?: string;
  requires_approval?: boolean;
  // Source data that triggered the agent
  source_contact?: Record<string, unknown>;
  source_deal?: Record<string, unknown>;
  source_document?: Record<string, unknown>;
  source_property?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  action_type: ActionType;
  result?: Record<string, unknown>;
  error?: string;
  created_id?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized_params?: Record<string, unknown>;
}

// ============================================================================
// VALIDATORS
// ============================================================================

const validators: Record<ActionType, (params: Record<string, unknown>) => ValidationResult> = {
  create_contact: (params) => {
    const errors: string[] = [];
    
    if (!params.first_name && !params.full_name) {
      errors.push('first_name or full_name is required');
    }
    
    if (params.email && !isValidEmail(params.email)) {
      errors.push('Invalid email format');
    }
    
    if (params.contact_type && !CONTACT_TYPE_VALUES.includes(params.contact_type as string)) {
      errors.push('Invalid contact_type');
    }
    
    // Parse full_name into first_name and last_name if provided
    const sanitized = { ...params };
    if (params.full_name && !params.first_name) {
      const names = (params.full_name as string).trim().split(' ');
      sanitized.first_name = names[0] || 'Unknown';
      sanitized.last_name = names.slice(1).join(' ') || '';
      delete sanitized.full_name;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      sanitized_params: sanitized,
    };
  },

  update_contact: (params) => {
    const errors: string[] = [];
    
    if (!params.contact_id) {
      errors.push('contact_id is required');
    }
    if (params.contact_id && !isUuid(params.contact_id)) {
      errors.push('contact_id must be a valid UUID');
    }
    
    if (params.email && !isValidEmail(params.email)) {
      errors.push('Invalid email format');
    }

    if (params.contact_type && !CONTACT_TYPE_VALUES.includes(params.contact_type as string)) {
      errors.push('Invalid contact_type');
    }

    if (params.tags && (!Array.isArray(params.tags) || (params.tags as unknown[]).some((tag) => !isNonEmptyString(tag)))) {
      errors.push('tags must be a non-empty string array');
    }

    const allowedFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'company',
      'contact_type',
      'status',
      'tags',
      'notes',
      'custom_fields',
    ];
    const sanitizedUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in params) {
        sanitizedUpdates[field] = params[field];
      }
    }
    if (Object.keys(sanitizedUpdates).length === 0) {
      errors.push('At least one updatable field is required');
    }
    
    return { valid: errors.length === 0, errors, sanitized_params: { contact_id: params.contact_id, ...sanitizedUpdates } };
  },

  create_deal: (params) => {
    const errors: string[] = [];
    
    if (!params.deal_type || !['buyer', 'seller', 'dual'].includes(params.deal_type as string)) {
      errors.push('deal_type is required and must be buyer, seller, or dual');
    }
    
    if (!params.contact_id) {
      errors.push('contact_id is required');
    }
    if (params.contact_id && !isUuid(params.contact_id)) {
      errors.push('contact_id must be a valid UUID');
    }
    if (params.property_id && !isUuid(params.property_id)) {
      errors.push('property_id must be a valid UUID');
    }
    
    if (params.stage && !DEAL_STAGE_VALUES.includes(params.stage as string)) {
      errors.push(`Invalid stage. Must be one of: ${DEAL_STAGE_VALUES.join(', ')}`);
    }
    
    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  move_deal_stage: (params) => {
    const errors: string[] = [];
    
    if (!params.deal_id) {
      errors.push('deal_id is required');
    }
    if (params.deal_id && !isUuid(params.deal_id)) {
      errors.push('deal_id must be a valid UUID');
    }
    
    if (!params.stage) {
      errors.push('stage is required');
    }
    
    if (params.stage && !DEAL_STAGE_VALUES.includes(params.stage as string)) {
      errors.push(`Invalid stage. Must be one of: ${DEAL_STAGE_VALUES.join(', ')}`);
    }
    
    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  send_email: (params) => {
    const errors: string[] = [];
    
    if (!params.template && !params.subject) {
      errors.push('Either template or subject is required');
    }
    
    if (!params.recipient_user_id && !params.to_email && !params.contact_id) {
      errors.push('recipient_user_id, to_email, or contact_id is required');
    }

    if (params.recipient_user_id && !isUuid(params.recipient_user_id)) {
      errors.push('recipient_user_id must be a valid UUID');
    }

    if (params.contact_id && !isUuid(params.contact_id)) {
      errors.push('contact_id must be a valid UUID');
    }

    if (params.to_email && !isValidEmail(params.to_email)) {
      errors.push('to_email must be a valid email address');
    }

    if (params.subject && typeof params.subject === 'string' && params.subject.length > 200) {
      errors.push('subject is too long (max 200 chars)');
    }
    
    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  add_note: (params) => {
    const errors: string[] = [];
    
    if (!params.content) {
      errors.push('content is required');
    }
    
    if (!params.contact_id && !params.deal_id && !params.property_id) {
      errors.push('At least one of contact_id, deal_id, or property_id is required');
    }

    if (params.contact_id && !isUuid(params.contact_id)) {
      errors.push('contact_id must be a valid UUID');
    }
    if (params.deal_id && !isUuid(params.deal_id)) {
      errors.push('deal_id must be a valid UUID');
    }
    if (params.property_id && !isUuid(params.property_id)) {
      errors.push('property_id must be a valid UUID');
    }
    
    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  schedule_task: (params) => {
    const errors: string[] = [];
    
    if (!params.title) {
      errors.push('title is required');
    }
    
    if (!params.due_date && !params.due_in_days) {
      errors.push('Either due_date or due_in_days is required');
    }

    if (params.due_in_days && (typeof params.due_in_days !== 'number' || params.due_in_days < 0)) {
      errors.push('due_in_days must be a positive number');
    }
    
    // Calculate due_date from due_in_days if needed
    const sanitized = { ...params };
    if (!params.due_date && params.due_in_days) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (params.due_in_days as number));
      sanitized.due_date = dueDate.toISOString().split('T')[0];
    }
    
    return { valid: errors.length === 0, errors, sanitized_params: sanitized };
  },

  enroll_drip: (params) => {
    const errors: string[] = [];
    
    if (!params.contact_id) {
      errors.push('contact_id is required');
    }
    if (params.contact_id && !isUuid(params.contact_id)) {
      errors.push('contact_id must be a valid UUID');
    }
    
    if (!params.campaign_id && !params.campaign_name) {
      errors.push('Either campaign_id or campaign_name is required');
    }
    
    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  notify_user: (params) => {
    const errors: string[] = [];
    
    if (!params.title && !params.message) {
      errors.push('title or message is required');
    }

    if (params.target_user_id && !isUuid(params.target_user_id)) {
      errors.push('target_user_id must be a valid UUID');
    }
    
    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  assign_tags: (params) => {
    const errors: string[] = [];

    if (!params.contact_id) {
      errors.push('contact_id is required');
    }
    if (params.contact_id && !isUuid(params.contact_id)) {
      errors.push('contact_id must be a valid UUID');
    }

    if (!params.tags || !Array.isArray(params.tags) || params.tags.length === 0) {
      errors.push('tags array is required and must not be empty');
    }
    if (params.tags && Array.isArray(params.tags) && (params.tags as unknown[]).some((tag) => !isNonEmptyString(tag))) {
      errors.push('tags must be a non-empty string array');
    }

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  // ============================================================================
  // MCP ACTION VALIDATORS
  // ============================================================================

  playwright_run_test: (params) => {
    const errors: string[] = [];

    if (!params.test_file) {
      errors.push('test_file is required');
    }

    if (params.project && !['chromium', 'firefox', 'webkit', 'mobile'].includes(params.project as string)) {
      errors.push('Invalid project. Must be chromium, firefox, webkit, or mobile');
    }

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  playwright_run_suite: (params) => {
    const errors: string[] = [];

    if (!params.test_suite) {
      errors.push('test_suite is required');
    }

    if (params.project && !['chromium', 'firefox', 'webkit', 'mobile'].includes(params.project as string)) {
      errors.push('Invalid project. Must be chromium, firefox, webkit, or mobile');
    }

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  playwright_compare_visual: (params) => {
    const errors: string[] = [];

    if (!params.test_name) {
      errors.push('test_name is required');
    }

    if (!params.page_url) {
      errors.push('page_url is required');
    }

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  zillow_enrich_property: (params) => {
    const errors: string[] = [];

    if (!params.property_id && !params.address) {
      errors.push('Either property_id or address is required');
    }

    if (params.property_id && !isUuid(params.property_id)) {
      errors.push('property_id must be a valid UUID');
    }

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  zillow_check_price_change: (params) => {
    const errors: string[] = [];

    if (!params.property_id && !params.external_property_id) {
      errors.push('Either property_id or external_property_id is required');
    }

    if (params.property_id && !isUuid(params.property_id)) {
      errors.push('property_id must be a valid UUID');
    }

    if (params.external_property_id && !isUuid(params.external_property_id)) {
      errors.push('external_property_id must be a valid UUID');
    }

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  zillow_search_properties: (params) => {
    const errors: string[] = [];

    if (!params.location) {
      errors.push('location is required (city, state, or zip code)');
    }

    if (params.min_price && typeof params.min_price !== 'number') {
      errors.push('min_price must be a number');
    }

    if (params.max_price && typeof params.max_price !== 'number') {
      errors.push('max_price must be a number');
    }

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  mls_search: (params) => {
    const errors: string[] = [];

    if (!params.location) {
      errors.push('location is required');
    }

    // Future: Add MLS-specific validation
    errors.push('MLS search not yet implemented');

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  vercel_deploy_status: (params) => {
    const errors: string[] = [];

    // Future: Add Vercel-specific validation
    errors.push('Vercel deploy status not yet implemented');

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },

  supabase_query: (params) => {
    const errors: string[] = [];

    if (!params.query) {
      errors.push('query is required');
    }

    // Security: Block dangerous operations
    const query = (params.query as string)?.toLowerCase() || '';
    if (query.includes('drop ') || query.includes('delete ') || query.includes('truncate ')) {
      errors.push('Dangerous SQL operations are not allowed');
    }

    // Future: Add more validation
    errors.push('Supabase query not yet implemented');

    return { valid: errors.length === 0, errors, sanitized_params: params };
  },
};

// ============================================================================
// MCP HELPER FUNCTION
// ============================================================================

/**
 * Execute an MCP action via the MCP Gateway
 */
async function executeMcpAction(
  supabase: SupabaseClient,
  mcpType: 'playwright' | 'zillow' | 'mls' | 'vercel' | 'supabase',
  toolName: string,
  params: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Call MCP Gateway
    const response = await fetch(`${supabaseUrl}/functions/v1/mcp-gateway`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mcp_type: mcpType,
        tool_name: toolName,
        params,
        agent_run_id: context.agent_run_id,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `MCP Gateway error: ${response.status}`);
    }

    return {
      success: true,
      action_type: toolName as ActionType,
      result: {
        mcp_call_id: result.mcp_call_id,
        data: result.data,
        rate_limit: result.rate_limit,
      },
    };
  } catch (error) {
    logger.error('MCP action execution error', {
      mcp_type: mcpType,
      tool_name: toolName,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      action_type: toolName as ActionType,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXECUTORS
// ============================================================================

const executors: Record<ActionType, (
  supabase: SupabaseClient,
  params: Record<string, unknown>,
  context: ActionContext
) => Promise<ActionResult>> = {
  
  create_contact: async (supabase, params, context) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          tenant_id: context.tenant_id,
          first_name: params.first_name,
          last_name: params.last_name || '',
          email: params.email,
          phone: params.phone,
          company: params.company,
          contact_type: params.contact_type || 'lead',
          status: params.status || 'active',
          tags: params.tags || [],
          notes: params.notes,
          custom_fields: params.custom_fields || {},
          created_by: context.user_id,
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        action_type: 'create_contact',
        result: { contact_id: data.id },
        created_id: data.id,
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'create_contact',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  update_contact: async (supabase, params, context) => {
    try {
      const { contact_id, ...updates } = params;
      if (!isUuid(contact_id)) {
        throw new Error('Invalid contact_id');
      }

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', contact_id)
        .eq('tenant_id', context.tenant_id)
        .maybeSingle();

      if (contactError) throw contactError;
      if (!contact) {
        throw new Error('Contact not found');
      }

      const allowedFields = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'contact_type',
        'status',
        'tags',
        'notes',
        'custom_fields',
      ];
      const sanitizedUpdates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (field in updates) {
          sanitizedUpdates[field] = updates[field];
        }
      }
      if (Object.keys(sanitizedUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }
      
      const { error } = await supabase
        .from('contacts')
        .update(sanitizedUpdates)
        .eq('id', contact_id)
        .eq('tenant_id', context.tenant_id);

      if (error) throw error;

      return {
        success: true,
        action_type: 'update_contact',
        result: { contact_id },
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'update_contact',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  create_deal: async (supabase, params, context) => {
    try {
      if (!isUuid(params.contact_id)) {
        throw new Error('Invalid contact_id');
      }

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', params.contact_id)
        .eq('tenant_id', context.tenant_id)
        .maybeSingle();

      if (contactError) throw contactError;
      if (!contact) {
        throw new Error('Contact not found');
      }

      if (params.property_id) {
        if (!isUuid(params.property_id)) {
          throw new Error('Invalid property_id');
        }

        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('id')
          .eq('id', params.property_id)
          .eq('tenant_id', context.tenant_id)
          .maybeSingle();

        if (propertyError) throw propertyError;
        if (!property) {
          throw new Error('Property not found');
        }
      }

      const { data, error } = await supabase
        .from('deals')
        .insert({
          tenant_id: context.tenant_id,
          contact_id: params.contact_id,
          property_id: params.property_id,
          deal_type: params.deal_type,
          stage: params.stage || 'lead',
          estimated_value: params.estimated_value,
          commission_rate: params.commission_rate,
          expected_close_date: params.expected_close_date,
          notes: params.notes,
          agent_id: context.user_id,
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        action_type: 'create_deal',
        result: { deal_id: data.id },
        created_id: data.id,
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'create_deal',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  move_deal_stage: async (supabase, params, context) => {
    try {
      if (!isUuid(params.deal_id)) {
        throw new Error('Invalid deal_id');
      }

      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id')
        .eq('id', params.deal_id)
        .eq('tenant_id', context.tenant_id)
        .maybeSingle();

      if (dealError) throw dealError;
      if (!deal) {
        throw new Error('Deal not found');
      }

      const { error } = await supabase
        .from('deals')
        .update({ 
          stage: params.stage,
          notes: params.notes ? `${params.notes}` : undefined,
        })
        .eq('id', params.deal_id)
        .eq('tenant_id', context.tenant_id);

      if (error) throw error;

      return {
        success: true,
        action_type: 'move_deal_stage',
        result: { deal_id: params.deal_id, new_stage: params.stage },
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'move_deal_stage',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  send_email: async (supabase, params, context) => {
    try {
      if (params.contact_id) {
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select('id')
          .eq('id', params.contact_id)
          .eq('tenant_id', context.tenant_id)
          .maybeSingle();

        if (contactError) throw contactError;
        if (!contact) {
          throw new Error('Contact not found');
        }
      }

      // If we have a contact_id, get the associated user_id
      let recipientUserId = params.recipient_user_id as string;
      
      if (!recipientUserId && params.contact_id) {
        // Check if contact is linked to a user
        const { data: contactAgent } = await supabase
          .from('contact_agents')
          .select('agent_user_id')
          .eq('contact_id', params.contact_id)
          .maybeSingle();
        
        if (contactAgent) {
          recipientUserId = contactAgent.agent_user_id;
        }
      }

      if (!recipientUserId) {
        // Log email to send later or handle external email
        logger.info('Email would be sent to external recipient', { params });
        return {
          success: true,
          action_type: 'send_email',
          result: { status: 'queued_for_external', params },
        };
      }

      // Call the send-email edge function internally
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientUserId,
          template: params.template || 'generic',
          variables: params.variables || {
            subject: params.subject,
            message: params.message,
          },
          createNotification: params.create_notification !== false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      return {
        success: true,
        action_type: 'send_email',
        result,
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'send_email',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  add_note: async (supabase, params, context) => {
    try {
      const noteContent = params.content as string;
      const timestamp = new Date().toISOString();
      const formattedNote = `[${timestamp}] [Agent Action] ${noteContent}`;

      // Add note to contact
      if (params.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('notes')
          .eq('id', params.contact_id)
          .eq('tenant_id', context.tenant_id)
          .single();

        const existingNotes = contact?.notes || '';
        const newNotes = existingNotes 
          ? `${existingNotes}\n\n${formattedNote}`
          : formattedNote;

        await supabase
          .from('contacts')
          .update({ notes: newNotes })
          .eq('id', params.contact_id)
          .eq('tenant_id', context.tenant_id);
      }

      // Add note to deal
      if (params.deal_id) {
        const { data: deal } = await supabase
          .from('deals')
          .select('notes')
          .eq('id', params.deal_id)
          .eq('tenant_id', context.tenant_id)
          .single();

        const existingNotes = deal?.notes || '';
        const newNotes = existingNotes 
          ? `${existingNotes}\n\n${formattedNote}`
          : formattedNote;

        await supabase
          .from('deals')
          .update({ notes: newNotes })
          .eq('id', params.deal_id)
          .eq('tenant_id', context.tenant_id);
      }

      return {
        success: true,
        action_type: 'add_note',
        result: { 
          contact_id: params.contact_id, 
          deal_id: params.deal_id,
          note: formattedNote,
        },
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'add_note',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  schedule_task: async (supabase, params, context) => {
    try {
      // Create a deal milestone as a task
      if (params.deal_id) {
        if (!isUuid(params.deal_id)) {
          throw new Error('Invalid deal_id');
        }

        const { data: deal, error: dealError } = await supabase
          .from('deals')
          .select('id')
          .eq('id', params.deal_id)
          .eq('tenant_id', context.tenant_id)
          .maybeSingle();

        if (dealError) throw dealError;
        if (!deal) {
          throw new Error('Deal not found');
        }

        const { data, error } = await supabase
          .from('deal_milestones')
          .insert({
            deal_id: params.deal_id,
            title: params.title,
            due_date: params.due_date,
            notes: params.notes,
          })
          .select('id')
          .single();

        if (error) throw error;

        return {
          success: true,
          action_type: 'schedule_task',
          result: { milestone_id: data.id, deal_id: params.deal_id },
          created_id: data.id,
        };
      }

      // For tasks not associated with a deal, create a notification as reminder
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: context.user_id,
          tenant_id: context.tenant_id,
          type: 'task_reminder',
          title: params.title as string,
          body: params.notes as string || `Due: ${params.due_date}`,
          metadata: {
            due_date: params.due_date,
            contact_id: params.contact_id,
            created_by_agent: true,
          },
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        action_type: 'schedule_task',
        result: { notification_id: data.id, due_date: params.due_date },
        created_id: data.id,
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'schedule_task',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  enroll_drip: async (supabase, params, context) => {
    try {
      if (!isUuid(params.contact_id)) {
        throw new Error('Invalid contact_id');
      }

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', params.contact_id)
        .eq('tenant_id', context.tenant_id)
        .maybeSingle();

      if (contactError) throw contactError;
      if (!contact) {
        throw new Error('Contact not found');
      }

      let campaignId = params.campaign_id as string;

      // Find campaign by name if needed
      if (!campaignId && params.campaign_name) {
        const { data: campaign } = await supabase
          .from('email_campaigns')
          .select('id')
          .eq('tenant_id', context.tenant_id)
          .ilike('name', `%${params.campaign_name}%`)
          .single();

        if (campaign) {
          campaignId = campaign.id;
        }
      }

      if (!campaignId) {
        throw new Error('Campaign not found');
      }

      // Check if already enrolled
      const { data: existing } = await supabase
        .from('email_campaign_recipients')
        .select('id, status')
        .eq('campaign_id', campaignId)
        .eq('contact_id', params.contact_id)
        .single();

      if (existing) {
        if (existing.status === 'active') {
          return {
            success: true,
            action_type: 'enroll_drip',
            result: { status: 'already_enrolled', recipient_id: existing.id },
          };
        }
        
        // Reactivate if paused/completed
        await supabase
          .from('email_campaign_recipients')
          .update({ status: 'active' })
          .eq('id', existing.id);

        return {
          success: true,
          action_type: 'enroll_drip',
          result: { status: 'reactivated', recipient_id: existing.id },
        };
      }

      // Enroll in campaign
      const { data, error } = await supabase
        .from('email_campaign_recipients')
        .insert({
          campaign_id: campaignId,
          contact_id: params.contact_id,
          tenant_id: context.tenant_id,
          status: 'active',
          current_step: 0,
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        action_type: 'enroll_drip',
        result: { recipient_id: data.id, campaign_id: campaignId },
        created_id: data.id,
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'enroll_drip',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  notify_user: async (supabase, params, context) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: params.target_user_id || context.user_id,
          tenant_id: context.tenant_id,
          type: params.type || 'agent_notification',
          title: params.title || 'Agent Notification',
          body: params.message,
          action_url: params.action_url,
          metadata: {
            agent_run_id: context.agent_run_id,
            priority: params.priority,
            ...((params.metadata as Record<string, unknown>) || {}),
          },
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        action_type: 'notify_user',
        result: { notification_id: data.id },
        created_id: data.id,
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'notify_user',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  assign_tags: async (supabase, params, context) => {
    try {
      const { data: contact } = await supabase
        .from('contacts')
        .select('tags')
        .eq('id', params.contact_id)
        .eq('tenant_id', context.tenant_id)
        .single();

      if (!contact) {
        throw new Error('Contact not found');
      }

      const existingTags = contact.tags || [];
      const newTags = params.tags as string[];
      const mergedTags = [...new Set([...existingTags, ...newTags])];

      const { error } = await supabase
        .from('contacts')
        .update({ tags: mergedTags })
        .eq('id', params.contact_id)
        .eq('tenant_id', context.tenant_id);

      if (error) throw error;

      return {
        success: true,
        action_type: 'assign_tags',
        result: {
          contact_id: params.contact_id,
          tags: mergedTags,
          added_tags: newTags.filter(t => !existingTags.includes(t)),
        },
      };
    } catch (error) {
      return {
        success: false,
        action_type: 'assign_tags',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // ============================================================================
  // MCP ACTION EXECUTORS
  // ============================================================================

  playwright_run_test: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'playwright', 'playwright_run_test', params, context);
  },

  playwright_run_suite: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'playwright', 'playwright_run_suite', params, context);
  },

  playwright_compare_visual: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'playwright', 'playwright_compare_visual', params, context);
  },

  zillow_enrich_property: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'zillow', 'zillow_enrich_property', params, context);
  },

  zillow_check_price_change: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'zillow', 'zillow_check_price_change', params, context);
  },

  zillow_search_properties: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'zillow', 'zillow_search_properties', params, context);
  },

  mls_search: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'mls', 'mls_search', params, context);
  },

  vercel_deploy_status: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'vercel', 'vercel_deploy_status', params, context);
  },

  supabase_query: async (supabase, params, context) => {
    return await executeMcpAction(supabase, 'supabase', 'supabase_query', params, context);
  },
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Validate an action request
 */
export function validateAction(action: ActionRequest): ValidationResult {
  const validator = validators[action.type];
  if (!validator) {
    return {
      valid: false,
      errors: [`Unknown action type: ${action.type}`],
    };
  }
  return validator(action.params);
}

/**
 * Execute an action immediately
 */
export async function executeAction(
  supabase: SupabaseClient,
  action: ActionRequest,
  context: ActionContext
): Promise<ActionResult> {
  const executor = executors[action.type];
  if (!executor) {
    return {
      success: false,
      action_type: action.type,
      error: `Unknown action type: ${action.type}`,
    };
  }

  // Validate first
  const validation = validateAction(action);
  if (!validation.valid) {
    return {
      success: false,
      action_type: action.type,
      error: `Validation failed: ${validation.errors.join(', ')}`,
    };
  }

  // Execute with sanitized params
  const params = validation.sanitized_params || action.params;
  
  logger.info('Executing action', { 
    action_type: action.type, 
    context: { tenant_id: context.tenant_id, user_id: context.user_id }
  });

  const result = await executor(supabase, params, context);
  
  logger.info('Action result', { action_type: action.type, success: result.success });
  
  return result;
}

/**
 * Queue an action for later execution (with optional approval)
 */
export async function queueAction(
  supabase: SupabaseClient,
  action: ActionRequest,
  context: ActionContext
): Promise<{ queued: boolean; action_queue_id?: string; error?: string }> {
  // Validate first
  const validation = validateAction(action);
  if (!validation.valid) {
    return {
      queued: false,
      error: `Validation failed: ${validation.errors.join(', ')}`,
    };
  }

  try {
    const { data, error } = await supabase
      .from('action_queue')
      .insert({
        tenant_id: context.tenant_id,
        user_id: context.user_id,
        agent_run_id: context.agent_run_id,
        action_type: action.type,
        action_params: validation.sanitized_params || action.params,
        action_reason: action.reason,
        requires_approval: context.requires_approval ?? false,
        status: context.requires_approval ? 'pending' : 'approved',
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      queued: true,
      action_queue_id: data.id,
    };
  } catch (error) {
    return {
      queued: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a queued action by ID
 */
export async function processQueuedAction(
  supabase: SupabaseClient,
  actionQueueId: string
): Promise<ActionResult> {
  // Get the queued action
  const { data: queuedAction, error: fetchError } = await supabase
    .from('action_queue')
    .select('*')
    .eq('id', actionQueueId)
    .single();

  if (fetchError || !queuedAction) {
    return {
      success: false,
      action_type: 'unknown' as ActionType,
      error: 'Action not found in queue',
    };
  }

  if (queuedAction.status !== 'approved') {
    return {
      success: false,
      action_type: queuedAction.action_type as ActionType,
      error: `Action status is ${queuedAction.status}, not approved`,
    };
  }

  // Mark as executing
  await supabase
    .from('action_queue')
    .update({ status: 'executing', updated_at: new Date().toISOString() })
    .eq('id', actionQueueId);

  // Execute the action
  const context: ActionContext = {
    tenant_id: queuedAction.tenant_id,
    user_id: queuedAction.user_id,
    agent_run_id: queuedAction.agent_run_id,
  };

  const result = await executeAction(
    supabase,
    {
      type: queuedAction.action_type as ActionType,
      params: queuedAction.action_params,
      reason: queuedAction.action_reason,
    },
    context
  );

  // Update queue status
  await supabase
    .from('action_queue')
    .update({
      status: result.success ? 'completed' : 'failed',
      executed_at: new Date().toISOString(),
      result: result.result,
      error_message: result.error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', actionQueueId);

  return result;
}

/**
 * Get all supported action types with descriptions
 */
export function getActionDescriptions(): Record<ActionType, string> {
  return {
    create_contact: 'Create a new contact in the CRM',
    update_contact: 'Update an existing contact\'s information',
    create_deal: 'Create a new deal/transaction',
    move_deal_stage: 'Move a deal to a different pipeline stage',
    send_email: 'Send an email to a user or contact',
    add_note: 'Add a note to a contact, deal, or property',
    schedule_task: 'Schedule a follow-up task or reminder',
    enroll_drip: 'Enroll a contact in an email drip campaign',
    notify_user: 'Send an in-app notification to a user',
    assign_tags: 'Assign tags to a contact for categorization',
    // MCP Actions
    playwright_run_test: 'Run a specific Playwright E2E test file',
    playwright_run_suite: 'Run a full Playwright test suite (e2e, smoke, visual)',
    playwright_compare_visual: 'Compare screenshot against visual baseline for regression testing',
    zillow_enrich_property: 'Enrich property data with Zillow information (price, details, photos)',
    zillow_check_price_change: 'Check if a property\'s price has changed on Zillow',
    zillow_search_properties: 'Search for properties on Zillow by location and filters',
    mls_search: 'Search MLS listings (not yet implemented)',
    vercel_deploy_status: 'Check Vercel deployment status (not yet implemented)',
    supabase_query: 'Execute a read-only Supabase query (not yet implemented)',
  };
}
