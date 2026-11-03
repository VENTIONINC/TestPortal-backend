// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import { TestScenarioNotFoundError } from "@/types/testScenarios";
import { Prisma, type TestSuiteMember } from "@prisma/client";
import {
  lockScenarios,
  lockSuites,
  ScenarioTransactionRetryError,
  withScenarioTransaction,
} from "@/models/testScenarioTransactions";

import { OrganizationError } from "@/models/testScenarioOrganizationErrors";

async function requireOrganizationActor(
  tx: Prisma.TransactionClient,
  updatedById?: string,
): Promise<void> {
  if (
    updatedById !== undefined &&
    !(await tx.user.findUnique({
      where: { id: updatedById },
      select: { id: true },
    }))
  )
    throw new TestScenarioNotFoundError("Updater not found");
}

export async function advanceScenarioRevisions(
  tx: Prisma.TransactionClient,
  projectId: string,
  ids: string[],
  updatedById?: string,
): Promise<void> {
  if (ids.length)
    await tx.testScenario.updateMany({
      where: { projectId, id: { in: ids } },
      data: {
        revision: { increment: 1 },
        updatedById: updatedById ?? null,
        updatedAt: new Date(),
      },
    });
}
export async function deleteScenarioSuite(
  projectId: string,
  suiteId: string,
  updatedById?: string,
): Promise<{ deleted: true }> {
  return withScenarioTransaction(async (tx) => {
    await requireOrganizationActor(tx, updatedById);
    const discovered = await tx.testSuiteMember.findMany({
      where: { suiteId, suite: { projectId } },
      select: { testScenarioId: true },
    });
    const ids = discovered.map((m) => m.testScenarioId);
    await lockScenarios(tx, projectId, ids);
    await lockSuites(tx, projectId, [suiteId]);
    const current = await tx.testSuiteMember.findMany({
      where: { suiteId },
      select: { testScenarioId: true },
    });
    if (current.some((m) => !ids.includes(m.testScenarioId)))
      throw new ScenarioTransactionRetryError();
    await advanceScenarioRevisions(
      tx,
      projectId,
      current.map((m) => m.testScenarioId),
      updatedById,
    );
    await tx.testSuite.delete({ where: { id: suiteId } });
    return { deleted: true };
  });
}

const notFound = () => new OrganizationError("Resource not found", 404);
const invalid = (message: string) => new OrganizationError(message, 400);

