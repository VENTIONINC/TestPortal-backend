/*
  Warnings:

  - You are about to drop the column `createdById` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `updatedById` on the `Issue` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_updatedById_fkey";

-- AlterTable
ALTER TABLE "Issue" DROP COLUMN "createdById",
DROP COLUMN "updatedById";
