import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/error-handler.ts";

interface ScheduledTrigger {
  id: string;
  tenant_id: string;
  agent_id: string;
  schedule_cron: string;
  is_active: boolean;
  requires_approval: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  context_config: Record<string, unknown>;
  ai_agents: {
    id: string;
    name: string;
  };
}

/**
 * Parse cron expression and check if it should run now
 * Simplified cron parser - supports: minute hour day-of-month month day-of-week
 */
function shouldRunNow(cronExpression: string, lastRunAt: string | null): boolean {
  const now = new Date();
  const parts = cronExpression.split(" ");
  
  if (parts.length !== 5) {
    logger.warn("Invalid cron expression", { cronExpression });
    return false;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Check each part
  const nowMinute = now.getMinutes();
  const nowHour = now.getHours();
  const nowDayOfMonth = now.getDate();
  const nowMonth = now.getMonth() + 1; // 1-indexed
  const nowDayOfWeek = now.getDay(); // 0 = Sunday

  // Helper to check if value matches cron part
  const matches = (cronPart: string, value: number, max: number): boolean => {
    if (cronPart === "*") return true;
    
    // Range: 1-5
    if (cronPart.includes("-")) {
      const [start, end] = cronPart.split("-").map(Number);
      return value >= start && value <= end;
    }
    
    // Step: */4
    if (cronPart.startsWith("*/")) {
      const step = parseInt(cronPart.slice(2));
      return value % step === 0;
    }
    
    // List: 1,3,5
    if (cronPart.includes(",")) {
      return cronPart.split(",").map(Number).includes(value);
    }
    
    // Exact match
    return parseInt(cronPart) === value;
  };

  // Check if current time matches cron expression
  const minuteMatch = matches(minute, nowMinute, 59);
  const hourMatch = matches(hour, nowHour, 23);
  const dayOfMonthMatch = matches(dayOfMonth, nowDayOfMonth, 31);
  const monthMatch = matches(month, nowMonth, 12);
  const dayOfWeekMatch = matches(dayOfWeek, nowDayOfWeek, 6);

  if (!minuteMatch || !hourMatch || !dayOfMonthMatch || !monthMatch || !dayOfWeekMatch) {
    return false;
  }

  // Check if already ran this minute
  if (lastRunAt) {
    const lastRun = new Date(lastRunAt);
    const sameMinute = 
      lastRun.getFullYear() === now.getFullYear() &&
      lastRun.getMonth() === now.getMonth() &&
      lastRun.getDate() === now.getDate() &&
      lastRun.getHours() === now.getHours() &&
      lastRun.getMinutes() === now.getMinutes();
    
    if (sameMinute) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate next run time from cron expression (simplified)
 */
function calculateNextRun(cronExpression: string): Date {
  // For simplicity, just return now + 1 minute
  // A full implementation would calculate the actual next run time
  const next = new Date();
  next.setMinutes(next.getMinutes() + 1);
  return next;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active scheduled triggers
    const { data: triggers, error: triggersError } = await supabase
      .from("agent_triggers")
      .select(`
        *,
        ai_agents(id, name)
      `)
      .eq("trigger_type", "scheduled")
      .eq("is_active", true)
      .not("schedule_cron", "is", null);

    if (triggersError) {
      logger.error("Error fetching scheduled triggers", { error: triggersError.message });
      throw new Error(`Failed to fetch triggers: ${triggersError.message}`);
    }

    if (!triggers || triggers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No scheduled triggers found",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results: Array<{
      trigger_id: string;
      agent_id: string;
      agent_name: string;
      executed: boolean;
      error?: string;
    }> = [];

    // Check each trigger
    for (const trigger of triggers as ScheduledTrigger[]) {
      const result = {
        trigger_id: trigger.id,
        agent_id: trigger.agent_id,
        agent_name: trigger.ai_agents?.name || "Unknown",
        executed: false,
        error: undefined as string | undefined,
      };

      try {
        // Check if trigger should run now
        if (!shouldRunNow(trigger.schedule_cron, trigger.last_run_at)) {
          continue;
        }

        logger.info("Executing scheduled trigger", {
          trigger_id: trigger.id,
          agent_id: trigger.agent_id,
          cron: trigger.schedule_cron,
        });

        // Build context from trigger config
        const context: Record<string, string | undefined> = {
          ...(trigger.context_config || {}),
          additional_context: `Scheduled execution at ${new Date().toISOString()}`,
        };

        // Execute the agent
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
              trigger_id: trigger.id,
              trigger_type: "scheduled",
              schedule_cron: trigger.schedule_cron,
              execution_time: new Date().toISOString(),
            },
          }),
        });

        if (executeResponse.ok) {
          result.executed = true;

          // Update last_run_at and next_run_at
          const nextRun = calculateNextRun(trigger.schedule_cron);
          await supabase
            .from("agent_triggers")
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: nextRun.toISOString(),
            })
            .eq("id", trigger.id);

          logger.info("Scheduled agent executed", {
            trigger_id: trigger.id,
            agent_id: trigger.agent_id,
          });
        } else {
          const errorText = await executeResponse.text();
          result.error = `Execution failed: ${errorText}`;
          logger.error("Scheduled agent execution failed", {
            trigger_id: trigger.id,
            error: errorText,
          });
        }
      } catch (execError) {
        result.error = execError instanceof Error ? execError.message : String(execError);
        logger.error("Scheduled agent error", {
          trigger_id: trigger.id,
          error: result.error,
        });
      }

      results.push(result);
    }

    const executedCount = results.filter((r) => r.executed).length;

    const summary = {
      success: true,
      checked: triggers.length,
      executed: executedCount,
      results: results.filter((r) => r.executed || r.error), // Only return those that ran or had errors
    };

    logger.info("Scheduled processing complete", {
      checked: summary.checked,
      executed: summary.executed,
    });

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return createErrorResponse(error, corsHeaders, {
      functionName: "process-scheduled-agents",
      logContext: { endpoint: "process-scheduled-agents" },
    });
  }
});
