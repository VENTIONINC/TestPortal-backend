// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import { testScenarioOrganizationWrites, deleteScenarioSuite, mutateSuiteMembership, moveSuiteMembership, restoreSuiteMembership, restoreSuiteMove } from "@/models/testScenarioOrganizationWrites";
import { OrganizationError } from "@/models/testScenarioOrganizationErrors";
export { OrganizationError } from "@/models/testScenarioOrganizationErrors";


const notFound = () => new OrganizationError("Resource not found", 404);
const invalid = (message: string) => new OrganizationError(message, 400);

async function requireProject(projectId: string): Promise<void> {
  if (!(await dbClient.project.findUnique({ where: { id: projectId }, select: { id: true } }))) throw notFound();
}

async function descendants(tx: Prisma.TransactionClient, projectId: string, rootId: string): Promise<string[]> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH RECURSIVE tree AS (
      SELECT "id" FROM "TestScenarioFolder" WHERE "id" = ${rootId}::uuid AND "projectId" = ${projectId}::uuid
      UNION ALL
      SELECT child."id" FROM "TestScenarioFolder" child JOIN tree parent ON child."parentId" = parent."id"
      WHERE child."projectId" = ${projectId}::uuid
    ) SELECT "id" FROM tree
  `);
  if (!rows.length) throw notFound();
  return rows.map(({ id }) => id);
}

export const testScenarioOrganizationService = {
  async listFolders(projectId: string) {
    await requireProject(projectId);
    const rows = await dbClient.testScenarioFolder.findMany({ where: { projectId }, orderBy: [{ position: "asc" }, { name: "asc" }, { id: "asc" }], include: { _count: { select: { scenarios: true } } } });
    const nodes = new Map(rows.map((row) => [row.id, { ...row, scenarioCount: row._count.scenarios, children: [] as typeof rows }]));
    const roots: Array<(typeof nodes extends Map<string, infer T> ? T : never)> = [];
    for (const row of rows) {
      const node = nodes.get(row.id);
      if (!node) continue;
      if (row.parentId) nodes.get(row.parentId)?.children.push(row);
      else roots.push(node);
    }
    const build = (node: (typeof roots)[number]): unknown => ({ ...node, children: node.children.flatMap((child) => { const childNode = nodes.get(child.id); return childNode ? [build(childNode)] : []; }) });
    return roots.map(build);
  },

  async createFolder(input: { projectId: string; name: string; description?: string | null; parentId?: string | null; position?: number }) {
    const name = input.name.trim();
    if (!name || name.length > 200) throw invalid("Folder name must contain 1 to 200 characters");
    try { return await dbClient.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Project" WHERE "id" = ${input.projectId}::uuid FOR UPDATE`);
      if (!(await tx.project.findUnique({ where: { id: input.projectId }, select: { id: true } }))) throw notFound();
      if (input.parentId) {
        let depth = 1;
        let parent = await tx.testScenarioFolder.findFirst({ where: { id: input.parentId, projectId: input.projectId } });
        if (!parent) throw notFound();
        while (parent.parentId) { depth++; parent = await tx.testScenarioFolder.findFirst({ where: { id: parent.parentId, projectId: input.projectId } }); if (!parent) throw notFound(); }
        if (depth >= 5) throw invalid("Folder depth cannot exceed five levels");
      }
      const description = input.description?.trim() || null;
      return await tx.testScenarioFolder.create({ data: { projectId: input.projectId, name, description, parentId: input.parentId ?? null, position: input.position ?? 0 } });
    }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OrganizationError("A sibling folder already has this name", 409); throw error; }
  },

  async updateFolder(input: { projectId: string; folderId: string; name?: string; description?: string | null; parentId?: string | null; position?: number }) {
    return await dbClient.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Project" WHERE "id" = ${input.projectId}::uuid FOR UPDATE`);
      if (input.name !== undefined && (!input.name.trim() || input.name.trim().length > 200)) throw invalid("Folder name must contain 1 to 200 characters");
      const folder = await tx.testScenarioFolder.findFirst({ where: { id: input.folderId, projectId: input.projectId } });
      if (!folder) throw notFound();
      const parentId = input.parentId === undefined ? folder.parentId : input.parentId;
      if (parentId && parentId !== folder.parentId) {
        const subtree = await descendants(tx, input.projectId, folder.id);
        if (subtree.includes(parentId)) throw invalid("Folder cannot be moved into itself or a descendant");
        let level = 1; let parent = await tx.testScenarioFolder.findFirst({ where: { id: parentId, projectId: input.projectId } });
        if (!parent) throw notFound();
        while (parent.parentId) { level++; parent = await tx.testScenarioFolder.findFirst({ where: { id: parent.parentId, projectId: input.projectId } }); if (!parent) break; }
        const deepest = await tx.$queryRaw<Array<{ depth: number }>>(Prisma.sql`WITH RECURSIVE t AS (SELECT "id", 1 AS depth FROM "TestScenarioFolder" WHERE "id" = ${folder.id}::uuid UNION ALL SELECT c."id", t.depth + 1 FROM "TestScenarioFolder" c JOIN t ON c."parentId" = t."id") SELECT MAX(depth)::int AS depth FROM t`);
        if (level + (deepest[0]?.depth ?? subtree.length) > 5) throw invalid("Folder depth cannot exceed five levels");
      }
      const description = input.description === undefined ? undefined : input.description?.trim() || null;
      try { return await tx.testScenarioFolder.update({ where: { id: folder.id }, data: { ...(input.name !== undefined ? { name: input.name.trim() } : {}), ...(description !== undefined ? { description } : {}), parentId, ...(input.position !== undefined ? { position: input.position } : {}) } }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OrganizationError("A sibling folder already has this name", 409); throw error; }
    });
  },

  async deleteFolder(input: {
    projectId: string;
    folderId: string;
    disposition: "parent" | "unfiled";
    updatedById?: string;
  }) {
    return await testScenarioOrganizationWrites.deleteFolder(input);
  },

  async listSuites(projectId: string) { await requireProject(projectId); return await dbClient.testSuite.findMany({ where: { projectId }, orderBy: [{ name: "asc" }, { id: "asc" }], include: { members: { orderBy: { position: "asc" } } } }); },

  async getSuite(projectId: string, suiteId: string) { const suite = await dbClient.testSuite.findFirst({ where: { id: suiteId, projectId }, include: { members: { orderBy: { position: "asc" } } } }); if (!suite) throw notFound(); return suite; },

  async createSuite(input: { projectId: string; name: string; description?: string | null; purpose?: string | null; release?: string | null }) {
    await requireProject(input.projectId);
    if (!input.name.trim()) throw invalid("Suite name must not be blank");
    return await dbClient.testSuite.create({ data: { ...input, name: input.name.trim() } });
  },

  async updateSuite(input: { projectId: string; suiteId: string; name?: string; description?: string | null; purpose?: string | null; release?: string | null }) {
    if (input.name !== undefined && (!input.name.trim() || input.name.trim().length > 200)) throw invalid("Suite name must contain 1 to 200 characters");
    const suite = await dbClient.testSuite.findFirst({ where: { id: input.suiteId, projectId: input.projectId } }); if (!suite) throw notFound();
    return await dbClient.testSuite.update({ where: { id: suite.id }, data: { ...(input.name !== undefined ? { name: input.name.trim() } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.purpose !== undefined ? { purpose: input.purpose } : {}), ...(input.release !== undefined ? { release: input.release } : {}) } });
  },

  async deleteSuite(projectId: string, suiteId: string, updatedById?: string) {
    return deleteScenarioSuite(projectId, suiteId, updatedById);
  },

  async mutateMembers(input: {
    projectId: string;
    suiteId: string;
    scenarioIds: string[];
    operation: "add" | "remove";
    updatedById?: string;
  }) {
    if (
      !input.scenarioIds.length ||
      new Set(input.scenarioIds).size !== input.scenarioIds.length ||
      input.scenarioIds.length > 100
    )
      throw invalid("scenarioIds must contain 1 to 100 unique IDs");
    return await testScenarioOrganizationWrites.mutateMembers(input);
  },

  async changeSuiteMembership(input: { projectId: string; suiteId: string; expectedMembershipRevision: number; expectedScenarioIds: string[]; addScenarioIds: string[]; removeScenarioIds: string[]; updatedById?: string }) {
    if (input.expectedScenarioIds.length > 10_000 || input.addScenarioIds.length > 10_000 || input.removeScenarioIds.length > 10_000) throw invalid("Membership changes are limited to 10000 scenarios");
    return await mutateSuiteMembership(input);
  },

  async restoreSuiteMembership(input: { projectId: string; suiteId: string; expectedMembershipRevision: number; expectedScenarioIds: string[]; restoreData: { suiteId: string; addedScenarioIds: string[]; removedMembers: Array<{ scenarioId: string; position: number }> }; updatedById?: string }) {
    if (input.expectedScenarioIds.length > 10_000) throw invalid("Membership changes are limited to 10000 scenarios");
    return await restoreSuiteMembership(input);
  },

  async moveSuiteMembership(input: { projectId: string; sourceSuiteId: string; destinationSuiteId: string; scenarioIds: string[]; expectedSourceScenarioIds: string[]; expectedDestinationScenarioIds: string[]; expectedSourceMembershipRevision: number; expectedDestinationMembershipRevision: number; updatedById?: string }) {
    if ([input.scenarioIds, input.expectedSourceScenarioIds, input.expectedDestinationScenarioIds].some((ids) => ids.length > 10_000)) throw invalid("Membership changes are limited to 10000 scenarios");
    return await moveSuiteMembership(input);
  },

  async restoreSuiteMove(input: { projectId: string; expectedSourceScenarioIds: string[]; expectedDestinationScenarioIds: string[]; expectedSourceMembershipRevision: number; expectedDestinationMembershipRevision: number; restoreData: { sourceSuiteId: string; destinationSuiteId: string; sourceMembers: Array<{ scenarioId: string; position: number }>; destinationAddedScenarioIds: string[] }; updatedById?: string }) {
    if ([input.expectedSourceScenarioIds, input.expectedDestinationScenarioIds].some((ids) => ids.length > 10_000)) throw invalid("Membership changes are limited to 10000 scenarios");
    return await restoreSuiteMove(input);
  },

  async reorderMembers(input: {
    projectId: string;
    suiteId: string;
    expectedMembershipRevision: number;
    expectedScenarioIds: string[];
    scenarioIds: string[];
  }) {
    return await testScenarioOrganizationWrites.reorderMembers(input);
  },

  async moveScenarios(input: {
    projectId: string;
    scenarioIds: string[];
    folderId: string | null;
    updatedById?: string;
  }) {
    if (
      !input.scenarioIds.length ||
      input.scenarioIds.length > 100 ||
      new Set(input.scenarioIds).size !== input.scenarioIds.length
    )
      throw invalid("scenarioIds must contain 1 to 100 unique IDs");
    return await testScenarioOrganizationWrites.moveScenarios(input);
  },
};
