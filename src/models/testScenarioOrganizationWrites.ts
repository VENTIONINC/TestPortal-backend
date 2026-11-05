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
const conflict = () => new OrganizationError("Suite membership changed; reload and retry", 409);

type OrderedMembership = { testScenarioId: string; position: number };
type MembershipUndo = {
  suiteId: string;
  addedScenarioIds: string[];
  removedMembers: Array<{ scenarioId: string; position: number }>;
};

async function readOrderedMembers(tx: Prisma.TransactionClient, suiteId: string): Promise<OrderedMembership[]> {
  return await tx.testSuiteMember.findMany({ where: { suiteId }, select: { testScenarioId: true, position: true }, orderBy: [{ position: "asc" }, { testScenarioId: "asc" }] });
}

async function createMembers(tx: Prisma.TransactionClient, suiteId: string, members: Array<{ scenarioId: string; position: number }>): Promise<void> {
  for (let offset = 0; offset < members.length; offset += 1000) {
    await tx.testSuiteMember.createMany({
      data: members.slice(offset, offset + 1000).map(({ scenarioId, position }) => ({ suiteId, testScenarioId: scenarioId, position })),
    });
  }
}

function assertExpectedOrder(current: OrderedMembership[], expected: string[]): void {
  if (current.length !== expected.length || current.some((member, index) => member.testScenarioId !== expected[index])) throw conflict();
}

export async function mutateSuiteMembership(input: {
  projectId: string;
  suiteId: string;
  expectedScenarioIds: string[];
  expectedMembershipRevision: number;
  addScenarioIds?: string[];
  removeScenarioIds?: string[];
  updatedById?: string;
}): Promise<{ scenarioIds: string[]; membershipRevision: number; restoreData: MembershipUndo }> {
  const addIds = input.addScenarioIds ?? [];
  const removeIds = input.removeScenarioIds ?? [];
  if (new Set(input.expectedScenarioIds).size !== input.expectedScenarioIds.length || new Set(addIds).size !== addIds.length || new Set(removeIds).size !== removeIds.length || addIds.some((id) => removeIds.includes(id))) throw invalid("Membership IDs must be unique and additions must not overlap removals");
  return await withScenarioTransaction(async (tx) => {
    await requireOrganizationActor(tx, input.updatedById);
    await lockScenarios(tx, input.projectId, [...input.expectedScenarioIds, ...addIds, ...removeIds]);
    await lockSuites(tx, input.projectId, [input.suiteId]);
    const current = await readOrderedMembers(tx, input.suiteId);
    const suite = await tx.testSuite.findFirst({ where: { id: input.suiteId, projectId: input.projectId }, select: { membershipRevision: true } });
    if (!suite) throw notFound();
    if (suite.membershipRevision !== input.expectedMembershipRevision) throw conflict();
    assertExpectedOrder(current, input.expectedScenarioIds);
    const currentSet = new Set(current.map(({ testScenarioId }) => testScenarioId));
    if (addIds.some((id) => currentSet.has(id)) || removeIds.some((id) => !currentSet.has(id))) throw conflict();
    if (current.length + addIds.length - removeIds.length > 10_000) throw invalid("Resulting membership exceeds 10000 scenarios");
    const removedMembers = current.filter(({ testScenarioId }) => removeIds.includes(testScenarioId)).map(({ testScenarioId, position }) => ({ scenarioId: testScenarioId, position }));
    await tx.testSuiteMember.deleteMany({ where: { suiteId: input.suiteId, testScenarioId: { in: removeIds } } });
    const lastPosition = current.reduce((max, member) => Math.max(max, member.position), -1);
    await createMembers(tx, input.suiteId, addIds.map((scenarioId, index) => ({ scenarioId, position: lastPosition + index + 1 })));
    const changed = [...addIds, ...removeIds];
    await advanceScenarioRevisions(tx, input.projectId, changed, input.updatedById);
    const updatedSuite = changed.length ? await tx.testSuite.update({ where: { id: input.suiteId }, data: { membershipRevision: { increment: 1 } }, select: { membershipRevision: true } }) : suite;
    const after = await readOrderedMembers(tx, input.suiteId);
    return { scenarioIds: after.map(({ testScenarioId }) => testScenarioId), membershipRevision: updatedSuite.membershipRevision, restoreData: { suiteId: input.suiteId, addedScenarioIds: addIds, removedMembers } };
  });
}

