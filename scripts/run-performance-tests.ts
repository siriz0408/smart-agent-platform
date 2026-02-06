#!/usr/bin/env npx tsx
/**
 * Performance Test Runner
 * 
 * Runs comprehensive performance tests for Smart Agent Platform:
 * - Lighthouse CI audits
 * - API endpoint latency tests
 * - Database query performance
 * - Edge function performance
 * 
 * Usage:
 *   npm run test:performance
 *   npx tsx scripts/run-performance-tests.ts
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface PerformanceResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  metric: string;
  value: number;
  target: number;
  unit: string;
  message?: string;
}

interface TestSuite {
  name: string;
  results: PerformanceResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

const RESULTS_DIR = join(process.cwd(), 'test-artifacts', 'performance');
const REPORT_FILE = join(RESULTS_DIR, 'performance-report.json');
const SUMMARY_FILE = join(RESULTS_DIR, 'performance-summary.md');

// Performance thresholds (aligned with Lighthouse CI config)
const THRESHOLDS = {
  lighthouse: {
    performance: 0.7,
    accessibility: 0.9,
    bestPractices: 0.85,
    seo: 0.8,
    fcp: 2000, // ms
    lcp: 2500, // ms
    tbt: 300, // ms
    cls: 0.1,
  },
  api: {
    p50: 150, // ms
    p95: 300, // ms
    p99: 500, // ms
  },
  edgeFunction: {
    p50: 200, // ms
    p95: 500, // ms
    p99: 1000, // ms
  },
  database: {
    queryTime: 200, // ms
    slowQueries: 0, // count
  },
};

/**
 * Ensure results directory exists
 */
