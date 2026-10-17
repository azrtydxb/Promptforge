-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN "agentPersonaId" TEXT;

-- CreateIndex
CREATE INDEX "Prompt_agentPersonaId_idx" ON "Prompt"("agentPersonaId");

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_agentPersonaId_fkey" FOREIGN KEY ("agentPersonaId") REFERENCES "AgentPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
