-- Project UUID migration (safe, transactional)
BEGIN;
-- 0) Ensure UUID function available
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- 1) Add new UUID columns alongside existing integer IDs
ALTER TABLE "Project"
ADD COLUMN "uuid" UUID;
ALTER TABLE "Execution"
ADD COLUMN "projectUuid" UUID;
ALTER TABLE "Spec"
ADD COLUMN "projectUuid" UUID;
ALTER TABLE "Issue"
ADD COLUMN "projectUuid" UUID;
-- 2) Populate UUIDs for projects
UPDATE "Project"
SET "uuid" = gen_random_uuid()
WHERE "uuid" IS NULL;
-- 3) Map FKs using current int IDs
UPDATE "Execution" e
SET "projectUuid" = p."uuid"
FROM "Project" p
WHERE e."projectId" = p."id";
UPDATE "Spec" s
SET "projectUuid" = p."uuid"
FROM "Project" p
WHERE s."projectId" = p."id";
UPDATE "Issue" i
SET "projectUuid" = p."uuid"
FROM "Project" p
WHERE i."projectId" = p."id";
-- 4) Drop dependent FKs referencing old columns (but keep indexes for now)
DO $$
DECLARE r RECORD;
BEGIN -- Drop FKs only
FOR r IN (
  SELECT conname,
    conrelid::regclass AS tbl
  FROM pg_constraint
  WHERE conname IN (
      'Execution_projectId_fkey',
      'Spec_projectId_fkey',
      'Issue_projectId_fkey'
    )
) LOOP EXECUTE format(
  'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
  r.tbl,
  r.conname
);
END LOOP;
-- Drop specific indexes on projectId columns (not all indexes)
FOR r IN (
  SELECT schemaname, indexname
  FROM pg_indexes
  WHERE tablename IN ('Execution', 'Spec', 'Issue')
    AND indexname LIKE '%projectId%'
    AND indexname NOT LIKE '%pkey'  -- Don't drop primary key indexes
) LOOP EXECUTE format('DROP INDEX IF EXISTS %I.%I', r.schemaname, r.indexname);
END LOOP;
END $$;
-- 5) Replace primary key and columns
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_pkey";
ALTER TABLE "Project" DROP COLUMN "id";
ALTER TABLE "Project"
  RENAME COLUMN "uuid" TO "id";
ALTER TABLE "Project"
ALTER COLUMN "id"
SET NOT NULL;
ALTER TABLE "Project"
ADD PRIMARY KEY ("id");
-- 6) Swap foreign key columns and enforce NOT NULL
ALTER TABLE "Execution" DROP COLUMN "projectId";
ALTER TABLE "Execution"
  RENAME COLUMN "projectUuid" TO "projectId";
ALTER TABLE "Execution"
ALTER COLUMN "projectId"
SET NOT NULL;
ALTER TABLE "Spec" DROP COLUMN "projectId";
ALTER TABLE "Spec"
  RENAME COLUMN "projectUuid" TO "projectId";
ALTER TABLE "Spec"
ALTER COLUMN "projectId"
SET NOT NULL;
ALTER TABLE "Issue" DROP COLUMN "projectId";
ALTER TABLE "Issue"
  RENAME COLUMN "projectUuid" TO "projectId";
ALTER TABLE "Issue"
ALTER COLUMN "projectId"
SET NOT NULL;
-- 7) Recreate foreign keys
ALTER TABLE "Execution"
ADD CONSTRAINT "Execution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Spec"
ADD CONSTRAINT "Spec_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Issue"
ADD CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8) Recreate optimized indexes for UUID columns
CREATE INDEX IF NOT EXISTS "Execution_projectId_idx" ON "Execution"("projectId");
CREATE INDEX IF NOT EXISTS "Execution_projectId_environment_idx" ON "Execution"("projectId", "environment");
CREATE INDEX IF NOT EXISTS "Execution_projectId_type_idx" ON "Execution"("projectId", "type");
CREATE INDEX IF NOT EXISTS "Execution_projectId_startedAt_idx" ON "Execution"("projectId", "startedAt");

CREATE INDEX IF NOT EXISTS "Spec_projectId_idx" ON "Spec"("projectId");
CREATE INDEX IF NOT EXISTS "Spec_projectId_file_idx" ON "Spec"("projectId", "file");
CREATE INDEX IF NOT EXISTS "Spec_projectId_title_idx" ON "Spec"("projectId", "title");

CREATE INDEX IF NOT EXISTS "Issue_projectId_idx" ON "Issue"("projectId");
CREATE INDEX IF NOT EXISTS "Issue_projectId_category_idx" ON "Issue"("projectId", "category");
CREATE INDEX IF NOT EXISTS "Issue_projectId_createdAt_idx" ON "Issue"("projectId", "createdAt");

COMMIT;