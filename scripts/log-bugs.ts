/**
 * Bug Logging Script
 * Parses Playwright test results and logs bugs to bugs.json
 * 
 * Usage: npx ts-node scripts/log-bugs.ts [results-file.json]
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  attachments?: Array<{
    name: string;
    path: string;
  }>;
}

interface Bug {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'fixed' | 'wontfix';
  test: string;
  error: string;
  screenshot?: string;
  steps: string[];
  expected: string;
  actual: string;
  discovered: string;
  lastSeen: string;
  occurrences: number;
  persona?: string;
  priority: string;
  assignedFix: string | null;
  fixAttempts: number;
}

interface BugsFile {
  bugs: Bug[];
  summary: {
    total: number;
    open: number;
    fixed: number;
    wontfix: number;
    lastUpdated: string | null;
  };
}

const BUGS_FILE = 'test-artifacts/bugs.json';

function determineSeverity(error: string): Bug['severity'] {
  const errorLower = error.toLowerCase();
  if (errorLower.includes('crash') || errorLower.includes('critical')) return 'critical';
  if (errorLower.includes('auth') || errorLower.includes('login')) return 'high';
  if (errorLower.includes('ui') || errorLower.includes('display')) return 'low';
  return 'medium';
}

function determinePriority(testTitle: string): string {
  if (testTitle.includes('@p0')) return 'P0';
  if (testTitle.includes('@p1')) return 'P1';
  if (testTitle.includes('@p2')) return 'P2';
  return 'P1'; // Default
}

function extractPersona(testTitle: string): string | undefined {
  if (testTitle.toLowerCase().includes('sarah')) return 'sarah';
  if (testTitle.toLowerCase().includes('marcus')) return 'marcus';
  if (testTitle.toLowerCase().includes('elena')) return 'elena';
  if (testTitle.toLowerCase().includes('david')) return 'david';
  return undefined;
}

function loadBugs(): BugsFile {
  try {
    const content = fs.readFileSync(BUGS_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return {
      bugs: [],
      summary: { total: 0, open: 0, fixed: 0, wontfix: 0, lastUpdated: null }
    };
  }
}

function saveBugs(bugsFile: BugsFile): void {
  bugsFile.summary.lastUpdated = new Date().toISOString();
  bugsFile.summary.total = bugsFile.bugs.length;
  bugsFile.summary.open = bugsFile.bugs.filter(b => b.status === 'open' || b.status === 'investigating').length;
  bugsFile.summary.fixed = bugsFile.bugs.filter(b => b.status === 'fixed').length;
  bugsFile.summary.wontfix = bugsFile.bugs.filter(b => b.status === 'wontfix').length;
  
  fs.writeFileSync(BUGS_FILE, JSON.stringify(bugsFile, null, 2));
}

function logBug(testResult: TestResult, bugsFile: BugsFile): void {
  if (testResult.status !== 'failed' || !testResult.error) return;

  const errorMsg = testResult.error.message;
  
  // Check if bug already exists
  const existingBug = bugsFile.bugs.find(b => 
    b.test === testResult.title && 
    b.error === errorMsg
  );

  if (existingBug) {
    // Update existing bug
    existingBug.occurrences++;
    existingBug.lastSeen = new Date().toISOString();
    console.log(`Updated existing bug: ${existingBug.id} (${existingBug.occurrences} occurrences)`);
  } else {
    // Create new bug
    const bug: Bug = {
      id: `BUG-${Date.now()}`,
      title: `Test failure: ${testResult.title}`,
      severity: determineSeverity(errorMsg),
      status: 'open',
      test: testResult.title,
      error: errorMsg,
      screenshot: testResult.attachments?.find(a => a.name === 'screenshot')?.path,
      steps: ['Run test suite', `Execute test: ${testResult.title}`],
      expected: 'Test should pass',
      actual: errorMsg,
      discovered: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      occurrences: 1,
      persona: extractPersona(testResult.title),
      priority: determinePriority(testResult.title),
      assignedFix: null,
      fixAttempts: 0
    };

    bugsFile.bugs.push(bug);
    console.log(`Logged new bug: ${bug.id} - ${bug.title}`);
  }
}

async function main() {
  const resultsFile = process.argv[2] || 'test-artifacts/playwright-results.json';
  
  if (!fs.existsSync(resultsFile)) {
    console.log(`Results file not found: ${resultsFile}`);
    console.log('Run tests first: npx playwright test --reporter=json');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  const bugsFile = loadBugs();
  
  let failedCount = 0;
  
  // Parse Playwright results
  for (const suite of results.suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.status === 'failed') {
          const testResult: TestResult = {
            title: `${suite.title} > ${spec.title}`,
            status: 'failed',
            duration: test.duration,
            error: test.results?.[0]?.error ? {
              message: test.results[0].error.message || 'Unknown error'
            } : undefined
          };
          logBug(testResult, bugsFile);
          failedCount++;
        }
      }
    }
  }

  saveBugs(bugsFile);
  
  console.log(`\n=== Bug Summary ===`);
  console.log(`New failures logged: ${failedCount}`);
  console.log(`Total open bugs: ${bugsFile.summary.open}`);
  console.log(`Total bugs tracked: ${bugsFile.summary.total}`);
}

main().catch(console.error);
