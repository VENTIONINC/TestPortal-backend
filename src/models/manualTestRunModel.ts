// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  ManualTestRunStatus,
  ManualTestRunStepStatus,
  Prisma,
} from "@prisma/client";
import { dbClient } from "@/prisma/client";
import {
  ManualTestRunConflictError,
  type CompleteManualTestRunParams,
  type ListManualTestRunsParams,
  type ManualTestRunPage,
  type ManualTestRunResponse,
  type ManualTestRunSummary,
  type StartManualTestRunParams,
  type UpdateManualTestRunParams,
  type UpdateManualTestRunStepParams,
} from "@/types/manualTestRuns";

const detailSelect = {
  id: true,
  projectId: true,
  sourceTestScenarioId: true,
  testScenarioId: true,
  executedById: true,
  status: true,
  startedAt: true,
  completedAt: true,
  updatedAt: true,
  title: true,
  details: true,
  objective: true,
  preconditions: true,
  testData: true,
  expectedResult: true,
  scenarioNotes: true,
  notes: true,
  executedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  steps: {
    select: {
      id: true,
      position: true,
      action: true,
      expectedResult: true,
      status: true,
      notes: true,
      updatedAt: true,
    },
    orderBy: { position: "asc" as const },
  },
} satisfies Prisma.ManualTestRunSelect;

const summarySelect = {
  id: true,
  projectId: true,
  sourceTestScenarioId: true,
  testScenarioId: true,
  executedById: true,
  status: true,
  startedAt: true,
  completedAt: true,
  updatedAt: true,
  title: true,
  executedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.ManualTestRunSelect;

type DetailRecord = Prisma.ManualTestRunGetPayload<{
  select: typeof detailSelect;
}>;
type SummaryRecord = Prisma.ManualTestRunGetPayload<{
  select: typeof summarySelect;
}>;

type TransactionCallback<T> = (
  client: Prisma.TransactionClient,
) => Promise<T>;

function inTransaction<T>(
  tx: Prisma.TransactionClient | undefined,
  callback: TransactionCallback<T>,
  isolationLevel?: Prisma.TransactionIsolationLevel,
): Promise<T> {
  if (tx) {
    return callback(tx);
  }

  return dbClient.$transaction(callback, {
    ...(isolationLevel ? { isolationLevel } : {}),
  });
}

async function lockProject(
  client: Prisma.TransactionClient,
  projectId: string,
): Promise<boolean> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Project" WHERE "id" = ${projectId}::uuid FOR KEY SHARE
  `;
  return rows.length > 0;
}

async function lockScenario(
  client: Prisma.TransactionClient,
  scenarioId: string,
  projectId: string,
): Promise<boolean> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "TestScenario"
    WHERE "id" = ${scenarioId}::uuid AND "projectId" = ${projectId}::uuid
    FOR UPDATE
  `;
  return rows.length > 0;
}

async function lockExecutor(
  client: Prisma.TransactionClient,
  executedById: string,
): Promise<boolean> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "User" WHERE "id" = ${executedById}::uuid FOR KEY SHARE
  `;
  return rows.length > 0;
}

async function lockRun(
  client: Prisma.TransactionClient,
  runId: string,
  projectId: string,
): Promise<{ id: string; status: ManualTestRunStatus } | null> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ManualTestRun"
    WHERE "id" = ${runId}::uuid AND "projectId" = ${projectId}::uuid
    FOR UPDATE
  `;
  if (rows.length === 0) {
    return null;
  }

  return await client.manualTestRun.findUnique({
    where: { id: runId },
    select: { id: true, status: true },
  });
}

async function findDetail(
  client: Prisma.TransactionClient,
  runId: string,
  projectId: string,
): Promise<DetailRecord | null> {
  return await client.manualTestRun.findFirst({
    where: { id: runId, projectId },
    select: detailSelect,
  });
}

