-- Enable pg_trgm extension for text search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create composite indexes for performance optimization

-- Prompt model indexes
CREATE INDEX IF NOT EXISTS "Prompt_userId_folderId_createdAt_idx" ON "Prompt"("userId", "folderId", "createdAt");
CREATE INDEX IF NOT EXISTS "Prompt_userId_pinnedAt_order_idx" ON "Prompt"("userId", "pinnedAt", "order");

-- SharedPrompt model indexes
CREATE INDEX IF NOT EXISTS "SharedPrompt_isPublished_publishedAt_likeCount_idx" ON "SharedPrompt"("isPublished", "publishedAt", "likeCount");
CREATE INDEX IF NOT EXISTS "SharedPrompt_status_publishedAt_idx" ON "SharedPrompt"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "SharedPrompt_visibility_isPublished_publishedAt_idx" ON "SharedPrompt"("visibility", "isPublished", "publishedAt");
CREATE INDEX IF NOT EXISTS "SharedPrompt_authorId_isPublished_publishedAt_idx" ON "SharedPrompt"("authorId", "isPublished", "publishedAt");

-- User model indexes for analytics
CREATE INDEX IF NOT EXISTS "User_reputationScore_createdAt_idx" ON "User"("reputationScore", "createdAt");

-- Comment model indexes for threading
CREATE INDEX IF NOT EXISTS "PromptComment_sharedPromptId_createdAt_idx" ON "PromptComment"("sharedPromptId", "createdAt");
CREATE INDEX IF NOT EXISTS "PromptComment_parentId_createdAt_idx" ON "PromptComment"("parentId", "createdAt");

-- Analytics indexes
CREATE INDEX IF NOT EXISTS "PromptView_sharedPromptId_createdAt_idx" ON "PromptView"("sharedPromptId", "createdAt");
CREATE INDEX IF NOT EXISTS "PromptLike_createdAt_idx" ON "PromptLike"("createdAt");
CREATE INDEX IF NOT EXISTS "PromptCopy_createdAt_idx" ON "PromptCopy"("createdAt");

