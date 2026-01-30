-- Migration: Add performance monitoring views
-- Addresses: Query performance visibility, index usage tracking
-- Impact: Enables data-driven optimization decisions

-- Note: pg_stat_statements requires special configuration on Supabase
-- It may not be available in all environments
-- The slow_queries view is commented out - enable manually if pg_stat_statements is available

-- Uncomment below if pg_stat_statements is properly configured:
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
--
-- CREATE OR REPLACE VIEW public.slow_queries AS
-- SELECT
--   substring(query, 1, 100) as short_query,
--   calls,
--   ROUND(total_exec_time::numeric, 2) as total_time_ms,
--   ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
--   ROUND(max_exec_time::numeric, 2) as max_time_ms,
--   ROUND(stddev_exec_time::numeric, 2) as stddev_time_ms,
--   rows
-- FROM pg_stat_statements
-- WHERE mean_exec_time > 100
--   AND query NOT LIKE '%pg_stat%'
--   AND query NOT LIKE '%information_schema%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 50;

-- View: Unused indexes (< 50 scans)
CREATE OR REPLACE VIEW public.unused_indexes AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 50
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- View: Table bloat and vacuum stats
CREATE OR REPLACE VIEW public.table_maintenance_status AS
SELECT
  schemaname,
  relname as tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- View: Index health (size, scans, usage)
CREATE OR REPLACE VIEW public.index_health AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  CASE
    WHEN idx_scan = 0 THEN 0
    ELSE ROUND(100.0 * idx_tup_read / NULLIF(idx_scan, 0), 2)
  END as avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Grant access to authenticated users (read-only)
-- GRANT SELECT ON public.slow_queries TO authenticated; -- Disabled: pg_stat_statements not available
GRANT SELECT ON public.unused_indexes TO authenticated;
GRANT SELECT ON public.table_maintenance_status TO authenticated;
GRANT SELECT ON public.index_health TO authenticated;

-- COMMENT ON VIEW public.slow_queries IS
--   'Queries with mean execution time > 100ms for performance analysis';
COMMENT ON VIEW public.unused_indexes IS
  'Indexes with < 50 scans that may be candidates for removal';
COMMENT ON VIEW public.table_maintenance_status IS
  'Table bloat and autovacuum statistics for maintenance planning';
COMMENT ON VIEW public.index_health IS
  'Index usage patterns and statistics';
