-- Create SearchHistory table
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "searchType" TEXT NOT NULL DEFAULT 'hybrid',
    "filters" JSONB,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "clickedPromptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "SearchHistory_userId_idx" ON "SearchHistory"("userId");
CREATE INDEX "SearchHistory_createdAt_idx" ON "SearchHistory"("createdAt");
CREATE INDEX "SearchHistory_query_idx" ON "SearchHistory"("query");

-- Add foreign keys
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_clickedPromptId_fkey" FOREIGN KEY ("clickedPromptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;