async function completeLocked(
  client: Prisma.TransactionClient,
  runId: string,
  status: Exclude<ManualTestRunStatus, "in_progress">,
  notes: string | null | undefined,
): Promise<DetailRecord> {
  const steps = await client.manualTestRunStep.findMany({
    where: { manualTestRunId: runId },
    select: { status: true },
  });

  if (
    status === ManualTestRunStatus.passed &&
    steps.length > 0 &&
    (!steps.some((step) => step.status === ManualTestRunStepStatus.passed) ||
      steps.some(
        (step) =>
          step.status !== ManualTestRunStepStatus.passed &&
          step.status !== ManualTestRunStepStatus.skipped,
      ))
  ) {
    throw new ManualTestRunConflictError(
      "A run can be marked passed only when every step is passed or skipped and at least one step is passed",
    );
  }

  const now = new Date();
  await client.manualTestRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt: now,
      updatedAt: now,
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  const detail = await client.manualTestRun.findUnique({
    where: { id: runId },
    select: detailSelect,
  });
  if (!detail) {
    throw new Error(`Manual test run with id '${runId}' disappeared after update`);
  }
  return detail;
}

function mapDetail(record: DetailRecord): ManualTestRunResponse {
  return record;
}

function mapSummary(record: SummaryRecord): ManualTestRunSummary {
  return record;
}

export interface ManualTestRunHistoryResult {
  page: ManualTestRunPage | null;
  missingScope: "project" | "scenario" | null;
}

