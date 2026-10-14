-- CreateEnum
CREATE TYPE "StylistMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "StylistConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StylistConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StylistMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "StylistMessageRole" NOT NULL,
    "content" VARCHAR(3000) NOT NULL,
    "result" JSONB,
    "provider" VARCHAR(80),
    "model" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StylistMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StylistConversation_userId_updatedAt_idx" ON "StylistConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "StylistMessage_conversationId_createdAt_idx" ON "StylistMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "StylistMessage_role_createdAt_idx" ON "StylistMessage"("role", "createdAt");

-- AddForeignKey
ALTER TABLE "StylistConversation" ADD CONSTRAINT "StylistConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StylistMessage" ADD CONSTRAINT "StylistMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "StylistConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
