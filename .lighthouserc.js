/**
 * Lighthouse CI Configuration
 * 
 * Performance budgets and thresholds for Smart Agent Platform
 */

module.exports = {
  ci: {
    collect: {
      url: ['https://smart-agent-platform.vercel.app'],
      numberOfRuns: 3,
      settings: {
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.7}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.85}],
        'categories:seo': ['error', {minScore: 0.8}],
        'first-contentful-paint': ['error', {maxNumericValue: 2000}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'total-blocking-time': ['error', {maxNumericValue: 300}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
