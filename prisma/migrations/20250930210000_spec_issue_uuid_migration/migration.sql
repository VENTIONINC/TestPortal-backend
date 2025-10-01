-- Phase 1: Spec table migration
-- Step 1: Add new UUID column for Spec.id
ALTER TABLE "Spec" ADD COLUMN "id_new" UUID DEFAULT gen_random_uuid();

-- Step 2: Generate UUIDs for all existing Spec records
UPDATE "Spec" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

-- Step 3: Add new UUID column for Result.specId
ALTER TABLE "Result" ADD COLUMN "specId_new" UUID;

-- Step 4: Create mapping table to preserve relationships
CREATE TEMP TABLE spec_id_mapping AS
SELECT id as old_id, id_new as new_id FROM "Spec";

-- Step 5: Update Result.specId_new with corresponding UUIDs
UPDATE "Result" r
SET "specId_new" = m.new_id
FROM spec_id_mapping m
WHERE r."specId" = m.old_id;

-- Step 6: Make new columns NOT NULL
ALTER TABLE "Spec" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "Result" ALTER COLUMN "specId_new" SET NOT NULL;

-- Step 7: Drop old foreign key constraint
ALTER TABLE "Result" DROP CONSTRAINT "Result_specId_fkey";

-- Step 8: Drop old columns
ALTER TABLE "Result" DROP COLUMN "specId";
ALTER TABLE "Spec" DROP CONSTRAINT "Spec_pkey";
ALTER TABLE "Spec" DROP COLUMN "id";

-- Step 9: Rename new columns to original names
ALTER TABLE "Spec" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "Result" RENAME COLUMN "specId_new" TO "specId";

-- Step 10: Add primary key constraint
ALTER TABLE "Spec" ADD CONSTRAINT "Spec_pkey" PRIMARY KEY ("id");

-- Step 11: Add foreign key constraint
ALTER TABLE "Result" ADD CONSTRAINT "Result_specId_fkey" FOREIGN KEY ("specId") REFERENCES "Spec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 2: Issue table migration
-- Step 1: Add new UUID column for Issue.id
ALTER TABLE "Issue" ADD COLUMN "id_new" UUID DEFAULT gen_random_uuid();

-- Step 2: Generate UUIDs for all existing Issue records
UPDATE "Issue" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

-- Step 3: Add new UUID column for Assumption.issueId
ALTER TABLE "Assumption" ADD COLUMN "issueId_new" UUID;

-- Step 4: Create mapping table to preserve relationships
CREATE TEMP TABLE issue_id_mapping AS
SELECT id as old_id, id_new as new_id FROM "Issue";

-- Step 5: Update Assumption.issueId_new with corresponding UUIDs
UPDATE "Assumption" a
SET "issueId_new" = m.new_id
FROM issue_id_mapping m
WHERE a."issueId" = m.old_id;

-- Step 6: Make new columns NOT NULL
ALTER TABLE "Issue" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "Assumption" ALTER COLUMN "issueId_new" SET NOT NULL;

-- Step 7: Drop old foreign key constraint
ALTER TABLE "Assumption" DROP CONSTRAINT "Assumption_issueId_fkey";

-- Step 8: Drop old columns
ALTER TABLE "Assumption" DROP COLUMN "issueId";
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_pkey";
ALTER TABLE "Issue" DROP COLUMN "id";

-- Step 9: Rename new columns to original names
ALTER TABLE "Issue" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "Assumption" RENAME COLUMN "issueId_new" TO "issueId";

-- Step 10: Add primary key constraint
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_pkey" PRIMARY KEY ("id");

-- Step 11: Add foreign key constraint
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate unique constraint for Spec
DROP INDEX IF EXISTS "Spec_projectId_key_key";
CREATE UNIQUE INDEX "Spec_projectId_key_key" ON "Spec"("projectId", "key");
