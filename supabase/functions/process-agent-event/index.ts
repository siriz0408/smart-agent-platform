import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  source_table: string;
  source_id: string;
  processed: boolean;
  created_at: string;
}

interface AgentTrigger {
  id: string;
  tenant_id: string;
  agent_id: string;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  is_active: boolean;
  requires_approval: boolean;
  priority: number;
  context_config: Record<string, unknown>;
  ai_agents: {
    id: string;
    name: string;
    system_prompt: string;
    data_sources: string[];
  };
}

interface ProcessRequest {
  // Process a specific event by ID
  event_id?: string;
  // Process all unprocessed events
  process_all?: boolean;
  // Limit for batch processing
  limit?: number;
  // Dry run - match triggers but don't execute
  dry_run?: boolean;
}

/**
 * Checks if event data matches trigger conditions
 */
function matchesConditions(
  conditions: Record<string, unknown>,
  eventData: Record<string, unknown>
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true; // No conditions means always match
  }

  for (const [key, expectedValue] of Object.entries(conditions)) {
    // Handle nested keys with dot notation (e.g., "new.stage" or "old.status")
    const keys = key.split('.');
    let actualValue: unknown = eventData;
    
    for (const k of keys) {
      if (actualValue && typeof actualValue === 'object') {
        actualValue = (actualValue as Record<string, unknown>)[k];
      } else {
        actualValue = undefined;
        break;
      }
    }

    // Handle different comparison types
    if (typeof expectedValue === 'object' && expectedValue !== null) {
      // Complex conditions: { "$in": [...], "$ne": ..., "$gt": ..., etc. }
      const condObj = expectedValue as Record<string, unknown>;
      
      if ('$in' in condObj && Array.isArray(condObj.$in)) {
        if (!condObj.$in.includes(actualValue)) return false;
      }
      if ('$nin' in condObj && Array.isArray(condObj.$nin)) {
        if (condObj.$nin.includes(actualValue)) return false;
      }
      if ('$ne' in condObj) {
        if (actualValue === condObj.$ne) return false;
      }
      if ('$gt' in condObj) {
        if (typeof actualValue !== 'number' || actualValue <= (condObj.$gt as number)) return false;
      }
      if ('$gte' in condObj) {
        if (typeof actualValue !== 'number' || actualValue < (condObj.$gte as number)) return false;
      }
      if ('$lt' in condObj) {
        if (typeof actualValue !== 'number' || actualValue >= (condObj.$lt as number)) return false;
      }
      if ('$lte' in condObj) {
        if (typeof actualValue !== 'number' || actualValue > (condObj.$lte as number)) return false;
      }
      if ('$contains' in condObj) {
        if (!String(actualValue).includes(String(condObj.$contains))) return false;
      }
      if ('$exists' in condObj) {
        const exists = actualValue !== undefined && actualValue !== null;
        if (condObj.$exists !== exists) return false;
      }
    } else {
      // Simple equality check
      if (actualValue !== expectedValue) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Build context for agent execution based on event data
 */
function buildAgentContext(
  event: AgentEvent,
  trigger: AgentTrigger
): Record<string, string | undefined> {
  const context: Record<string, string | undefined> = {};
  const eventData = event.event_data as Record<string, unknown>;

  // Extract IDs from event data based on source table
  switch (event.source_table) {
    case 'contacts':
      context.contact_id = event.source_id;
      break;
    case 'deals':
      context.deal_id = event.source_id;
      // If deal has contact_id in event data, include it
      if (eventData.contact_id || (eventData.new as Record<string, unknown>)?.contact_id) {
        context.contact_id = (eventData.contact_id || (eventData.new as Record<string, unknown>)?.contact_id) as string;
      }
      break;
    case 'documents':
      context.document_id = event.source_id;
      if (eventData.deal_id || (eventData.new as Record<string, unknown>)?.deal_id) {
        context.deal_id = (eventData.deal_id || (eventData.new as Record<string, unknown>)?.deal_id) as string;
      }
      break;
    case 'properties':
      context.property_id = event.source_id;
      break;
  }

  // Add any additional context from trigger config
  if (trigger.context_config) {
    Object.assign(context, trigger.context_config);
  }

  // Add the event data as additional context
  context.additional_context = `Triggered by ${event.event_type} event:\n${JSON.stringify(eventData, null, 2)}`;

  return context;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service client for processing events
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ProcessRequest = await req.json().catch(() => ({}));
    const { event_id, process_all = false, limit = 50, dry_run = false } = body;

    const results: Array<{
      event_id: string;
      matched_triggers: string[];
      agents_triggered: string[];
      errors: string[];
    }> = [];

    // Get events to process
    let eventsQuery = supabase
      .from("agent_events")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true });

    if (event_id) {
      eventsQuery = eventsQuery.eq("id", event_id);
    } else if (process_all) {
      eventsQuery = eventsQuery.limit(limit);
    } else {
      return new Response(
        JSON.stringify({ error: "Either event_id or process_all must be provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) {
      logger.error("Error fetching events", { error: eventsError.message });
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No unprocessed events found",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process each event
    for (const event of events as AgentEvent[]) {
      const eventResult = {
        event_id: event.id,
        matched_triggers: [] as string[],
        agents_triggered: [] as string[],
        errors: [] as string[],
      };

      try {
        // Find matching triggers for this event
        const { data: triggers, error: triggersError } = await supabase
          .from("agent_triggers")
          .select(`
            *,
            ai_agents(id, name, system_prompt, data_sources)
          `)
          .eq("trigger_type", event.event_type)
          .eq("is_active", true)
          .or(`tenant_id.eq.${event.tenant_id},tenant_id.is.null`)
          .order("priority", { ascending: false });

        if (triggersError) {
          logger.error("Error fetching triggers", { error: triggersError.message });
          eventResult.errors.push(`Failed to fetch triggers: ${triggersError.message}`);
          continue;
        }

        // Filter triggers by conditions
        const matchedTriggers = (triggers as AgentTrigger[]).filter((trigger) =>
          matchesConditions(trigger.trigger_conditions, event.event_data)
        );

        eventResult.matched_triggers = matchedTriggers.map((t) => t.id);

        // Execute agents for matched triggers
        for (const trigger of matchedTriggers) {
          if (dry_run) {
            eventResult.agents_triggered.push(trigger.agent_id);
            continue;
          }

          try {
            // Build context for agent
            const context = buildAgentContext(event, trigger);

            // Call execute-agent function
            const executeResponse = await fetch(`${supabaseUrl}/functions/v1/execute-agent`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                agent_id: trigger.agent_id,
                context,
                enable_actions: true,
                auto_execute_actions: !trigger.requires_approval,
                trigger_event: {
                  event_id: event.id,
                  event_type: event.event_type,
                  trigger_id: trigger.id,
                  trigger_name: trigger.ai_agents?.name,
                },
              }),
            });

            if (executeResponse.ok) {
              eventResult.agents_triggered.push(trigger.agent_id);
              logger.info("Agent triggered", {
                agent_id: trigger.agent_id,
                event_id: event.id,
                trigger_id: trigger.id,
              });
            } else {
              const errorText = await executeResponse.text();
              eventResult.errors.push(
                `Agent ${trigger.agent_id} execution failed: ${errorText}`
              );
              logger.error("Agent execution failed", {
                agent_id: trigger.agent_id,
                error: errorText,
              });
            }
          } catch (execError) {
            eventResult.errors.push(
              `Agent ${trigger.agent_id} execution error: ${execError instanceof Error ? execError.message : String(execError)}`
            );
          }
        }

        // Mark event as processed
        if (!dry_run) {
          await supabase
            .from("agent_events")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              matched_triggers: eventResult.matched_triggers,
              processing_error: eventResult.errors.length > 0 
                ? eventResult.errors.join("; ") 
                : null,
            })
            .eq("id", event.id);
        }

      } catch (eventError) {
        eventResult.errors.push(
          eventError instanceof Error ? eventError.message : String(eventError)
        );
        
        // Mark event as processed with error
        if (!dry_run) {
          await supabase
            .from("agent_events")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              processing_error: eventResult.errors.join("; "),
            })
            .eq("id", event.id);
        }
      }

      results.push(eventResult);
    }

    const summary = {
      success: true,
      dry_run,
      processed: results.length,
      total_triggers_matched: results.reduce((sum, r) => sum + r.matched_triggers.length, 0),
      total_agents_triggered: results.reduce((sum, r) => sum + r.agents_triggered.length, 0),
      total_errors: results.reduce((sum, r) => sum + r.errors.length, 0),
      results,
    };

    logger.info("Event processing complete", {
      processed: summary.processed,
      triggered: summary.total_agents_triggered,
    });

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logger.error("Process agent event error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
