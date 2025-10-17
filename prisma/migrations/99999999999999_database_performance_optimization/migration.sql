-- Database Performance Optimization Migration
-- Generated: 2025-10-17
-- Purpose: Fix critical performance issues identified in database analysis

-- ============================================
-- STEP 1: Drop Unused Indexes
-- ============================================
-- These indexes have never been used (0 scans) and waste storage/write performance

-- Prompt table unused indexes
DROP INDEX IF EXISTS "Prompt_title_idx";
DROP INDEX IF EXISTS "Prompt_description_idx";
DROP INDEX IF EXISTS "Prompt_pinnedAt_idx";
DROP INDEX IF EXISTS "Prompt_userId_createdAt_idx";
DROP INDEX IF EXISTS "Prompt_userId_pinnedAt_order_idx";
DROP INDEX IF EXISTS "Prompt_title_content_fts_idx"; -- 24KB unused full-text search index

-- AppConfig unused indexes
DROP INDEX IF EXISTS "AppConfig_pkey";
DROP INDEX IF EXISTS "AppConfig_version_idx";
DROP INDEX IF EXISTS "AppConfig_category_key_idx";
DROP INDEX IF EXISTS "AppConfig_category_idx";

-- User table unused indexes
DROP INDEX IF EXISTS "User_username_key";

-- PromptVersion unused indexes
DROP INDEX IF EXISTS "PromptVersion_pkey";

-- SharedPrompt unused indexes
DROP INDEX IF EXISTS "SharedPrompt_title_content_fts_idx";

-- Folder unused indexes
DROP INDEX IF EXISTS "Folder_userId_parentId_order_idx";

-- PromptFavorite/Like primary keys (unused)
DROP INDEX IF EXISTS "PromptFavorite_pkey";
DROP INDEX IF EXISTS "PromptLike_pkey";

-- CollectionPrompt unused
DROP INDEX IF EXISTS "CollectionPrompt_pkey";

-- ModerationRule unused
DROP INDEX IF EXISTS "ModerationRule_pkey";

-- ============================================
-- STEP 2: Add Missing Indexes for High Sequential Scan Tables
-- ============================================

-- User table: 2,893 seq scans with only 36% index usage
-- Add composite index for common user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_email_username_idx" 
ON "User" (email, username);

-- Tag table: 879 seq scans with 0% index usage
-- Add index on name for lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Tag_name_idx" 
ON "Tag" (name);

-- Team table: 665 seq scans with 0% index usage
-- Add composite index for team lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Team_slug_createdById_idx" 
ON "Team" (slug, "createdById");

-- Prompt table: Improve index usage from 38%
-- Add composite index for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Prompt_userId_updatedAt_idx" 
ON "Prompt" ("userId", "updatedAt" DESC);

-- Add index for lastUsedAt queries (currently unused but needed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Prompt_userId_lastUsedAt_idx" 
ON "Prompt" ("userId", "lastUsedAt" DESC NULLS LAST);

-- ============================================
-- STEP 3: Optimize Existing Indexes
-- ============================================

-- Replace single-column folderId index with composite for better query performance
DROP INDEX IF EXISTS "Prompt_folderId_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Prompt_folderId_userId_createdAt_idx" 
ON "Prompt" ("folderId", "userId", "createdAt" DESC);

-- Optimize folder queries
DROP INDEX IF EXISTS "Folder_parentId_idx";
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Folder_userId_parentId_idx" 
ON "Folder" ("userId", "parentId");

-- ============================================
-- STEP 4: Analyze Tables After Index Changes
-- ============================================

ANALYZE "User";
ANALYZE "Tag";
ANALYZE "Team";
ANALYZE "Prompt";
ANALYZE "Folder";
ANALYZE "SharedPrompt";
ANALYZE "PromptVersion";
ANALYZE "ModerationRule";