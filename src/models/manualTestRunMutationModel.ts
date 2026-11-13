// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import { manualTestRunCreationModel } from "@/models/manualTestRunCreationModel";
import {
  ManualTestRunConflictError,
  type BulkUpdateManualTestRunScenariosParams,
  type ManualTestRunResponse,
  type ReorderManualTestRunScenariosParams,
  type UpdateManualTestRunScenarioAssigneeParams,
  type UpdateManualTestRunScenarioResultParams,
} from "@/types/manualTestRuns";

async function lockRun(
  tx: Prisma.TransactionClient,
  projectId: string,
  runId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<
    Array<{ status: "in_progress" | "completed" }>
  >`
    SELECT "status"
    FROM "ManualTestRun"
    WHERE "id" = ${runId}::uuid AND "projectId" = ${projectId}::uuid
    FOR UPDATE
  `;
  if (rows.length === 0) return false;
  if (rows[0]?.status === "completed") {
    throw new ManualTestRunConflictError(
      "Completed manual test runs are locked; reopen the run before editing",
    );
  }
  return true;
}

async function lockActiveUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid AND "status" = 'active' FOR SHARE
  `;
  return rows.length > 0;
}

async function findUpdatedRun(
  tx: Prisma.TransactionClient,
  projectId: string,
  runId: string,
): Promise<ManualTestRunResponse | null> {
  await tx.manualTestRun.update({
    where: { id: runId },
    data: { updatedAt: new Date() },
  });
  return await manualTestRunCreationModel.findByIdInTransaction(
    tx,
    projectId,
    runId,
  );
}

export const manualTestRunMutationModel = {
  async updateResult(
    params: UpdateManualTestRunScenarioResultParams,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(async (tx) => {
      if (!(await lockRun(tx, params.projectId, params.runId))) return null;
      if (!(await lockActiveUser(tx, params.resultById))) return null;
      const updated = await tx.manualTestRunScenario.updateMany({
        where: {
          id: params.scenarioId,
          projectId: params.projectId,
          manualTestRunId: params.runId,
        },
        data: {
          result: params.result,
          resultById: params.resultById,
          resultAt: new Date(),
        },
      });
      if (updated.count !== 1) return null;
      return await findUpdatedRun(tx, params.projectId, params.runId);
    });
  },

  async updateAssignee(
    params: UpdateManualTestRunScenarioAssigneeParams,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(async (tx) => {
      if (!(await lockRun(tx, params.projectId, params.runId))) return null;
      if (
        params.assigneeId !== null &&
        !(await lockActiveUser(tx, params.assigneeId))
      )
        return null;
      const updated = await tx.manualTestRunScenario.updateMany({
        where: {
          id: params.scenarioId,
          projectId: params.projectId,
          manualTestRunId: params.runId,
        },
        data: { assigneeId: params.assigneeId },
      });
      if (updated.count !== 1) return null;
      return await findUpdatedRun(tx, params.projectId, params.runId);
    });
  },

  async reorder(
    params: ReorderManualTestRunScenariosParams,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(async (tx) => {
      if (!(await lockRun(tx, params.projectId, params.runId))) return null;
      const current = await tx.manualTestRunScenario.findMany({
        where: { projectId: params.projectId, manualTestRunId: params.runId },
        select: { id: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });
      if (
        current.length !== params.scenarioIds.length ||
        params.scenarioIds.some(
          (id) => !current.some((scenario) => scenario.id === id),
        )
      ) {
        return null;
      }
      const offset = current.length;
      await tx.manualTestRunScenario.updateMany({
        where: { projectId: params.projectId, manualTestRunId: params.runId },
        data: { position: { increment: offset } },
      });
      for (const [position, id] of params.scenarioIds.entries()) {
        await tx.manualTestRunScenario.update({
          where: { id },
          data: { position },
        });
      }
      return await findUpdatedRun(tx, params.projectId, params.runId);
    });
  },

  async bulkUpdate(
    params: BulkUpdateManualTestRunScenariosParams,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(async (tx) => {
      if (!(await lockRun(tx, params.projectId, params.runId))) return null;
      const resultById = params.resultById;
      if (params.result !== undefined) {
        if (!resultById || !(await lockActiveUser(tx, resultById))) return null;
      }
      if (
        params.assigneeId !== undefined &&
        params.assigneeId !== null &&
        !(await lockActiveUser(tx, params.assigneeId))
      )
        return null;
      const targets = await tx.manualTestRunScenario.findMany({
        where: {
          projectId: params.projectId,
          manualTestRunId: params.runId,
          id: { in: params.scenarioIds },
        },
        select: { id: true },
      });
      if (targets.length !== params.scenarioIds.length) return null;
      const resultData: Prisma.ManualTestRunScenarioUncheckedUpdateManyInput | null =
        params.result === undefined
          ? {}
          : resultById
            ? { result: params.result, resultById, resultAt: new Date() }
            : null;
      if (!resultData) return null;
      const data: Prisma.ManualTestRunScenarioUncheckedUpdateManyInput = {
        ...resultData,
        ...(params.assigneeId !== undefined
          ? { assigneeId: params.assigneeId }
          : {}),
      };
      await tx.manualTestRunScenario.updateMany({
        where: {
          projectId: params.projectId,
          manualTestRunId: params.runId,
          id: { in: params.scenarioIds },
        },
        data,
      });
      return await findUpdatedRun(tx, params.projectId, params.runId);
    });
  },
};