function ensureResultsDir() {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

/**
 * Run Lighthouse CI tests
 */
async function runLighthouseTests(): Promise<TestSuite> {
  const suite: TestSuite = {
    name: 'Lighthouse CI',
    results: [],
    summary: { passed: 0, failed: 0, warnings: 0 },
  };

  console.log('🔍 Running Lighthouse CI tests...');

  try {
    // Check if Lighthouse CI is installed
    try {
      execSync('which lhci', { stdio: 'ignore' });
    } catch {
      console.log('📦 Installing Lighthouse CI...');
      execSync('npm install -g @lhci/cli@latest', { stdio: 'inherit' });
    }

    // Run Lighthouse CI
    const output = execSync('lhci autorun --config=.lighthouserc.js', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    // Parse Lighthouse results from .lighthouseci directory
    const lighthouseDir = join(process.cwd(), '.lighthouseci');
    if (existsSync(lighthouseDir)) {
      // Try to read results
      console.log('✅ Lighthouse CI completed');
      suite.results.push({
        test: 'Lighthouse CI Run',
        status: 'pass',
        metric: 'completion',
        value: 1,
        target: 1,
        unit: 'boolean',
        message: 'Lighthouse CI audit completed successfully',
      });
      suite.summary.passed++;
    } else {
      suite.results.push({
        test: 'Lighthouse CI Run',
        status: 'warning',
        metric: 'completion',
        value: 0,
        target: 1,
        unit: 'boolean',
        message: 'Lighthouse results directory not found',
      });
      suite.summary.warnings++;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Lighthouse CI failed:', errorMessage);
    suite.results.push({
      test: 'Lighthouse CI Run',
      status: 'fail',
      metric: 'completion',
      value: 0,
      target: 1,
      unit: 'boolean',
      message: errorMessage,
    });
    suite.summary.failed++;
  }

  return suite;
}

/**
 * Test API endpoint performance
 */
async function testAPIPerformance(): Promise<TestSuite> {
  const suite: TestSuite = {
    name: 'API Performance',
    results: [],
    summary: { passed: 0, failed: 0, warnings: 0 },
  };

  console.log('⚡ Testing API endpoint performance...');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    suite.results.push({
      test: 'API Performance',
      status: 'warning',
      metric: 'availability',
      value: 0,
      target: 1,
      unit: 'boolean',
      message: 'Supabase URL not configured',
    });
    suite.summary.warnings++;
    return suite;
  }

  // Test edge function endpoints
  const endpoints = [
    { name: 'universal-search', path: '/functions/v1/universal-search' },
    { name: 'ai-chat', path: '/functions/v1/ai-chat' },
  ];

  for (const endpoint of endpoints) {
    const latencies: number[] = [];
    const iterations = 3;

    for (let i = 0; i < iterations; i++) {
      try {
        const start = Date.now();
        const response = await fetch(`${supabaseUrl}${endpoint.path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: 'test' }),
        });
        const latency = Date.now() - start;
        latencies.push(latency);

        // Don't wait for response body, just measure latency
        await response.text().catch(() => {});
      } catch (error) {
        // Ignore errors for performance testing (we're just measuring latency)
        latencies.push(9999); // Mark as failed
      }
    }

    if (latencies.length > 0) {
      const sorted = latencies.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];

      // Check p50
      const p50Status = p50 <= THRESHOLDS.api.p50 ? 'pass' : p50 <= THRESHOLDS.api.p95 ? 'warning' : 'fail';
      suite.results.push({
        test: `${endpoint.name} p50`,
        status: p50Status,
        metric: 'latency',
        value: p50,
        target: THRESHOLDS.api.p50,
        unit: 'ms',
      });
      if (p50Status === 'pass') suite.summary.passed++;
      else if (p50Status === 'warning') suite.summary.warnings++;
      else suite.summary.failed++;

      // Check p95
      const p95Status = p95 <= THRESHOLDS.api.p95 ? 'pass' : 'warning';
      suite.results.push({
        test: `${endpoint.name} p95`,
        status: p95Status,
        metric: 'latency',
        value: p95,
        target: THRESHOLDS.api.p95,
        unit: 'ms',
      });
      if (p95Status === 'pass') suite.summary.passed++;
      else suite.summary.warnings++;
    }
  }

  return suite;
}

/**
 * Test database query performance
 */
async function testDatabasePerformance(): Promise<TestSuite> {
  const suite: TestSuite = {
    name: 'Database Performance',
    results: [],
    summary: { passed: 0, failed: 0, warnings: 0 },
  };

  console.log('🗄️  Testing database query performance...');

  // This would require Supabase client setup
  // For now, we'll mark it as a placeholder
  suite.results.push({
    test: 'Database Query Performance',
    status: 'warning',
    metric: 'availability',
    value: 0,
    target: 1,
    unit: 'boolean',
    message: 'Database performance testing requires Supabase client setup',
  });
  suite.summary.warnings++;

  return suite;
}

/**
 * Generate performance report
 */
function generateReport(suites: TestSuite[]): void {
  const totalPassed = suites.reduce((sum, s) => sum + s.summary.passed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.summary.failed, 0);
  const totalWarnings = suites.reduce((sum, s) => sum + s.summary.warnings, 0);

  // JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPassed,
      totalFailed,
      totalWarnings,
      totalTests: totalPassed + totalFailed + totalWarnings,
    },
    suites,
  };

  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  // Markdown summary
  let markdown = `# Performance Test Report\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- ✅ **Passed:** ${totalPassed}\n`;
  markdown += `- ❌ **Failed:** ${totalFailed}\n`;
  markdown += `- ⚠️  **Warnings:** ${totalWarnings}\n\n`;

  markdown += `## Test Suites\n\n`;

  for (const suite of suites) {
    markdown += `### ${suite.name}\n\n`;
    markdown += `- Passed: ${suite.summary.passed}\n`;
    markdown += `- Failed: ${suite.summary.failed}\n`;
    markdown += `- Warnings: ${suite.summary.warnings}\n\n`;

    if (suite.results.length > 0) {
      markdown += `| Test | Status | Metric | Value | Target |\n`;
      markdown += `|------|--------|--------|-------|--------|\n`;
      for (const result of suite.results) {
        const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        markdown += `| ${result.test} | ${statusIcon} ${result.status} | ${result.metric} | ${result.value} ${result.unit} | ${result.target} ${result.unit} |\n`;
      }
      markdown += `\n`;
    }
  }

  markdown += `\n---\n\n`;
  markdown += `*Full JSON report available at: ${REPORT_FILE}*\n`;

  writeFileSync(SUMMARY_FILE, markdown);

  console.log(`\n📊 Performance test report generated:`);
  console.log(`   - JSON: ${REPORT_FILE}`);
  console.log(`   - Summary: ${SUMMARY_FILE}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Performance Tests\n');
  console.log('═══════════════════════════════════════════════════════\n');

  ensureResultsDir();

  const suites: TestSuite[] = [];

  // Run test suites
  try {
    suites.push(await runLighthouseTests());
    suites.push(await testAPIPerformance());
    suites.push(await testDatabasePerformance());
  } catch (error) {
    console.error('❌ Error running performance tests:', error);
    process.exit(1);
  }

  // Generate report
  generateReport(suites);

  // Print summary
  const totalPassed = suites.reduce((sum, s) => sum + s.summary.passed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.summary.failed, 0);
  const totalWarnings = suites.reduce((sum, s) => sum + s.summary.warnings, 0);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Performance Test Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Exit with error code if any tests failed
  if (totalFailed > 0) {
    console.log('❌ Some performance tests failed. Check the report for details.');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('⚠️  Some performance tests have warnings. Review the report.');
    process.exit(0);
  } else {
    console.log('✅ All performance tests passed!');
    process.exit(0);
  }
}

// Run if executed directly
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
