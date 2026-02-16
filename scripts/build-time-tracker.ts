#!/usr/bin/env npx tsx
/**
 * Build Time Tracker
 *
 * Tracks and reports build times for Vite dev server and production builds.
 * Stores metrics in a JSON file for historical analysis.
 *
 * Usage:
 *   npm run build:track
 *   npx tsx scripts/build-time-tracker.ts
 *   npx tsx scripts/build-time-tracker.ts --mode production
 *   npx tsx scripts/build-time-tracker.ts --mode development
 *   npx tsx scripts/build-time-tracker.ts --report
 *
 * Security note: This script uses execSync with hardcoded commands only.
 * No user input is passed to shell commands.
 *
 * @author PM-Infrastructure
 * @task INF-012
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Metrics file location
const METRICS_DIR = join(process.cwd(), 'test-artifacts', 'build-metrics');
const METRICS_FILE = join(METRICS_DIR, 'build-times.json');
const REPORT_FILE = join(METRICS_DIR, 'build-report.md');

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  production: {
    good: 60000,      // Under 1 minute is good
    warning: 120000,  // Under 2 minutes is acceptable
    // Over 2 minutes is concerning
  },
  development: {
    good: 30000,      // Under 30 seconds is good
    warning: 60000,   // Under 1 minute is acceptable
    // Over 1 minute is concerning
  },
};

interface BuildMetric {
  timestamp: string;
  mode: 'production' | 'development';
  duration: number;
  durationFormatted: string;
  status: 'good' | 'warning' | 'slow';
  bundleSize?: number;
  bundleSizeFormatted?: string;
  chunkCount?: number;
  error?: string;
  git?: {
    branch: string;
    commit: string;
  };
}

interface BuildMetrics {
  lastUpdated: string;
  builds: BuildMetric[];
  stats: {
    averageProductionBuild: number;
    averageDevelopmentBuild: number;
    totalBuilds: number;
    slowBuilds: number;
  };
}

/**
 * Ensure metrics directory exists
 */
function ensureMetricsDir(): void {
  if (!existsSync(METRICS_DIR)) {
    mkdirSync(METRICS_DIR, { recursive: true });
    console.log(`Created metrics directory: ${METRICS_DIR}`);
  }
}

/**
 * Load existing metrics or create new
 */
function loadMetrics(): BuildMetrics {
  if (existsSync(METRICS_FILE)) {
    try {
      const data = readFileSync(METRICS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      console.warn('Could not parse existing metrics file, creating new one');
    }
  }

  return {
    lastUpdated: new Date().toISOString(),
    builds: [],
    stats: {
      averageProductionBuild: 0,
      averageDevelopmentBuild: 0,
      totalBuilds: 0,
      slowBuilds: 0,
    },
  };
}

/**
 * Save metrics to file
 */
function saveMetrics(metrics: BuildMetrics): void {
  metrics.lastUpdated = new Date().toISOString();

  // Calculate stats
  const prodBuilds = metrics.builds.filter(b => b.mode === 'production' && !b.error);
  const devBuilds = metrics.builds.filter(b => b.mode === 'development' && !b.error);

  metrics.stats.totalBuilds = metrics.builds.length;
  metrics.stats.slowBuilds = metrics.builds.filter(b => b.status === 'slow').length;

  if (prodBuilds.length > 0) {
    metrics.stats.averageProductionBuild = Math.round(
      prodBuilds.reduce((sum, b) => sum + b.duration, 0) / prodBuilds.length
    );
  }

  if (devBuilds.length > 0) {
    metrics.stats.averageDevelopmentBuild = Math.round(
      devBuilds.reduce((sum, b) => sum + b.duration, 0) / devBuilds.length
    );
  }

  // Keep only last 100 builds
  if (metrics.builds.length > 100) {
    metrics.builds = metrics.builds.slice(-100);
  }

  writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  console.log(`Metrics saved to: ${METRICS_FILE}`);
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format bytes in human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get build status based on duration
 */
function getBuildStatus(mode: 'production' | 'development', duration: number): 'good' | 'warning' | 'slow' {
  const threshold = THRESHOLDS[mode];
  if (duration <= threshold.good) return 'good';
  if (duration <= threshold.warning) return 'warning';
  return 'slow';
}

/**
 * Get git info using hardcoded commands (no user input)
 */
function getGitInfo(): { branch: string; commit: string } | undefined {
  try {
    // These are hardcoded commands - no user input injection possible
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    return { branch, commit };
  } catch {
    return undefined;
  }
}

/**
 * Parse bundle info from Vite output
 */
function parseBundleInfo(output: string): { size: number; chunks: number } | undefined {
  try {
    // Match Vite bundle output format: "dist/assets/index-abc123.js   xxx.xx kB"
    const sizeMatches = output.match(/(\d+(?:\.\d+)?)\s*(kB|KB|MB|B)/gi);
    if (sizeMatches) {
      let totalSize = 0;
      for (const match of sizeMatches) {
        const [, num, unit] = match.match(/(\d+(?:\.\d+)?)\s*(kB|KB|MB|B)/i) || [];
        if (num && unit) {
          const multiplier = unit.toLowerCase() === 'kb' ? 1024 : unit.toLowerCase() === 'mb' ? 1024 * 1024 : 1;
          totalSize += parseFloat(num) * multiplier;
        }
      }

      // Count chunks (files in dist/assets/)
      const chunkMatches = output.match(/dist\/assets\/[^\s]+/g);
      const chunks = chunkMatches ? chunkMatches.length : 0;

      return { size: Math.round(totalSize), chunks };
    }
  } catch {
    // Ignore parsing errors
  }
  return undefined;
}

/**
 * Run build and track time
 * Note: Commands are hardcoded - no user input is passed to shell
 */
async function runBuild(mode: 'production' | 'development'): Promise<BuildMetric> {
  console.log(`\nStarting ${mode} build...`);
  console.log('=' .repeat(50));

  const startTime = Date.now();
  let error: string | undefined;
  let output = '';

  try {
    // Hardcoded commands only - no user input
    const command = mode === 'production' ? 'npm run build' : 'npm run build:dev';
    output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });
    console.log(output);
  } catch (e) {
    const err = e as { message: string; stdout?: string; stderr?: string };
    error = err.message;
    output = err.stdout || err.stderr || '';
    console.error('Build failed:', error);
  }

  const duration = Date.now() - startTime;
  const status = error ? 'slow' : getBuildStatus(mode, duration);
  const bundleInfo = parseBundleInfo(output);

  const metric: BuildMetric = {
    timestamp: new Date().toISOString(),
    mode,
    duration,
    durationFormatted: formatDuration(duration),
    status,
    git: getGitInfo(),
  };

  if (error) {
    metric.error = error;
  }

  if (bundleInfo) {
    metric.bundleSize = bundleInfo.size;
    metric.bundleSizeFormatted = formatBytes(bundleInfo.size);
    metric.chunkCount = bundleInfo.chunks;
  }

  return metric;
}