export async function restoreSuiteMembership(input: {
  projectId: string;
  suiteId: string;
  expectedScenarioIds: string[];
  expectedMembershipRevision: number;
  restoreData: MembershipUndo;
  updatedById?: string;
}): Promise<{ scenarioIds: string[]; membershipRevision: number }> {
  if (input.restoreData.suiteId !== input.suiteId) throw invalid("Restoration data does not match the suite");
  return await withScenarioTransaction(async (tx) => {
    await requireOrganizationActor(tx, input.updatedById);
    const restoreIds = [...input.restoreData.addedScenarioIds, ...input.restoreData.removedMembers.map(({ scenarioId }) => scenarioId)];
    await lockScenarios(tx, input.projectId, [...input.expectedScenarioIds, ...restoreIds]);
    await lockSuites(tx, input.projectId, [input.suiteId]);
    const current = await readOrderedMembers(tx, input.suiteId);
    const suite = await tx.testSuite.findFirst({ where: { id: input.suiteId, projectId: input.projectId }, select: { membershipRevision: true } });
    if (!suite) throw notFound();
    if (suite.membershipRevision !== input.expectedMembershipRevision) throw conflict();
    assertExpectedOrder(current, input.expectedScenarioIds);
    const currentSet = new Set(current.map(({ testScenarioId }) => testScenarioId));
    if (input.restoreData.addedScenarioIds.some((id) => !currentSet.has(id)) || input.restoreData.removedMembers.some(({ scenarioId }) => currentSet.has(scenarioId))) throw conflict();
    await tx.testSuiteMember.deleteMany({ where: { suiteId: input.suiteId, testScenarioId: { in: input.restoreData.addedScenarioIds } } });
    await createMembers(tx, input.suiteId, input.restoreData.removedMembers);
    await advanceScenarioRevisions(tx, input.projectId, restoreIds, input.updatedById);
    const updatedSuite = restoreIds.length ? await tx.testSuite.update({ where: { id: input.suiteId }, data: { membershipRevision: { increment: 1 } }, select: { membershipRevision: true } }) : suite;
    const after = await readOrderedMembers(tx, input.suiteId);
    return { scenarioIds: after.map(({ testScenarioId }) => testScenarioId), membershipRevision: updatedSuite.membershipRevision };
  });
}

type MoveUndo = {
  sourceSuiteId: string;
  destinationSuiteId: string;
  sourceMembers: Array<{ scenarioId: string; position: number }>;
  destinationAddedScenarioIds: string[];
};

