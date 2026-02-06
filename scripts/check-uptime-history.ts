#!/usr/bin/env tsx
/**
 * Check Uptime History Script
 * 
 * PM-Infrastructure: INF-003
 * Verifies uptime tracking is working and displays recent uptime history
 * 
 * Usage:
 *   tsx scripts/check-uptime-history.ts [--days=30] [--tenant-id=<uuid>]
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface ProductionMetric {
  metric_date: string;
  tenant_id: string | null;
  uptime_percent: number;
  error_rate_percent: number;
  edge_function_total_calls: number;
  edge_function_successful_calls: number;
  edge_function_failed_calls: number;
  api_total_requests: number;
  api_successful_requests: number;
  api_failed_requests: number;
}

interface MetricsSummary {
  total_days: number;
  avg_uptime_percent: number;
  min_uptime_percent: number;
  avg_api_error_rate_percent: number;
  total_errors: number;
  total_api_requests: number;
  total_edge_function_calls: number;
}

async function checkUptimeHistory(days: number = 30, tenantId?: string) {
  console.log('🔍 Checking Uptime History');
  console.log('=' .repeat(60));
  console.log(`📅 Date Range: Last ${days} days`);
  if (tenantId) {
    console.log(`🏢 Tenant ID: ${tenantId}`);
  } else {
    console.log(`🏢 Tenant: All tenants`);
  }
  console.log('');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const endDate = new Date();

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  try {
    // 1. Check if metrics table exists and has data
    console.log('📊 Step 1: Checking metrics table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('production_metrics')
      .select('metric_date, uptime_percent')
      .order('metric_date', { ascending: false })
      .limit(1);

    if (tableError) {
      console.error(`❌ Error accessing production_metrics table: ${tableError.message}`);
      console.error('   Make sure migrations have been run: supabase db push');
      return;
    }

    if (!tableCheck || tableCheck.length === 0) {
      console.log('⚠️  No metrics data found in production_metrics table');
      console.log('   Metrics will be populated once the cron job runs');
      console.log('   To manually trigger: SELECT public.trigger_aggregate_production_metrics();');
      return;
    }

    const latestMetric = tableCheck[0];
    console.log(`✅ Metrics table accessible. Latest metric: ${latestMetric.metric_date}`);
    console.log('');

    // 2. Get metrics summary
    console.log('📈 Step 2: Fetching metrics summary...');
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_production_metrics_summary',
      {
        p_tenant_id: tenantId || null,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      }
    );

    if (summaryError) {
      console.error(`❌ Error fetching summary: ${summaryError.message}`);
      return;
    }

    if (!summaryData || summaryData.length === 0) {
      console.log('⚠️  No summary data found for the specified date range');
      return;
    }

    const summary = summaryData[0] as MetricsSummary;
    console.log('✅ Summary retrieved successfully');
    console.log('');

    // 3. Display summary
    console.log('📊 UPTIME SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Days Tracked: ${summary.total_days}`);
    console.log(`Average Uptime: ${summary.avg_uptime_percent?.toFixed(3) || 'N/A'}%`);
    console.log(`Minimum Uptime: ${summary.min_uptime_percent?.toFixed(3) || 'N/A'}%`);
    console.log(`Average API Error Rate: ${summary.avg_api_error_rate_percent?.toFixed(2) || 'N/A'}%`);
    console.log(`Total API Requests: ${summary.total_api_requests?.toLocaleString() || 0}`);
    console.log(`Total Edge Function Calls: ${summary.total_edge_function_calls?.toLocaleString() || 0}`);
    console.log(`Total Errors: ${summary.total_errors?.toLocaleString() || 0}`);
    console.log('');

    // 4. Check if uptime meets target (99.9%)
    const targetUptime = 99.9;
    const avgUptime = summary.avg_uptime_percent || 0;
    const status = avgUptime >= targetUptime ? '✅' : avgUptime >= 99.0 ? '⚠️' : '❌';
    console.log(`${status} Uptime Status: ${avgUptime >= targetUptime ? 'MEETS TARGET' : 'BELOW TARGET'} (Target: ${targetUptime}%)`);
    console.log('');

    // 5. Get recent daily metrics
    console.log('📅 Step 3: Fetching recent daily metrics...');
    const { data: metricsData, error: metricsError } = await supabase.rpc(
      'get_production_metrics',
      {
        p_tenant_id: tenantId || null,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      }
    );

    if (metricsError) {
      console.error(`❌ Error fetching metrics: ${metricsError.message}`);
      return;
    }

    if (!metricsData || metricsData.length === 0) {
      console.log('⚠️  No daily metrics found for the specified date range');
      return;
    }

    const metrics = metricsData as ProductionMetric[];
    console.log(`✅ Retrieved ${metrics.length} daily metric records`);
    console.log('');

    // 6. Display recent daily metrics (last 7 days or all if less)
    const displayCount = Math.min(7, metrics.length);
    console.log(`📊 RECENT DAILY METRICS (Last ${displayCount} days)`);
    console.log('=' .repeat(60));
    console.log(
      'Date       | Uptime %  | Error %   | API Calls  | Edge Calls | Status'
    );
    console.log('-'.repeat(60));

    for (let i = 0; i < displayCount; i++) {
      const metric = metrics[i];
      const uptime = metric.uptime_percent || 0;
      const errorRate = metric.error_rate_percent || 0;
      const apiCalls = metric.api_total_requests || 0;
      const edgeCalls = metric.edge_function_total_calls || 0;
      const statusIcon =
        uptime >= targetUptime ? '✅' : uptime >= 99.0 ? '⚠️' : '❌';

      console.log(
        `${metric.metric_date} | ${uptime.toFixed(3).padStart(8)}% | ${errorRate
          .toFixed(2)
          .padStart(8)}% | ${apiCalls.toString().padStart(10)} | ${edgeCalls
          .toString()
          .padStart(10)} | ${statusIcon}`
      );
    }

    if (metrics.length > displayCount) {
      console.log(`... and ${metrics.length - displayCount} more days`);
    }

    console.log('');
    console.log('✅ Uptime history check completed successfully');
  } catch (error) {
    console.error('❌ Unexpected error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let days = 30;
let tenantId: string | undefined;

for (const arg of args) {
  if (arg.startsWith('--days=')) {
    days = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--tenant-id=')) {
    tenantId = arg.split('=')[1];
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: tsx scripts/check-uptime-history.ts [--days=30] [--tenant-id=<uuid>]');
    process.exit(0);
  }
}

checkUptimeHistory(days, tenantId).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
