/**
 * Integration test for search functionality
 * Tests the complete search pipeline from API to database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
  const start = Date.now();
  try {
    const passed = await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed, message: passed ? 'PASS' : 'FAIL', duration });
    console.log(`${passed ? '✅' : '❌'} ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.push({ name, passed: false, message: `ERROR: ${message}`, duration });
    console.log(`❌ ${name} (${duration}ms) - ${message}`);
  }
}

async function testDatabaseConnection() {
  const { data, error } = await supabase.from('contacts').select('count', { count: 'exact', head: true });
  return !error;
}

async function testAuthenticationRequired() {
  // Try to access universal-search without auth (should fail)
  const response = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'test' }),
  });

  return response.status === 401; // Should require auth
}

async function testSearchAPIWithAuth() {
  // First authenticate
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test-search@smartagent.test',
    password: 'TestSearch123!',
  });

  if (authError || !authData.session) {
    console.log('   ⚠️  Test user not found - run seed-test-data first');
    return false;
  }

  const token = authData.session.access_token;

  // Call search API
  const response = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: 'Denver',
      entityTypes: ['contact', 'property', 'document', 'deal'],
      matchThreshold: 0.1,
      matchCountPerType: 5,
    }),
  });

  if (!response.ok) {
    console.log(`   Response: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`   Body: ${text}`);
    return false;
  }

  const data = await response.json();
  console.log(`   Found ${data.results?.length || 0} results for "Denver"`);

  // Should find at least the "Denver" contact and property
  return data.results && data.results.length > 0;
}

async function testSearchFor922() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test-search@smartagent.test',
    password: 'TestSearch123!',
  });

  if (!authData.session) return false;

  const response = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({
      query: '922',
      entityTypes: ['property'],
    }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  console.log(`   Found ${data.results?.length || 0} results for "922"`);

  if (data.results && data.results.length > 0) {
    const property = data.results.find((r: any) => r.name?.includes('922 Sharondale'));
    if (property) {
      console.log(`   ✓ Found property: ${property.name}`);
      console.log(`   ✓ RRF Score: ${property.rrf_score?.toFixed(4)}`);
    }
    return property !== undefined;
  }

  return false;
}

async function testFacetedFiltering() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test-search@smartagent.test',
    password: 'TestSearch123!',
  });

  if (!authData.session) return false;

  // Search for "Denver" but filter by contacts only
  const response = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({
      query: 'Denver',
      entityTypes: ['contact'], // Filter to contacts only
    }),
  });

  if (!response.ok) return false;

  const data = await response.json();

  // All results should be contacts
  const allContacts = data.results?.every((r: any) => r.entity_type === 'contact');

  console.log(`   Found ${data.results?.length || 0} results`);
  console.log(`   All contacts: ${allContacts ? 'Yes' : 'No'}`);

  return allContacts === true;
}

async function testEmbeddingsExist() {
  // Check if test data has embeddings
  const { data: properties } = await supabase
    .from('properties')
    .select('address, embedding')
    .ilike('address', '%922%')
    .limit(1);

  if (!properties || properties.length === 0) {
    console.log('   ⚠️  No property with "922" found - seed data first');
    return false;
  }

  const hasEmbedding = properties[0].embedding !== null;
  console.log(`   Property: ${properties[0].address}`);
  console.log(`   Has embedding: ${hasEmbedding ? 'Yes' : 'No'}`);

  return hasEmbedding;
}

async function testRRFScoring() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test-search@smartagent.test',
    password: 'TestSearch123!',
  });

  if (!authData.session) return false;

  const response = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({
      query: 'Denver Real Estate',
      entityTypes: ['contact', 'property'],
    }),
  });

  if (!response.ok) return false;

  const data = await response.json();

  // Check that results have RRF scores
  const allHaveScores = data.results?.every((r: any) => typeof r.rrf_score === 'number' && r.rrf_score > 0);

  // Check that results are sorted by RRF score (descending)
  let sorted = true;
  for (let i = 0; i < (data.results?.length || 0) - 1; i++) {
    if (data.results[i].rrf_score < data.results[i + 1].rrf_score) {
      sorted = false;
      break;
    }
  }

  console.log(`   Results have RRF scores: ${allHaveScores ? 'Yes' : 'No'}`);
  console.log(`   Results sorted by score: ${sorted ? 'Yes' : 'No'}`);

  return allHaveScores && sorted;
}

async function main() {
  console.log('\n🧪 SEARCH INTEGRATION TESTS');
  console.log('='.repeat(60));
  console.log('');

  await runTest('Database connection', testDatabaseConnection);
  await runTest('Search API requires authentication', testAuthenticationRequired);
  await runTest('Test data has embeddings', testEmbeddingsExist);
  await runTest('Search API returns results for "Denver"', testSearchAPIWithAuth);
  await runTest('Search finds "922 Sharondale Dr"', testSearchFor922);
  await runTest('Faceted filtering (contacts only)', testFacetedFiltering);
  await runTest('RRF scoring and sorting', testRRFScoring);

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal: ${total} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Pass Rate: ${Math.round((passed / total) * 100)}%`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ❌ ${r.name}: ${r.message}`);
    });
  }

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
  console.log(`\nAverage test duration: ${avgDuration.toFixed(0)}ms`);

  console.log('\n');

  // Exit with error code if tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

main();
