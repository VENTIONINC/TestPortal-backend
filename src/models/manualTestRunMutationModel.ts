// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import { manualTestRunCreationModel } from "@/models/manualTestRunCreationModel";
import { randomUUID } from "node:crypto";
import { lockScenarios } from "@/models/testScenarioTransactions";
import { TestScenarioNotFoundError } from "@/types/testScenarios";
import {
  ManualTestRunConflictError,
  ManualTestRunValidationError,
  type BulkUpdateManualTestRunScenariosParams,
  type ManualTestRunResponse,
  type ReorderManualTestRunScenariosParams,
  type UpdateManualTestRunScenarioAssigneeParams,
  type UpdateManualTestRunScenarioResultParams,
  type UpdateManualTestRunDetailsParams,
  type UpdateManualTestRunScenarioEvidenceParams,
} from "@/types/manualTestRuns";

async function getFolderPaths(
  tx: Prisma.TransactionClient,
  projectId: string,
  folderIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(folderIds)];
  if (!ids.length) return new Map();
  const rows = await tx.$queryRaw<Array<{ id: string; path: string }>>(Prisma.sql`
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
    WHERE "id" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
  `);
  return new Map(rows.map(({ id, path }) => [id, path]));
}

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
  async updateScenarioEvidence(
    params: UpdateManualTestRunScenarioEvidenceParams,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(async (tx) => {
      if (!(await lockRun(tx, params.projectId, params.runId))) return null;
      const scenario = await tx.manualTestRunScenario.findFirst({
        where: { id: params.scenarioId, projectId: params.projectId, manualTestRunId: params.runId },
        select: { id: true },
      });
      if (!scenario) return null;
      const stepChanges = params.steps ?? [];
      const currentSteps = await tx.manualTestRunScenarioStep.findMany({
        where: { manualTestRunScenarioId: scenario.id },
        select: { id: true, failedFlag: true, blockedFlag: true },
      });
      const currentById = new Map(currentSteps.map((step) => [step.id, step]));
      if (stepChanges.some((step) => !currentById.has(step.id))) return null;
      const failedIds = new Set(currentSteps.filter(({ failedFlag }) => failedFlag).map(({ id }) => id));
      const blockedIds = new Set(currentSteps.filter(({ blockedFlag }) => blockedFlag).map(({ id }) => id));
      for (const step of stepChanges) {
        if (step.failedFlag !== undefined) {
          if (step.failedFlag) failedIds.add(step.id);
          else failedIds.delete(step.id);
        }
        if (step.blockedFlag !== undefined) {
          if (step.blockedFlag) blockedIds.add(step.id);
          else blockedIds.delete(step.id);
        }
      }
      if (failedIds.size > 1 || blockedIds.size > 1) {
        throw new ManualTestRunValidationError("Only one step per result type may be flagged");
      }
      await tx.manualTestRunScenario.update({
        where: { id: scenario.id },
        data: {
          ...(params.executionComment !== undefined ? { executionComment: params.executionComment } : {}),
          ...(params.defectReference !== undefined ? { defectReference: params.defectReference } : {}),
        },
      });
      for (const step of stepChanges) {
        await tx.manualTestRunScenarioStep.update({
          where: { id: step.id },
          data: {
            ...(step.comment !== undefined ? { comment: step.comment } : {}),
            ...(step.failedFlag !== undefined ? {
              failedFlag: step.failedFlag,
              ...(step.failedFlag ? {} : { failedComment: null }),
            } : {}),
            ...(step.failedComment !== undefined ? { failedComment: step.failedComment } : {}),
            ...(step.blockedFlag !== undefined ? {
              blockedFlag: step.blockedFlag,
              ...(step.blockedFlag ? {} : { blockedComment: null }),
            } : {}),
            ...(step.blockedComment !== undefined ? { blockedComment: step.blockedComment } : {}),
          },
        });
      }
      return await findUpdatedRun(tx, params.projectId, params.runId);
    });
  },

  async updateDetails(
    params: UpdateManualTestRunDetailsParams,
  ): Promise<ManualTestRunResponse | null> {
    return await dbClient.$transaction(async (tx) => {
      if (!(await lockRun(tx, params.projectId, params.runId))) return null;
      const current = await tx.manualTestRunScenario.findMany({
        where: { projectId: params.projectId, manualTestRunId: params.runId },
        select: { id: true, sourceScenarioId: true, position: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });
      const currentBySource = new Map(current.map((scenario) => [scenario.sourceScenarioId, scenario]));
      const retained = current.filter((scenario) => params.scenarioIds.includes(scenario.sourceScenarioId));
      const additions = params.scenarioIds.filter((id) => !currentBySource.has(id));
      let sources: Array<{
        id: string; scenarioKey: string; title: string; details: string | null;
        preconditions: string | null; testData: string | null; folderId: string | null;
        priority: "low" | "medium" | "high"; relatedIssueUrl: string | null;
        specLinks: Array<{ spec: { key: string; title: string } }>;
        steps: Array<{ position: number; action: string; expectedResult: string | null }>;
      }> = [];
      if (additions.length) {
        try {
          await lockScenarios(tx, params.projectId, additions);
        } catch (error) {
          if (error instanceof TestScenarioNotFoundError) return null;
          throw error;
        }
        sources = await tx.testScenario.findMany({
          where: { id: { in: additions }, projectId: params.projectId },
          include: {
            steps: { orderBy: { position: "asc" } },
            specLinks: { include: { spec: { select: { key: true, title: true } } } },
          },
        });
        if (sources.length !== additions.length) return null;
      }
      const folderPaths = await getFolderPaths(
        tx,
        params.projectId,
        sources.flatMap((source) => source.folderId ? [source.folderId] : []),
      );

      const removed = current.filter((scenario) => !params.scenarioIds.includes(scenario.sourceScenarioId));
      if (removed.length) {
        await tx.manualTestRunScenario.deleteMany({
          where: { projectId: params.projectId, manualTestRunId: params.runId, id: { in: removed.map(({ id }) => id) } },
        });
      }
      const retainedOffset = current.length + additions.length + 1;
      if (retained.length) {
        await tx.manualTestRunScenario.updateMany({
          where: { id: { in: retained.map(({ id }) => id) } },
          data: { position: { increment: retainedOffset } },
        });
        for (const [position, scenario] of retained.entries()) {
          await tx.manualTestRunScenario.update({ where: { id: scenario.id }, data: { position } });
        }
      }
      const firstAdditionPosition = retained.length;
      const additionIds = new Map(additions.map((id) => [id, randomUUID()]));
      const sourcesById = new Map(sources.map((source) => [source.id, source]));
      const newSnapshots = additions.map((sourceScenarioId, index) => {
        const source = sourcesById.get(sourceScenarioId);
        if (!source) throw new Error("Selected scenario disappeared during run update");
        const snapshotId = additionIds.get(sourceScenarioId);
        if (!snapshotId) throw new Error("Missing snapshot ID during run update");
        return {
          id: snapshotId,
          manualTestRunId: params.runId,
          projectId: params.projectId,
          sourceScenarioId: source.id,
          sourceScenarioKey: source.scenarioKey,
          title: source.title,
          position: firstAdditionPosition + index,
          details: source.details,
          preconditions: source.preconditions,
          testData: source.testData,
          folderPath: source.folderId ? folderPaths.get(source.folderId) ?? null : null,
          priority: source.priority,
          requirementContext: [
            ...source.specLinks.map(({ spec }) => ({ type: "requirement", reference: spec.key, title: spec.title, url: null })),
            ...(source.relatedIssueUrl ? [{ type: "ticket", reference: source.relatedIssueUrl, title: source.relatedIssueUrl, url: source.relatedIssueUrl }] : []),
          ] as Prisma.InputJsonValue,
          steps: source.steps.map((step) => ({
            id: randomUUID(),
            manualTestRunScenarioId: snapshotId,
            position: step.position,
            action: step.action,
            expectedResult: step.expectedResult,
          })),
        };
      });
      if (newSnapshots.length) {
        await tx.manualTestRunScenario.createMany({
          data: newSnapshots.map(({ steps: _steps, ...snapshot }) => snapshot),
        });
        const steps = newSnapshots.flatMap(({ steps }) => steps);
        if (steps.length) await tx.manualTestRunScenarioStep.createMany({ data: steps });
      }

      const properties = params.environmentProperties as unknown as Prisma.InputJsonValue;
      const propertyValue = (name: string): string | null =>
        params.environmentProperties.find((property) => property.name === name)?.value ?? null;
      await tx.manualTestRun.update({
        where: { id: params.runId },
        data: {
          title: params.title,
          environmentProperties: properties,
          browser: propertyValue("browser"),
          operatingSystem: propertyValue("operatingSystem"),
          device: propertyValue("device"),
          apiEnvironment: propertyValue("apiEnvironment"),
          build: propertyValue("build"),
          deployment: propertyValue("deployment"),
          updatedAt: new Date(),
        },
      });
      return await manualTestRunCreationModel.findByIdInTransaction(tx, params.projectId, params.runId);
    });
  },

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
