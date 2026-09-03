-- CreateEnum
CREATE TYPE "SkillSource" AS ENUM ('system', 'custom');

-- CreateTable
CREATE TABLE "Skill" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" "SkillSource" NOT NULL,
    "readOnly" BOOLEAN NOT NULL,
    "packageHash" TEXT NOT NULL,
    "version" TEXT,
    "license" TEXT,
    "compatibility" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillPackageFile" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "skillId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "SkillPackageFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "Skill_name_idx" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "SkillPackageFile_skillId_path_idx" ON "SkillPackageFile"("skillId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "SkillPackageFile_skillId_path_key" ON "SkillPackageFile"("skillId", "path");

-- AddForeignKey
ALTER TABLE "SkillPackageFile" ADD CONSTRAINT "SkillPackageFile_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
