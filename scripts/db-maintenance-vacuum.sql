-- Database Maintenance: VACUUM and Dead Tuple Cleanup
-- Generated: 2025-10-17
-- Purpose: Clean up dead tuples identified in performance analysis
-- 
-- CRITICAL ISSUES FOUND:
-- - ModerationRule: 28 dead / 8 live (77.78% dead) - Never vacuumed
-- - Prompt: 17 dead / 3 live (85% dead) - Last autovacuum 3.5 hours ago
-- - PromptVersion: 7 dead / 3 live (70% dead) - Never vacuumed
--
-- Run this script using psql or a direct connection (NOT through read-only tools):
-- psql $DATABASE_URL < scripts/db-maintenance-vacuum.sql

-- VACUUM ANALYZE reclaims space and updates table statistics
VACUUM ANALYZE "ModerationRule";
VACUUM ANALYZE "Prompt";
VACUUM ANALYZE "PromptVersion";

-- Full database vacuum for good measure
VACUUM ANALYZE;

-- Display results
SELECT 
    schemaname, 
    relname, 
    n_dead_tup, 
    n_live_tup, 
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC 
LIMIT 10;