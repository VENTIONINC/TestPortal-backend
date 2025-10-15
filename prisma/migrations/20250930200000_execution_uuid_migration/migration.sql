-- Migration: Execution ID from Int to UUID
BEGIN;

-- Step 1: Add new UUID columns
ALTER TABLE "Execution" ADD COLUMN "uuid" UUID;
ALTER TABLE "Result" ADD COLUMN "executionUuid" UUID;

-- Step 2: Generate UUIDs for existing executions
UPDATE "Execution" SET "uuid" = gen_random_uuid() WHERE "uuid" IS NULL;

-- Step 3: Map foreign keys using current integer IDs
UPDATE "Result" r SET "executionUuid" = e."uuid"
FROM "Execution" e WHERE r."executionId" = e."id";

-- Step 4: Drop foreign key constraints
ALTER TABLE "Result" DROP CONSTRAINT IF EXISTS "Result_executionId_fkey";

-- Step 5: Replace Execution primary key
ALTER TABLE "Execution" DROP CONSTRAINT IF EXISTS "Execution_pkey";
ALTER TABLE "Execution" DROP COLUMN "id";
ALTER TABLE "Execution" RENAME COLUMN "uuid" TO "id";
ALTER TABLE "Execution" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "Execution" ADD PRIMARY KEY ("id");

-- Step 6: Swap foreign key column in Result
ALTER TABLE "Result" DROP COLUMN "executionId";
ALTER TABLE "Result" RENAME COLUMN "executionUuid" TO "executionId";
ALTER TABLE "Result" ALTER COLUMN "executionId" SET NOT NULL;

-- Step 7: Recreate foreign key constraint
ALTER TABLE "Result"
ADD CONSTRAINT "Result_executionId_fkey"
FOREIGN KEY ("executionId") REFERENCES "Execution"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
