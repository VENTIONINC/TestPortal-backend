// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import {
  hashTestScenarioMarkdown,
  renderTestScenarioMarkdown,
} from "@/lib/testScenarioMarkdown";
import { testScenarioModel } from "@/models/testScenarioModel";
import { testScenarioService } from "@/services/testScenarioService";
import type {
  CreateTestScenarioParams,
  TestScenarioResponse,
} from "@/types/testScenarios";

// Run explicitly against an isolated PostgreSQL database with:
// RUN_POSTGRES_INTEGRATION_TESTS=1 DATABASE_URL="..." npm test -- --runInBand __tests__/test-scenarios/testScenarioPostgresIntegration.test.ts
const postgresIntegrationEnabled =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";
const describePostgres = postgresIntegrationEnabled ? describe : describe.skip;
const databaseUrl = process.env.DATABASE_URL ?? "";
const userId = randomUUID();
const projectId = randomUUID();
const otherUserId = randomUUID();
const otherProjectId = randomUUID();

async function createScenario(
  data: Omit<CreateTestScenarioParams, "projectId" | "createdById">,
): Promise<TestScenarioResponse> {
  const scenario = await testScenarioModel.create({
    projectId,
    createdById: userId,
    ...data,
  });

  if (!scenario) {
    throw new Error("Failed to create PostgreSQL integration scenario");
  }

  return scenario;
}

async function createScenarioFor(
  scopedProjectId: string,
  scopedUserId: string,
  data: Omit<CreateTestScenarioParams, "projectId" | "createdById">,
): Promise<TestScenarioResponse> {
  const scenario = await testScenarioModel.create({
    projectId: scopedProjectId,
    createdById: scopedUserId,
    ...data,
  });

  if (!scenario) {
    throw new Error("Failed to create scoped PostgreSQL integration scenario");
  }

  return scenario;
}

async function getScenario(scenarioId: string): Promise<TestScenarioResponse> {
  const scenario = await testScenarioModel.findById(scenarioId, projectId);
  if (!scenario) {
    throw new Error(`Scenario ${scenarioId} was not found`);
  }

  return scenario;
}

async function expectProjectionConsistency(
  scenario: TestScenarioResponse,
): Promise<void> {
  const expectedContent = renderTestScenarioMarkdown({
    title: scenario.title,
    details: scenario.details,
    objective: scenario.objective,
    preconditions: scenario.preconditions,
    testData: scenario.testData,
    steps: scenario.steps,
    expectedResult: scenario.expectedResult,
    notes: scenario.notes,
  });
  const persistedScenario = await dbClient.testScenario.findUnique({
    where: { id: scenario.id },
  });
  const persistedSteps = await dbClient.testScenarioStep.findMany({
    where: { testScenarioId: scenario.id },
    orderBy: { position: "asc" },
  });

  expect(scenario.contentMd).toBe(expectedContent);
  expect(scenario.contentMdHash).toBe(
    hashTestScenarioMarkdown(expectedContent),
  );
  expect(scenario.contentMdFormatVersion).toBe(1);
  expect(persistedScenario?.contentMd).toBe(expectedContent);
  expect(persistedScenario?.contentMdHash).toBe(
    hashTestScenarioMarkdown(expectedContent),
  );
  expect(persistedScenario?.contentMdFormatVersion).toBe(1);
  expect(
    persistedSteps.map(({ id, position, action, expectedResult }) => ({
      id,
      position,
      action,
      expectedResult,
    })),
  ).toEqual(scenario.steps);
}

