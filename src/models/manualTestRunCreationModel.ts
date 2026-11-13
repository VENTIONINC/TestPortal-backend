// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import {
  ScenarioTransactionRetryError,
  lockScenarios,
  lockSuites,
  withScenarioTransaction,
} from "@/models/testScenarioTransactions";
import { TestScenarioNotFoundError } from "@/types/testScenarios";
import type {
  CreateManualTestRunParams,
  ManualTestRunResponse,
} from "@/types/manualTestRuns";

const detailSelect = {
  id: true,
  projectId: true,
  executedById: true,
  status: true,
  startedAt: true,
  updatedAt: true,
  completedAt: true,
  completedById: true,
  skippedAtCompletion: true,
  title: true,
  browser: true,
  operatingSystem: true,
  device: true,
  apiEnvironment: true,
  build: true,
  deployment: true,
  executedBy: { select: { id: true, name: true, email: true } },
  completedBy: { select: { id: true, name: true, email: true } },
  scenarios: {
    orderBy: { position: "asc" as const },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      resultBy: { select: { id: true, name: true, email: true } },
      steps: { orderBy: { position: "asc" as const } },
    },
  },
} satisfies Prisma.ManualTestRunSelect;

type RunRecord = Prisma.ManualTestRunGetPayload<{
  select: typeof detailSelect;
}>;

async function findDetail(
  client: Prisma.TransactionClient,
  projectId: string,
  runId: string,
): Promise<RunRecord | null> {
  return await client.manualTestRun.findFirst({
    where: { id: runId, projectId },
    select: detailSelect,
  });
}

async function getFolderPaths(
  tx: Prisma.TransactionClient,
  projectId: string,
  folderIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(folderIds)];
  if (uniqueIds.length === 0) return new Map();
  const rows = await tx.$queryRaw<
    Array<{ id: string; path: string }>
  >(Prisma.sql`
    WITH RECURSIVE folder_paths AS (
      SELECT f."id", f."projectId", f."parentId", f."name"::text AS path
      FROM "TestScenarioFolder" f
      WHERE f."projectId" = ${projectId}::uuid AND f."parentId" IS NULL
      UNION ALL
      SELECT child."id", child."projectId", child."parentId",
        (parent.path || ' / ' || child."name")::text
      FROM "TestScenarioFolder" child
      JOIN folder_paths parent ON child."parentId" = parent."id"
      WHERE child."projectId" = ${projectId}::uuid
    )
    SELECT "id", path FROM folder_paths
    WHERE "id" IN (${Prisma.join(uniqueIds.map((id) => Prisma.sql`${id}::uuid`))})
  `);
  return new Map(rows.map(({ id, path }) => [id, path]));
}

async function resolveSuiteSources(
  tx: Prisma.TransactionClient,
  projectId: string,
  suiteId: string,
): Promise<{ title: string; scenarioIds: string[] } | null> {
  const discovered = await tx.testSuite.findFirst({
    where: { id: suiteId, projectId },
    select: {
      name: true,
      members: {
        orderBy: [{ position: "asc" }, { testScenarioId: "asc" }],
        select: { testScenarioId: true },
      },
    },
  });
  if (!discovered) return null;
  const scenarioIds = discovered.members.map(
    ({ testScenarioId }) => testScenarioId,
  );
  if (scenarioIds.length === 0) return null;

  try {
    await lockScenarios(tx, projectId, scenarioIds);
  } catch (error) {
    if (error instanceof TestScenarioNotFoundError) return null;
    throw error;
  }
  await lockSuites(tx, projectId, [suiteId]);
  const current = await tx.testSuite.findFirst({
    where: { id: suiteId, projectId },
    select: {
      name: true,
      members: {
        orderBy: [{ position: "asc" }, { testScenarioId: "asc" }],
        select: { testScenarioId: true },
      },
    },
  });
  if (!current) return null;
  const currentIds = current.members.map(
    ({ testScenarioId }) => testScenarioId,
  );
  if (
    scenarioIds.length !== currentIds.length ||
    scenarioIds.some((id, index) => currentIds[index] !== id)
  ) {
    throw new ScenarioTransactionRetryError();
  }
  return { title: current.name, scenarioIds };
}

