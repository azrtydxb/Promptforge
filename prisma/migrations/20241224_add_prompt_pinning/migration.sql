-- Add pinnedAt column to Prompt table
ALTER TABLE "Prompt" ADD COLUMN "pinnedAt" TIMESTAMP(3);

-- Create index on pinnedAt for better query performance
CREATE INDEX "Prompt_pinnedAt_idx" ON "Prompt"("pinnedAt");