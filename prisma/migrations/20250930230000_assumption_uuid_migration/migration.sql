-- AlterTable: Change Assumption.id from Int to UUID
-- Step 1: Add new UUID column
ALTER TABLE "Assumption" ADD COLUMN "id_new" UUID DEFAULT gen_random_uuid();

-- Step 2: Update the new column with UUID values for existing rows
UPDATE "Assumption" SET "id_new" = gen_random_uuid();

-- Step 3: Drop the old primary key constraint
ALTER TABLE "Assumption" DROP CONSTRAINT "Assumption_pkey";

-- Step 4: Drop the old id column
ALTER TABLE "Assumption" DROP COLUMN "id";

-- Step 5: Rename the new column to 'id'
ALTER TABLE "Assumption" RENAME COLUMN "id_new" TO "id";

-- Step 6: Set NOT NULL constraint on the new id column
ALTER TABLE "Assumption" ALTER COLUMN "id" SET NOT NULL;

-- Step 7: Add primary key constraint on the new UUID id column
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_pkey" PRIMARY KEY ("id");
