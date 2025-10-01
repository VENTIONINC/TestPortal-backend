-- Migration: User ID from Int to UUID
BEGIN;

-- Step 1: Add new UUID columns
ALTER TABLE "User" ADD COLUMN "uuid" UUID;
ALTER TABLE "Project" ADD COLUMN "ownerUuid" UUID;
ALTER TABLE "Issue" ADD COLUMN "createdByUuid" UUID;
ALTER TABLE "Issue" ADD COLUMN "updatedByUuid" UUID;

-- Step 2: Generate UUIDs for existing users
UPDATE "User" SET "uuid" = gen_random_uuid() WHERE "uuid" IS NULL;

-- Step 3: Map foreign keys using current integer IDs
UPDATE "Project" p SET "ownerUuid" = u."uuid"
FROM "User" u WHERE p."ownerId" = u."id";

UPDATE "Issue" i SET "createdByUuid" = u."uuid"
FROM "User" u WHERE i."createdById" = u."id";

UPDATE "Issue" i SET "updatedByUuid" = u."uuid"
FROM "User" u WHERE i."updatedById" = u."id";

-- Step 4: Drop foreign key constraints
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_ownerId_fkey";
ALTER TABLE "Issue" DROP CONSTRAINT IF EXISTS "Issue_createdById_fkey";
ALTER TABLE "Issue" DROP CONSTRAINT IF EXISTS "Issue_updatedById_fkey";

-- Step 5: Replace User primary key
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "uuid" TO "id";
ALTER TABLE "User" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "User" ADD PRIMARY KEY ("id");

-- Step 6: Swap foreign key columns in Project
ALTER TABLE "Project" DROP COLUMN "ownerId";
ALTER TABLE "Project" RENAME COLUMN "ownerUuid" TO "ownerId";
ALTER TABLE "Project" ALTER COLUMN "ownerId" SET NOT NULL;

-- Step 7: Swap foreign key columns in Issue
ALTER TABLE "Issue" DROP COLUMN "createdById";
ALTER TABLE "Issue" RENAME COLUMN "createdByUuid" TO "createdById";

ALTER TABLE "Issue" DROP COLUMN "updatedById";
ALTER TABLE "Issue" RENAME COLUMN "updatedByUuid" TO "updatedById";

-- Step 8: Recreate foreign key constraints
ALTER TABLE "Project"
ADD CONSTRAINT "Project_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Issue"
ADD CONSTRAINT "Issue_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Issue"
ADD CONSTRAINT "Issue_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 9: Recreate indexes
CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");

COMMIT;
