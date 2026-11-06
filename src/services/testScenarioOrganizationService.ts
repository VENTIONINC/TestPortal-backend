// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";

export class OrganizationError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) {
    super(message);
    this.name = "OrganizationError";
  }
}

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

  async createFolder(input: { projectId: string; name: string; parentId?: string | null; position?: number }) {
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
      return await tx.testScenarioFolder.create({ data: { projectId: input.projectId, name, parentId: input.parentId ?? null, position: input.position ?? 0 } });
    }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OrganizationError("A sibling folder already has this name", 409); throw error; }
  },

  async updateFolder(input: { projectId: string; folderId: string; name?: string; parentId?: string | null; position?: number }) {
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
      try { return await tx.testScenarioFolder.update({ where: { id: folder.id }, data: { ...(input.name !== undefined ? { name: input.name.trim() } : {}), parentId, ...(input.position !== undefined ? { position: input.position } : {}) } }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OrganizationError("A sibling folder already has this name", 409); throw error; }
    });
  },

  async deleteFolder(input: { projectId: string; folderId: string; disposition: "parent" | "unfiled" }) {
    return await dbClient.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Project" WHERE "id" = ${input.projectId}::uuid FOR UPDATE`);
      const folder = await tx.testScenarioFolder.findFirst({ where: { id: input.folderId, projectId: input.projectId } });
      if (!folder) throw notFound();
      await tx.testScenario.updateMany({ where: { projectId: input.projectId, folderId: folder.id }, data: { folderId: input.disposition === "parent" ? folder.parentId : null } });
      const children = await tx.testScenarioFolder.findMany({ where: { projectId: input.projectId, parentId: folder.id }, orderBy: [{ position: "asc" }, { id: "asc" }] });
      for (const [index, child] of children.entries()) await tx.testScenarioFolder.update({ where: { id: child.id }, data: { parentId: folder.parentId, position: folder.position + index } });
      await tx.testScenarioFolder.delete({ where: { id: folder.id } });
      return { deleted: true as const };
    });
  },

  async listSuites(projectId: string) { await requireProject(projectId); return await dbClient.testSuite.findMany({ where: { projectId }, orderBy: [{ name: "asc" }, { id: "asc" }], include: { members: { orderBy: { position: "asc" } } } }); },

  async getSuite(projectId: string, suiteId: string) { const suite = await dbClient.testSuite.findFirst({ where: { id: suiteId, projectId }, include: { members: { orderBy: { position: "asc" } } } }); if (!suite) throw notFound(); return suite; },

  async createSuite(input: { projectId: string; name: string; description?: string | null; purpose?: string | null; release?: string | null }) {
    await requireProject(input.projectId);
    if (!input.name.trim()) throw invalid("Suite name must not be blank");
    try { return await dbClient.testSuite.create({ data: { ...input, name: input.name.trim() } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OrganizationError("A suite with this name already exists", 409); throw error; }
  },

  async updateSuite(input: { projectId: string; suiteId: string; name?: string; description?: string | null; purpose?: string | null; release?: string | null }) {
    if (input.name !== undefined && (!input.name.trim() || input.name.trim().length > 200)) throw invalid("Suite name must contain 1 to 200 characters");
    const suite = await dbClient.testSuite.findFirst({ where: { id: input.suiteId, projectId: input.projectId } }); if (!suite) throw notFound();
    try { return await dbClient.testSuite.update({ where: { id: suite.id }, data: { ...(input.name !== undefined ? { name: input.name.trim() } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.purpose !== undefined ? { purpose: input.purpose } : {}), ...(input.release !== undefined ? { release: input.release } : {}) } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OrganizationError("A suite with this name already exists", 409); throw error; }
  },

  async deleteSuite(projectId: string, suiteId: string) { const result = await dbClient.testSuite.deleteMany({ where: { id: suiteId, projectId } }); if (!result.count) throw notFound(); return { deleted: true as const }; },

  async mutateMembers(input: { projectId: string; suiteId: string; scenarioIds: string[]; operation: "add" | "remove" }) {
    if (!input.scenarioIds.length || new Set(input.scenarioIds).size !== input.scenarioIds.length || input.scenarioIds.length > 100) throw invalid("scenarioIds must contain 1 to 100 unique IDs");
    return await dbClient.$transaction(async (tx) => {
      const suite = await tx.testSuite.findFirst({ where: { id: input.suiteId, projectId: input.projectId } }); if (!suite) throw notFound();
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "TestSuite" WHERE "id" = ${suite.id}::uuid FOR UPDATE`);
      const found = await tx.testScenario.count({ where: { projectId: input.projectId, id: { in: input.scenarioIds } } }); if (found !== input.scenarioIds.length) throw notFound();
      if (input.operation === "remove") { await tx.testSuiteMember.deleteMany({ where: { suiteId: suite.id, testScenarioId: { in: input.scenarioIds } } }); }
      else {
        const existing = await tx.testSuiteMember.findMany({ where: { suiteId: suite.id }, orderBy: { position: "asc" } });
        let next = existing.reduce((max, member) => Math.max(max, member.position), -1) + 1;
        for (const id of input.scenarioIds) if (!existing.some((member) => member.testScenarioId === id)) await tx.testSuiteMember.create({ data: { suiteId: suite.id, testScenarioId: id, position: next++ } });
      }
      return await tx.testSuiteMember.findMany({ where: { suiteId: suite.id }, orderBy: { position: "asc" } });
    });
  },

  async reorderMembers(input: { projectId: string; suiteId: string; scenarioIds: string[] }) {
    return await dbClient.$transaction(async (tx) => {
      const suiteId = await tx.testSuite.findFirst({ where: { id: input.suiteId, projectId: input.projectId }, select: { id: true } }); if (!suiteId) throw notFound();
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "TestSuite" WHERE "id" = ${suiteId.id}::uuid FOR UPDATE`);
      const suite = await tx.testSuite.findUnique({ where: { id: suiteId.id }, include: { members: true } }); if (!suite) throw notFound();
      const current = suite.members.map(({ testScenarioId }) => testScenarioId);
      if (new Set(input.scenarioIds).size !== input.scenarioIds.length || current.length !== input.scenarioIds.length || current.some((id) => !input.scenarioIds.includes(id))) throw invalid("Ordering must contain every current member exactly once");
      const offset = suite.members.reduce((max, member) => Math.max(max, member.position), -1) + 1;
      for (const member of suite.members) await tx.testSuiteMember.update({ where: { suiteId_testScenarioId: { suiteId: suite.id, testScenarioId: member.testScenarioId } }, data: { position: member.position + offset } });
      for (const [position, id] of input.scenarioIds.entries()) await tx.testSuiteMember.update({ where: { suiteId_testScenarioId: { suiteId: suite.id, testScenarioId: id } }, data: { position } });
      return { scenarioIds: input.scenarioIds };
    });
  },

  async moveScenarios(input: { projectId: string; scenarioIds: string[]; folderId: string | null }) {
    if (!input.scenarioIds.length || input.scenarioIds.length > 100 || new Set(input.scenarioIds).size !== input.scenarioIds.length) throw invalid("scenarioIds must contain 1 to 100 unique IDs");
    return await dbClient.$transaction(async (tx) => {
      if (input.folderId && !(await tx.testScenarioFolder.findFirst({ where: { id: input.folderId, projectId: input.projectId }, select: { id: true } }))) throw notFound();
      const count = await tx.testScenario.count({ where: { id: { in: input.scenarioIds }, projectId: input.projectId } }); if (count !== input.scenarioIds.length) throw notFound();
      await tx.testScenario.updateMany({ where: { id: { in: input.scenarioIds }, projectId: input.projectId }, data: { folderId: input.folderId } });
      return { moved: count };
    });
  },
};
