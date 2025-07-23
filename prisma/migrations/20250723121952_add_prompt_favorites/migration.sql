-- CreateTable
CREATE TABLE "PromptFavorite" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptFavorite_promptId_idx" ON "PromptFavorite"("promptId");

-- CreateIndex
CREATE INDEX "PromptFavorite_userId_idx" ON "PromptFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptFavorite_promptId_userId_key" ON "PromptFavorite"("promptId", "userId");

-- AddForeignKey
ALTER TABLE "PromptFavorite" ADD CONSTRAINT "PromptFavorite_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptFavorite" ADD CONSTRAINT "PromptFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
