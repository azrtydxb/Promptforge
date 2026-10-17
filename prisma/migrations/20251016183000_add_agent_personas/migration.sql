-- CreateTable
CREATE TABLE "AgentPersona" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "tone" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPersona_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentPersona_userId_idx" ON "AgentPersona"("userId");

-- CreateIndex
CREATE INDEX "AgentPersona_name_idx" ON "AgentPersona"("name");

-- CreateIndex
CREATE INDEX "AgentPersona_userId_updatedAt_idx" ON "AgentPersona"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "AgentPersona" ADD CONSTRAINT "AgentPersona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
