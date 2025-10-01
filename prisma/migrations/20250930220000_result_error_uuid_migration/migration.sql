-- AlterTable ResultError: Migrate id from Int to UUID and resultId to UUID
-- Dependencies: Result already migrated to UUID

-- Step 1: Drop the foreign key constraint on resultId (references old Int)
ALTER TABLE "ResultError" DROP CONSTRAINT IF EXISTS "ResultError_resultId_fkey";

-- Step 2: Drop old resultId Int column
ALTER TABLE "ResultError" DROP COLUMN "resultId";

-- Step 3: Rename the new UUID column from Result migration
ALTER TABLE "ResultError" RENAME COLUMN "resultId_new" TO "resultId";

-- Step 4: Add new UUID column for id
ALTER TABLE "ResultError" ADD COLUMN "id_new" UUID DEFAULT gen_random_uuid();

-- Step 5: Populate new UUID column (generate UUIDs for existing records)
UPDATE "ResultError" SET "id_new" = gen_random_uuid();

-- Step 6: Update Assumption references to use new UUID column
-- First add the new foreign key column
ALTER TABLE "Assumption" ADD COLUMN "resultErrorId_new" UUID;

-- Copy the UUID values from ResultError to Assumption using the old Int relationship
UPDATE "Assumption" a
SET "resultErrorId_new" = re."id_new"
FROM "ResultError" re
WHERE a."resultErrorId" = re."id";

-- Step 7: Drop foreign key constraint from Assumption before dropping ResultError primary key
ALTER TABLE "Assumption" DROP CONSTRAINT IF EXISTS "Assumption_resultErrorId_fkey";

-- Step 8: Drop the old ResultError.id primary key constraint and column
ALTER TABLE "ResultError" DROP CONSTRAINT "ResultError_pkey";
ALTER TABLE "ResultError" DROP COLUMN "id";

-- Step 9: Rename new id column
ALTER TABLE "ResultError" RENAME COLUMN "id_new" TO "id";

-- Step 10: Set new primary key
ALTER TABLE "ResultError" ADD CONSTRAINT "ResultError_pkey" PRIMARY KEY ("id");

-- Step 11: Make the new id column NOT NULL (should already be due to default)
ALTER TABLE "ResultError" ALTER COLUMN "id" SET NOT NULL;

-- Step 12: Re-create foreign key constraint for resultId (now UUID)
ALTER TABLE "ResultError" ADD CONSTRAINT "ResultError_resultId_fkey"
  FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 13: Complete Assumption.resultErrorId migration
-- Drop old Int column
ALTER TABLE "Assumption" DROP COLUMN "resultErrorId";

-- Rename new UUID column
ALTER TABLE "Assumption" RENAME COLUMN "resultErrorId_new" TO "resultErrorId";

-- Re-create foreign key constraint for Assumption.resultErrorId (now UUID)
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_resultErrorId_fkey"
  FOREIGN KEY ("resultErrorId") REFERENCES "ResultError"("id") ON DELETE SET NULL ON UPDATE CASCADE;