export const testScenarioOrganizationWrites = {
  async deleteFolder(input: {
    projectId: string;
    folderId: string;
    disposition: "parent" | "unfiled";
    updatedById?: string;
  }): Promise<{ deleted: true }> {
    return await withScenarioTransaction(async (tx) => {
      await requireOrganizationActor(tx, input.updatedById);
      // Folder-tree writes retain their project mutex for tree depth and reparenting.
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Project" WHERE "id" = ${input.projectId}::uuid FOR UPDATE`,
      );
      const folder = await tx.testScenarioFolder.findFirst({
        where: { id: input.folderId, projectId: input.projectId },
      });
      if (!folder) throw notFound();
      const discovered = await tx.testScenario.findMany({
        where: { projectId: input.projectId, folderId: folder.id },
        select: { id: true },
      });
      await lockScenarios(
        tx,
        input.projectId,
        discovered.map((s) => s.id),
      );
      const current = await tx.testScenario.findMany({
        where: { projectId: input.projectId, folderId: folder.id },
        select: { id: true },
      });
      if (current.some((s) => !discovered.some((d) => d.id === s.id)))
        throw new ScenarioTransactionRetryError();
      await tx.testScenario.updateMany({
        where: { projectId: input.projectId, folderId: folder.id },
        data: {
          folderId: input.disposition === "parent" ? folder.parentId : null,
        },
      });
      await advanceScenarioRevisions(
        tx,
        input.projectId,
        current.map((s) => s.id),
        input.updatedById,
      );
      const children = await tx.testScenarioFolder.findMany({
        where: { projectId: input.projectId, parentId: folder.id },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });
      for (const [index, child] of children.entries())
        await tx.testScenarioFolder.update({
          where: { id: child.id },
          data: {
            parentId: folder.parentId,
            position: folder.position + index,
          },
        });
      await tx.testScenarioFolder.delete({ where: { id: folder.id } });
      return { deleted: true as const };
    });
  },
  async mutateMembers(input: {
    projectId: string;
    suiteId: string;
    scenarioIds: string[];
    operation: "add" | "remove";
    updatedById?: string;
  }): Promise<TestSuiteMember[]> {
    return await withScenarioTransaction(async (tx) => {
      await requireOrganizationActor(tx, input.updatedById);
      await lockScenarios(tx, input.projectId, input.scenarioIds);
      await lockSuites(tx, input.projectId, [input.suiteId]);
      const suite = { id: input.suiteId };
      const memberships = await tx.testSuiteMember.findMany({
        where: { suiteId: suite.id, testScenarioId: { in: input.scenarioIds } },
        select: { testScenarioId: true },
      });
      const existingIds = memberships.map((m) => m.testScenarioId);
      const changedIds = input.scenarioIds.filter((id) =>
        input.operation === "add"
          ? !existingIds.includes(id)
          : existingIds.includes(id),
      );
      await advanceScenarioRevisions(
        tx,
        input.projectId,
        changedIds,
        input.updatedById,
      );
      if (input.operation === "remove") {
        await tx.testSuiteMember.deleteMany({
          where: {
            suiteId: suite.id,
            testScenarioId: { in: input.scenarioIds },
          },
        });
      } else {
        const existing = await tx.testSuiteMember.findMany({
          where: { suiteId: suite.id },
          orderBy: { position: "asc" },
        });
        let next =
          existing.reduce((max, member) => Math.max(max, member.position), -1) +
          1;
        for (const id of input.scenarioIds)
          if (!existing.some((member) => member.testScenarioId === id))
            await tx.testSuiteMember.create({
              data: { suiteId: suite.id, testScenarioId: id, position: next++ },
            });
      }
      return await tx.testSuiteMember.findMany({
        where: { suiteId: suite.id },
        orderBy: { position: "asc" },
      });
    });
  },
  async reorderMembers(input: {
    projectId: string;
    suiteId: string;
    scenarioIds: string[];
  }): Promise<{ scenarioIds: string[] }> {
    return await withScenarioTransaction(async (tx) => {
      await lockScenarios(tx, input.projectId, input.scenarioIds);
      const suiteId = await tx.testSuite.findFirst({
        where: { id: input.suiteId, projectId: input.projectId },
        select: { id: true },
      });
      if (!suiteId) throw notFound();
      await lockSuites(tx, input.projectId, [suiteId.id]);
      const suite = await tx.testSuite.findUnique({
        where: { id: suiteId.id },
        include: { members: true },
      });
      if (!suite) throw notFound();
      const current = suite.members.map(({ testScenarioId }) => testScenarioId);
      if (
        new Set(input.scenarioIds).size !== input.scenarioIds.length ||
        current.length !== input.scenarioIds.length ||
        current.some((id) => !input.scenarioIds.includes(id))
      )
        throw invalid(
          "Ordering must contain every current member exactly once",
        );
      const offset =
        suite.members.reduce(
          (max, member) => Math.max(max, member.position),
          -1,
        ) + 1;
      for (const member of suite.members)
        await tx.testSuiteMember.update({
          where: {
            suiteId_testScenarioId: {
              suiteId: suite.id,
              testScenarioId: member.testScenarioId,
            },
          },
          data: { position: member.position + offset },
        });
      for (const [position, id] of input.scenarioIds.entries())
        await tx.testSuiteMember.update({
          where: {
            suiteId_testScenarioId: { suiteId: suite.id, testScenarioId: id },
          },
          data: { position },
        });
      return { scenarioIds: input.scenarioIds };
    });
  },
  async moveScenarios(input: {
    projectId: string;
    scenarioIds: string[];
    folderId: string | null;
    updatedById?: string;
  }): Promise<{ moved: number }> {
    return await withScenarioTransaction(async (tx) => {
      await requireOrganizationActor(tx, input.updatedById);
      await lockScenarios(tx, input.projectId, input.scenarioIds);
      if (
        input.folderId &&
        !(await tx.testScenarioFolder.findFirst({
          where: { id: input.folderId, projectId: input.projectId },
          select: { id: true },
        }))
      )
        throw notFound();
      const count = await tx.testScenario.count({
        where: { id: { in: input.scenarioIds }, projectId: input.projectId },
      });
      if (count !== input.scenarioIds.length) throw notFound();
      const changed = await tx.testScenario.findMany({
        where: {
          projectId: input.projectId,
          id: { in: input.scenarioIds },
          ...(input.folderId === null
            ? { folderId: { not: null } }
            : {
                OR: [{ folderId: null }, { folderId: { not: input.folderId } }],
              }),
        },
        select: { id: true },
      });
      await advanceScenarioRevisions(
        tx,
        input.projectId,
        changed.map((s) => s.id),
        input.updatedById,
      );
      await tx.testScenario.updateMany({
        where: { id: { in: input.scenarioIds }, projectId: input.projectId },
        data: { folderId: input.folderId },
      });
      return { moved: count };
    });
  },
};
