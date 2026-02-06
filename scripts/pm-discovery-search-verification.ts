/**
 * PM-Discovery Search Verification Script
 * 
 * Tests universal-search edge function with 20 common queries
 * Measures search success rate (target: >95%)
 * 
 * Usage:
 *   npx tsx scripts/pm-discovery-search-verification.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load from .env.local if available, otherwise use defaults
// Use production URL as default
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sthnezuadfbmbqlxiwtq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseKey) {
  console.warn('⚠️  VITE_SUPABASE_PUBLISHABLE_KEY not set - will try to authenticate via email/password');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SearchResult {
  entity_type: string;
  entity_id: string;
  name: string;
  subtitle: string;
  text_rank: number;
  metadata: Record<string, unknown>;
  updated_at: string;
}

interface TestCase {
  query: string;
  expectedEntityTypes?: string[];
  minResults?: number;
  description: string;
}

// 20 common search queries based on real estate use cases
const TEST_QUERIES: TestCase[] = [
  // Contact searches
  { query: 'sarah', expectedEntityTypes: ['contact'], minResults: 1, description: 'Find contact by first name' },
  { query: 'johnson', expectedEntityTypes: ['contact'], minResults: 1, description: 'Find contact by last name' },
  { query: 'sarah johnson', expectedEntityTypes: ['contact'], minResults: 1, description: 'Find contact by full name' },
  { query: 'gmail.com', expectedEntityTypes: ['contact'], minResults: 0, description: 'Find contacts by email domain' },
  
  // Property searches
  { query: '922', expectedEntityTypes: ['property'], minResults: 1, description: 'Find property by street number' },
  { query: 'sharondale', expectedEntityTypes: ['property'], minResults: 1, description: 'Find property by street name' },
  { query: 'denver', expectedEntityTypes: ['property'], minResults: 1, description: 'Find properties by city' },
  { query: 'colorado', expectedEntityTypes: ['property'], minResults: 0, description: 'Find properties by state' },
  
  // Document searches
  { query: 'inspection', expectedEntityTypes: ['document'], minResults: 0, description: 'Find inspection documents' },
  { query: 'contract', expectedEntityTypes: ['document'], minResults: 0, description: 'Find contract documents' },
  { query: 'settlement', expectedEntityTypes: ['document'], minResults: 0, description: 'Find settlement documents' },
  { query: 'appraisal', expectedEntityTypes: ['document'], minResults: 0, description: 'Find appraisal documents' },
  
  // Deal searches
  { query: 'buyer', expectedEntityTypes: ['deal'], minResults: 0, description: 'Find buyer deals' },
  { query: 'seller', expectedEntityTypes: ['deal'], minResults: 0, description: 'Find seller deals' },
  { query: 'pending', expectedEntityTypes: ['deal'], minResults: 0, description: 'Find pending deals' },
  
  // Multi-entity searches
  { query: 'denver', expectedEntityTypes: ['contact', 'property', 'deal'], minResults: 1, description: 'Cross-entity search for Denver' },
  { query: 'test', expectedEntityTypes: undefined, minResults: 0, description: 'Generic search term' },
  { query: '2024', expectedEntityTypes: undefined, minResults: 0, description: 'Search by year' },
  { query: 'pdf', expectedEntityTypes: ['document'], minResults: 0, description: 'Find PDF documents' },
  { query: 'email', expectedEntityTypes: ['contact'], minResults: 0, description: 'Find contacts with email' },
];

interface TestResult {
  query: string;
  description: string;
  success: boolean;
  resultsCount: number;
  results: SearchResult[];
  entityTypesFound: string[];
  error?: string;
  latency: number;
}

async function testSearchQuery(testCase: TestCase, authToken: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/universal-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        query: testCase.query,
        entityTypes: ['document', 'contact', 'property', 'deal'],
        matchCountPerType: 10,
      }),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      return {
        query: testCase.query,
        description: testCase.description,
        success: false,
        resultsCount: 0,
        results: [],
        entityTypesFound: [],
        error: errorData.error || `HTTP ${response.status}`,
        latency,
      };
    }

    const data = await response.json();
    const results: SearchResult[] = data.results || [];
    const entityTypesFound = [...new Set(results.map(r => r.entity_type))];

    // Determine success:
    // - If minResults specified, must meet that threshold
    // - If expectedEntityTypes specified, must find at least one of those types
    // - Otherwise, any results = success
    let success = true;
    if (testCase.minResults !== undefined && results.length < testCase.minResults) {
      success = false;
    }
    if (testCase.expectedEntityTypes && testCase.expectedEntityTypes.length > 0) {
      const foundExpectedType = testCase.expectedEntityTypes.some(type => 
        entityTypesFound.includes(type)
      );
      if (!foundExpectedType && results.length > 0) {
        // Found results but wrong type - partial success
        success = false;
      } else if (!foundExpectedType && results.length === 0) {
        // No results - failure
        success = false;
      }
    }

    return {
      query: testCase.query,
      description: testCase.description,
      success,
      resultsCount: results.length,
      results,
      entityTypesFound,
      latency,
    };
  } catch (error) {
    return {
      query: testCase.query,
      description: testCase.description,
      success: false,
      resultsCount: 0,
      results: [],
      entityTypesFound: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime,
    };
  }
}

async function runVerification() {
  console.log('\n🔍 PM-Discovery: Search Verification Test');
  console.log('='.repeat(70));
  console.log(`Testing ${TEST_QUERIES.length} common search queries\n`);

  // Authenticate
  console.log('1️⃣ Authenticating...');
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'Test1234!';
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error('❌ Authentication failed:', authError?.message);
    console.log('\n💡 Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local');
    process.exit(1);
  }

  const authToken = authData.session.access_token;
  console.log(`✅ Authenticated as: ${authData.user.email}\n`);

  // Run tests
  console.log('2️⃣ Running search tests...\n');
  const results: TestResult[] = [];

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const testCase = TEST_QUERIES[i];
    process.stdout.write(`   [${i + 1}/${TEST_QUERIES.length}] Testing: "${testCase.query}"... `);
    
    const result = await testSearchQuery(testCase, authToken);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.resultsCount} results (${result.latency}ms)`);
    } else {
      console.log(`❌ ${result.error || `No results (expected ${testCase.minResults || 'any'})`}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Calculate metrics
  console.log('\n3️⃣ Calculating metrics...\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const successRate = (successful / results.length) * 100;
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  const totalResults = results.reduce((sum, r) => sum + r.resultsCount, 0);
  
  // Entity type breakdown
  const entityTypeCounts: Record<string, number> = {};
  results.forEach(r => {
    r.entityTypesFound.forEach(type => {
      entityTypeCounts[type] = (entityTypeCounts[type] || 0) + 1;
    });
  });

  // Print summary
  console.log('📊 Test Results Summary');
  console.log('─'.repeat(70));
  console.log(`Total Tests:        ${results.length}`);
  console.log(`✅ Successful:      ${successful} (${successRate.toFixed(1)}%)`);
  console.log(`❌ Failed:          ${failed}`);
  console.log(`🎯 Success Rate:    ${successRate.toFixed(1)}% ${successRate >= 95 ? '✅' : '⚠️  (Target: >95%)'}`);
  console.log(`⚡ Avg Latency:     ${avgLatency.toFixed(0)}ms`);
  console.log(`📦 Total Results:   ${totalResults}`);
  console.log('\n📋 Results by Entity Type:');
  Object.entries(entityTypeCounts).forEach(([type, count]) => {
    console.log(`   ${type.padEnd(12)} ${count} queries found results`);
  });

  // Failed tests detail
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    console.log('─'.repeat(70));
    results.filter(r => !r.success).forEach(r => {
      console.log(`   "${r.query}" - ${r.description}`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      } else {
        console.log(`      Found: ${r.resultsCount} results (types: ${r.entityTypesFound.join(', ') || 'none'})`);
      }
    });
  }

  // Successful tests with details
  console.log('\n✅ Successful Tests:');
  console.log('─'.repeat(70));
  results.filter(r => r.success).forEach(r => {
    const topResult = r.results[0];
    console.log(`   "${r.query}" - ${r.resultsCount} results (${r.latency}ms)`);
    if (topResult) {
      console.log(`      Top: [${topResult.entity_type}] ${topResult.name}`);
    }
  });

  // Generate report file
  const reportPath = `docs/pm-agents/reports/${new Date().toISOString().split('T')[0]}/pm-discovery-search-verification.md`;
  const reportContent = `# PM-Discovery Search Verification Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Test User:** ${authData.user.email}
**Total Queries:** ${results.length}

## Summary

- **Success Rate:** ${successRate.toFixed(1)}% ${successRate >= 95 ? '✅' : '⚠️  (Target: >95%)'}
- **Successful:** ${successful}/${results.length}
- **Failed:** ${failed}/${results.length}
- **Average Latency:** ${avgLatency.toFixed(0)}ms
- **Total Results:** ${totalResults}

## Results by Entity Type

${Object.entries(entityTypeCounts).map(([type, count]) => `- **${type}**: ${count} queries`).join('\n')}

## Test Results

${results.map((r, i) => `
### ${i + 1}. "${r.query}" - ${r.description}

- **Status:** ${r.success ? '✅ Success' : '❌ Failed'}
- **Results:** ${r.resultsCount}
- **Latency:** ${r.latency}ms
- **Entity Types Found:** ${r.entityTypesFound.join(', ') || 'none'}
${r.error ? `- **Error:** ${r.error}` : ''}
${r.results.length > 0 ? `- **Top Result:** [${r.results[0].entity_type}] ${r.results[0].name}` : ''}
`).join('\n')}

## Recommendations

${successRate >= 95 
  ? '✅ Search success rate meets target (>95%). No immediate action required.'
  : `⚠️  Search success rate below target. Review failed queries and improve ranking/search logic.`}
`;

  // Ensure directory exists
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n📄 Report saved: ${reportPath}`);

  // Exit with appropriate code
  process.exit(successRate >= 95 ? 0 : 1);
}

runVerification().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