/**
 * Generate build report
 */
function generateReport(metrics: BuildMetrics): void {
  const now = new Date();
  const last7Days = metrics.builds.filter(b => {
    const buildDate = new Date(b.timestamp);
    const diffDays = (now.getTime() - buildDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  });

  let report = `# Build Time Report\n\n`;
  report += `**Generated:** ${now.toLocaleString()}\n\n`;

  // Overall stats
  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Builds (all time) | ${metrics.stats.totalBuilds} |\n`;
  report += `| Builds (last 7 days) | ${last7Days.length} |\n`;
  report += `| Avg Production Build | ${formatDuration(metrics.stats.averageProductionBuild)} |\n`;
  report += `| Avg Development Build | ${formatDuration(metrics.stats.averageDevelopmentBuild)} |\n`;
  report += `| Slow Builds | ${metrics.stats.slowBuilds} |\n\n`;

  // Thresholds
  report += `## Performance Thresholds\n\n`;
  report += `| Mode | Good | Warning | Slow |\n`;
  report += `|------|------|---------|------|\n`;
  report += `| Production | < ${formatDuration(THRESHOLDS.production.good)} | < ${formatDuration(THRESHOLDS.production.warning)} | > ${formatDuration(THRESHOLDS.production.warning)} |\n`;
  report += `| Development | < ${formatDuration(THRESHOLDS.development.good)} | < ${formatDuration(THRESHOLDS.development.warning)} | > ${formatDuration(THRESHOLDS.development.warning)} |\n\n`;

  // Recent builds
  report += `## Recent Builds (Last 10)\n\n`;
  const recentBuilds = metrics.builds.slice(-10).reverse();

  if (recentBuilds.length > 0) {
    report += `| Date | Mode | Duration | Status | Bundle Size |\n`;
    report += `|------|------|----------|--------|-------------|\n`;

    for (const build of recentBuilds) {
      const date = new Date(build.timestamp).toLocaleDateString();
      const statusIcon = build.status === 'good' ? 'GOOD' : build.status === 'warning' ? 'WARN' : 'SLOW';
      const bundleSize = build.bundleSizeFormatted || 'N/A';
      report += `| ${date} | ${build.mode} | ${build.durationFormatted} | ${statusIcon} | ${bundleSize} |\n`;
    }
    report += `\n`;
  } else {
    report += `No builds recorded yet.\n\n`;
  }

  // Trend analysis
  if (last7Days.length >= 2) {
    report += `## Trend Analysis (Last 7 Days)\n\n`;

    const prodBuilds = last7Days.filter(b => b.mode === 'production' && !b.error);
    const devBuilds = last7Days.filter(b => b.mode === 'development' && !b.error);

    if (prodBuilds.length >= 2) {
      const firstHalf = prodBuilds.slice(0, Math.floor(prodBuilds.length / 2));
      const secondHalf = prodBuilds.slice(Math.floor(prodBuilds.length / 2));
      const firstAvg = firstHalf.reduce((sum, b) => sum + b.duration, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, b) => sum + b.duration, 0) / secondHalf.length;
      const trend = ((secondAvg - firstAvg) / firstAvg) * 100;

      report += `**Production Build Trend:** ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%\n`;
      report += `- ${trend > 5 ? 'REGRESSION: Builds are getting slower' : trend < -5 ? 'IMPROVEMENT: Builds are getting faster' : 'STABLE: Build times are consistent'}\n\n`;
    }

    if (devBuilds.length >= 2) {
      const firstHalf = devBuilds.slice(0, Math.floor(devBuilds.length / 2));
      const secondHalf = devBuilds.slice(Math.floor(devBuilds.length / 2));
      const firstAvg = firstHalf.reduce((sum, b) => sum + b.duration, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, b) => sum + b.duration, 0) / secondHalf.length;
      const trend = ((secondAvg - firstAvg) / firstAvg) * 100;

      report += `**Development Build Trend:** ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%\n`;
      report += `- ${trend > 5 ? 'REGRESSION: Builds are getting slower' : trend < -5 ? 'IMPROVEMENT: Builds are getting faster' : 'STABLE: Build times are consistent'}\n\n`;
    }
  }

  // Recommendations
  report += `## Recommendations\n\n`;

  const avgProd = metrics.stats.averageProductionBuild;
  const avgDev = metrics.stats.averageDevelopmentBuild;

  if (avgProd > THRESHOLDS.production.warning) {
    report += `- [ ] **Production builds are slow** (avg: ${formatDuration(avgProd)}). Consider:\n`;
    report += `  - Enable build caching\n`;
    report += `  - Review chunk splitting configuration\n`;
    report += `  - Audit dependencies for large packages\n\n`;
  }

  if (avgDev > THRESHOLDS.development.warning) {
    report += `- [ ] **Development builds are slow** (avg: ${formatDuration(avgDev)}). Consider:\n`;
    report += `  - Enable Vite's optimizeDeps pre-bundling\n`;
    report += `  - Check for slow transforms\n\n`;
  }

  if (avgProd <= THRESHOLDS.production.good && avgDev <= THRESHOLDS.development.good) {
    report += `Build performance is healthy. No action needed.\n\n`;
  }

  report += `---\n\n`;
  report += `*Full metrics available at: ${METRICS_FILE}*\n`;

  writeFileSync(REPORT_FILE, report);
  console.log(`\nReport generated: ${REPORT_FILE}`);
}

