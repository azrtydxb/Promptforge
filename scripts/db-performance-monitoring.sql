-- Database Performance Monitoring Script
-- Generated: 2025-10-17
-- Purpose: Regular performance monitoring queries
-- Run this to check database health: psql $DATABASE_URL < scripts/db-performance-monitoring.sql

-- ============================================
-- TABLE SIZES AND GROWTH
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TABLE SIZES'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('"' || tablename || '"')) AS total_size,
    pg_size_pretty(pg_relation_size('"' || tablename || '"')) AS table_size,
    pg_size_pretty(pg_total_relation_size('"' || tablename || '"') - pg_relation_size('"' || tablename || '"')) AS indexes_size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size('"' || tablename || '"') DESC 
LIMIT 15;

-- ============================================
-- INDEX USAGE STATISTICS
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'INDEX USAGE (Tables with Low Index Usage)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
    relname AS table_name,
    ROUND(100.0 * idx_scan / NULLIF((seq_scan + idx_scan), 0), 2) AS index_usage_pct,
    seq_scan AS sequential_scans,
    idx_scan AS index_scans,
    n_live_tup AS live_rows
FROM pg_stat_user_tables 
WHERE (seq_scan + idx_scan) > 0 
    AND schemaname = 'public'
ORDER BY index_usage_pct ASC NULLS FIRST, seq_scan DESC 
LIMIT 15;

-- ============================================
-- UNUSED INDEXES (Candidates for Removal)
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'UNUSED INDEXES (0 scans)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS scans
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC 
LIMIT 20;

-- ============================================
-- DEAD TUPLES AND BLOAT
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TABLE BLOAT (Dead Tuples)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
    schemaname,
    relname AS table_name,
    n_dead_tup AS dead_tuples,
    n_live_tup AS live_tuples,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS bloat_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables 
WHERE n_dead_tup > 0 
    AND schemaname = 'public'
ORDER BY bloat_pct DESC NULLS LAST, n_dead_tup DESC 
LIMIT 10;

-- ============================================
-- CONNECTION STATISTICS
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'CONNECTION STATISTICS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
    COUNT(*) as total_connections,
    COUNT(*) FILTER (WHERE state = 'active') as active,
    COUNT(*) FILTER (WHERE state = 'idle') as idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    COUNT(*) FILTER (WHERE state IS NULL) as other
FROM pg_stat_activity 
WHERE datname = current_database();

-- ============================================
-- MOST ACCESSED TABLES
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'MOST ACCESSED TABLES'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
    relname AS table_name,
    seq_scan + idx_scan AS total_scans,
    seq_scan AS sequential_scans,
    idx_scan AS index_scans,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY (seq_scan + idx_scan) DESC 
LIMIT 15;

-- ============================================
-- CACHE HIT RATIO
-- ============================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'CACHE HIT RATIO (should be > 99%)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
    ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) AS cache_hit_ratio
FROM pg_statio_user_tables;