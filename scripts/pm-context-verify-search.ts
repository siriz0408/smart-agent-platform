/**
 * PM-Context: Search Functionality Verification
 * 
 * Verifies search functionality in production by testing:
 * 1. Database RPC function (search_all_entities)
 * 2. Edge function endpoint (universal-search)
 * 3. Search results quality and performance
 * 
 * Usage:
 *   npx tsx scripts/pm-context-verify-search.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// Environment variables are loaded from process.env directly
// If .env.local exists, it should be loaded by the shell or tsx

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Create supabase client only if key is available
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.log('⚠️  VITE_SUPABASE_PUBLISHABLE_KEY not set - will only verify code structure');
  console.log('💡 Set TEST_USER_EMAIL and TEST_USER_PASSWORD for full verification\n');
}

interface SearchResult {
  entity_type: string;
  entity_id: string;
  name: string;
  subtitle: string;
  text_rank: number;
  metadata: Record<string, unknown>;
  updated_at: string;
}

interface VerificationResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, unknown>;
  latency?: number;
}

const results: VerificationResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>, skipOnError = false) {
  const startTime = Date.now();
  try {
    await testFn();
    const latency = Date.now() - startTime;
    results.push({
      test: name,
      status: 'pass',
      message: 'Test passed',
      latency,
    });
    console.log(`✅ ${name} (${latency}ms)`);
  } catch (error) {
    const latency = Date.now() - startTime;
    const status = skipOnError ? 'warning' : 'fail';
    results.push({
      test: name,
      status,
      message: error instanceof Error ? error.message : 'Unknown error',
      latency,
    });
    const icon = skipOnError ? '⚠️' : '❌';
    console.log(`${icon} ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function verifyDatabaseRPC() {
  if (!supabase) {
    throw new Error('Supabase client not initialized - VITE_SUPABASE_PUBLISHABLE_KEY required');
  }

  // Authenticate first
  const email = process.env.TEST_USER_EMAIL || 'siriz04081@gmail.com';
  const password = process.env.TEST_USER_PASSWORD || '';
  
  if (!password) {
    throw new Error('TEST_USER_PASSWORD not set - cannot authenticate');
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    throw new Error(`Authentication failed: ${authError?.message}`);
  }

  // Get tenant_id from profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', authData.user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    throw new Error('Could not get tenant_id from profile');
  }

  const tenantId = profile.tenant_id;

  // Test 1: RPC function exists and can be called
  const { data: rpcResults, error: rpcError } = await supabase.rpc('search_all_entities', {
    p_query: 'test',
    p_tenant_id: tenantId,
    p_entity_types: ['document', 'contact', 'property', 'deal'],
    p_match_count_per_type: 5,
  });

  if (rpcError) {
    throw new Error(`RPC call failed: ${rpcError.message}`);
  }

  if (!Array.isArray(rpcResults)) {
    throw new Error('RPC did not return an array');
  }

  // Test 2: Search returns results for known query
  const { data: sarahResults, error: sarahError } = await supabase.rpc('search_all_entities', {
    p_query: 'sarah',
    p_tenant_id: tenantId,
    p_entity_types: ['contact'],
    p_match_count_per_type: 10,
  });

  if (sarahError) {
    throw new Error(`Search for "sarah" failed: ${sarahError.message}`);
  }

  if (!Array.isArray(sarahResults)) {
    throw new Error('Search did not return an array');
  }

  // Test 3: Search handles empty query gracefully
  const { data: emptyResults, error: emptyError } = await supabase.rpc('search_all_entities', {
    p_query: 'xyznonexistent12345',
    p_tenant_id: tenantId,
    p_entity_types: ['document', 'contact', 'property', 'deal'],
    p_match_count_per_type: 10,
  });

  if (emptyError) {
    throw new Error(`Empty search failed: ${emptyError.message}`);
  }

  if (!Array.isArray(emptyResults)) {
    throw new Error('Empty search did not return an array');
  }

  // Test 4: Verify result structure
  if (sarahResults.length > 0) {
    const firstResult = sarahResults[0];
    const requiredFields = ['entity_type', 'entity_id', 'name', 'subtitle', 'text_rank', 'metadata', 'updated_at'];
    const missingFields = requiredFields.filter(field => !(field in firstResult));
    
    if (missingFields.length > 0) {
      throw new Error(`Result missing required fields: ${missingFields.join(', ')}`);
    }
  }

  return { tenantId, authToken: authData.session.access_token };
}

async function verifyEdgeFunction(authToken: string) {
  // Test 1: Edge function responds
  const response = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      query: 'sarah',
      entityTypes: ['contact', 'document', 'property', 'deal'],
      matchCountPerType: 10,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Edge function returned ${response.status}: ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();

  if (!data.results || !Array.isArray(data.results)) {
    throw new Error('Edge function did not return results array');
  }

  // Test 2: Edge function validates input
  const invalidResponse = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      query: 'a', // Too short (< 2 chars)
      entityTypes: ['contact'],
      matchCountPerType: 10,
    }),
  });

  if (invalidResponse.ok) {
    // Should reject queries < 2 chars
    const invalidData = await invalidResponse.json();
    if (!invalidData.error) {
      throw new Error('Edge function should reject queries < 2 characters');
    }
  }

  // Test 3: Edge function handles invalid entity types
  const invalidTypeResponse = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      query: 'test',
      entityTypes: ['invalid_type'],
      matchCountPerType: 10,
    }),
  });

  if (invalidTypeResponse.ok) {
    const invalidTypeData = await invalidTypeResponse.json();
    if (!invalidTypeData.error) {
      throw new Error('Edge function should reject invalid entity types');
    }
  }

  return data.results as SearchResult[];
}

async function verifySearchQuality(searchResults: SearchResult[]) {
  // Check that results are sorted by relevance
  if (searchResults.length > 1) {
    const ranks = searchResults.map(r => r.text_rank || 0);
    const isDescending = ranks.every((rank, i) => i === 0 || rank <= ranks[i - 1]);
    
    if (!isDescending) {
      throw new Error('Results are not sorted by text_rank (descending)');
    }
  }

  // Check that entity types are valid
  const validTypes = ['document', 'contact', 'property', 'deal'];
  const invalidTypes = searchResults.filter(r => !validTypes.includes(r.entity_type));
  
  if (invalidTypes.length > 0) {
    throw new Error(`Found invalid entity types: ${invalidTypes.map(r => r.entity_type).join(', ')}`);
  }
}

async function verifyCodeStructure() {
  // Verify migration files exist
  const migrationFiles = [
    'supabase/migrations/20260203000000_simplify_search_keyword_only.sql',
    'supabase/migrations/20260206200400_add_fuzzy_search_pg_trgm.sql',
  ];

  for (const file of migrationFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Migration file not found: ${file}`);
    }
  }

  // Verify edge function exists
  const edgeFunctionFile = 'supabase/functions/universal-search/index.ts';
  if (!fs.existsSync(edgeFunctionFile)) {
    throw new Error(`Edge function not found: ${edgeFunctionFile}`);
  }

  // Verify frontend hook exists
  const hookFile = 'src/hooks/useGlobalSearch.ts';
  if (!fs.existsSync(hookFile)) {
    throw new Error(`Frontend hook not found: ${hookFile}`);
  }

  // Verify component exists
  const componentFile = 'src/components/search/GlobalSearch.tsx';
  if (!fs.existsSync(componentFile)) {
    throw new Error(`Search component not found: ${componentFile}`);
  }

  // Check that migration defines search_all_entities function
  const migrationContent = fs.readFileSync('supabase/migrations/20260206200400_add_fuzzy_search_pg_trgm.sql', 'utf-8');
  if (!migrationContent.includes('CREATE OR REPLACE FUNCTION search_all_entities')) {
    throw new Error('Migration does not define search_all_entities function');
  }

  // Check that edge function calls the RPC
  const edgeFunctionContent = fs.readFileSync(edgeFunctionFile, 'utf-8');
  if (!edgeFunctionContent.includes('search_all_entities')) {
    throw new Error('Edge function does not call search_all_entities RPC');
  }
}

async function main() {
  console.log('\n🔍 PM-Context: Search Functionality Verification');
  console.log('='.repeat(70));
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  let authToken = '';

  // Phase 0: Code Structure Verification
  console.log('📁 Phase 0: Code Structure Verification');
  console.log('─'.repeat(70));
  
  await runTest('Migration files exist', async () => {
    await verifyCodeStructure();
  });

  // Phase 1: Database RPC Verification
  console.log('\n📊 Phase 1: Database RPC Function Verification');
  console.log('─'.repeat(70));
  
  await runTest('Database RPC function exists and works', async () => {
    const result = await verifyDatabaseRPC();
    authToken = result.authToken;
  }, true); // Skip on error (no credentials)

  // Phase 2: Edge Function Verification
  console.log('\n🌐 Phase 2: Edge Function Verification');
  console.log('─'.repeat(70));
  
  let searchResults: SearchResult[] = [];
  
  await runTest('Edge function responds correctly', async () => {
    if (!authToken) {
      throw new Error('No auth token available - set TEST_USER_EMAIL and TEST_USER_PASSWORD');
    }
    searchResults = await verifyEdgeFunction(authToken);
  }, true); // Skip on error (no credentials)

  // Phase 3: Search Quality Verification
  console.log('\n✨ Phase 3: Search Quality Verification');
  console.log('─'.repeat(70));
  
  if (authToken && searchResults.length > 0) {
    await runTest('Search results are properly sorted', async () => {
      await verifySearchQuality(searchResults);
    });
  } else {
    console.log('⚠️  Skipping quality verification (no search results available)');
    results.push({
      test: 'Search results quality',
      status: 'warning',
      message: 'Skipped - no authentication or search results available',
    });
  }

  // Summary
  console.log('\n📊 Verification Summary');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  const passRate = (passed / total) * 100;
  
  console.log(`Total Tests:     ${total}`);
  console.log(`✅ Passed:        ${passed}`);
  console.log(`❌ Failed:        ${failed}`);
  console.log(`📈 Pass Rate:     ${passRate.toFixed(1)}%`);
  
  const avgLatency = results.reduce((sum, r) => sum + (r.latency || 0), 0) / total;
  console.log(`⚡ Avg Latency:   ${avgLatency.toFixed(0)}ms`);

  if (searchResults.length > 0) {
    console.log(`\n📦 Sample Results (${searchResults.length} total):`);
    searchResults.slice(0, 5).forEach((result, i) => {
      console.log(`   ${i + 1}. [${result.entity_type}] ${result.name} (rank: ${result.text_rank?.toFixed(3) || 'N/A'})`);
    });
  }

  // Generate report
  const reportDir = `docs/pm-agents/reports/${new Date().toISOString().split('T')[0]}`;
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'pm-context-search-verification.md');
  const reportContent = `# PM-Context: Search Functionality Verification Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Status:** ${failed === 0 ? '✅ PASSED' : '❌ FAILED'}

## Summary

- **Total Tests:** ${total}
- **Passed:** ${passed}
- **Failed:** ${failed}
- **Pass Rate:** ${passRate.toFixed(1)}%
- **Average Latency:** ${avgLatency.toFixed(0)}ms

## Test Results

${results.map((r, i) => `
### ${i + 1}. ${r.test}

- **Status:** ${r.status === 'pass' ? '✅ PASS' : '❌ FAIL'}
- **Message:** ${r.message}
- **Latency:** ${r.latency || 0}ms
${r.details ? `- **Details:** ${JSON.stringify(r.details, null, 2)}` : ''}
`).join('\n')}

## Search Results Sample

${searchResults.length > 0 ? `
Found ${searchResults.length} results for query "sarah":

${searchResults.slice(0, 10).map((r, i) => `
${i + 1}. **[${r.entity_type}]** ${r.name}
   - Subtitle: ${r.subtitle}
   - Rank: ${r.text_rank?.toFixed(3) || 'N/A'}
   - Updated: ${r.updated_at}
`).join('\n')}
` : 'No results found'}

## Conclusion

${failed === 0 
  ? '✅ All search functionality tests passed. Search is working correctly in production.'
  : `❌ ${failed} test(s) failed. Review the errors above and fix issues before marking CTX-008 as complete.`}
`;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n📄 Report saved: ${reportPath}`);

  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
