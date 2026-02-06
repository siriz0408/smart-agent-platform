#!/usr/bin/env npx tsx
/**
 * PM-QA Post-Cycle QA Gate
 * 
 * This script implements the post-cycle QA gate process:
 * 1. Identify files changed in the cycle (git diff)
 * 2. Map changed files to critical flows (using OWNERSHIP.md)
 * 3. Run targeted Playwright tests for affected flows
 * 4. Run full critical flow smoke test
 * 5. Report results (PASS/WARN/FAIL)
 * 
 * Usage:
 *   npm run qa:gate                    # Test current branch vs main
 *   npm run qa:gate -- --base main     # Test vs specific branch
 *   npm run qa:gate -- --files file1.ts file2.ts  # Test specific files
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestMapping {
  flow: string;
  testFile: string;
  priority: 'P0' | 'P1' | 'P2';
  description: string;
}

interface FileToFlowMap {
  [filePattern: string]: {
    flows: string[];
    owner: string;
  };
}

interface QAReport {
  status: 'PASS' | 'WARN' | 'FAIL';
  changedFiles: string[];
  affectedFlows: string[];
  testsRun: string[];
  testResults: {
    passed: number;
    failed: number;
    skipped: number;
  };
  bugs: Array<{
    id: string;
    severity: 'P0' | 'P1' | 'P2';
    flow: string;
    description: string;
  }>;
  timestamp: string;
}

// Critical flows and their test files
const CRITICAL_FLOWS: TestMapping[] = [
  {
    flow: 'Login / Signup',
    testFile: 'tests/e2e/auth.spec.ts',
    priority: 'P0',
    description: 'Authentication flow'
  },
  {
    flow: 'Create contact',
    testFile: 'tests/e2e/contacts.spec.ts',
    priority: 'P0',
    description: 'Contact CRUD operations'
  },
  {
    flow: 'Create deal',
    testFile: 'tests/e2e/deals.spec.ts',
    priority: 'P0',
    description: 'Deal creation and pipeline'
  },
  {
    flow: 'Pipeline drag-and-drop',
    testFile: 'tests/e2e/pipeline.spec.ts',
    priority: 'P1',
    description: 'Pipeline kanban board interactions'
  },
  {
    flow: 'Property search and save',
    testFile: 'tests/e2e/properties.spec.ts',
    priority: 'P1',
    description: 'Property search functionality'
  },
  {
    flow: 'Admin console access',
    testFile: 'tests/e2e/admin-agents-delete.spec.ts',
    priority: 'P1',
    description: 'Admin console flows'
  }
];

// Map file patterns to flows based on OWNERSHIP.md
function buildFileToFlowMap(): FileToFlowMap {
  const ownershipPath = join(process.cwd(), 'docs/pm-agents/OWNERSHIP.md');
  if (!existsSync(ownershipPath)) {
    console.warn('⚠️  OWNERSHIP.md not found, using default mappings');
    return getDefaultMappings();
  }

  const ownership = readFileSync(ownershipPath, 'utf-8');
  const map: FileToFlowMap = {};

  // Parse OWNERSHIP.md to extract file patterns and map to flows
  // This is a simplified parser - could be enhanced
  
  // Auth files -> Login flow
  if (ownership.includes('src/components/auth') || ownership.includes('src/pages/Login')) {
    map['src/components/auth/**'] = { flows: ['Login / Signup'], owner: 'PM-Experience' };
    map['src/pages/Login.tsx'] = { flows: ['Login / Signup'], owner: 'PM-Experience' };
  }

  // Contact files -> Create contact flow
  if (ownership.includes('src/components/contacts') || ownership.includes('src/pages/Contacts')) {
    map['src/components/contacts/**'] = { flows: ['Create contact'], owner: 'PM-Context' };
    map['src/pages/Contacts.tsx'] = { flows: ['Create contact'], owner: 'PM-Context' };
  }

  // Deal files -> Create deal flow
  if (ownership.includes('src/components/deals') || ownership.includes('src/pages/Pipeline')) {
    map['src/components/deals/**'] = { flows: ['Create deal', 'Pipeline drag-and-drop'], owner: 'PM-Transactions' };
    map['src/pages/Pipeline.tsx'] = { flows: ['Create deal', 'Pipeline drag-and-drop'], owner: 'PM-Transactions' };
    map['src/components/pipeline/**'] = { flows: ['Pipeline drag-and-drop'], owner: 'PM-Transactions' };
  }

  // Property files -> Property search flow
  if (ownership.includes('src/components/properties') || ownership.includes('src/pages/Properties')) {
    map['src/components/properties/**'] = { flows: ['Property search and save'], owner: 'PM-Context' };
    map['src/pages/Properties.tsx'] = { flows: ['Property search and save'], owner: 'PM-Context' };
  }

  // AI Chat files -> AI chat flow (not yet in critical flows but important)
  if (ownership.includes('src/components/ai-chat') || ownership.includes('src/hooks/useAIChat')) {
    map['src/components/ai-chat/**'] = { flows: [], owner: 'PM-Intelligence' };
    map['src/hooks/useAIChat.tsx'] = { flows: [], owner: 'PM-Intelligence' };
  }

  return { ...map, ...getDefaultMappings() };
}

function getDefaultMappings(): FileToFlowMap {
  return {
    'src/components/auth/**': { flows: ['Login / Signup'], owner: 'PM-Experience' },
    'src/pages/Login.tsx': { flows: ['Login / Signup'], owner: 'PM-Experience' },
    'src/components/contacts/**': { flows: ['Create contact'], owner: 'PM-Context' },
    'src/pages/Contacts.tsx': { flows: ['Create contact'], owner: 'PM-Context' },
    'src/components/deals/**': { flows: ['Create deal'], owner: 'PM-Transactions' },
    'src/pages/Pipeline.tsx': { flows: ['Create deal', 'Pipeline drag-and-drop'], owner: 'PM-Transactions' },
    'src/components/pipeline/**': { flows: ['Pipeline drag-and-drop'], owner: 'PM-Transactions' },
    'src/components/properties/**': { flows: ['Property search and save'], owner: 'PM-Context' },
    'src/pages/Properties.tsx': { flows: ['Property search and save'], owner: 'PM-Context' },
    'src/components/ai-chat/**': { flows: [], owner: 'PM-Intelligence' },
    'supabase/functions/**': { flows: [], owner: 'PM-Infrastructure' },
  };
}

// Get changed files from git
function getChangedFiles(baseBranch: string = 'main'): string[] {
  try {
    // Get current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    
    // Get diff between current branch and base
    const diffOutput = execSync(
      `git diff --name-only ${baseBranch}...${currentBranch}`,
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    return diffOutput
      .split('\n')
      .filter(line => line.trim().length > 0)
      .filter(file => {
        // Exclude test files, config files, docs
        const excludePatterns = [
          /^tests\//,
          /^docs\//,
          /^\.git/,
          /^node_modules/,
          /package-lock\.json$/,
          /\.md$/,
          /^scripts\/qa-gate/,
        ];
        return !excludePatterns.some(pattern => pattern.test(file));
      });
  } catch (error) {
    console.error('❌ Error getting changed files:', error);
    return [];
  }
}

// Map files to flows
function mapFilesToFlows(files: string[], fileToFlowMap: FileToFlowMap): string[] {
  const affectedFlows = new Set<string>();

  for (const file of files) {
    for (const [pattern, mapping] of Object.entries(fileToFlowMap)) {
      if (matchesPattern(file, pattern)) {
        mapping.flows.forEach(flow => affectedFlows.add(flow));
      }
    }
  }

  return Array.from(affectedFlows);
}

function matchesPattern(file: string, pattern: string): boolean {
  // Simple pattern matching - supports ** wildcards
  const regex = new RegExp(
    '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
  );
  return regex.test(file);
}

// Get test files for flows
function getTestFilesForFlows(flows: string[]): string[] {
  const testFiles = new Set<string>();

  for (const flow of flows) {
    const mapping = CRITICAL_FLOWS.find(f => f.flow === flow);
    if (mapping && existsSync(mapping.testFile)) {
      testFiles.add(mapping.testFile);
    }
  }

  return Array.from(testFiles);
}

// Run Playwright tests
function runTests(testFiles: string[]): { passed: number; failed: number; skipped: number } {
  if (testFiles.length === 0) {
    console.log('ℹ️  No tests to run');
    return { passed: 0, failed: 0, skipped: 0 };
  }

  console.log(`\n🧪 Running ${testFiles.length} test file(s)...\n`);

  try {
    // Run Playwright with JSON reporter
    const testArgs = testFiles.join(' ');
    const command = `npx playwright test ${testArgs} --reporter=json,list`;
    
    const output = execSync(command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    // Try to parse JSON results if available
    try {
      const resultsPath = join(process.cwd(), 'test-artifacts/playwright-results.json');
      if (existsSync(resultsPath)) {
        const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));
        const stats = results.stats || {};
        return {
          passed: stats.passed || 0,
          failed: stats.failed || 0,
          skipped: stats.skipped || 0,
        };
      }
    } catch (e) {
      // Fall back to parsing stdout
    }

    // Parse output for pass/fail counts
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Test execution failed:', errorMessage);
    // If tests fail, try to extract failure count
    const output = (error as { stdout?: string }).stdout || errorMessage || '';
    const failedMatch = output.match(/(\d+) failed/);
    return {
      passed: 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 1,
      skipped: 0,
    };
  }
}

// Generate QA report
function generateReport(
  changedFiles: string[],
  affectedFlows: string[],
  testsRun: string[],
  testResults: { passed: number; failed: number; skipped: number }
): QAReport {
  let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';

  if (testResults.failed > 0) {
    status = 'FAIL';
  } else if (testResults.skipped > 0 || affectedFlows.length === 0) {
    status = 'WARN';
  }

  return {
    status,
    changedFiles,
    affectedFlows,
    testsRun,
    testResults,
    bugs: [], // Will be populated if bugs are found
    timestamp: new Date().toISOString(),
  };
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const baseBranch = args.includes('--base') 
    ? args[args.indexOf('--base') + 1] 
    : 'main';
  
  const specificFiles = args.includes('--files')
    ? args.slice(args.indexOf('--files') + 1)
    : null;

  console.log('🚪 PM-QA Post-Cycle QA Gate\n');
  console.log(`📊 Base branch: ${baseBranch}`);

  // Step 1: Get changed files
  const changedFiles = specificFiles || getChangedFiles(baseBranch);
  console.log(`\n📝 Changed files: ${changedFiles.length}`);
  if (changedFiles.length > 0) {
    changedFiles.slice(0, 10).forEach(file => console.log(`   - ${file}`));
    if (changedFiles.length > 10) {
      console.log(`   ... and ${changedFiles.length - 10} more`);
    }
  }

  // Step 2: Map to flows
  const fileToFlowMap = buildFileToFlowMap();
  const affectedFlows = mapFilesToFlows(changedFiles, fileToFlowMap);
  console.log(`\n🎯 Affected flows: ${affectedFlows.length}`);
  affectedFlows.forEach(flow => console.log(`   - ${flow}`));

  // Step 3: Get test files
  const testFiles = getTestFilesForFlows(affectedFlows);
  
  // Always include P0 critical flows for smoke test
  const p0Flows = CRITICAL_FLOWS.filter(f => f.priority === 'P0').map(f => f.flow);
  const p0TestFiles = getTestFilesForFlows(p0Flows);
  const allTestFiles = Array.from(new Set([...testFiles, ...p0TestFiles]));

  console.log(`\n🧪 Test files to run: ${allTestFiles.length}`);
  allTestFiles.forEach(file => console.log(`   - ${file}`));

  // Step 4: Run tests
  const testResults = runTests(allTestFiles);

  // Step 5: Generate report
  const report = generateReport(changedFiles, affectedFlows, allTestFiles, testResults);

  // Step 6: Print report
  console.log('\n' + '='.repeat(60));
  console.log('📋 QA GATE REPORT');
  console.log('='.repeat(60));
  console.log(`Status: ${report.status === 'PASS' ? '✅ PASS' : report.status === 'WARN' ? '⚠️  WARN' : '❌ FAIL'}`);
  console.log(`Tests: ${testResults.passed} passed, ${testResults.failed} failed, ${testResults.skipped} skipped`);
  console.log(`Affected flows: ${affectedFlows.length}`);
  console.log(`Tests run: ${allTestFiles.length}`);
  console.log('='.repeat(60));

  // Exit with appropriate code
  if (report.status === 'FAIL') {
    console.log('\n❌ QA Gate FAILED - Blocking merge');
    process.exit(1);
  } else if (report.status === 'WARN') {
    console.log('\n⚠️  QA Gate WARN - Merge with caution');
    process.exit(0);
  } else {
    console.log('\n✅ QA Gate PASSED - Merge approved');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
