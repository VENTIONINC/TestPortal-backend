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
  details: true,
  createdAt: true,
  updatedAt: true,
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
  "projectId" | "page" | "limit" | "search" | "createdById" | "sort"
>;

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function summaryWhere(
  params: SummaryListParams,
): Prisma.TestScenarioWhereInput {
  return {
    projectId: params.projectId,
    ...(params.createdById ? { createdById: params.createdById } : {}),
    ...(params.search
      ? {
          title: {
            contains: escapeLikePattern(params.search),
            mode: "insensitive",
          },
        }
      : {}),
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
    createdById: scenario.createdById,
    title: scenario.title,
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
    title: data.title,
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
    const where = summaryWhere(params);
    const orderBy = summaryOrderBy(params.sort);

    return await dbClient.$transaction(
      async (transaction) => {
        const [scenarios, total] = await Promise.all([
          transaction.testScenario.findMany({
            where,
            select: summarySelect,
            skip: (page - 1) * limit,
            take: limit,
            orderBy,
          }),
          transaction.testScenario.count({ where }),
        ]);

        return { scenarios, total };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
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
        };
        await client.testScenario.update({
          where: { id: scenario.id },
          data: updateData,
        });
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
