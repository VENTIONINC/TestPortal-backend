/*
  Warnings:

  - You are about to drop the column `createdById` on the `Issue` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_createdById_fkey";

-- AlterTable
ALTER TABLE "Issue" DROP COLUMN "createdById";
