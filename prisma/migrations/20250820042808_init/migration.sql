-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "emailNotified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN     "targetBehavior" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "openaiApiKey" TEXT;
