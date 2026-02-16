/**
 * Vite Build Metrics Plugin
 *
 * A Vite plugin that tracks build times and outputs metrics during the build process.
 * Integrates with the build-time-tracker.ts script for comprehensive metrics.
 *
 * Usage in vite.config.ts:
 *   import buildMetrics from './plugins/vite-build-metrics';
 *   plugins: [buildMetrics()]
 *
 * @author PM-Infrastructure
 * @task INF-012
 */

import { Plugin } from 'vite';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface BuildPhaseMetric {
  phase: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface ViteBuildMetrics {
  timestamp: string;
  mode: string;
  totalDuration: number;
  phases: BuildPhaseMetric[];
  modules: {
    total: number;
    transformed: number;
  };
  chunks?: {
    count: number;
    totalSize: number;
  };
}

interface PluginOptions {
  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Output directory for metrics
   * @default 'test-artifacts/build-metrics'
   */
  outputDir?: string;

  /**
   * Enable console output
   * @default true
   */
  consoleOutput?: boolean;
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
 * Create the build metrics plugin
 */
export default function buildMetrics(options: PluginOptions = {}): Plugin {
  const {
    verbose = false,
    outputDir = 'test-artifacts/build-metrics',
    consoleOutput = true,
  } = options;

  let buildStartTime: number;
  let configResolveTime: number;
  let transformStartTime: number;
  let transformedModules = 0;
  let totalModules = 0;
  let currentMode = 'production';
  const phases: BuildPhaseMetric[] = [];

  function log(message: string): void {
    if (consoleOutput) {
      console.log(`[build-metrics] ${message}`);
    }
  }

  function logVerbose(message: string): void {
    if (verbose && consoleOutput) {
      console.log(`[build-metrics] ${message}`);
    }
  }

  function startPhase(name: string): void {
    const existing = phases.find(p => p.phase === name);
    if (existing) {
      existing.startTime = Date.now();
    } else {
      phases.push({
        phase: name,
        startTime: Date.now(),
      });
    }
    logVerbose(`Started phase: ${name}`);
  }

  function endPhase(name: string): void {
    const phase = phases.find(p => p.phase === name);
    if (phase && !phase.endTime) {
      phase.endTime = Date.now();
      phase.duration = phase.endTime - phase.startTime;
      logVerbose(`Ended phase: ${name} (${formatDuration(phase.duration)})`);
    }
  }

  function saveMetrics(metrics: ViteBuildMetrics): void {
    try {
      const metricsDir = join(process.cwd(), outputDir);
      if (!existsSync(metricsDir)) {
        mkdirSync(metricsDir, { recursive: true });
      }

      // Save individual build metrics
      const filename = `vite-build-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filepath = join(metricsDir, filename);
      writeFileSync(filepath, JSON.stringify(metrics, null, 2));
      logVerbose(`Metrics saved to: ${filepath}`);

      // Append to aggregate metrics file
      const aggregateFile = join(metricsDir, 'vite-builds.json');
      let aggregate: ViteBuildMetrics[] = [];

      if (existsSync(aggregateFile)) {
        try {
          aggregate = JSON.parse(readFileSync(aggregateFile, 'utf-8'));
        } catch {
          // Start fresh if file is corrupted
        }
      }

      aggregate.push(metrics);

      // Keep only last 50 builds
      if (aggregate.length > 50) {
        aggregate = aggregate.slice(-50);
      }

      writeFileSync(aggregateFile, JSON.stringify(aggregate, null, 2));
    } catch (error) {
      console.error('[build-metrics] Error saving metrics:', error);
    }
  }

  return {
    name: 'vite-build-metrics',
    enforce: 'pre',

    config(config, { mode }) {
      currentMode = mode;
      buildStartTime = Date.now();
      startPhase('config-resolve');
      logVerbose(`Build started in ${mode} mode`);
      return undefined;
    },

    configResolved() {
      configResolveTime = Date.now();
      endPhase('config-resolve');
      startPhase('plugins-init');
    },

    buildStart() {
      endPhase('plugins-init');
      startPhase('module-resolution');
      transformStartTime = Date.now();
    },

    resolveId() {
      totalModules++;
      return undefined;
    },

    transform() {
      if (!phases.find(p => p.phase === 'transform')) {
        endPhase('module-resolution');
        startPhase('transform');
      }
      transformedModules++;
      return undefined;
    },

    generateBundle() {
      endPhase('transform');
      startPhase('bundle-generation');
    },

    writeBundle(_, bundle) {
      endPhase('bundle-generation');
      startPhase('write-bundle');

      // Calculate bundle stats
      let totalSize = 0;
      let chunkCount = 0;

      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          chunkCount++;
          if (chunk.code) {
            totalSize += chunk.code.length;
          }
        } else if (chunk.type === 'asset') {
          if (typeof chunk.source === 'string') {
            totalSize += chunk.source.length;
          } else if (chunk.source instanceof Uint8Array) {
            totalSize += chunk.source.length;
          }
        }
      }

      endPhase('write-bundle');

      // Calculate total duration
      const totalDuration = Date.now() - buildStartTime;

      // Build metrics object
      const metrics: ViteBuildMetrics = {
        timestamp: new Date().toISOString(),
        mode: currentMode,
        totalDuration,
        phases: phases.filter(p => p.duration !== undefined),
        modules: {
          total: totalModules,
          transformed: transformedModules,
        },
        chunks: {
          count: chunkCount,
          totalSize,
        },
      };

      // Save metrics
      saveMetrics(metrics);

      // Print summary
      if (consoleOutput) {
        console.log('\n' + '='.repeat(50));
        console.log('BUILD METRICS');
        console.log('='.repeat(50));
        console.log(`Mode:            ${currentMode}`);
        console.log(`Total Duration:  ${formatDuration(totalDuration)}`);
        console.log(`Modules:         ${transformedModules}/${totalModules} transformed`);
        console.log(`Chunks:          ${chunkCount} (${formatBytes(totalSize)})`);
        console.log('');
        console.log('Phase Breakdown:');
        for (const phase of phases) {
          if (phase.duration !== undefined) {
            const percentage = ((phase.duration / totalDuration) * 100).toFixed(1);
            console.log(`  ${phase.phase.padEnd(20)} ${formatDuration(phase.duration).padStart(10)} (${percentage}%)`);
          }
        }
        console.log('='.repeat(50));
      }
    },

    closeBundle() {
      // Reset for next build
      phases.length = 0;
      transformedModules = 0;
      totalModules = 0;
    },
  };
}