-- Search optimization indexes
CREATE INDEX IF NOT EXISTS "Tag_name_trgm_idx" ON "Tag" USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Prompt_title_trgm_idx" ON "Prompt" USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Prompt_description_trgm_idx" ON "Prompt" USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SharedPrompt_title_trgm_idx" ON "SharedPrompt" USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SharedPrompt_description_trgm_idx" ON "SharedPrompt" USING gin(description gin_trgm_ops);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS "Prompt_title_content_fts_idx" ON "Prompt" USING gin(to_tsvector('english', title || ' ' || COALESCE(content, '')));
CREATE INDEX IF NOT EXISTS "SharedPrompt_title_content_fts_idx" ON "SharedPrompt" USING gin(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Performance monitoring view
CREATE OR REPLACE VIEW "performance_stats" AS
SELECT 
  'Prompt' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN "createdAt" > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_rows,
  MAX("createdAt") as last_created
FROM "Prompt"
UNION ALL
SELECT 
  'SharedPrompt' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN "createdAt" > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_rows,
  MAX("createdAt") as last_created
FROM "SharedPrompt"
UNION ALL
SELECT 
  'User' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN "createdAt" > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_rows,
  MAX("createdAt") as last_created
FROM "User";

-- Cache version tracking table (if not exists)
CREATE TABLE IF NOT EXISTS "_CacheVersion" (
  "group" TEXT PRIMARY KEY,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial cache versions
INSERT INTO "_CacheVersion" ("group", "version") VALUES
  ('shared-prompts', 1),
  ('user-prompts', 1),
  ('analytics', 1),
  ('tags', 1),
  ('trending', 1),
  ('search', 1),
  ('user-profile', 1),
  ('collections', 1),
  ('folders', 1)
ON CONFLICT ("group") DO NOTHING;

-- Create function to update cache version
CREATE OR REPLACE FUNCTION increment_cache_version(cache_group TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_version INTEGER;
BEGIN
  UPDATE "_CacheVersion" 
  SET "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "group" = cache_group
  RETURNING "version" INTO new_version;
  
  RETURN COALESCE(new_version, 1);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic performance logging
CREATE OR REPLACE FUNCTION log_slow_queries()
RETURNS TRIGGER AS $$
BEGIN
  IF EXTRACT(MILLISECOND FROM (statement_timestamp() - clock_timestamp())) > 100 THEN
    -- Log slow queries (implementation depends on your logging setup)
    RAISE WARNING 'Slow query detected: %', SQLSTATE;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Additional indexes for better performance
CREATE INDEX IF NOT EXISTS "Collection_userId_isPublic_idx" ON "Collection"("userId", "isPublic");
CREATE INDEX IF NOT EXISTS "Folder_userId_lastUsedAt_idx" ON "Folder"("userId", "lastUsedAt");
CREATE INDEX IF NOT EXISTS "Folder_userId_pinnedAt_idx" ON "Folder"("userId", "pinnedAt");
CREATE INDEX IF NOT EXISTS "Tag_name_idx" ON "Tag"("name");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Team-related indexes
CREATE INDEX IF NOT EXISTS "Team_createdById_idx" ON "Team"("createdById");
CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");
CREATE INDEX IF NOT EXISTS "TeamPrompt_teamId_idx" ON "TeamPrompt"("teamId");
CREATE INDEX IF NOT EXISTS "TeamPrompt_createdById_idx" ON "TeamPrompt"("createdById");

-- Analytics and reporting indexes
CREATE INDEX IF NOT EXISTS "SharedPrompt_publishedAt_likeCount_idx" ON "SharedPrompt"("publishedAt", "likeCount");
CREATE INDEX IF NOT EXISTS "SharedPrompt_publishedAt_viewCount_idx" ON "SharedPrompt"("publishedAt", "viewCount");
CREATE INDEX IF NOT EXISTS "SharedPrompt_publishedAt_commentCount_idx" ON "SharedPrompt"("publishedAt", "commentCount");

-- Session and auth indexes
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expires_idx" ON "Session"("expires");

-- Search history indexes
CREATE INDEX IF NOT EXISTS "SearchHistory_userId_idx" ON "SearchHistory"("userId");
CREATE INDEX IF NOT EXISTS "SearchHistory_createdAt_idx" ON "SearchHistory"("createdAt");

-- Rating indexes
CREATE INDEX IF NOT EXISTS "PromptRating_sharedPromptId_rating_idx" ON "PromptRating"("sharedPromptId", "rating");
CREATE INDEX IF NOT EXISTS "PromptRating_createdAt_idx" ON "PromptRating"("createdAt");

-- Moderation indexes
CREATE INDEX IF NOT EXISTS "ModerationRule_isActive_idx" ON "ModerationRule"("isActive");
CREATE INDEX IF NOT EXISTS "ModerationLog_createdAt_idx" ON "ModerationLog"("createdAt");

-- Template indexes
CREATE INDEX IF NOT EXISTS "PromptTemplate_isPublic_idx" ON "PromptTemplate"("isPublic");
CREATE INDEX IF NOT EXISTS "PromptTemplate_createdById_idx" ON "PromptTemplate"("createdById");

-- Share link indexes
CREATE INDEX IF NOT EXISTS "PromptShareLink_expiresAt_idx" ON "PromptShareLink"("expiresAt");
CREATE INDEX IF NOT EXISTS "PromptShareLink_shareId_idx" ON "PromptShareLink"("shareId");

-- Draft indexes
CREATE INDEX IF NOT EXISTS "PromptDraft_userId_idx" ON "PromptDraft"("userId");
CREATE INDEX IF NOT EXISTS "PromptDraft_updatedAt_idx" ON "PromptDraft"("updatedAt");

-- Version history indexes
CREATE INDEX IF NOT EXISTS "PromptVersion_promptId_idx" ON "PromptVersion"("promptId");
CREATE INDEX IF NOT EXISTS "PromptVersion_createdAt_idx" ON "PromptVersion"("createdAt");

-- Badge indexes
CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE INDEX IF NOT EXISTS "UserBadge_type_idx" ON "UserBadge"("type");

-- Follow indexes
CREATE INDEX IF NOT EXISTS "UserFollow_followerId_idx" ON "UserFollow"("followerId");
CREATE INDEX IF NOT EXISTS "UserFollow_followingId_idx" ON "UserFollow"("followingId");

-- Config indexes
CREATE INDEX IF NOT EXISTS "AppConfig_category_idx" ON "AppConfig"("category");
CREATE INDEX IF NOT EXISTS "AppConfig_category_key_idx" ON "AppConfig"("category", "key");

-- Cache version indexes
CREATE INDEX IF NOT EXISTS "_CacheVersion_group_idx" ON "_CacheVersion"("group");
CREATE INDEX IF NOT EXISTS "_CacheVersion_version_idx" ON "_CacheVersion"("version");

-- Junction table indexes
CREATE INDEX IF NOT EXISTS "_PromptToTag_promptId_idx" ON "_PromptToTag"("promptId");
CREATE INDEX IF NOT EXISTS "_PromptToTag_tagId_idx" ON "_PromptToTag"("tagId");
CREATE INDEX IF NOT EXISTS "_PromptDraftToTag_promptDraftId_idx" ON "_PromptDraftToTag"("promptDraftId");
CREATE INDEX IF NOT EXISTS "_PromptDraftToTag_tagId_idx" ON "_PromptDraftToTag"("tagId");

-- Report index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Report table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;