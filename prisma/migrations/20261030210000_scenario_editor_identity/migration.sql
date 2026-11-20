-- Coordinate deployment with all scenario writers stopped. See DEVELOPMENT_GUIDE.
ALTER TABLE "Project" ADD COLUMN "lastScenarioNumber" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TestScenario"
  ADD COLUMN "scenarioNumber" INTEGER,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updatedById" UUID;

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "projectId" ORDER BY "createdAt" ASC, "id" ASC
  )::INTEGER AS number FROM "TestScenario"
)
UPDATE "TestScenario" s
SET "scenarioNumber" = n.number, "scenarioKey" = 'TMS-' || n.number
FROM numbered n WHERE s."id" = n."id";

UPDATE "Project" p SET "lastScenarioNumber" = counts.maximum
FROM (
  SELECT "projectId", MAX("scenarioNumber") AS maximum
  FROM "TestScenario" GROUP BY "projectId"
) counts WHERE p."id" = counts."projectId";

UPDATE "TestScenario" SET "priority" = 'medium' WHERE "priority" IS NULL;
ALTER TABLE "TestScenario"
  ALTER COLUMN "scenarioNumber" SET NOT NULL,
  ALTER COLUMN "scenarioKey" SET NOT NULL,
  ALTER COLUMN "priority" SET DEFAULT 'medium',
  ALTER COLUMN "priority" SET NOT NULL,
  ADD CONSTRAINT "TestScenario_scenarioNumber_positive" CHECK ("scenarioNumber" > 0),
  ADD CONSTRAINT "TestScenario_revision_positive" CHECK ("revision" > 0),
  ADD CONSTRAINT "TestScenario_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_lastScenarioNumber_nonnegative" CHECK ("lastScenarioNumber" >= 0);
CREATE UNIQUE INDEX "TestScenario_projectId_scenarioNumber_key" ON "TestScenario"("projectId", "scenarioNumber");
