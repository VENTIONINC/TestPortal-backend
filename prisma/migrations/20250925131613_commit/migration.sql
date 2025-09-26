/*
  Warnings:

  - A unique constraint covering the columns `[projectId,key]` on the table `Spec` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Spec_projectId_key_key" ON "Spec"("projectId", "key");
