-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector similarity search indexes for prompts
CREATE INDEX IF NOT EXISTS prompt_embedding_idx ON "Prompt" 
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Add vector similarity search indexes for templates
CREATE INDEX IF NOT EXISTS template_embedding_idx ON "PromptTemplate" 
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Add a column to track embedding version (for future model updates)
ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "embeddingVersion" INTEGER DEFAULT 1;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "embeddingVersion" INTEGER DEFAULT 1;

-- Add a column to track if embedding needs update
ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "embeddingOutdated" BOOLEAN DEFAULT true;
ALTER TABLE "PromptTemplate" ADD COLUMN IF NOT EXISTS "embeddingOutdated" BOOLEAN DEFAULT true;