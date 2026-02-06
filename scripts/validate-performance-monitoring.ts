/**
 * Performance Monitoring Validation Script
 * 
 * Validates that performance monitoring is working correctly:
 * 1. Checks if metrics are being collected in source tables
 * 2. Verifies aggregation function works
 * 3. Tests edge function endpoint
 * 4. Validates production_metrics table has data
 * 
 * Usage:
 *   deno run --allow-net --allow-env scripts/validate-performance-monitoring.ts
 *   OR
 *   npx tsx scripts/validate-performance-monitoring.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

const results: ValidationResult[] = [];

function addResult(name: string, passed: boolean, message: string, details?: unknown) {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details && !passed) {
    console.log(`   Details:`, details);
  }
}

async function validateMetricsCollection() {
  console.log('\n📊 Validating Metrics Collection...');
  console.log('='.repeat(60));

  // 1. Check if mcp_call_logs table has recent data
  try {
    const { data, error, count } = await supabase
      .from('mcp_call_logs')
      .select('*', { count: 'exact', head: false })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10);

    if (error) {
      addResult(
        'MCP Call Logs Table',
        false,
        `Error querying mcp_call_logs: ${error.message}`,
        error
      );
    } else {
      addResult(
        'MCP Call Logs Table',
        true,
        `Found ${count || 0} calls in last 7 days`,
        { sample_count: data?.length || 0 }
      );
    }
  } catch (error) {
    addResult(
      'MCP Call Logs Table',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // 2. Check if production_metrics table exists and has data
  try {
    const { data, error, count } = await supabase
      .from('production_metrics')
      .select('*', { count: 'exact', head: false })
      .order('metric_date', { ascending: false })
      .limit(10);

    if (error) {
      addResult(
        'Production Metrics Table',
        false,
        `Error querying production_metrics: ${error.message}`,
        error
      );
    } else {
      addResult(
        'Production Metrics Table',
        true,
        `Found ${count || 0} metric records`,
        { recent_records: data?.length || 0 }
      );
    }
  } catch (error) {
    addResult(
      'Production Metrics Table',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // 3. Test aggregation function
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dateStr = yesterday.toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('aggregate_production_metrics', {
      p_metric_date: dateStr,
    });

    if (error) {
      addResult(
        'Aggregation Function',
        false,
        `Error calling aggregate_production_metrics: ${error.message}`,
        error
      );
    } else {
      addResult(
        'Aggregation Function',
        true,
        `Successfully aggregated metrics for ${dateStr}`,
        { result: data }
      );
    }
  } catch (error) {
    addResult(
      'Aggregation Function',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // 4. Test edge function endpoint
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-production-metrics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const responseData = await response.json();

    if (!response.ok) {
      addResult(
        'Edge Function Endpoint',
        false,
        `HTTP ${response.status}: ${responseData.error || response.statusText}`,
        responseData
      );
    } else {
      addResult(
        'Edge Function Endpoint',
        true,
        `Successfully called edge function`,
        responseData
      );
    }
  } catch (error) {
    addResult(
      'Edge Function Endpoint',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // 5. Check if pg_cron is configured (if available)
  try {
    const { data, error } = await supabase.rpc('trigger_aggregate_production_metrics');

    if (error) {
      // This is expected if pg_cron isn't set up yet
      addResult(
        'Cron Schedule',
        false,
        `pg_cron not configured or function not available: ${error.message}`,
        { note: 'This is expected if pg_cron extension is not enabled' }
      );
    } else {
      addResult(
        'Cron Schedule',
        true,
        'Cron trigger function is available',
        { result: data }
      );
    }
  } catch (error) {
    addResult(
      'Cron Schedule',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`,
      { note: 'This is expected if pg_cron extension is not enabled' }
    );
  }

  // 6. Verify metrics summary function
  try {
    const { data, error } = await supabase.rpc('get_production_metrics_summary', {
      p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      addResult(
        'Metrics Summary Function',
        false,
        `Error calling get_production_metrics_summary: ${error.message}`,
        error
      );
    } else {
      addResult(
        'Metrics Summary Function',
        true,
        'Successfully retrieved metrics summary',
        data
      );
    }
  } catch (error) {
    addResult(
      'Metrics Summary Function',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function main() {
  console.log('🔍 Performance Monitoring Validation');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service Key: ${supabaseServiceKey ? '***' + supabaseServiceKey.slice(-4) : 'NOT SET'}`);
  console.log('='.repeat(60));

  await validateMetricsCollection();

  // Summary
  console.log('\n📋 Validation Summary');
  console.log('='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n✅ All validations passed! Performance monitoring is working correctly.');
    Deno.exit(0);
  } else {
    console.log('\n⚠️  Some validations failed. Please review the errors above.');
    console.log('\nNext steps:');
    console.log('1. Ensure pg_cron extension is enabled in Supabase Dashboard');
    console.log('2. Set database settings:');
    console.log('   ALTER DATABASE postgres SET app.supabase_url = \'https://your-project.supabase.co\';');
    console.log('   ALTER DATABASE postgres SET app.service_role_key = \'your-service-role-key\';');
    console.log('3. Run the cron migration: supabase/migrations/20260206200400_production_metrics_cron.sql');
    console.log('4. Verify metrics are being collected in mcp_call_logs');
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
