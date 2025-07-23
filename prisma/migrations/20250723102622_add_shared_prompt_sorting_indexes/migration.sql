-- CreateIndex
CREATE INDEX "SharedPrompt_viewCount_idx" ON "SharedPrompt"("viewCount");

-- CreateIndex
CREATE INDEX "SharedPrompt_likeCount_idx" ON "SharedPrompt"("likeCount");

-- CreateIndex
CREATE INDEX "SharedPrompt_copyCount_idx" ON "SharedPrompt"("copyCount");

-- CreateIndex
CREATE INDEX "SharedPrompt_commentCount_idx" ON "SharedPrompt"("commentCount");

-- CreateIndex
CREATE INDEX "SharedPrompt_publishedAt_likeCount_idx" ON "SharedPrompt"("publishedAt", "likeCount");