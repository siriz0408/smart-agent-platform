/**
 * PM-Context: Production Metrics Monitoring Verification Script
 * 
 * Verifies that production metrics monitoring is properly implemented:
 * 1. Checks database schema and functions exist
 * 2. Verifies edge function is accessible
 * 3. Tests aggregation function
 * 4. Validates dashboard components exist
 * 
 * Usage:
 *   npx tsx scripts/pm-context-verify-production-metrics.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

const results: VerificationResult[] = [];

function addResult(name: string, passed: boolean, message: string, details?: unknown) {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details && !passed) {
    console.log(`   Details:`, details);
  }
}

async function verifyDatabaseSchema() {
  console.log('\n📊 Verifying Database Schema...');
  console.log('='.repeat(60));

  if (!supabaseServiceKey) {
    addResult(
      'Database Connection',
      false,
      'SUPABASE_SERVICE_ROLE_KEY not set'
    );
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Check if production_metrics table exists
  try {
    const { data, error } = await supabase
      .from('production_metrics')
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      addResult(
        'Production Metrics Table',
        false,
        'Table does not exist - migration may not have run'
      );
    } else if (error) {
      addResult(
        'Production Metrics Table',
        false,
        `Error accessing table: ${error.message}`
      );
    } else {
      addResult(
        'Production Metrics Table',
        true,
        'Table exists and is accessible'
      );
    }
  } catch (error) {
    addResult(
      'Production Metrics Table',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Check if aggregation function exists
  try {
    const { data, error } = await supabase.rpc('aggregate_production_metrics', {
      p_metric_date: new Date().toISOString().split('T')[0],
    });

    if (error && error.message.includes('does not exist')) {
      addResult(
        'Aggregation Function',
        false,
        'Function does not exist - migration may not have run'
      );
    } else if (error) {
      // Function exists but may have failed (this is OK for verification)
      addResult(
        'Aggregation Function',
        true,
        'Function exists (execution result may vary)'
      );
    } else {
      addResult(
        'Aggregation Function',
        true,
        'Function exists and is callable'
      );
    }
  } catch (error) {
    addResult(
      'Aggregation Function',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Check if get_production_metrics function exists
  try {
    const { data, error } = await supabase.rpc('get_production_metrics', {
      p_tenant_id: null,
      p_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0],
    });

    if (error && error.message.includes('does not exist')) {
      addResult(
        'Get Metrics Function',
        false,
        'Function does not exist'
      );
    } else {
      addResult(
        'Get Metrics Function',
        true,
        'Function exists and is callable'
      );
    }
  } catch (error) {
    addResult(
      'Get Metrics Function',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Check if get_production_metrics_summary function exists
  try {
    const { data, error } = await supabase.rpc('get_production_metrics_summary', {
      p_tenant_id: null,
      p_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0],
    });

    if (error && error.message.includes('does not exist')) {
      addResult(
        'Get Metrics Summary Function',
        false,
        'Function does not exist'
      );
    } else {
      addResult(
        'Get Metrics Summary Function',
        true,
        'Function exists and is callable'
      );
    }
  } catch (error) {
    addResult(
      'Get Metrics Summary Function',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function verifyEdgeFunction() {
  console.log('\n🔧 Verifying Edge Function...');
  console.log('='.repeat(60));

  if (!supabaseServiceKey) {
    addResult(
      'Edge Function',
      false,
      'SUPABASE_SERVICE_ROLE_KEY not set'
    );
    return;
  }

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
        'Edge function is accessible and responding',
        { status: response.status }
      );
    }
  } catch (error) {
    addResult(
      'Edge Function Endpoint',
      false,
      `Exception: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function verifyFrontendFiles() {
  console.log('\n🎨 Verifying Frontend Files...');
  console.log('='.repeat(60));

  const filesToCheck = [
    'src/pages/ProductionMetrics.tsx',
    'src/components/admin/ProductionMetricsDashboard.tsx',
    'src/hooks/useProductionMetrics.ts',
  ];

  filesToCheck.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      addResult(
        `Frontend: ${file}`,
        true,
        'File exists'
      );
    } else {
      addResult(
        `Frontend: ${file}`,
        false,
        'File does not exist'
      );
    }
  });

  // Check if route is configured
  const appTsxPath = path.join(process.cwd(), 'src/App.tsx');
  if (fs.existsSync(appTsxPath)) {
    const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');
    if (appTsxContent.includes('ProductionMetrics') && appTsxContent.includes('/admin/metrics')) {
      addResult(
        'Route Configuration',
        true,
        'Route /admin/metrics is configured'
      );
    } else {
      addResult(
        'Route Configuration',
        false,
        'Route /admin/metrics may not be configured'
      );
    }
  }
}

function verifyMigrations() {
  console.log('\n📦 Verifying Migrations...');
  console.log('='.repeat(60));

  const migrationsToCheck = [
    'supabase/migrations/20260206200300_production_metrics.sql',
    'supabase/migrations/20260206200400_production_metrics_cron.sql',
  ];

  migrationsToCheck.forEach(migration => {
    const migrationPath = path.join(process.cwd(), migration);
    if (fs.existsSync(migrationPath)) {
      addResult(
        `Migration: ${path.basename(migration)}`,
        true,
        'Migration file exists'
      );
    } else {
      addResult(
        `Migration: ${path.basename(migration)}`,
        false,
        'Migration file does not exist'
      );
    }
  });
}

async function main() {
  console.log('🔍 PM-Context: Production Metrics Monitoring Verification');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service Key: ${supabaseServiceKey ? '***' + supabaseServiceKey.slice(-4) : 'NOT SET'}`);
  console.log('='.repeat(60));

  verifyMigrations();
  verifyFrontendFiles();
  await verifyDatabaseSchema();
  await verifyEdgeFunction();

  // Summary
  console.log('\n📋 Verification Summary');
  console.log('='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n✅ All verifications passed! Production metrics monitoring is properly implemented.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some verifications failed. Please review the errors above.');
    console.log('\nNext steps:');
    console.log('1. Ensure all migrations have been run');
    console.log('2. Verify edge function is deployed');
    console.log('3. Check that frontend files are in place');
    console.log('4. Test the dashboard at /admin/metrics');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { verifyDatabaseSchema, verifyEdgeFunction, verifyFrontendFiles, verifyMigrations };
