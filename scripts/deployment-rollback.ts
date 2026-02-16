#!/usr/bin/env npx tsx
/**
 * Deployment Rollback Utility
 *
 * Lists recent Vercel deployments and provides rollback functionality.
 *
 * Usage:
 *   npx tsx scripts/deployment-rollback.ts                    # List recent deployments
 *   npx tsx scripts/deployment-rollback.ts --list             # List recent deployments
 *   npx tsx scripts/deployment-rollback.ts --rollback <id>    # Rollback to specific deployment
 *   npx tsx scripts/deployment-rollback.ts --current          # Show current production deployment
 *   npx tsx scripts/deployment-rollback.ts --json             # Output as JSON
 *
 * @created 2026-02-15 by PM-Infrastructure (INF-013)
 */

import { execFileSync, execFile } from 'child_process';
import * as readline from 'readline';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface VercelDeployment {
  url: string;
  name: string;
  state: string;
  target: string | null;
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  creator: {
    uid: string;
    username: string;
  };
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubCommitRef?: string;
    githubCommitAuthorName?: string;
  };
}

interface VercelListResponse {
  deployments: VercelDeployment[];
  pagination?: {
    count: number;
    next: number | null;
    prev: number | null;
  };
}

// Normalized deployment interface for internal use
interface Deployment {
  id: string; // Use URL as the ID (Vercel accepts URL for rollback)
  url: string;
  fullUrl: string;
  state: string;
  created: number;
  target: string | null;
  creator: {
    username: string;
  };
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubCommitRef?: string;
  };
}

interface RollbackResult {
  success: boolean;
  deploymentId: string;
  previousDeploymentId?: string;
  error?: string;
  duration?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  maxDeployments: 10,
  productionUrl: 'https://smart-agent-platform-sigma.vercel.app',
  projectName: 'smart-agent-platform',
  rollbackTimeout: 180000, // 3 minutes
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message: string) {
  console.log(message);
}

function success(message: string) {
  console.log(`${colors.green}${message}${colors.reset}`);
}

function error(message: string) {
  console.error(`${colors.red}${message}${colors.reset}`);
}

function warn(message: string) {
  console.log(`${colors.yellow}${message}${colors.reset}`);
}

function info(message: string) {
  console.log(`${colors.cyan}${message}${colors.reset}`);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Command Execution Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a deployment ID/URL to prevent injection.
 * Vercel accepts both deployment IDs and URLs.
 * URLs are in format: project-name-hash-scope.vercel.app
 */
function validateDeploymentId(id: string): boolean {
  // Allow alphanumeric, hyphens, underscores, and dots (for URLs)
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  return validPattern.test(id) && id.length > 0 && id.length < 200;
}

/**
 * Execute command synchronously using execFileSync (no shell injection risk)
 */
function runCommandSync(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    throw new Error(error.stderr || error.message || 'Command failed');
  }
}

/**
 * Execute command asynchronously using execFile (no shell injection risk)
 */
function runCommandAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: CONFIG.rollbackTimeout }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Vercel CLI Interactions
// ─────────────────────────────────────────────────────────────────────────────

function checkVercelCli(): boolean {
  try {
    runCommandSync('vercel', ['--version']);
    return true;
  } catch {
    return false;
  }
}

function getDeployments(limit: number = CONFIG.maxDeployments): Deployment[] {
  try {
    const output = runCommandSync('vercel', ['ls', '-F', 'json']);
    const response: VercelListResponse = JSON.parse(output);

    // Extract deployments array from response
    const rawDeployments = response.deployments || [];

    // Normalize to our internal format
    const normalized: Deployment[] = rawDeployments.map((d: VercelDeployment) => ({
      id: d.url, // Use URL as ID (Vercel accepts this for rollback)
      url: d.url,
      fullUrl: `https://${d.url}`,
      state: d.state,
      created: d.createdAt,
      target: d.target,
      creator: d.creator,
      meta: d.meta,
    }));

    // Sort by created time and limit
    return normalized
      .sort((a, b) => b.created - a.created)
      .slice(0, limit);
  } catch (err) {
    error('Failed to fetch deployments. Make sure you are logged into Vercel CLI.');
    return [];
  }
}

function getCurrentProduction(): Deployment | null {
  const deployments = getDeployments();
  // Find most recent production deployment that is ready
  return deployments
    .filter(d => d.target === 'production' && d.state === 'READY')
    .sort((a, b) => b.created - a.created)[0] || null;
}

