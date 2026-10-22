// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import type { TestScenario, TestScenarioStep } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import {
  hashTestScenarioMarkdown,
  renderTestScenarioMarkdown,
  TEST_SCENARIO_MARKDOWN_FORMAT_VERSION,
} from "@/lib/testScenarioMarkdown";
import type {
  ListTestScenariosParams,
  TestScenarioSortDirection,
  TestScenarioSort,
} from "@/types/testScenarios";
import type {
  AppendTestScenarioStepParams,
  CreateTestScenarioParams,
  DeleteTestScenarioStepParams,
  ReorderTestScenarioStepsParams,
  TestScenarioResponse,
  TestScenarioSummary,
  UpdateTestScenarioParams,
  UpdateTestScenarioStepParams,
} from "@/types/testScenarios";

export interface CreateTestScenarioData extends CreateTestScenarioParams {}

export type UpdateTestScenarioData = Omit<
  UpdateTestScenarioParams,
  "scenarioId" | "projectId"
>;

type ScenarioAggregate = TestScenario & { steps: TestScenarioStep[] };

export type ReorderTestScenarioResult =
  | { kind: "not-found" }
  | { kind: "invalid-order" }
  | { kind: "success"; scenario: TestScenarioResponse };

const summarySelect = {
  id: true,
  projectId: true,
  createdById: true,
  title: true,
  scenarioKey: true,
  details: true,
  createdAt: true,
  updatedAt: true,
  folderId: true,
  folder: { select: { name: true } },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.TestScenarioSelect;

type SummaryListParams = Pick<
  ListTestScenariosParams,
  "projectId" | "page" | "limit" | "search" | "createdById" | "sort" | "folderId" | "includeDescendants" | "suiteId" | "sortField" | "sortDirection" | "scenarioKey" | "title" | "details" | "folder" | "createdBy"
> & { _folderIds?: string[] };

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function summaryWhere(
  params: SummaryListParams,
): Prisma.TestScenarioWhereInput {
  const organization: Prisma.TestScenarioWhereInput[] = [];
  if (params.folderId === "unfiled") organization.push({ folderId: null });
  else if (params.folderId) organization.push({ folderId: { in: params._folderIds ?? [params.folderId] } } as Prisma.TestScenarioWhereInput);
  if (params.suiteId) organization.push({ suiteMemberships: { some: { suiteId: params.suiteId } } });
  return {
    projectId: params.projectId,
    ...(params.createdById ? { createdById: params.createdById } : {}),
    ...(organization.length ? { AND: organization } : {}),
    ...(params.search
      ? {
          OR: [
            {
              title: {
                contains: escapeLikePattern(params.search),
                mode: "insensitive",
              },
            },
            {
              scenarioKey: {
                contains: escapeLikePattern(params.search),
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(params.scenarioKey ? { scenarioKey: { contains: params.scenarioKey, mode: "insensitive" as const } } : {}),
    ...(params.title ? { title: { contains: params.title, mode: "insensitive" as const } } : {}),
    ...(params.details ? { details: { contains: params.details, mode: "insensitive" as const } } : {}),
    ...(params.createdBy ? { createdBy: { OR: [{ name: { contains: params.createdBy, mode: "insensitive" as const } }, { email: { contains: params.createdBy, mode: "insensitive" as const } }] } } : {}),
  };
}

function summaryOrderBy(
  sort: TestScenarioSort = "recently_created",
): Prisma.TestScenarioOrderByWithRelationInput[] {
  switch (sort) {
    case "recently_updated":
      return [{ updatedAt: "desc" }, { id: "desc" }];
    case "title_asc":
      return [{ title: "asc" }, { id: "asc" }];
    case "recently_created":
      return [{ createdAt: "desc" }, { id: "desc" }];
    default: {
      const exhaustiveSort: never = sort;
      return exhaustiveSort;
    }
  }
}

function toResponse(scenario: ScenarioAggregate): TestScenarioResponse {
  return {
    id: scenario.id,
    projectId: scenario.projectId,
    folderId: scenario.folderId,
    createdById: scenario.createdById,
    title: scenario.title,
    scenarioKey: scenario.scenarioKey,
    details: scenario.details,
    objective: scenario.objective,
    preconditions: scenario.preconditions,
    testData: scenario.testData,
    expectedResult: scenario.expectedResult,
    notes: scenario.notes,
    steps: scenario.steps.map(({ id, position, action, expectedResult }) => ({
      id,
      position,
      action,
      expectedResult,
    })),
    contentMd: scenario.contentMd,
    contentMdHash: scenario.contentMdHash,
    contentMdFormatVersion: scenario.contentMdFormatVersion,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
  };
}

async function findAggregate(
  client: Prisma.TransactionClient | typeof dbClient,
  id: string,
  projectId: string,
): Promise<ScenarioAggregate | null> {
  return await client.testScenario.findFirst({
    where: { id, projectId },
    include: { steps: { orderBy: { position: "asc" } } },
  });
}

async function lockAggregate(
  client: Prisma.TransactionClient,
  id: string,
  projectId: string,
): Promise<ScenarioAggregate | null> {
  const lockedRows = await client.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT "id"
      FROM "TestScenario"
      WHERE "id" = ${id}::uuid AND "projectId" = ${projectId}::uuid
      FOR UPDATE
    `,
  );

  if (lockedRows.length === 0) {
    return null;
  }

  return await findAggregate(client, id, projectId);
}

async function withLockedAggregate<T>(
  id: string,
  projectId: string,
  callback: (
    client: Prisma.TransactionClient,
    scenario: ScenarioAggregate,
  ) => Promise<T>,
  tx?: Prisma.TransactionClient,
): Promise<T | null> {
  if (tx) {
    const scenario = await lockAggregate(tx, id, projectId);
    return scenario ? await callback(tx, scenario) : null;
  }

  return await dbClient.$transaction(async (transaction) => {
    const scenario = await lockAggregate(transaction, id, projectId);
    return scenario ? await callback(transaction, scenario) : null;
  });
}

async function refreshProjection(
  client: Prisma.TransactionClient,
  id: string,
  projectId: string,
): Promise<TestScenarioResponse> {
  const aggregate = await findAggregate(client, id, projectId);
  if (!aggregate) {
    throw new Error("Test Scenario disappeared during its transaction");
  }

  const contentMd = renderTestScenarioMarkdown(aggregate);
  const updated = await client.testScenario.update({
    where: { id: aggregate.id },
    data: {
      contentMd,
      contentMdHash: hashTestScenarioMarkdown(contentMd),
      contentMdFormatVersion: TEST_SCENARIO_MARKDOWN_FORMAT_VERSION,
    },
  });

  return toResponse({ ...aggregate, ...updated });
}

async function compactSteps(
  client: Prisma.TransactionClient,
  scenarioId: string,
  steps: readonly TestScenarioStep[],
): Promise<void> {
  if (steps.length === 0) {
    return;
  }

  const offset =
    Math.max(...steps.map((step) => step.position), 0) + steps.length + 1;
  await client.testScenarioStep.updateMany({
    where: { testScenarioId: scenarioId },
    data: { position: { increment: offset } },
  });

  for (const [position, step] of steps.entries()) {
    await client.testScenarioStep.update({
      where: { id: step.id },
      data: { position },
    });
  }
}

function contentCreateData(
  data: CreateTestScenarioData,
  contentMd: string,
): Prisma.TestScenarioUncheckedCreateInput {
  return {
    projectId: data.projectId,
    folderId: data.folderId ?? null,
    title: data.title,
    scenarioKey: data.scenarioKey ?? null,
    details: data.details ?? null,
    objective: data.objective ?? null,
    preconditions: data.preconditions ?? null,
    testData: data.testData ?? null,
    expectedResult: data.expectedResult ?? null,
    notes: data.notes ?? null,
    contentMd,
    contentMdHash: hashTestScenarioMarkdown(contentMd),
    contentMdFormatVersion: TEST_SCENARIO_MARKDOWN_FORMAT_VERSION,
    createdById: data.createdById,
  };
}

export const testScenarioModel = {
  async create(
    data: CreateTestScenarioData,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioResponse | null> {
    const createWithinTransaction = async (
      client: Prisma.TransactionClient,
    ): Promise<TestScenarioResponse | null> => {
      const project = await client.project.findUnique({
        where: { id: data.projectId },
        select: { id: true },
      });
      if (!project) {
        return null;
      }

      const steps = data.steps ?? [];
      const contentMd = renderTestScenarioMarkdown({
        title: data.title,
        details: data.details ?? null,
        objective: data.objective ?? null,
        preconditions: data.preconditions ?? null,
        testData: data.testData ?? null,
        steps: steps.map((step) => ({
          action: step.action,
          expectedResult: step.expectedResult ?? null,
        })),
        expectedResult: data.expectedResult ?? null,
        notes: data.notes ?? null,
      });
      const scenario = await client.testScenario.create({
        data: contentCreateData(data, contentMd),
      });

      if (steps.length > 0) {
        await client.testScenarioStep.createMany({
          data: steps.map((step, position) => ({
            testScenarioId: scenario.id,
            position,
            action: step.action,
            expectedResult: step.expectedResult ?? null,
          })),
        });
      }

      const detail = await findAggregate(client, scenario.id, data.projectId);
      return detail ? toResponse(detail) : null;
    };

    if (tx) {
      return await createWithinTransaction(tx);
    }

    return await dbClient.$transaction(createWithinTransaction);
  },

  async findManySummaries(
    projectId: string,
    page = 1,
    limit = 30,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioSummary[]> {
    const client = tx ?? dbClient;
    return await client.testScenario.findMany({
      where: summaryWhere({ projectId, page, limit }),
      select: summarySelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: summaryOrderBy(),
    });
  },

  async listSummaries(
    params: SummaryListParams,
  ): Promise<{ scenarios: TestScenarioSummary[]; total: number }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const sortField = params.sortField;
    const direction: TestScenarioSortDirection = params.sortDirection ??
      (params.sort === "title_asc" ? "asc" : "desc");
    const sortColumn = sortField === "scenarioKey" ? Prisma.sql`s."scenarioKey"`
      : sortField === "title" ? Prisma.sql`s."title"`
      : sortField === "details" ? Prisma.sql`s."details"`
      : sortField === "folder" ? Prisma.sql`COALESCE(fp.path, 'Unfiled')`
      : sortField === "createdBy" ? Prisma.sql`COALESCE(u."name", u."email", '')`
      : sortField === "updatedAt" || (!sortField && params.sort === "recently_updated") ? Prisma.sql`s."updatedAt"`
      : sortField === "createdAt" || (!sortField && params.sort !== "title_asc") ? Prisma.sql`s."createdAt"`
      : Prisma.sql`s."title"`;
    const sqlDirection = Prisma.raw(direction.toUpperCase());
    const orderBy = sortField
      ? Prisma.sql`ORDER BY ${sortColumn} ${sqlDirection}, s."id" ASC`
      : params.sort === "title_asc"
        ? Prisma.sql`ORDER BY s."title" ASC, s."id" ASC`
        : params.sort === "recently_updated"
          ? Prisma.sql`ORDER BY s."updatedAt" DESC, s."id" DESC`
          : Prisma.sql`ORDER BY s."createdAt" DESC, s."id" DESC`;

    return await dbClient.$transaction(
      async (transaction) => {
        const scoped: SummaryListParams = { ...params };
        if (params.folderId && params.folderId !== "unfiled") {
          if (params.includeDescendants === false) scoped._folderIds = [params.folderId];
          else {
            const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
              WITH RECURSIVE folders AS (
                SELECT "id" FROM "TestScenarioFolder" WHERE "id" = ${params.folderId}::uuid AND "projectId" = ${params.projectId}::uuid
                UNION ALL SELECT child."id" FROM "TestScenarioFolder" child JOIN folders parent ON child."parentId" = parent."id" WHERE child."projectId" = ${params.projectId}::uuid
              ) SELECT "id" FROM folders
            `);
            if (!rows.length) throw new Error("Folder not found");
            scoped._folderIds = rows.map(({ id }) => id);
          }
        }
        if (params.suiteId && !(await transaction.testSuite.findFirst({ where: { id: params.suiteId, projectId: params.projectId }, select: { id: true } }))) throw new Error("Suite not found");
        const needsFolderPaths = Boolean(params.folder || sortField === "folder");
        const folderCte = needsFolderPaths ? Prisma.sql`WITH RECURSIVE folder_paths AS (
          SELECT f."id", f."projectId", f."parentId", f."name"::text AS path
          FROM "TestScenarioFolder" f WHERE f."projectId" = ${params.projectId}::uuid AND f."parentId" IS NULL
          UNION ALL
          SELECT child."id", child."projectId", child."parentId", (parent.path || ' / ' || child."name")::text
          FROM "TestScenarioFolder" child JOIN folder_paths parent ON child."parentId" = parent."id"
          WHERE child."projectId" = ${params.projectId}::uuid
        )` : Prisma.empty;
        const where: Prisma.Sql[] = [Prisma.sql`s."projectId" = ${params.projectId}::uuid`];
        if (params.createdById) where.push(Prisma.sql`s."createdById" = ${params.createdById}::uuid`);
        if (params.search) where.push(Prisma.sql`(POSITION(LOWER(${params.search}) IN LOWER(COALESCE(s."title", ''))) > 0 OR POSITION(LOWER(${params.search}) IN LOWER(COALESCE(s."scenarioKey", ''))) > 0)`);
        if (params.scenarioKey) where.push(Prisma.sql`POSITION(LOWER(${params.scenarioKey}) IN LOWER(COALESCE(s."scenarioKey", ''))) > 0`);
        if (params.title) where.push(Prisma.sql`POSITION(LOWER(${params.title}) IN LOWER(s."title")) > 0`);
        if (params.details) where.push(Prisma.sql`POSITION(LOWER(${params.details}) IN LOWER(COALESCE(s."details", ''))) > 0`);
        if (params.createdBy) where.push(Prisma.sql`(POSITION(LOWER(${params.createdBy}) IN LOWER(COALESCE(u."name", ''))) > 0 OR POSITION(LOWER(${params.createdBy}) IN LOWER(u."email")) > 0)`);
        if (params.folder) where.push(Prisma.sql`POSITION(LOWER(${params.folder}) IN LOWER(COALESCE(fp.path, 'Unfiled'))) > 0`);
        if (params.folderId === "unfiled") where.push(Prisma.sql`s."folderId" IS NULL`);
        else if (scoped._folderIds) where.push(Prisma.sql`s."folderId" IN (${Prisma.join(scoped._folderIds.map((id) => Prisma.sql`${id}::uuid`))})`);
        if (params.suiteId) where.push(Prisma.sql`EXISTS (SELECT 1 FROM "TestSuiteMember" sm WHERE sm."testScenarioId" = s."id" AND sm."suiteId" = ${params.suiteId}::uuid)`);
        const folderJoin = needsFolderPaths ? Prisma.sql`LEFT JOIN folder_paths fp ON fp."id" = s."folderId"` : Prisma.empty;
        const from = Prisma.sql`FROM "TestScenario" s JOIN "User" u ON u."id" = s."createdById" ${folderJoin}`;
        const whereSql = Prisma.join(where, " AND ");
        const [idRows, totalRows] = await Promise.all([
          transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`${folderCte} SELECT s."id" ${from} WHERE ${whereSql} ${orderBy} OFFSET ${(page - 1) * limit} LIMIT ${limit}`),
          transaction.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`${folderCte} SELECT COUNT(*) AS total ${from} WHERE ${whereSql}`),
        ]);
        const ids = idRows.map(({ id }) => id);
        const rows = ids.length ? await transaction.testScenario.findMany({ where: { id: { in: ids }, projectId: params.projectId }, select: summarySelect }) : [];
        const byId = new Map(rows.map(({ folder, ...row }) => [row.id, { ...row, folderName: folder?.name ?? null, matchedSuiteId: params.suiteId ?? null }]));
        const scenarios: TestScenarioSummary[] = [];
        for (const id of ids) {
          const row = byId.get(id);
          if (row) scenarios.push(row);
        }
        const total = Number(totalRows[0]?.total ?? 0n);

        return { scenarios, total };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  },

  async folderBelongsToProject(folderId: string, projectId: string): Promise<boolean> {
    return (await dbClient.testScenarioFolder.findFirst({ where: { id: folderId, projectId }, select: { id: true } })) !== null;
  },

  async suiteBelongsToProject(suiteId: string, projectId: string): Promise<boolean> {
    return (await dbClient.testSuite.findFirst({ where: { id: suiteId, projectId }, select: { id: true } })) !== null;
  },

  async count(
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? dbClient;
    return await client.testScenario.count({ where: { projectId } });
  },

  async findById(
    id: string,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioResponse | null> {
    if (tx) {
      const aggregate = await findAggregate(tx, id, projectId);
      return aggregate ? toResponse(aggregate) : null;
    }

    return await dbClient.$transaction(
      async (transaction) => {
        const aggregate = await findAggregate(transaction, id, projectId);
        return aggregate ? toResponse(aggregate) : null;
      },
      { isolationLevel: "RepeatableRead" },
    );
  },

  async update(
    id: string,
    projectId: string,
    data: UpdateTestScenarioData,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioResponse | null> {
    return await withLockedAggregate(
      id,
      projectId,
      async (client, scenario) => {
        const updateData: Prisma.TestScenarioUpdateInput = {
          ...(data.scenarioKey !== undefined ? { scenarioKey: data.scenarioKey } : {}),
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.details !== undefined ? { details: data.details } : {}),
          ...(data.objective !== undefined
            ? { objective: data.objective }
            : {}),
          ...(data.preconditions !== undefined
            ? { preconditions: data.preconditions }
            : {}),
          ...(data.testData !== undefined ? { testData: data.testData } : {}),
          ...(data.expectedResult !== undefined
            ? { expectedResult: data.expectedResult }
            : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.folderId !== undefined ? { folder: data.folderId ? { connect: { id: data.folderId } } : { disconnect: true } } : {}),
        };
        await client.testScenario.update({
          where: { id: scenario.id },
          data: updateData,
        });
        const contentFields: readonly (keyof UpdateTestScenarioData)[] = [
          "title", "details", "objective", "preconditions", "testData", "expectedResult", "notes",
        ];
        if (!contentFields.some((field) => data[field] !== undefined)) {
          const updated = await findAggregate(client, id, projectId);
          return updated ? toResponse(updated) : null;
        }
        return await refreshProjection(client, id, projectId);
      },
      tx,
    );
  },

  async appendStep(
    params: AppendTestScenarioStepParams,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioResponse | null> {
    return await withLockedAggregate(
      params.scenarioId,
      params.projectId,
      async (client, scenario) => {
        const position =
          scenario.steps.length === 0
            ? 0
            : Math.max(...scenario.steps.map((step) => step.position)) + 1;
        await client.testScenarioStep.create({
          data: {
            testScenarioId: scenario.id,
            position,
            action: params.action,
            expectedResult: params.expectedResult ?? null,
          },
        });
        return await refreshProjection(
          client,
          params.scenarioId,
          params.projectId,
        );
      },
      tx,
    );
  },

  async updateStep(
    params: UpdateTestScenarioStepParams,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioResponse | null> {
    return await withLockedAggregate(
      params.scenarioId,
      params.projectId,
      async (client, scenario) => {
        const step = scenario.steps.find(({ id }) => id === params.stepId);
        if (!step) {
          return null;
        }

        await client.testScenarioStep.update({
          where: { id: step.id },
          data: {
            ...(params.action !== undefined ? { action: params.action } : {}),
            ...(params.expectedResult !== undefined
              ? { expectedResult: params.expectedResult }
              : {}),
          },
        });
        return await refreshProjection(
          client,
          params.scenarioId,
          params.projectId,
        );
      },
      tx,
    );
  },

  async deleteStep(
    params: DeleteTestScenarioStepParams,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioResponse | null> {
    return await withLockedAggregate(
      params.scenarioId,
      params.projectId,
      async (client, scenario) => {
        const step = scenario.steps.find(({ id }) => id === params.stepId);
        if (!step) {
          return null;
        }

        await client.testScenarioStep.delete({ where: { id: step.id } });
        await compactSteps(
          client,
          scenario.id,
          scenario.steps.filter(({ id }) => id !== step.id),
        );
        return await refreshProjection(
          client,
          params.scenarioId,
          params.projectId,
        );
      },
      tx,
    );
  },

  async reorderSteps(
    params: ReorderTestScenarioStepsParams,
    tx?: Prisma.TransactionClient,
  ): Promise<ReorderTestScenarioResult> {
    const result = await withLockedAggregate(
      params.scenarioId,
      params.projectId,
      async (client, scenario): Promise<ReorderTestScenarioResult> => {
        const existingIds = scenario.steps.map(({ id }) => id);
        const requestedIds = params.stepIds;
        const idsAreValid =
          requestedIds.length === existingIds.length &&
          new Set(requestedIds).size === requestedIds.length &&
          requestedIds.every((id) => existingIds.includes(id));

        if (!idsAreValid) {
          return { kind: "invalid-order" };
        }

        const orderedSteps = requestedIds.map(
          (id) =>
            scenario.steps.find((step) => step.id === id) as TestScenarioStep,
        );
        await compactSteps(client, scenario.id, orderedSteps);
        return {
          kind: "success",
          scenario: await refreshProjection(
            client,
            params.scenarioId,
            params.projectId,
          ),
        };
      },
      tx,
    );

    return result ?? { kind: "not-found" };
  },

  async delete(
    id: string,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await withLockedAggregate(
      id,
      projectId,
      async (client, scenario) => {
        await client.testScenario.delete({ where: { id: scenario.id } });
        return 1;
      },
      tx,
    );

    return result ?? 0;
  },
};