export async function moveSuiteMembership(input: {
  projectId: string;
  sourceSuiteId: string;
  destinationSuiteId: string;
  scenarioIds: string[];
  expectedSourceScenarioIds: string[];
  expectedDestinationScenarioIds: string[];
  expectedSourceMembershipRevision: number;
  expectedDestinationMembershipRevision: number;
  updatedById?: string;
}): Promise<{ sourceScenarioIds: string[]; destinationScenarioIds: string[]; sourceMembershipRevision: number; destinationMembershipRevision: number; restoreData: MoveUndo; alreadyInDestination: string[] }> {
  if (input.sourceSuiteId === input.destinationSuiteId || !input.scenarioIds.length || new Set(input.scenarioIds).size !== input.scenarioIds.length || new Set(input.expectedSourceScenarioIds).size !== input.expectedSourceScenarioIds.length || new Set(input.expectedDestinationScenarioIds).size !== input.expectedDestinationScenarioIds.length) throw invalid("Move requires two different suites and unique scenario IDs");
  return await withScenarioTransaction(async (tx) => {
    await requireOrganizationActor(tx, input.updatedById);
    await lockScenarios(tx, input.projectId, [...input.expectedSourceScenarioIds, ...input.expectedDestinationScenarioIds, ...input.scenarioIds]);
    await lockSuites(tx, input.projectId, [input.sourceSuiteId, input.destinationSuiteId]);
    const [source, destination] = await Promise.all([readOrderedMembers(tx, input.sourceSuiteId), readOrderedMembers(tx, input.destinationSuiteId)]);
    const [sourceSuite, destinationSuite] = await Promise.all([tx.testSuite.findFirst({ where: { id: input.sourceSuiteId, projectId: input.projectId }, select: { membershipRevision: true } }), tx.testSuite.findFirst({ where: { id: input.destinationSuiteId, projectId: input.projectId }, select: { membershipRevision: true } })]);
    if (!sourceSuite || !destinationSuite) throw notFound();
    if (sourceSuite.membershipRevision !== input.expectedSourceMembershipRevision || destinationSuite.membershipRevision !== input.expectedDestinationMembershipRevision) throw conflict();
    assertExpectedOrder(source, input.expectedSourceScenarioIds);
    assertExpectedOrder(destination, input.expectedDestinationScenarioIds);
    const sourceSet = new Set(source.map(({ testScenarioId }) => testScenarioId));
    if (input.scenarioIds.some((id) => !sourceSet.has(id))) throw conflict();
    const destinationSet = new Set(destination.map(({ testScenarioId }) => testScenarioId));
    const alreadyInDestination = input.scenarioIds.filter((id) => destinationSet.has(id));
    const destinationAddedScenarioIds = input.scenarioIds.filter((id) => !destinationSet.has(id));
    if (destination.length + destinationAddedScenarioIds.length > 10_000) throw invalid("Resulting membership exceeds 10000 scenarios");
    const sourceMembers = source.filter(({ testScenarioId }) => input.scenarioIds.includes(testScenarioId)).map(({ testScenarioId, position }) => ({ scenarioId: testScenarioId, position }));
    await tx.testSuiteMember.deleteMany({ where: { suiteId: input.sourceSuiteId, testScenarioId: { in: input.scenarioIds } } });
    const lastPosition = destination.reduce((max, member) => Math.max(max, member.position), -1);
    await createMembers(tx, input.destinationSuiteId, destinationAddedScenarioIds.map((scenarioId, index) => ({ scenarioId, position: lastPosition + index + 1 })));
    await advanceScenarioRevisions(tx, input.projectId, input.scenarioIds, input.updatedById);
    const [sourceUpdated, destinationUpdated] = await Promise.all([
      tx.testSuite.update({ where: { id: input.sourceSuiteId }, data: { membershipRevision: { increment: 1 } }, select: { membershipRevision: true } }),
      destinationAddedScenarioIds.length ? tx.testSuite.update({ where: { id: input.destinationSuiteId }, data: { membershipRevision: { increment: 1 } }, select: { membershipRevision: true } }) : Promise.resolve(destinationSuite),
    ]);
    const [sourceAfter, destinationAfter] = await Promise.all([readOrderedMembers(tx, input.sourceSuiteId), readOrderedMembers(tx, input.destinationSuiteId)]);
    return { sourceScenarioIds: sourceAfter.map(({ testScenarioId }) => testScenarioId), destinationScenarioIds: destinationAfter.map(({ testScenarioId }) => testScenarioId), sourceMembershipRevision: sourceUpdated.membershipRevision, destinationMembershipRevision: destinationUpdated.membershipRevision, restoreData: { sourceSuiteId: input.sourceSuiteId, destinationSuiteId: input.destinationSuiteId, sourceMembers, destinationAddedScenarioIds }, alreadyInDestination };
  });
}

