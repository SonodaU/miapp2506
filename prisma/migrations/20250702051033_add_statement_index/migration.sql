-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "statementIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "chats_conversationId_aspect_statementIndex_idx" ON "chats"("conversationId", "aspect", "statementIndex");
