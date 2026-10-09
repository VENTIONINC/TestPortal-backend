// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import express from "express";
import request from "supertest";
import { dbClient } from "@/prisma/client";
import {
  hashTestScenarioMarkdown,
  renderTestScenarioMarkdown,
} from "@/lib/testScenarioMarkdown";
import { testScenarioModel } from "@/models/testScenarioModel";
import { testScenarioService } from "@/services/testScenarioService";
import { testScenarioOrganizationService as organization } from "@/services/testScenarioOrganizationService";
import { projectModel } from "@/models/projectModel";
import { TestScenarioNotFoundError } from "@/types/testScenarios";
import { jwtService } from "@/services/jwtService";
import organizationRouter from "@/routes/test-scenario-organization";
import type {
  CreateTestScenarioParams,
  TestScenarioResponse,
} from "@/types/testScenarios";

// Run explicitly against an isolated PostgreSQL database with:
// TEST_DATABASE_URL="..." npm run test:integration -- --runTestsByPath __tests__/test-scenarios/testScenarioPostgresIntegration.test.ts
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
    await dbClient.testSuite.deleteMany({ where: { projectId: { in: [projectId, otherProjectId] } } });
    await dbClient.testScenarioFolder.deleteMany({ where: { projectId: { in: [projectId, otherProjectId] } } });
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
      "folderId",
      "folderName",
      "id",
      "matchedSuiteId",
      "projectId",
      "scenarioKey",
      "title",
      "updatedAt",
    ]);
    expect(
      Object.keys(literalMatches.scenarios[0]?.createdBy ?? {}).sort(),
    ).toEqual(["email", "id", "name"]);
  });

  it("combines column filters and sorts summaries by displayed folder paths before pagination", async () => {
    const root = await organization.createFolder({ projectId, name: "Root" });
    const child = await organization.createFolder({ projectId, name: "Child", parentId: root.id });
    const nested = await createScenario({ title: "Alpha nested", scenarioKey: "KEY-1", details: "Special detail", folderId: child.id });
    const nestedSecond = await createScenario({ title: "Alpha second", scenarioKey: "KEY-1", details: "Special detail", folderId: child.id });
    const unfiled = await createScenario({ title: "Beta unfiled", scenarioKey: "KEY-2", details: "Special detail" });
    await createScenarioFor(otherProjectId, otherUserId, { title: "Alpha foreign", scenarioKey: "KEY-1", folderId: (await organization.createFolder({ projectId: otherProjectId, name: "Root" })).id });

    const combined = await testScenarioService.listScenarios({
      projectId,
      scenarioKey: "key-1",
      title: "ALPHA",
      details: "special",
      createdBy: "test-scenario-postgres-",
      sortField: "title",
      sortDirection: "asc",
      page: 1,
      limit: 1,
    });
    expect(combined.total).toBe(2);
    expect(combined.totalPages).toBe(2);
    expect(combined.scenarios.map(({ id }) => id)).toEqual([nested.id]);
    const combinedSecondPage = await testScenarioService.listScenarios({ projectId, scenarioKey: "key-1", title: "ALPHA", details: "special", createdBy: "test-scenario-postgres-", sortField: "title", sortDirection: "asc", page: 2, limit: 1 });
    expect(combinedSecondPage.scenarios.map(({ id }) => id)).toEqual([nestedSecond.id]);

    const nestedPath = await testScenarioService.listScenarios({ projectId, folder: "root / child" });
    expect(nestedPath.scenarios.map(({ id }) => id)).toEqual([nested.id, nestedSecond.id]);
    const unfiledPath = await testScenarioService.listScenarios({ projectId, folder: " UNFILED " });
    expect(unfiledPath.scenarios.map(({ id }) => id)).toEqual([unfiled.id]);

    const folderOrder = await testScenarioService.listScenarios({ projectId, sortField: "folder", sortDirection: "asc" });
    expect(folderOrder.scenarios.map(({ id }) => id)).toEqual([nested.id, unfiled.id]);
  });

  it("sorts every supported column in both directions with stable defaults", async () => {
    const alphaFolder = await organization.createFolder({ projectId, name: "Alpha folder" });
    const alpha = await createScenario({ title: "Alpha", scenarioKey: "A", details: "A detail", folderId: alphaFolder.id });
    const zeta = await createScenarioFor(projectId, otherUserId, { title: "Zeta", scenarioKey: "Z", details: "Z detail" });
    await dbClient.testScenario.update({ where: { id: alpha.id }, data: { createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-02T00:00:00Z") } });
    await dbClient.testScenario.update({ where: { id: zeta.id }, data: { createdAt: new Date("2026-01-03T00:00:00Z"), updatedAt: new Date("2026-01-04T00:00:00Z") } });

    for (const field of ["scenarioKey", "title", "details", "createdAt", "updatedAt"] as const) {
      const ascending = await testScenarioService.listScenarios({ projectId, sortField: field, sortDirection: "asc" });
      expect(ascending.scenarios.map(({ id }) => id)).toEqual([alpha.id, zeta.id]);
      const descending = await testScenarioService.listScenarios({ projectId, sortField: field, sortDirection: "desc" });
      expect(descending.scenarios.map(({ id }) => id)).toEqual([zeta.id, alpha.id]);
    }
    const creatorAscending = await testScenarioService.listScenarios({ projectId, sortField: "createdBy", sortDirection: "asc" });
    expect(creatorAscending.scenarios.map(({ id }) => id)).toEqual([zeta.id, alpha.id]);
    const creatorDescending = await testScenarioService.listScenarios({ projectId, sortField: "createdBy", sortDirection: "desc" });
    expect(creatorDescending.scenarios.map(({ id }) => id)).toEqual([alpha.id, zeta.id]);
    const folderAscending = await testScenarioService.listScenarios({ projectId, sortField: "folder", sortDirection: "asc" });
    expect(folderAscending.scenarios.map(({ id }) => id)).toEqual([alpha.id, zeta.id]);
    const folderDescending = await testScenarioService.listScenarios({ projectId, sortField: "folder", sortDirection: "desc" });
    expect(folderDescending.scenarios.map(({ id }) => id)).toEqual([zeta.id, alpha.id]);
    const defaultOrder = await testScenarioService.listScenarios({ projectId });
    expect(defaultOrder.scenarios.map(({ id }) => id)).toEqual([zeta.id, alpha.id]);
  });

  it("orders nullable keys and details using PostgreSQL null ordering and stable ID ties", async () => {
    const keyed = await createScenario({ title: "Nullable keyed", scenarioKey: "A", details: "Present" });
    const noKey = await createScenario({ title: "Nullable without key", scenarioKey: null });
    const tiedFirst = await createScenario({ title: "Tie" });
    const tiedSecond = await createScenario({ title: "Tie" });

    const keyAscending = await testScenarioService.listScenarios({ projectId, title: "Nullable", sortField: "scenarioKey", sortDirection: "asc" });
    expect(keyAscending.scenarios.map(({ id }) => id)).toEqual([keyed.id, noKey.id]);
    const keyDescending = await testScenarioService.listScenarios({ projectId, title: "Nullable", sortField: "scenarioKey", sortDirection: "desc" });
    expect(keyDescending.scenarios.map(({ id }) => id)).toEqual([noKey.id, keyed.id]);
    const detailsAscending = await testScenarioService.listScenarios({ projectId, title: "Nullable", sortField: "details", sortDirection: "asc" });
    expect(detailsAscending.scenarios.map(({ id }) => id)).toEqual([keyed.id, noKey.id]);
    const titleTies = await testScenarioService.listScenarios({ projectId, title: "Tie", sortField: "title", sortDirection: "asc" });
    expect(titleTies.scenarios.map(({ id }) => id)).toEqual([tiedFirst.id, tiedSecond.id].sort());
  });

  it("searches keys literally and case-insensitively without duplicating overlapping matches", async () => {
    const keyOnly = await createScenario({
      title: "Payment history",
      scenarioKey: "PAY-Case-42",
    });
    const overlap = await createScenario({
      title: "Checkout DUP-42 flow",
      scenarioKey: "DUP-42",
    });
    const duplicateKey = await createScenarioFor(projectId, otherUserId, {
      title: "Refund flow",
      scenarioKey: "DUP-42",
    });
    const specialKey = await createScenario({
      title: "Special key lookup",
      scenarioKey: "R%_\\\\-alpha",
    });
    await createScenarioFor(otherProjectId, otherUserId, {
      title: "Foreign duplicate key",
      scenarioKey: "DUP-42",
    });
    const nullKey = await createScenario({
      title: "Null-key registration",
      scenarioKey: null,
    });
    await createScenario({
      title: "Billing details only",
      details: "PAY-Case-42 appears only in details",
    });

    const keyMatches = await testScenarioService.listScenarios({
      projectId,
      search: "pay-case",
    });
    expect(keyMatches.total).toBe(1);
    expect(keyMatches.scenarios[0]?.id).toBe(keyOnly.id);

    const duplicateMatches = await testScenarioService.listScenarios({
      projectId,
      search: "dup-42",
    });
    expect(duplicateMatches.total).toBe(2);
    expect(duplicateMatches.scenarios.map(({ id }) => id).sort()).toEqual(
      [overlap.id, duplicateKey.id].sort(),
    );

    const creatorMatches = await testScenarioService.listScenarios({
      projectId,
      search: "DUP-42",
      createdById: otherUserId,
    });
    expect(creatorMatches.total).toBe(1);
    expect(creatorMatches.scenarios[0]?.id).toBe(duplicateKey.id);

    const literalKeyMatches = await testScenarioService.listScenarios({
      projectId,
      search: "R%_\\\\",
    });
    expect(literalKeyMatches.total).toBe(1);
    expect(literalKeyMatches.scenarios[0]?.id).toBe(specialKey.id);

    const nullKeyTitleMatch = await testScenarioService.listScenarios({
      projectId,
      search: "NULL-KEY",
    });
    expect(nullKeyTitleMatch.total).toBe(1);
    expect(nullKeyTitleMatch.scenarios[0]?.id).toBe(nullKey.id);

    const detailsOnly = await testScenarioService.listScenarios({
      projectId,
      search: "PAY-Case-42 appears only in details",
    });
    expect(detailsOnly.total).toBe(0);
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

  it("keeps folder and suite organization project-scoped and supports ordered membership", async () => {
    const root = await organization.createFolder({ projectId, name: "Product" });
    const child = await organization.createFolder({ projectId, name: "Login", parentId: root.id });
    await organization.updateFolder({ projectId, folderId: child.id, name: "Sign-in", position: 2 });
    const billing = await organization.createFolder({ projectId, name: "Billing", parentId: root.id, position: 1 });
    const alternate = await organization.createFolder({ projectId, name: "Alternate", position: 3 });
    await organization.updateFolder({ projectId, folderId: child.id, parentId: alternate.id });
    await organization.updateFolder({ projectId, folderId: child.id, parentId: root.id });
    const tree = await organization.listFolders(projectId) as Array<{ id: string; children: Array<{ id: string }> }>;
    expect(tree.find(({ id }) => id === root.id)?.children.map(({ id }) => id)).toEqual([billing.id, child.id]);
    await expect(organization.updateFolder({ projectId, folderId: root.id, parentId: child.id })).rejects.toMatchObject({ status: 400 });
    const level3 = await organization.createFolder({ projectId, name: "Level 3", parentId: child.id });
    const level4 = await organization.createFolder({ projectId, name: "Level 4", parentId: level3.id });
    const level5 = await organization.createFolder({ projectId, name: "Level 5", parentId: level4.id });
    await expect(organization.createFolder({ projectId, name: "Too deep", parentId: level5.id })).rejects.toMatchObject({ status: 400 });
    const foreignParent = await organization.createFolder({ projectId: otherProjectId, name: "Foreign parent" });
    await expect(organization.createFolder({ projectId, name: "Cross-project child", parentId: foreignParent.id })).rejects.toMatchObject({ status: 404 });
    const first = await createScenario({ title: "Login" });
    const second = await createScenario({ title: "Logout" });
    const third = await createScenario({ title: "Signup", folderId: child.id });
    await organization.moveScenarios({ projectId, scenarioIds: [first.id], folderId: child.id });
    await organization.moveScenarios({ projectId, scenarioIds: [second.id], folderId: root.id });
    expect((await getScenario(third.id)).folderId).toBe(child.id);
    await testScenarioService.updateScenario({ scenarioId: third.id, projectId, title: "Signup updated" });
    const updatedThird = await getScenario(third.id);
    expect(updatedThird.folderId).toBe(child.id);
    await testScenarioService.updateScenario({ scenarioId: third.id, projectId, folderId: null });
    expect(await getScenario(third.id)).toMatchObject({ folderId: null, contentMd: updatedThird.contentMd });
    const foreignAssignment = await organization.createFolder({ projectId: otherProjectId, name: "Not for this project" });
    await expect(testScenarioService.updateScenario({ scenarioId: third.id, projectId, folderId: foreignAssignment.id })).rejects.toBeInstanceOf(TestScenarioNotFoundError);
    await expect(organization.createFolder({ projectId, name: "product" })).rejects.toMatchObject({ status: 409 });
    const suite = await organization.createSuite({ projectId, name: "Smoke", purpose: "Critical route" });
    await expect(organization.createSuite({ projectId, name: "smoke" })).rejects.toMatchObject({ status: 409 });
    await organization.mutateMembers({ projectId, suiteId: suite.id, scenarioIds: [first.id, second.id], operation: "add" });
    await organization.mutateMembers({ projectId, suiteId: suite.id, scenarioIds: [first.id], operation: "add" });
    await organization.reorderMembers({ projectId, suiteId: suite.id, scenarioIds: [second.id, first.id] });
    await expect(organization.reorderMembers({ projectId, suiteId: suite.id, scenarioIds: [first.id] })).rejects.toMatchObject({ status: 400 });
    await Promise.all([
      organization.mutateMembers({ projectId, suiteId: suite.id, scenarioIds: [third.id], operation: "add" }),
      organization.mutateMembers({ projectId, suiteId: suite.id, scenarioIds: [third.id], operation: "add" }),
    ]);
    await expect(organization.mutateMembers({ projectId, suiteId: suite.id, scenarioIds: [first.id, randomUUID()], operation: "add" })).rejects.toMatchObject({ status: 404 });
    const nonMember = await createScenario({ title: "Not in this suite" });
    await organization.mutateMembers({ projectId, suiteId: suite.id, scenarioIds: [nonMember.id], operation: "remove" });

    const filtered = await testScenarioService.listScenarios({ projectId, folderId: root.id, suiteId: suite.id });
    expect(filtered.total).toBe(2);
    expect(filtered.scenarios.map(({ id }) => id).sort()).toEqual([first.id, second.id].sort());
    expect(filtered.scenarios.find(({ id }) => id === first.id)).toMatchObject({ folderId: child.id, folderName: "Sign-in", matchedSuiteId: suite.id });
    await organization.updateSuite({ projectId, suiteId: suite.id, description: "Current smoke selection", release: "R1" });
    expect(await organization.getSuite(projectId, suite.id)).toMatchObject({ description: "Current smoke selection", release: "R1" });
    const direct = await testScenarioService.listScenarios({ projectId, folderId: root.id, includeDescendants: false });
    expect(direct.total).toBe(1);
    expect(direct.scenarios.map(({ id }) => id)).toEqual([second.id]);
    const outOfRange = await testScenarioService.listScenarios({ projectId, folderId: root.id, suiteId: suite.id, page: 3, limit: 1 });
    expect(outOfRange).toMatchObject({ scenarios: [], total: 2, page: 3, limit: 1, totalPages: 2 });
    await expect(organization.moveScenarios({ projectId, scenarioIds: [first.id, randomUUID()], folderId: root.id })).rejects.toMatchObject({ status: 404 });
    expect((await getScenario(first.id)).folderId).toBe(child.id);
    expect(await organization.moveScenarios({ projectId, scenarioIds: [second.id], folderId: null })).toEqual({ moved: 1 });
    expect((await getScenario(second.id)).folderId).toBeNull();
    expect((await organization.listSuites(projectId))[0]?.members.map(({ testScenarioId }) => testScenarioId)).toEqual([second.id, first.id, third.id]);
    await organization.deleteSuite(projectId, suite.id);
    expect(await dbClient.testScenario.findMany({ where: { id: { in: [first.id, second.id, third.id] } } })).toHaveLength(3);
    const foreign = await organization.createFolder({ projectId: otherProjectId, name: "Foreign" });
    expect(foreign.projectId).toBe(otherProjectId);
    await expect(organization.moveScenarios({ projectId, scenarioIds: [first.id], folderId: foreign.id })).rejects.toMatchObject({ status: 404 });
    const foreignSuite = await organization.createSuite({ projectId: otherProjectId, name: "Foreign suite" });
    await expect(testScenarioService.listScenarios({ projectId, suiteId: foreignSuite.id })).rejects.toBeInstanceOf(TestScenarioNotFoundError);

    await organization.deleteFolder({ projectId, folderId: root.id, disposition: "unfiled" });
    expect(await dbClient.testScenario.findUnique({ where: { id: first.id }, select: { folderId: true } })).toEqual({ folderId: child.id });
    expect(await dbClient.testScenario.findUnique({ where: { id: second.id }, select: { folderId: true } })).toEqual({ folderId: null });
    expect(await dbClient.testScenarioFolder.findFirst({ where: { id: child.id }, select: { parentId: true } })).toEqual({ parentId: null });
  });

  it("cascades project deletion through its folders, suites, and memberships only", async () => {
    const folder = await organization.createFolder({ projectId, name: "Delete with project" });
    const foreignFolder = await organization.createFolder({ projectId: otherProjectId, name: "Keep foreign" });
    const scenario = await createScenario({ title: "Project cascade" });
    const suite = await organization.createSuite({ projectId, name: "Delete with project" });
    await organization.mutateMembers({ projectId, suiteId: suite.id, scenarioIds: [scenario.id], operation: "add" });

    await projectModel.deleteWithCascade(projectId);

    expect(await dbClient.testScenarioFolder.findFirst({ where: { id: folder.id } })).toBeNull();
    expect(await dbClient.testSuite.findFirst({ where: { id: suite.id } })).toBeNull();
    expect(await dbClient.testScenario.findFirst({ where: { id: scenario.id } })).toBeNull();
    expect(await dbClient.testScenarioFolder.findFirst({ where: { id: foreignFolder.id } })).not.toBeNull();
  });

  it("serves authenticated folder and suite operations and validates organization requests", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", organizationRouter);
    const routeProjectId = otherProjectId;
    const token = jwtService.generateAccessToken({ userId: otherUserId, email: `test-scenario-postgres-${otherUserId}@example.test` });

    await request(app).get(`/api/v2/test-scenario-folders?projectId=${routeProjectId}`).expect(401);
    const folder = await request(app).post("/api/v2/test-scenario-folders").set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, name: "REST folder" }).expect(201);
    await request(app).post("/api/v2/test-scenario-folders").set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, name: "rest folder" }).expect(409);
    await request(app).post("/api/v2/test-scenario-folders").set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, name: "   " }).expect(400);
    await request(app).get(`/api/v2/test-scenario-folders?projectId=${routeProjectId}`).set("Authorization", `Bearer ${token}`).expect(200);
    await request(app).patch(`/api/v2/test-scenario-folders/${folder.body.id}?projectId=${routeProjectId}`).set("Authorization", `Bearer ${token}`).send({ name: "Renamed folder" }).expect(200);
    const suite = await request(app).post("/api/v2/test-suites").set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, name: "REST suite", purpose: "API contract", release: "R2" }).expect(201);
    expect(suite.body).toMatchObject({ purpose: "API contract", release: "R2" });
    await request(app).post("/api/v2/test-suites").set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, name: "rest suite" }).expect(409);
    const routeScenario = await createScenarioFor(routeProjectId, otherUserId, { title: "REST member" });
    await request(app).post(`/api/v2/test-suites/${suite.body.id}/members`).set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, scenarioIds: [routeScenario.id] }).expect(200);
    await request(app).put(`/api/v2/test-suites/${suite.body.id}/members/order`).set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, scenarioIds: [routeScenario.id] }).expect(200);
    await request(app).delete(`/api/v2/test-suites/${suite.body.id}/members`).set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, scenarioIds: [routeScenario.id] }).expect(200);
    await request(app).get(`/api/v2/test-suites/${suite.body.id}?projectId=${routeProjectId}`).set("Authorization", `Bearer ${token}`).expect(200);
    await request(app).get(`/api/v2/test-suites/${suite.body.id}?projectId=${projectId}`).set("Authorization", `Bearer ${token}`).expect(404);
    await request(app).patch("/api/v2/test-scenarios/bulk-folder").set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, scenarioIds: [], folderId: null }).expect(400);
    await request(app).delete(`/api/v2/test-scenario-folders/${randomUUID()}?projectId=${routeProjectId}&disposition=unfiled`).set("Authorization", `Bearer ${token}`).expect(404);
    const assignmentFolder = await organization.createFolder({ projectId: routeProjectId, name: "REST assignment" });
    await request(app).patch("/api/v2/test-scenarios/bulk-folder").set("Authorization", `Bearer ${token}`).send({ projectId: routeProjectId, scenarioIds: [routeScenario.id], folderId: assignmentFolder.id }).expect(200);
    await request(app).delete(`/api/v2/test-scenario-folders/${assignmentFolder.id}?projectId=${routeProjectId}&disposition=unfiled`).set("Authorization", `Bearer ${token}`).expect(200);
  });
});