export const manualTestRunCreationModel = {
  async findByIdInTransaction(
    tx: Prisma.TransactionClient,
    projectId: string,
    runId: string,
  ): Promise<ManualTestRunResponse | null> {
    return await findDetail(tx, projectId, runId);
  },

  async createFromCatalog(
    input: CreateManualTestRunParams,
  ): Promise<ManualTestRunResponse | null> {
    return await withScenarioTransaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: input.projectId },
        select: { id: true },
      });
      if (!project) return null;
      const starter = await tx.user.findFirst({
        where: { id: input.executedById, status: "active" },
        select: { id: true },
      });
      if (!starter) return null;

      let title: string;
      let scenarioIds: string[];
      if (input.suiteId !== undefined) {
        const suite = await resolveSuiteSources(
          tx,
          input.projectId,
          input.suiteId,
        );
        if (!suite) return null;
        title = suite.title;
        scenarioIds = suite.scenarioIds;
      } else {
        scenarioIds = input.scenarioIds;
        if (
          scenarioIds.length === 0 ||
          new Set(scenarioIds).size !== scenarioIds.length
        ) {
          return null;
        }
        try {
          await lockScenarios(tx, input.projectId, scenarioIds);
        } catch (error) {
          if (error instanceof TestScenarioNotFoundError) return null;
          throw error;
        }
        title = "Manual run";
      }

      const sources = await tx.testScenario.findMany({
        where: { id: { in: scenarioIds }, projectId: input.projectId },
        orderBy: { id: "asc" },
        include: { steps: { orderBy: { position: "asc" } } },
      });
      if (sources.length !== scenarioIds.length) return null;
      const sourcesById = new Map(sources.map((source) => [source.id, source]));
      const orderedSources = scenarioIds.map((id) => sourcesById.get(id));
      if (orderedSources.some((source) => source === undefined)) return null;
      const completeSources = orderedSources.filter(
        (source): source is (typeof sources)[number] => source !== undefined,
      );
      const folderPaths = await getFolderPaths(
        tx,
        input.projectId,
        completeSources.flatMap((source) =>
          source.folderId ? [source.folderId] : [],
        ),
      );
      const now = new Date();
      const runId = randomUUID();
      const snapshots = completeSources.map((source, position) => ({
        id: randomUUID(),
        manualTestRunId: runId,
        projectId: input.projectId,
        sourceScenarioId: source.id,
        sourceScenarioKey: source.scenarioKey,
        title: source.title,
        position,
        details: source.details,
        preconditions: source.preconditions,
        testData: source.testData,
        folderPath: source.folderId
          ? (folderPaths.get(source.folderId) ?? null)
          : null,
        steps: source.steps.map((step) => ({
          id: randomUUID(),
          manualTestRunScenarioId: "",
          position: step.position,
          action: step.action,
          expectedResult: step.expectedResult,
        })),
      }));

      await tx.manualTestRun.create({
        data: {
          id: runId,
          projectId: input.projectId,
          executedById: input.executedById,
          status: "in_progress",
          startedAt: now,
          title,
          browser: input.browser ?? null,
          operatingSystem: input.operatingSystem ?? null,
          device: input.device ?? null,
          apiEnvironment: input.apiEnvironment ?? null,
          build: input.build ?? null,
          deployment: input.deployment ?? null,
        },
      });
      await tx.manualTestRunScenario.createMany({
        data: snapshots.map(({ steps: _steps, ...snapshot }) => snapshot),
      });
      const copiedSteps = snapshots.flatMap((snapshot) =>
        snapshot.steps.map((step) => ({
          ...step,
          manualTestRunScenarioId: snapshot.id,
        })),
      );
      if (copiedSteps.length) {
        await tx.manualTestRunScenarioStep.createMany({ data: copiedSteps });
      }
      await tx.manualTestRunLifecycleInterval.create({
        data: {
          id: randomUUID(),
          manualTestRunId: runId,
          projectId: input.projectId,
          startedAt: now,
        },
      });
      return await findDetail(tx, input.projectId, runId);
    });
  },

  async findById(
    projectId: string,
    runId: string,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(
      async (tx) => {
        const record = await findDetail(tx, projectId, runId);
        return record;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  },
};