export async function restoreSuiteMove(input: {
  projectId: string;
  expectedSourceScenarioIds: string[];
  expectedDestinationScenarioIds: string[];
  expectedSourceMembershipRevision: number;
  expectedDestinationMembershipRevision: number;
  restoreData: MoveUndo;
  updatedById?: string;
}): Promise<{ sourceScenarioIds: string[]; destinationScenarioIds: string[]; sourceMembershipRevision: number; destinationMembershipRevision: number }> {
  const { sourceSuiteId, destinationSuiteId, sourceMembers, destinationAddedScenarioIds } = input.restoreData;
  if (!sourceSuiteId || !destinationSuiteId || sourceSuiteId === destinationSuiteId || new Set(destinationAddedScenarioIds).size !== destinationAddedScenarioIds.length || new Set(sourceMembers.map(({ scenarioId }) => scenarioId)).size !== sourceMembers.length) throw invalid("Invalid move restoration data");
  return await withScenarioTransaction(async (tx) => {
    await requireOrganizationActor(tx, input.updatedById);
    const restoreIds = [...destinationAddedScenarioIds, ...sourceMembers.map(({ scenarioId }) => scenarioId)];
    await lockScenarios(tx, input.projectId, [...input.expectedSourceScenarioIds, ...input.expectedDestinationScenarioIds, ...restoreIds]);
    await lockSuites(tx, input.projectId, [sourceSuiteId, destinationSuiteId]);
    const [source, destination] = await Promise.all([readOrderedMembers(tx, sourceSuiteId), readOrderedMembers(tx, destinationSuiteId)]);
    const [sourceSuite, destinationSuite] = await Promise.all([tx.testSuite.findFirst({ where: { id: sourceSuiteId, projectId: input.projectId }, select: { membershipRevision: true } }), tx.testSuite.findFirst({ where: { id: destinationSuiteId, projectId: input.projectId }, select: { membershipRevision: true } })]);
    if (!sourceSuite || !destinationSuite) throw notFound();
    if (sourceSuite.membershipRevision !== input.expectedSourceMembershipRevision || destinationSuite.membershipRevision !== input.expectedDestinationMembershipRevision) throw conflict();
    assertExpectedOrder(source, input.expectedSourceScenarioIds);
    assertExpectedOrder(destination, input.expectedDestinationScenarioIds);
    const sourceSet = new Set(source.map(({ testScenarioId }) => testScenarioId));
    const destinationSet = new Set(destination.map(({ testScenarioId }) => testScenarioId));
    if (sourceMembers.some(({ scenarioId }) => sourceSet.has(scenarioId)) || destinationAddedScenarioIds.some((id) => !destinationSet.has(id))) throw conflict();
    await tx.testSuiteMember.deleteMany({ where: { suiteId: destinationSuiteId, testScenarioId: { in: destinationAddedScenarioIds } } });
    await createMembers(tx, sourceSuiteId, sourceMembers);
    await advanceScenarioRevisions(tx, input.projectId, restoreIds, input.updatedById);
    const [sourceUpdated, destinationUpdated] = await Promise.all([
      sourceMembers.length ? tx.testSuite.update({ where: { id: sourceSuiteId }, data: { membershipRevision: { increment: 1 } }, select: { membershipRevision: true } }) : Promise.resolve(sourceSuite),
      destinationAddedScenarioIds.length ? tx.testSuite.update({ where: { id: destinationSuiteId }, data: { membershipRevision: { increment: 1 } }, select: { membershipRevision: true } }) : Promise.resolve(destinationSuite),
    ]);
    const [sourceAfter, destinationAfter] = await Promise.all([readOrderedMembers(tx, sourceSuiteId), readOrderedMembers(tx, destinationSuiteId)]);
    return { sourceScenarioIds: sourceAfter.map(({ testScenarioId }) => testScenarioId), destinationScenarioIds: destinationAfter.map(({ testScenarioId }) => testScenarioId), sourceMembershipRevision: sourceUpdated.membershipRevision, destinationMembershipRevision: destinationUpdated.membershipRevision };
  });
}

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
        if (existing.length + changedIds.length > 10_000) throw invalid("Resulting membership exceeds 10000 scenarios");
        let next =
          existing.reduce((max, member) => Math.max(max, member.position), -1) +
          1;
        for (const id of input.scenarioIds)
          if (!existing.some((member) => member.testScenarioId === id))
            await tx.testSuiteMember.create({
              data: { suiteId: suite.id, testScenarioId: id, position: next++ },
            });
      }
      if (changedIds.length) await tx.testSuite.update({ where: { id: suite.id }, data: { membershipRevision: { increment: 1 } } });
      return await tx.testSuiteMember.findMany({
        where: { suiteId: suite.id },
        orderBy: { position: "asc" },
      });
    });
  },
  async reorderMembers(input: {
    projectId: string;
    suiteId: string;
    expectedMembershipRevision?: number;
    expectedScenarioIds?: string[];
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
        include: { members: { orderBy: { position: "asc" } } },
      });
      if (!suite) throw notFound();
      const current = suite.members.map(({ testScenarioId }) => testScenarioId);
      if (input.expectedMembershipRevision !== undefined && (suite.membershipRevision !== input.expectedMembershipRevision || !input.expectedScenarioIds || current.length !== input.expectedScenarioIds.length || current.some((id, index) => id !== input.expectedScenarioIds?.[index]))) throw conflict();
      if (
        new Set(input.scenarioIds).size !== input.scenarioIds.length ||
        current.length !== input.scenarioIds.length ||
        current.some((id) => !input.scenarioIds.includes(id))
      )
        throw invalid(
          "Ordering must contain every current member exactly once",
        );
      const reordered = current.some((id, index) => id !== input.scenarioIds[index]);
      if (!reordered) return { scenarioIds: input.scenarioIds };
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
      await tx.testSuite.update({ where: { id: suite.id }, data: { membershipRevision: { increment: 1 } } });
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
