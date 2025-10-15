/*
 This migration has been adjusted to be safe on non-empty tables by:
 - Adding new foreign key columns as NULLable first
 - Creating a Default Project (and a fallback System Owner user if needed)
 - Backfilling existing rows to the Default Project
 - Enforcing NOT NULL and adding indexes/constraints afterward
 */
-- Drop the old unique index on Spec.key (moving to project-scoped uniqueness)
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM pg_indexes
  WHERE schemaname = current_schema()
    AND indexname = 'Spec_key_key'
) THEN EXECUTE 'DROP INDEX "Spec_key_key"';
END IF;
END $$;
-- Create Project table first so we can reference it
CREATE TABLE IF NOT EXISTS "Project" (
  "id" SERIAL NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "ownerId" INTEGER NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
-- Add new columns as NULLable to allow backfill
ALTER TABLE "Execution"
ADD COLUMN IF NOT EXISTS "projectId" INTEGER;
ALTER TABLE "Issue"
ADD COLUMN IF NOT EXISTS "projectId" INTEGER;
ALTER TABLE "Spec"
ADD COLUMN IF NOT EXISTS "projectId" INTEGER;
-- Create a default owner if no users exist, then create/find Default Project and backfill
DO $$
DECLARE v_owner_id INTEGER;
v_project_id INTEGER;
BEGIN -- Ensure there is at least one user to own the default project
SELECT "id" INTO v_owner_id
FROM "User"
ORDER BY "createdAt" ASC
LIMIT 1;
IF v_owner_id IS NULL THEN
INSERT INTO "User" ("name", "email", "createdAt", "updatedAt")
VALUES (
    'System Owner',
    'system-owner@local',
    NOW(),
    NOW()
  )
RETURNING id INTO v_owner_id;
END IF;
-- Ensure Default Project exists
SELECT "id" INTO v_project_id
FROM "Project"
WHERE "name" = 'Default Project'
LIMIT 1;
IF v_project_id IS NULL THEN
INSERT INTO "Project" (
    "createdAt",
    "updatedAt",
    "name",
    "description",
    "isActive",
    "ownerId"
  )
VALUES (
    NOW(),
    NOW(),
    'Default Project',
    'Auto-generated default project for migrating existing test data',
    true,
    v_owner_id
  )
RETURNING id INTO v_project_id;
END IF;
-- Backfill existing rows
UPDATE "Execution"
SET "projectId" = v_project_id
WHERE "projectId" IS NULL;
UPDATE "Spec"
SET "projectId" = v_project_id
WHERE "projectId" IS NULL;
UPDATE "Issue"
SET "projectId" = v_project_id
WHERE "projectId" IS NULL;
END $$;
-- Now enforce NOT NULL
ALTER TABLE "Execution"
ALTER COLUMN "projectId"
SET NOT NULL;
ALTER TABLE "Issue"
ALTER COLUMN "projectId"
SET NOT NULL;
ALTER TABLE "Spec"
ALTER COLUMN "projectId"
SET NOT NULL;
-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Project_name_key" ON "Project"("name");
CREATE INDEX IF NOT EXISTS "Project_name_idx" ON "Project"("name");
CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");
CREATE INDEX IF NOT EXISTS "Execution_projectId_idx" ON "Execution"("projectId");
CREATE INDEX IF NOT EXISTS "Execution_projectId_environment_idx" ON "Execution"("projectId", "environment");
CREATE INDEX IF NOT EXISTS "Execution_projectId_type_idx" ON "Execution"("projectId", "type");
CREATE INDEX IF NOT EXISTS "Execution_projectId_startedAt_idx" ON "Execution"("projectId", "startedAt");
CREATE INDEX IF NOT EXISTS "Issue_projectId_idx" ON "Issue"("projectId");
CREATE INDEX IF NOT EXISTS "Issue_projectId_category_idx" ON "Issue"("projectId", "category");
CREATE INDEX IF NOT EXISTS "Issue_projectId_createdAt_idx" ON "Issue"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Spec_projectId_idx" ON "Spec"("projectId");
CREATE INDEX IF NOT EXISTS "Spec_projectId_file_idx" ON "Spec"("projectId", "file");
CREATE INDEX IF NOT EXISTS "Spec_projectId_title_idx" ON "Spec"("projectId", "title");
CREATE UNIQUE INDEX IF NOT EXISTS "Spec_projectId_key_key" ON "Spec"("projectId", "key");
-- Foreign keys (conditionally add if not present)
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'Project_ownerId_fkey'
) THEN
ALTER TABLE "Project"
ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'Execution_projectId_fkey'
) THEN
ALTER TABLE "Execution"
ADD CONSTRAINT "Execution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'Spec_projectId_fkey'
) THEN
ALTER TABLE "Spec"
ADD CONSTRAINT "Spec_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'Issue_projectId_fkey'
) THEN
ALTER TABLE "Issue"
ADD CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF;
END $$;