async function rollbackToDeployment(deploymentUrl: string): Promise<RollbackResult> {
  const startTime = Date.now();

  // Validate deployment URL to prevent injection
  if (!validateDeploymentId(deploymentUrl)) {
    return {
      success: false,
      deploymentId: deploymentUrl,
      error: 'Invalid deployment URL format',
      duration: 0,
    };
  }

  const currentProd = getCurrentProduction();

  try {
    // Use the full URL for rollback
    const rollbackTarget = deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`;
    await runCommandAsync('vercel', ['rollback', rollbackTarget, '--yes', '--timeout', '3m']);
    const duration = Date.now() - startTime;

    return {
      success: true,
      deploymentId: deploymentUrl,
      previousDeploymentId: currentProd?.id,
      duration,
    };
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    return {
      success: false,
      deploymentId: deploymentUrl,
      previousDeploymentId: currentProd?.id,
      error: errorMessage,
      duration,
    };
  }
}

function checkRollbackStatus(): void {
  try {
    // Use inherit stdio to show Vercel's output directly
    execFileSync('vercel', ['rollback', 'status'], { stdio: 'inherit' });
  } catch (err: unknown) {
    // Vercel returns exit code 1 when no rollback in progress, which is fine
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    if (!errorMessage.includes('no rollback') && !errorMessage.includes('status 1')) {
      error('Failed to check rollback status.');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Display Functions
// ─────────────────────────────────────────────────────────────────────────────

function displayDeployments(deployments: Deployment[], asJson: boolean = false): void {
  if (asJson) {
    console.log(JSON.stringify(deployments, null, 2));
    return;
  }

  log('');
  log(`${colors.bold}${'='.repeat(80)}${colors.reset}`);
  log(`${colors.bold}  Recent Vercel Deployments - ${CONFIG.projectName}${colors.reset}`);
  log(`${colors.bold}${'='.repeat(80)}${colors.reset}`);
  log('');

  if (deployments.length === 0) {
    warn('No deployments found.');
    return;
  }

  const currentProd = deployments
    .filter(d => d.target === 'production' && d.state === 'READY')
    .sort((a, b) => b.created - a.created)[0];

  deployments.forEach((d, index) => {
    const isCurrentProd = currentProd?.id === d.id;
    const stateColor = d.state === 'READY' ? colors.green : d.state === 'ERROR' ? colors.red : colors.yellow;
    const targetLabel = d.target === 'production' ? `${colors.cyan}[PROD]${colors.reset}` : `${colors.gray}[preview]${colors.reset}`;
    const currentLabel = isCurrentProd ? ` ${colors.green}(CURRENT)${colors.reset}` : '';

    // Extract unique part of URL for display
    const shortId = d.url.split('-').slice(-2, -1)[0] || d.url.substring(0, 12);
    log(`  ${colors.bold}${index + 1}.${colors.reset} ${shortId}... ${targetLabel}${currentLabel}`);
    log(`     ${colors.gray}URL:${colors.reset}     ${d.fullUrl}`);
    log(`     ${colors.gray}State:${colors.reset}   ${stateColor}${d.state}${colors.reset}`);
    log(`     ${colors.gray}Created:${colors.reset} ${formatDate(d.created)} (${getRelativeTime(d.created)})`);
    log(`     ${colors.gray}Author:${colors.reset}  ${d.creator?.username || 'unknown'}`);

    if (d.meta?.githubCommitMessage) {
      const commitMsg = d.meta.githubCommitMessage.split('\n')[0].substring(0, 50);
      log(`     ${colors.gray}Commit:${colors.reset}  ${commitMsg}${d.meta.githubCommitMessage.length > 50 ? '...' : ''}`);
    }
    if (d.meta?.githubCommitSha) {
      log(`     ${colors.gray}SHA:${colors.reset}     ${d.meta.githubCommitSha.substring(0, 7)}`);
    }

    log('');
  });

  log(`${colors.bold}${'='.repeat(80)}${colors.reset}`);
  log('');
  log(`${colors.bold}Rollback Commands:${colors.reset}`);
  log(`  npm run deploy:rollback <deployment-id>    - Rollback to specific deployment`);
  log(`  npm run deploy:rollback:prev               - Rollback to previous production`);
  log(`  npm run deploy:status                      - Check current rollback status`);
  log('');
}

function displayCurrentProduction(deployment: Deployment | null, asJson: boolean = false): void {
  if (asJson) {
    console.log(JSON.stringify(deployment, null, 2));
    return;
  }

  log('');
  log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bold}  Current Production Deployment${colors.reset}`);
  log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  log('');

  if (!deployment) {
    warn('No production deployment found.');
    return;
  }

  log(`  ${colors.bold}ID:${colors.reset}      ${deployment.id}`);
  log(`  ${colors.bold}URL:${colors.reset}     ${deployment.fullUrl}`);
  log(`  ${colors.bold}State:${colors.reset}   ${colors.green}${deployment.state}${colors.reset}`);
  if (deployment.created) {
    log(`  ${colors.bold}Created:${colors.reset} ${formatDate(deployment.created)}`);
    log(`  ${colors.bold}Age:${colors.reset}     ${getRelativeTime(deployment.created)}`);
  }
  log(`  ${colors.bold}Author:${colors.reset}  ${deployment.creator?.username || 'unknown'}`);

  if (deployment.meta?.githubCommitMessage) {
    log(`  ${colors.bold}Commit:${colors.reset}  ${deployment.meta.githubCommitMessage.split('\n')[0]}`);
  }
  if (deployment.meta?.githubCommitSha) {
    log(`  ${colors.bold}SHA:${colors.reset}     ${deployment.meta.githubCommitSha}`);
  }

  log('');
  log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Rollback
// ─────────────────────────────────────────────────────────────────────────────

async function confirmRollback(deploymentId: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    warn('\n  WARNING: Rollback will immediately change production deployment!');
    log('');
    rl.question(`Confirm rollback to ${deploymentId}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function performRollback(deploymentId: string, skipConfirm: boolean = false): Promise<void> {
  // Validate deployment ID
  if (!validateDeploymentId(deploymentId)) {
    error(`Invalid deployment ID format: ${deploymentId}`);
    log('Deployment IDs should be alphanumeric (letters, numbers, hyphens, underscores).');
    process.exit(1);
  }

  // Verify deployment exists
  const deployments = getDeployments();
  const targetDeployment = deployments.find(d =>
    d.id === deploymentId ||
    d.url === deploymentId ||
    d.url.includes(deploymentId) ||
    d.fullUrl === deploymentId
  );

  if (!targetDeployment) {
    error(`Deployment not found: ${deploymentId}`);
    log('\nUse "npm run deploy:list" to see available deployments.');
    process.exit(1);
  }

  // Show what we're rolling back to
  log('');
  log(`${colors.bold}Target Deployment:${colors.reset}`);
  log(`  ID:      ${targetDeployment.id}`);
  log(`  URL:     ${targetDeployment.fullUrl}`);
  log(`  State:   ${targetDeployment.state}`);
  if (targetDeployment.created) {
    log(`  Created: ${formatDate(targetDeployment.created)} (${getRelativeTime(targetDeployment.created)})`);
  }
  if (targetDeployment.meta?.githubCommitMessage) {
    log(`  Commit:  ${targetDeployment.meta.githubCommitMessage.split('\n')[0]}`);
  }

  // Confirm
  if (!skipConfirm) {
    const confirmed = await confirmRollback(targetDeployment.id);
    if (!confirmed) {
      log('\nRollback cancelled.');
      process.exit(0);
    }
  }

  // Perform rollback
  log('');
  info('Performing rollback...');

  const result = await rollbackToDeployment(targetDeployment.url);

  if (result.success) {
    success(`\n  Rollback successful!`);
    log(`   Duration: ${Math.round((result.duration || 0) / 1000)}s`);
    log(`   Previous: ${result.previousDeploymentId || 'unknown'}`);
    log(`   Current:  ${result.deploymentId}`);
    log('');
    info('Running deployment verification...');

    try {
      execFileSync('./scripts/verify-deployment.sh', [], { stdio: 'inherit' });
    } catch {
      warn('Verification completed with warnings - check output above.');
    }
  } else {
    error(`\n  Rollback failed: ${result.error}`);
    log('');
    log('Troubleshooting:');
    log('  1. Ensure you are logged into Vercel: vercel login');
    log('  2. Check deployment exists: npm run deploy:list');
    log('  3. Try manual rollback: vercel rollback <deployment-id>');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');

  // Check Vercel CLI
  if (!checkVercelCli()) {
    error('Vercel CLI not found. Install with: npm i -g vercel');
    process.exit(1);
  }

  // Parse commands
  if (args.includes('--current') || args.includes('-c')) {
    const current = getCurrentProduction();
    displayCurrentProduction(current, asJson);
    return;
  }

  if (args.includes('--status') || args.includes('-s')) {
    checkRollbackStatus();
    return;
  }

  if (args.includes('--rollback') || args.includes('-r')) {
    const rollbackIndex = args.findIndex(a => a === '--rollback' || a === '-r');
    const deploymentId = args[rollbackIndex + 1];

    if (!deploymentId || deploymentId.startsWith('-')) {
      error('Please provide a deployment ID: npm run deploy:rollback <id>');
      process.exit(1);
    }

    const skipConfirm = args.includes('--yes') || args.includes('-y');
    await performRollback(deploymentId, skipConfirm);
    return;
  }

  if (args.includes('--previous') || args.includes('--prev') || args.includes('-p')) {
    // Rollback to previous production deployment
    const deployments = getDeployments();
    const productionDeployments = deployments.filter(d => d.target === 'production' && d.state === 'READY');

    if (productionDeployments.length < 2) {
      error('Not enough production deployments to rollback. Need at least 2.');
      process.exit(1);
    }

    const previousDeployment = productionDeployments[1]; // Second one is previous
    const skipConfirm = args.includes('--yes') || args.includes('-y');
    await performRollback(previousDeployment.url, skipConfirm);
    return;
  }

  // Default: list deployments
  const deployments = getDeployments();
  displayDeployments(deployments, asJson);
}

main().catch((err) => {
  error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
