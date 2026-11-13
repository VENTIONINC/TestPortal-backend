// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { Prisma, type ManualTestRunStatus } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import { manualTestRunCreationModel } from "@/models/manualTestRunCreationModel";
import {
  ManualTestRunConflictError,
  type CompleteManualTestRunParams,
  type ManualTestRunResponse,
  type ReopenManualTestRunParams,
} from "@/types/manualTestRuns";

async function lockRun(
  tx: Prisma.TransactionClient,
  projectId: string,
  runId: string,
): Promise<ManualTestRunStatus | null> {
  const rows = await tx.$queryRaw<Array<{ status: ManualTestRunStatus }>>`
    SELECT "status"
    FROM "ManualTestRun"
    WHERE "id" = ${runId}::uuid AND "projectId" = ${projectId}::uuid
    FOR UPDATE
  `;
  return rows[0]?.status ?? null;
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
  return await manualTestRunCreationModel.findByIdInTransaction(
    tx,
    projectId,
    runId,
  );
}

export const manualTestRunLifecycleModel = {
  async delete(params: { projectId: string; runId: string }): Promise<boolean> {
    const result = await dbClient.manualTestRun.deleteMany({
      where: { id: params.runId, projectId: params.projectId },
    });
    return result.count === 1;
  },

  async complete(
    params: CompleteManualTestRunParams,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(async (tx) => {
      const status = await lockRun(tx, params.projectId, params.runId);
      if (!status) return null;
      if (status === "completed") {
        throw new ManualTestRunConflictError(
          "Manual test run is already completed",
        );
      }
      if (!(await lockActiveUser(tx, params.completedById))) return null;

      const now = new Date();
      const skipped = await tx.manualTestRunScenario.updateMany({
        where: {
          projectId: params.projectId,
          manualTestRunId: params.runId,
          result: "untested",
        },
        data: {
          result: "skipped",
          resultById: params.completedById,
          resultAt: now,
        },
      });
      const closed = await tx.manualTestRunLifecycleInterval.updateMany({
        where: {
          projectId: params.projectId,
          manualTestRunId: params.runId,
          endedAt: null,
        },
        data: { endedAt: now },
      });
      if (closed.count !== 1) {
        throw new ManualTestRunConflictError(
          "Manual test run has no active lifecycle interval",
        );
      }
      const updated = await tx.manualTestRun.updateMany({
        where: {
          id: params.runId,
          projectId: params.projectId,
          status: "in_progress",
        },
        data: {
          status: "completed",
          completedAt: now,
          completedById: params.completedById,
          skippedAtCompletion: skipped.count,
          updatedAt: now,
        },
      });
      if (updated.count !== 1) {
        throw new ManualTestRunConflictError(
          "Manual test run changed while it was being completed",
        );
      }
      return await findUpdatedRun(tx, params.projectId, params.runId);
    });
  },

  async reopen(
    params: ReopenManualTestRunParams,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(async (tx) => {
      const status = await lockRun(tx, params.projectId, params.runId);
      if (!status) return null;
      if (status !== "completed") {
        throw new ManualTestRunConflictError(
          "Only completed manual test runs can be reopened",
        );
      }
      if (!(await lockActiveUser(tx, params.reopenedById))) return null;

      const now = new Date();
      await tx.manualTestRun.update({
        where: { id: params.runId },
        data: {
          status: "in_progress",
          completedAt: null,
          completedById: null,
          skippedAtCompletion: 0,
          updatedAt: now,
        },
      });
      await tx.manualTestRunLifecycleInterval.create({
        data: {
          id: randomUUID(),
          manualTestRunId: params.runId,
          projectId: params.projectId,
          startedAt: now,
        },
      });
      return await findUpdatedRun(tx, params.projectId, params.runId);
    });
  },
};
