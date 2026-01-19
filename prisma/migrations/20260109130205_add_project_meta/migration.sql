-- CreateTable
CREATE TABLE "ProjectMeta" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "ProjectMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMeta_projectId_idx" ON "ProjectMeta"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMeta_projectId_key_key" ON "ProjectMeta"("projectId", "key");

-- AddForeignKey
ALTER TABLE "ProjectMeta" ADD CONSTRAINT "ProjectMeta_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
