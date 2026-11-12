// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { dbClient } from "@/prisma/client";
import { resultModel } from "@/models/resultModel";

const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";
const describePostgres = enabled ? describe : describe.skip;
const userId = randomUUID();
const projectId = randomUUID();
const otherProjectId = randomUUID();
const resultId = randomUUID();
const foreignResultId = randomUUID();
const reviewerId = randomUUID();
const reviewedAt = new Date("2026-01-01T00:00:00.000Z");

describePostgres("result analysis batch PostgreSQL integration", () => {
  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL ?? "";
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
        name: "Result analysis integration",
        email: `result-analysis-${userId}@example.test`,
      },
    });
    await dbClient.project.createMany({
      data: [
        { id: projectId, name: `Analysis ${projectId}`, ownerId: userId },
        {
          id: otherProjectId,
          name: `Analysis ${otherProjectId}`,
          ownerId: userId,
        },
      ],
    });

    const [spec, otherSpec] = await Promise.all([
      dbClient.spec.create({
        data: {
          key: `SPEC-${projectId}`,
          file: "analysis.spec.ts",
          title: "Analysis spec",
          projectId,
        },
      }),
      dbClient.spec.create({
        data: {
          key: `SPEC-${otherProjectId}`,
          file: "foreign.spec.ts",
          title: "Foreign analysis spec",
          projectId: otherProjectId,
        },
      }),
    ]);
    const [execution, otherExecution] = await Promise.all([
      dbClient.execution.create({
        data: {
          type: "e2e",
          name: `Analysis ${projectId}`,
          environment: "test",
          version: "1.0.0",
          startedAt: new Date(),
          projectId,
        },
      }),
      dbClient.execution.create({
        data: {
          type: "e2e",
          name: `Analysis ${otherProjectId}`,
          environment: "test",
          version: "1.0.0",
          startedAt: new Date(),
          projectId: otherProjectId,
        },
      }),
    ]);
    await dbClient.result.createMany({
      data: [
        {
          id: resultId,
          retry: 0,
          status: "failed",
          duration: 100,
          startTime: new Date(),
          specId: spec.id,
          executionId: execution.id,
          analysisStatus: "failed",
          analysisCategory: "infra",
          analysisConfidence: 2,
          analysisConclusion: "previous analysis",
          analysisFeedbackCategory: "script",
          analysisFeedbackConfidence: 5,
          analysisFeedbackConclusion: "reviewed conclusion",
          analysisReviewedAt: reviewedAt,
          analysisReviewedById: reviewerId,
        },
        {
          id: foreignResultId,
          retry: 0,
          status: "failed",
          duration: 100,
          startTime: new Date(),
          specId: otherSpec.id,
          executionId: otherExecution.id,
        },
      ],
    });
  });

  afterAll(async () => {
    await dbClient.project.deleteMany({
      where: { id: { in: [projectId, otherProjectId] } },
    });
    await dbClient.user.deleteMany({ where: { id: userId } });
    await dbClient.$disconnect();
  });

  it("rolls back earlier writes when a later project-scope check fails", async () => {
    await expect(
      resultModel.persistAnalysisBatch({
        projectId,
        analyses: [
          {
            id: resultId,
            status: "failed",
            category: "bug",
            confidence: 5,
            conclusion: "new analysis",
            errorQuality: 4,
            errorQualityConclusion: "new quality",
          },
          {
            id: foreignResultId,
            status: "failed",
            category: "bug",
            confidence: 5,
            conclusion: "foreign analysis",
            errorQuality: 4,
            errorQualityConclusion: "foreign quality",
          },
        ],
      }),
    ).rejects.toThrow("Could not persist the complete analysis batch");

    const persisted = await dbClient.result.findUniqueOrThrow({
      where: { id: resultId },
    });
    expect(persisted.analysisCategory).toBe("infra");
    expect(persisted.analysisConclusion).toBe("previous analysis");
    expect(persisted.analysisFeedbackCategory).toBe("script");
    expect(persisted.analysisFeedbackConfidence).toBe(5);
    expect(persisted.analysisFeedbackConclusion).toBe("reviewed conclusion");
    expect(persisted.analysisReviewedAt).toEqual(reviewedAt);
    expect(persisted.analysisReviewedById).toBe(reviewerId);
  });

  it("persists generated fields while preserving human-owned review data", async () => {
    await resultModel.persistAnalysisBatch({
      projectId,
      analyses: [
        {
          id: resultId,
          status: "failed",
          category: "bug",
          confidence: 5,
          conclusion: "new analysis",
          errorQuality: 4,
          errorQualityConclusion: "new quality",
        },
      ],
    });

    const persisted = await dbClient.result.findUniqueOrThrow({
      where: { id: resultId },
    });
    expect(persisted.analysisCategory).toBe("bug");
    expect(persisted.analysisConclusion).toBe("new analysis");
    expect(persisted.analysisFeedbackCategory).toBe("script");
    expect(persisted.analysisFeedbackConfidence).toBe(5);
    expect(persisted.analysisFeedbackConclusion).toBe("reviewed conclusion");
    expect(persisted.analysisReviewedAt).toEqual(reviewedAt);
    expect(persisted.analysisReviewedById).toBe(reviewerId);
  });
});
