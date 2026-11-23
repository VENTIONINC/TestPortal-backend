-- CreateTable
CREATE TABLE "ScenarioTag" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT GENERATED ALWAYS AS (lower(btrim("name"))) STORED NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "position" SERIAL NOT NULL,

    CONSTRAINT "ScenarioTag_name_check" CHECK (name = btrim(name) AND name <> ''),
    CONSTRAINT "ScenarioTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioTagAssignment" (
    "projectId" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ScenarioTagAssignment_pkey" PRIMARY KEY ("scenarioId","tagId")
);

-- CreateTable
CREATE TABLE "ScenarioTagDeletion" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "restoredAt" TIMESTAMP(3),

    CONSTRAINT "ScenarioTagDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioTag_projectId_normalizedName_key" ON "ScenarioTag"("projectId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioTag_projectId_id_key" ON "ScenarioTag"("projectId", "id");

-- CreateIndex
CREATE INDEX "ScenarioTagAssignment_tagId_scenarioId_idx" ON "ScenarioTagAssignment"("tagId", "scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioTagDeletion_projectId_actorId_idx" ON "ScenarioTagDeletion"("projectId", "actorId");

-- CreateIndex
CREATE UNIQUE INDEX "TestScenario_projectId_id_key" ON "TestScenario"("projectId", "id");

-- AddForeignKey
ALTER TABLE "ScenarioTag" ADD CONSTRAINT "ScenarioTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioTagAssignment" ADD CONSTRAINT "ScenarioTagAssignment_projectId_scenarioId_fkey" FOREIGN KEY ("projectId", "scenarioId") REFERENCES "TestScenario"("projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioTagAssignment" ADD CONSTRAINT "ScenarioTagAssignment_projectId_tagId_fkey" FOREIGN KEY ("projectId", "tagId") REFERENCES "ScenarioTag"("projectId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioTagDeletion" ADD CONSTRAINT "ScenarioTagDeletion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioTagDeletion" ADD CONSTRAINT "ScenarioTagDeletion_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

