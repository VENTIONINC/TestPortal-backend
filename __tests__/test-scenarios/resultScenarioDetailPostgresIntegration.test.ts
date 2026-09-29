// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { dbClient } from "@/prisma/client";
import { executeController } from "@/test-utils/httpMocks";
import { resultController } from "@/controllers/resultController";
import { testScenarioModel } from "@/models/testScenarioModel";
import { testScenarioIntegrationService } from "@/services/testScenarioIntegrationService";
import type { RelatedTestScenarioSummary } from "@/types/testScenarios";

// Run explicitly against an isolated PostgreSQL database with:
// RUN_POSTGRES_INTEGRATION_TESTS=1 DATABASE_URL="..." npm test -- --runInBand __tests__/test-scenarios/resultScenarioDetailPostgresIntegration.test.ts
const postgresIntegrationEnabled =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";
const describePostgres = postgresIntegrationEnabled ? describe : describe.skip;
const databaseUrl = process.env.DATABASE_URL ?? "";
const userId = randomUUID();
const projectId = randomUUID();
const otherProjectId = randomUUID();
const resultId = randomUUID();

async function createScenario(
  scenarioProjectId: string,
  title: string,
  details?: string,
) {
  const scenario = await testScenarioModel.create({
    projectId: scenarioProjectId,
    createdById: userId,
    title,
    ...(details !== undefined ? { details } : {}),
  });
  if (!scenario) {
    throw new Error(`Failed to create integration scenario '${title}'`);
  }
  return scenario;
}

async function requestRelatedScenarios(): Promise<RelatedTestScenarioSummary[]> {
  const response = await executeController(resultController.getResultById, {
    method: "GET",
    params: { resultId },
    query: { projectId },
  });

  expect(response.statusCode).toBe(200);
  const body = response.body as { relatedTestScenarios: RelatedTestScenarioSummary[] };
  return body.relatedTestScenarios;
}

describePostgres("Result detail related Test Scenario PostgreSQL lifecycle", () => {
  beforeAll(async () => {
    if (
      !databaseUrl.startsWith("postgresql://") &&
      !databaseUrl.startsWith("postgres://")
    ) {
      throw new Error(
        "RUN_POSTGRES_INTEGRATION_TESTS=1 requires a PostgreSQL DATABASE_URL",
      );
    }

    await dbClient.user.create({
      data: {
        id: userId,
        name: "Result Scenario Integration",
        email: `result-scenario-${userId}@example.test`,
      },
    });
    await dbClient.project.create({
      data: {
        id: projectId,
        name: `Result Scenario Integration ${projectId}`,
        ownerId: userId,
      },
    });
    await dbClient.project.create({
      data: {
        id: otherProjectId,
        name: `Result Scenario Other Project ${otherProjectId}`,
        ownerId: userId,
      },
    });

    const spec = await dbClient.spec.create({
      data: {
        key: `SPEC-${randomUUID()}`,
        file: "scenario-detail.spec.ts",
        title: "Scenario detail spec",
        projectId,
      },
    });
    const execution = await dbClient.execution.create({
      data: {
        type: "e2e",
        name: "Scenario detail integration",
        environment: "test",
        version: "1.0.0",
        startedAt: new Date(),
        projectId,
      },
    });
    await dbClient.result.create({
      data: {
        id: resultId,
        retry: 0,
        status: "failed",
        duration: 100,
        startTime: new Date(),
        specId: spec.id,
        executionId: execution.id,
      },
    });
  });

  afterAll(async () => {
    await dbClient.project.deleteMany({
      where: { id: { in: [projectId, otherProjectId] } },
    });
    await dbClient.user.deleteMany({ where: { id: userId } });
    await dbClient.$disconnect();
  });

  it("reflects live links and scenario changes without changing the stored Result", async () => {
    const storedResultBefore = await dbClient.result.findUnique({
      where: { id: resultId },
    });
    if (!storedResultBefore) {
      throw new Error("Integration Result was not created");
    }

    const spec = await dbClient.spec.findFirstOrThrow({ where: { projectId } });
    const originalScenario = await createScenario(
      projectId,
      "Original scenario",
      "Original details",
    );
    const otherProjectScenario = await createScenario(
      otherProjectId,
      "Other project scenario",
      "Must stay private",
    );

    await expect(requestRelatedScenarios()).resolves.toEqual([]);

    await testScenarioIntegrationService.addSpecLink({
      scenarioId: originalScenario.id,
      specId: spec.id,
      projectId,
    });
    // Deliberately insert an inconsistent cross-project relation to verify both endpoint filters.
    await dbClient.testScenarioSpecLink.create({
      data: { testScenarioId: otherProjectScenario.id, specId: spec.id },
    });

    await expect(requestRelatedScenarios()).resolves.toEqual([
      {
        id: originalScenario.id,
        title: "Original scenario",
        details: "Original details",
        contentMd: originalScenario.contentMd,
      },
    ]);

    const editedScenario = await testScenarioModel.update(
      originalScenario.id,
      projectId,
      { title: "Edited scenario", details: "Current details" },
    );
    if (!editedScenario) {
      throw new Error("Integration scenario disappeared during edit");
    }
    await expect(requestRelatedScenarios()).resolves.toEqual([
      {
        id: originalScenario.id,
        title: "Edited scenario",
        details: "Current details",
        contentMd: editedScenario.contentMd,
      },
    ]);

    const secondScenario = await createScenario(projectId, "Second scenario");
    await testScenarioIntegrationService.addSpecLink({
      scenarioId: secondScenario.id,
      specId: spec.id,
      projectId,
    });
    const orderedScenarios = [editedScenario, secondScenario].sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.id.localeCompare(left.id),
    );
    await expect(requestRelatedScenarios()).resolves.toEqual(
      orderedScenarios.map(({ id, title, details, contentMd }) => ({ id, title, details, contentMd })),
    );

    await testScenarioIntegrationService.removeSpecLink({
      scenarioId: originalScenario.id,
      specId: spec.id,
      projectId,
    });
    await expect(requestRelatedScenarios()).resolves.toEqual([
      { id: secondScenario.id, title: "Second scenario", details: null, contentMd: secondScenario.contentMd },
    ]);

    await testScenarioModel.delete(secondScenario.id, projectId);
    await expect(requestRelatedScenarios()).resolves.toEqual([]);

    const storedResultAfter = await dbClient.result.findUnique({
      where: { id: resultId },
    });
    expect(storedResultAfter).toEqual(storedResultBefore);
  });
});
