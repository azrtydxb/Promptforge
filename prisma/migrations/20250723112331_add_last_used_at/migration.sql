-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "lastUsedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Prompt_lastUsedAt_idx" ON "Prompt"("lastUsedAt");
