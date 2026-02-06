/**
 * Aggregate Production Metrics Edge Function
 * 
 * This function aggregates daily production metrics from source tables
 * (mcp_call_logs, etc.) into the production_metrics table.
 * 
 * Should be run daily via pg_cron or scheduled trigger.
 * 
 * Usage:
 * - Manual: POST /functions/v1/aggregate-production-metrics
 * - Scheduled: Set up pg_cron to call this daily at 2 AM UTC
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../_shared/logger';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

Deno.serve(async (req) => {
  try {
    logger.info('Starting production metrics aggregation', {
      timestamp: new Date().toISOString(),
    });

    // Parse request body for optional date parameter
    let metricDate: Date | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.date) {
          metricDate = new Date(body.date);
        }
      } catch {
        // No body or invalid JSON, use default (yesterday)
      }
    }

    // Default to yesterday if not provided
    if (!metricDate) {
      metricDate = new Date();
      metricDate.setDate(metricDate.getDate() - 1);
      metricDate.setHours(0, 0, 0, 0);
    }

    const dateStr = metricDate.toISOString().split('T')[0];

    logger.info('Aggregating metrics for date', { date: dateStr });

    // Call the database function to aggregate metrics
    const { data, error } = await supabase.rpc('aggregate_production_metrics', {
      p_metric_date: dateStr,
    });

    if (error) {
      logger.error('Error aggregating production metrics', {
        error: error.message,
        date: dateStr,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          date: dateStr,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify metrics were created/updated
    const { data: metrics, error: verifyError } = await supabase
      .from('production_metrics')
      .select('*')
      .eq('metric_date', dateStr)
      .order('created_at', { ascending: false })
      .limit(10);

    if (verifyError) {
      logger.warn('Could not verify aggregated metrics', {
        error: verifyError.message,
      });
    }

    logger.info('Successfully aggregated production metrics', {
      date: dateStr,
      metrics_count: metrics?.length || 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        metrics_created: metrics?.length || 0,
        message: `Successfully aggregated metrics for ${dateStr}`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Unexpected error in aggregate-production-metrics', {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