/**
 * Print summary to console
 */
function printSummary(metric: BuildMetric): void {
  console.log('\n' + '=' .repeat(50));
  console.log('BUILD TIME TRACKING SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Mode:       ${metric.mode}`);
  console.log(`Duration:   ${metric.durationFormatted}`);
  console.log(`Status:     ${metric.status.toUpperCase()}`);

  if (metric.bundleSizeFormatted) {
    console.log(`Bundle:     ${metric.bundleSizeFormatted}`);
  }
  if (metric.chunkCount) {
    console.log(`Chunks:     ${metric.chunkCount}`);
  }
  if (metric.git) {
    console.log(`Branch:     ${metric.git.branch}`);
    console.log(`Commit:     ${metric.git.commit}`);
  }
  if (metric.error) {
    console.log(`Error:      ${metric.error.substring(0, 100)}...`);
  }
  console.log('=' .repeat(50));

  // Status indicator
  if (metric.status === 'good') {
    console.log('Build performance is GOOD');
  } else if (metric.status === 'warning') {
    console.log('Build performance is ACCEPTABLE but could be improved');
  } else {
    console.log('Build performance needs attention - consider optimizations');
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reportOnly = args.includes('--report');
  const modeArg = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'production';

  // Validate mode to prevent unexpected values
  const mode: 'production' | 'development' = modeArg === 'development' ? 'development' : 'production';

  console.log('Build Time Tracker');
  console.log('Task: INF-012 - Track build times for performance monitoring');
  console.log('=' .repeat(50));

  ensureMetricsDir();
  const metrics = loadMetrics();

  if (reportOnly) {
    console.log('Generating report from existing metrics...');
    generateReport(metrics);
    return;
  }

  // Run build and track time
  const metric = await runBuild(mode);

  // Save metric
  metrics.builds.push(metric);
  saveMetrics(metrics);

  // Print summary
  printSummary(metric);

  // Generate report
  generateReport(metrics);

  // Exit with appropriate code
  if (metric.error) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
