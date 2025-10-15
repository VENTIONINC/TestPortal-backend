/*
  Warnings:

  - You are about to drop the column `allureLink` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the `SimilarityLog` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cognitoUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mcpToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "SimilarityLog" DROP CONSTRAINT "SimilarityLog_assumptionId_fkey";

-- DropForeignKey
ALTER TABLE "SimilarityLog" DROP CONSTRAINT "SimilarityLog_sourceErrorId_fkey";

-- DropForeignKey
ALTER TABLE "SimilarityLog" DROP CONSTRAINT "SimilarityLog_targetErrorId_fkey";

-- AlterTable
ALTER TABLE "Result" DROP COLUMN "allureLink",
ADD COLUMN     "reportPortalLink" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cognitoUserId" TEXT,
ADD COLUMN     "mcpToken" TEXT,
ADD COLUMN     "monitoringPortalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monitoringPortalUrl" TEXT,
ADD COLUMN     "reportPortalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportPortalUrl" TEXT;

-- DropTable
DROP TABLE "SimilarityLog";

-- CreateIndex
CREATE UNIQUE INDEX "User_cognitoUserId_key" ON "User"("cognitoUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_mcpToken_key" ON "User"("mcpToken");