describePostgres("test scenario PostgreSQL aggregate integration", () => {
  beforeAll(async () => {
    if (!databaseUrl.startsWith("postgresql://")) {
      throw new Error(
        "RUN_POSTGRES_INTEGRATION_TESTS=1 requires a PostgreSQL DATABASE_URL",
      );
    }

    await dbClient.user.create({
      data: {
        id: userId,
        name: "Test Scenario PostgreSQL Integration",
        email: `test-scenario-postgres-${userId}@example.test`,
      },
    });
    await dbClient.user.create({
      data: {
        id: otherUserId,
        name: "Other Test Scenario PostgreSQL Integration",
        email: `test-scenario-postgres-${otherUserId}@example.test`,
      },
    });
    await dbClient.project.create({
      data: {
        id: projectId,
        name: `Test Scenario PostgreSQL Integration ${projectId}`,
        ownerId: userId,
      },
    });
    await dbClient.project.create({
      data: {
        id: otherProjectId,
        name: `Other Test Scenario PostgreSQL Integration ${otherProjectId}`,
        ownerId: otherUserId,
      },
    });
  });

  beforeEach(async () => {
    await dbClient.testScenario.deleteMany({
      where: { projectId: { in: [projectId, otherProjectId] } },
    });
  });

  afterAll(async () => {
    await dbClient.testScenario.deleteMany({
      where: { projectId: { in: [projectId, otherProjectId] } },
    });
    await dbClient.project.deleteMany({
      where: { id: { in: [projectId, otherProjectId] } },
    });
    await dbClient.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    await dbClient.$disconnect();
  });

  it("filters literal titles within the project and paginates matching totals", async () => {
    const literal = await createScenario({
      title: "Login %_\\\\ markers",
    });
    const otherCreator = await createScenarioFor(projectId, otherUserId, {
      title: "Login from another creator",
    });
    await createScenario({
      title: "Mixed Case Checkout",
      details: "login appears only in details",
    });
    await createScenario({
      title: "Checkout action",
      steps: [{ action: "Login is only in a step" }],
    });
    await createScenarioFor(otherProjectId, otherUserId, {
      title: "Login foreign project",
    });

    const titleMatches = await testScenarioService.listScenarios({
      projectId,
      search: "  LOGIN  ",
      page: 1,
      limit: 1,
    });
    expect(titleMatches.total).toBe(2);
    expect(titleMatches.totalPages).toBe(2);
    expect(titleMatches.scenarios).toHaveLength(1);
    expect(
      titleMatches.scenarios.every(
        ({ projectId: resultProjectId }) => resultProjectId === projectId,
      ),
    ).toBe(true);

    const outOfRange = await testScenarioService.listScenarios({
      projectId,
      search: "login",
      page: 3,
      limit: 1,
    });
    expect(outOfRange.scenarios).toEqual([]);
    expect(outOfRange.total).toBe(2);

    const creatorMatches = await testScenarioService.listScenarios({
      projectId,
      search: "login",
      createdById: otherUserId,
    });
    expect(creatorMatches.total).toBe(1);
    expect(creatorMatches.scenarios[0]?.id).toBe(otherCreator.id);
    expect(creatorMatches.scenarios[0]?.createdBy).toEqual({
      id: otherUserId,
      name: "Other Test Scenario PostgreSQL Integration",
      email: `test-scenario-postgres-${otherUserId}@example.test`,
    });

    const literalMatches = await testScenarioService.listScenarios({
      projectId,
      search: "%_\\\\",
    });
    expect(literalMatches.total).toBe(1);
    expect(literalMatches.scenarios[0]?.id).toBe(literal.id);

    const summaryKeys = Object.keys(literalMatches.scenarios[0] ?? {}).sort();
    expect(summaryKeys).toEqual([
      "createdAt",
      "createdBy",
      "createdById",
      "details",
      "id",
      "projectId",
      "title",
      "updatedAt",
    ]);
    expect(
      Object.keys(literalMatches.scenarios[0]?.createdBy ?? {}).sort(),
    ).toEqual(["email", "id", "name"]);
  });

  it("uses deterministic tie-breakers for every supported sort", async () => {
    const first = await createScenario({ title: "Sort first" });
    const second = await createScenario({ title: "Sort second" });
    const sameTimestamp = new Date("2026-01-01T00:00:00.000Z");

    await dbClient.testScenario.updateMany({
      where: { id: { in: [first.id, second.id] } },
      data: { createdAt: sameTimestamp, updatedAt: sameTimestamp },
    });

    const createdOrder = await testScenarioModel.listSummaries({
      projectId,
      search: "Sort",
      sort: "recently_created",
    });
    expect(createdOrder.scenarios.map(({ id }) => id)).toEqual(
      [first.id, second.id].sort().reverse(),
    );

    const updatedOrder = await testScenarioModel.listSummaries({
      projectId,
      search: "Sort",
      sort: "recently_updated",
    });
    expect(updatedOrder.scenarios.map(({ id }) => id)).toEqual(
      [first.id, second.id].sort().reverse(),
    );

    await dbClient.testScenario.updateMany({
      where: { id: { in: [first.id, second.id] } },
      data: { title: "Same sort title" },
    });
    const titleOrder = await testScenarioModel.listSummaries({
      projectId,
      search: "Same sort title",
      sort: "title_asc",
    });
    expect(titleOrder.scenarios.map(({ id }) => id)).toEqual(
      [first.id, second.id].sort(),
    );
  });

  it("serializes concurrent appends into distinct dense positions", async () => {
    const scenario = await createScenario({ title: "Concurrent appends" });
    const actions = [
      "Open login",
      "Enter credentials",
      "Submit form",
      "Verify dashboard",
    ];

    const appendResults = await Promise.all(
      actions.map((action) =>
        testScenarioModel.appendStep({
          scenarioId: scenario.id,
          projectId,
          action,
        }),
      ),
    );

    expect(appendResults.every((result) => result !== null)).toBe(true);
    const finalScenario = await getScenario(scenario.id);
    expect(finalScenario.steps).toHaveLength(actions.length);
    expect(finalScenario.steps.map(({ position }) => position)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(new Set(finalScenario.steps.map(({ id }) => id)).size).toBe(
      actions.length,
    );
    expect(finalScenario.steps.map(({ action }) => action).sort()).toEqual(
      [...actions].sort(),
    );
    await expectProjectionConsistency(finalScenario);
  });

  it("keeps append and reorder races lossless", async () => {
    const scenario = await createScenario({
      title: "Reorder versus append",
      steps: [{ action: "First" }, { action: "Second" }, { action: "Third" }],
    });
    const requestedOrder = [...scenario.steps].reverse().map(({ id }) => id);

    const [reorderResult, appendResult] = await Promise.all([
      testScenarioModel.reorderSteps({
        scenarioId: scenario.id,
        projectId,
        stepIds: requestedOrder,
      }),
      testScenarioModel.appendStep({
        scenarioId: scenario.id,
        projectId,
        action: "Appended",
      }),
    ]);

    expect(reorderResult.kind).not.toBe("not-found");
    expect(appendResult).not.toBeNull();
    const finalScenario = await getScenario(scenario.id);
    expect(finalScenario.steps.map(({ position }) => position)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(finalScenario.steps.map(({ action }) => action).sort()).toEqual(
      ["First", "Second", "Third", "Appended"].sort(),
    );
    await expectProjectionConsistency(finalScenario);
  });

  it("keeps delete and reorder races lossless", async () => {
    const scenario = await createScenario({
      title: "Reorder versus delete",
      steps: [
        { action: "Keep first" },
        { action: "Delete me" },
        { action: "Keep last" },
      ],
    });
    const deletedStepId = scenario.steps[1]?.id;
    if (!deletedStepId) {
      throw new Error("Expected a middle step for the race test");
    }
    const requestedOrder = [...scenario.steps].reverse().map(({ id }) => id);

    const [reorderResult, deleteResult] = await Promise.all([
      testScenarioModel.reorderSteps({
        scenarioId: scenario.id,
        projectId,
        stepIds: requestedOrder,
      }),
      testScenarioModel.deleteStep({
        scenarioId: scenario.id,
        projectId,
        stepId: deletedStepId,
      }),
    ]);

    expect(reorderResult.kind).not.toBe("not-found");
    expect(deleteResult).not.toBeNull();
    const finalScenario = await getScenario(scenario.id);
    expect(finalScenario.steps.map(({ id }) => id)).not.toContain(
      deletedStepId,
    );
    expect(finalScenario.steps.map(({ action }) => action).sort()).toEqual(
      ["Keep first", "Keep last"].sort(),
    );
    expect(finalScenario.steps.map(({ position }) => position)).toEqual([0, 1]);
    await expectProjectionConsistency(finalScenario);
  });

  it("rolls back structured, step, and projection changes after a transaction failure", async () => {
    const scenario = await createScenario({
      title: "Rollback",
      details: "Before",
      steps: [{ action: "Stable" }],
    });
    const before = await getScenario(scenario.id);

    await expect(
      dbClient.$transaction(async (tx) => {
        const updated = await testScenarioModel.appendStep(
          {
            scenarioId: scenario.id,
            projectId,
            action: "Must roll back",
          },
          tx,
        );
        expect(updated?.steps.map(({ action }) => action)).toContain(
          "Must roll back",
        );
        await tx.$executeRaw(Prisma.sql`SELECT 1 / 0`);
      }),
    ).rejects.toThrow();

    const after = await getScenario(scenario.id);
    expect(after).toEqual(before);
    await expectProjectionConsistency(after);
  });

  it("keeps structured fields, ordered steps, generated Markdown, and hash consistent", async () => {
    const scenario = await createScenario({
      title: "Unicode checkout ✅",
      details: "Line one\r\nLine two",
      objective: "Confirm the purchase flow",
      preconditions: "A signed-in customer exists",
      testData: "Card ending in 4242",
      expectedResult: "The order is accepted",
      notes: "Review the receipt\nwith the customer",
      steps: [
        {
          action: "Enter shipping address\r\nusing valid data",
          expectedResult: "Address is accepted",
        },
        {
          action: "Pay with the test card",
          expectedResult: "Payment succeeds",
        },
      ],
    });

    const persisted = await getScenario(scenario.id);
    expect(persisted).toMatchObject({
      title: scenario.title,
      details: "Line one\r\nLine two",
      objective: scenario.objective,
      preconditions: scenario.preconditions,
      testData: scenario.testData,
      expectedResult: scenario.expectedResult,
      notes: scenario.notes,
    });
    expect(persisted.steps).toEqual(scenario.steps);
    expect(persisted.contentMd).not.toMatch(/\r/);
    expect(persisted.contentMd.endsWith("\n")).toBe(true);
    await expectProjectionConsistency(persisted);
  });
});
