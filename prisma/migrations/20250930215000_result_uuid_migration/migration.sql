-- AlterTable Result: Migrate id from Int to UUID
-- Dependencies: Execution and Spec already migrated to UUID

-- Step 1: Add new UUID column
ALTER TABLE "Result" ADD COLUMN "id_new" UUID DEFAULT gen_random_uuid();

-- Step 2: Populate new UUID column (generate UUIDs for existing records)
UPDATE "Result" SET "id_new" = gen_random_uuid();

-- Step 3: Update ResultError references to use new UUID column
-- First add the new foreign key column
ALTER TABLE "ResultError" ADD COLUMN "resultId_new" UUID;

-- Copy the UUID values from Result to ResultError using the old Int relationship
UPDATE "ResultError" re
SET "resultId_new" = r."id_new"
FROM "Result" r
WHERE re."resultId" = r."id";

-- Step 4: Drop the old Result.id primary key constraint and column
ALTER TABLE "Result" DROP CONSTRAINT "Result_pkey";

-- Step 5: Rename new column to id
ALTER TABLE "Result" RENAME COLUMN "id_new" TO "id";

-- Step 6: Set new primary key
ALTER TABLE "Result" ADD CONSTRAINT "Result_pkey" PRIMARY KEY ("id");

-- Step 7: Make the new id column NOT NULL (should already be due to default)
ALTER TABLE "Result" ALTER COLUMN "id" SET NOT NULL;

-- Step 8: Drop old ResultError foreign key column (will be recreated in next migration)
-- This is handled in the ResultError migration