export const manualTestRunModel = {
  async createFromScenario(
    params: StartManualTestRunParams,
    tx?: Prisma.TransactionClient,
  ): Promise<ManualTestRunResponse | null> {
    const result = await inTransaction(tx, async (client) => {
      if (!(await lockProject(client, params.projectId))) {
        return null;
      }
      if (!(await lockScenario(client, params.scenarioId, params.projectId))) {
        return null;
      }
      if (!(await lockExecutor(client, params.executedById))) {
        throw new ManualTestRunConflictError(
          "The authenticated executor no longer exists",
        );
      }

      const scenario = await client.testScenario.findFirst({
        where: { id: params.scenarioId, projectId: params.projectId },
        select: {
          id: true,
          title: true,
          details: true,
          objective: true,
          preconditions: true,
          testData: true,
          expectedResult: true,
          notes: true,
          steps: {
            select: {
              action: true,
              expectedResult: true,
              position: true,
            },
            orderBy: { position: "asc" },
          },
        },
      });
      if (!scenario) {
        return null;
      }

      const now = new Date();
      const created = await client.manualTestRun.create({
        data: {
          project: { connect: { id: params.projectId } },
          testScenario: { connect: { id: scenario.id } },
          executedBy: { connect: { id: params.executedById } },
          sourceTestScenarioId: scenario.id,
          status: ManualTestRunStatus.in_progress,
          startedAt: now,
          updatedAt: now,
          title: scenario.title,
          details: scenario.details,
          objective: scenario.objective,
          preconditions: scenario.preconditions,
          testData: scenario.testData,
          expectedResult: scenario.expectedResult,
          scenarioNotes: scenario.notes,
          notes: params.notes ?? null,
          steps: {
            create: scenario.steps.map((step) => ({
              position: step.position,
              action: step.action,
              expectedResult: step.expectedResult,
              status: ManualTestRunStepStatus.not_started,
              notes: null,
              updatedAt: now,
            })),
          },
        },
        select: detailSelect,
      });

      return mapDetail(created);
    });

    return result;
  },

  async findById(
    runId: string,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ManualTestRunResponse | null> {
    return await inTransaction(
      tx,
      async (client) => {
        const detail = await findDetail(client, runId, projectId);
        return detail ? mapDetail(detail) : null;
      },
      Prisma.TransactionIsolationLevel.RepeatableRead,
    );
  },

  async findHistory(
    params: ListManualTestRunsParams,
    tx?: Prisma.TransactionClient,
  ): Promise<ManualTestRunHistoryResult> {
    return await inTransaction(
      tx,
      async (client) => {
        const project = await client.project.findUnique({
          where: { id: params.projectId },
          select: { id: true },
        });
        if (!project) {
          return { page: null, missingScope: "project" };
        }

        if (params.scenarioId) {
          const scenario = await client.testScenario.findFirst({
            where: { id: params.scenarioId, projectId: params.projectId },
            select: { id: true },
          });
          if (!scenario) {
            return { page: null, missingScope: "scenario" };
          }
        }

        const sourceTestScenarioId =
          params.scenarioId ?? params.testScenarioId;
        const where: Prisma.ManualTestRunWhereInput = {
          projectId: params.projectId,
          ...(sourceTestScenarioId !== undefined
            ? { sourceTestScenarioId }
            : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.startedFrom || params.startedBefore
            ? {
                startedAt: {
                  ...(params.startedFrom
                    ? { gte: new Date(params.startedFrom) }
                    : {}),
                  ...(params.startedBefore
                    ? { lt: new Date(params.startedBefore) }
                    : {}),
                },
              }
            : {}),
        };
        const page = params.page ?? 1;
        const limit = params.limit ?? 30;

        const [records, total] = await Promise.all([
          client.manualTestRun.findMany({
            where,
            select: summarySelect,
            orderBy: [{ startedAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
          }),
          client.manualTestRun.count({ where }),
        ]);

        return {
          page: {
            runs: records.map(mapSummary),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
          missingScope: null,
        };
      },
      Prisma.TransactionIsolationLevel.RepeatableRead,
    );
  },

  async updateRun(
    params: UpdateManualTestRunParams,
    tx?: Prisma.TransactionClient,
  ): Promise<ManualTestRunResponse | null> {
    return await inTransaction(tx, async (client) => {
      const run = await lockRun(client, params.runId, params.projectId);
      if (!run) {
        return null;
      }
      if (run.status !== ManualTestRunStatus.in_progress) {
        throw new ManualTestRunConflictError("Completed manual test runs are immutable");
      }

      if (
        params.status &&
        params.status !== ManualTestRunStatus.in_progress
      ) {
        return await completeLocked(
          client,
          run.id,
          params.status,
          params.notes,
        ).then(mapDetail);
      }

      const now = new Date();
      await client.manualTestRun.update({
        where: { id: run.id },
        data: {
          ...(params.notes !== undefined ? { notes: params.notes } : {}),
          updatedAt: now,
        },
      });
      const detail = await findDetail(client, run.id, params.projectId);
      return detail ? mapDetail(detail) : null;
    });
  },

  async updateStep(
    params: UpdateManualTestRunStepParams,
    tx?: Prisma.TransactionClient,
  ): Promise<ManualTestRunResponse | null> {
    return await inTransaction(tx, async (client) => {
      const run = await lockRun(client, params.runId, params.projectId);
      if (!run) {
        return null;
      }
      if (run.status !== ManualTestRunStatus.in_progress) {
        throw new ManualTestRunConflictError("Completed manual test runs are immutable");
      }

      const step = await client.manualTestRunStep.findFirst({
        where: { id: params.stepId, manualTestRunId: run.id },
        select: { id: true },
      });
      if (!step) {
        return null;
      }

      const now = new Date();
      await client.manualTestRunStep.update({
        where: { id: step.id },
        data: {
          ...(params.status !== undefined ? { status: params.status } : {}),
          ...(params.notes !== undefined ? { notes: params.notes } : {}),
          updatedAt: now,
        },
      });
      await client.manualTestRun.update({
        where: { id: run.id },
        data: { updatedAt: now },
      });
      const detail = await findDetail(client, run.id, params.projectId);
      return detail ? mapDetail(detail) : null;
    });
  },

  async complete(
    params: CompleteManualTestRunParams,
    tx?: Prisma.TransactionClient,
  ): Promise<ManualTestRunResponse | null> {
    return await inTransaction(tx, async (client) => {
      const run = await lockRun(client, params.runId, params.projectId);
      if (!run) {
        return null;
      }
      if (run.status !== ManualTestRunStatus.in_progress) {
        throw new ManualTestRunConflictError("Completed manual test runs are immutable");
      }

      return await completeLocked(
        client,
        run.id,
        params.status,
        params.notes,
      ).then(mapDetail);
    });
  },
};
