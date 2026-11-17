// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { dbClient } from "@/prisma/client";
import { resultModel } from "@/models/resultModel";
import { STORED_RESULT_CATEGORY_POLICY_VERSION } from "@/lib/storedResultCategoryPolicy";
import type {
  AnalysisLastError,
  AnalysisMetadata,
} from "@/schemas/analysisMetadataSchemas";

const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";
const describePostgres = enabled ? describe : describe.skip;
const userId = randomUUID();
const projectId = randomUUID();
const otherProjectId = randomUUID();
const resultId = randomUUID();
const resultErrorId = randomUUID();
const foreignResultId = randomUUID();
const reviewerId = randomUUID();
const reviewedAt = new Date("2026-01-01T00:00:00.000Z");
const reportStartedAt = new Date("2026-11-01T00:00:00.000Z");
const previousMetadata: AnalysisMetadata = {
  version: 1,
  strategy: "generative",
  connection: "openai",
  requestedModel: "gpt-4.1-mini",
  returnedModel: null,
  analyzedAt: "2026-11-10T12:00:00.000Z",
  latencyMs: null,
  attempts: null,
  rawConfidence: null,
  categoryProbabilities: null,
  categoryPolicyVersion: null,
  confidenceMappingVersion: null,
};
const previousFailure: AnalysisLastError = {
  version: 1,
  kind: "upstream",
  message: "Classification request failed (unknown).",
  occurredAt: "2026-11-10T12:01:00.000Z",
  connection: "openai",
  model: "gpt-4.1-mini",
  strategy: "generative",
};
const decisionsMetadata: AnalysisMetadata = {
  version: 1,
  strategy: "decisions",
  connection: "openai",
  requestedModel: "gpt-6-luna",
  returnedModel: "gpt-6-luna",
  analyzedAt: "2026-11-12T12:00:00.000Z",
  latencyMs: 20,
  attempts: 1,
  rawConfidence: 0.75,
  categoryProbabilities: {
    infra: 0.1,
    performance: 0.1,
    script: 0.1,
    bug: 0.6,
    other: 0.1,
  },
  categoryPolicyVersion: STORED_RESULT_CATEGORY_POLICY_VERSION,
  confidenceMappingVersion: "decisions-confidence-v1",
};
const failureMetadata: AnalysisLastError = {
  version: 1,
  kind: "rate_limit",
  message: "Classification request failed (rate-limit).",
  occurredAt: "2026-11-12T12:02:00.000Z",
  connection: "custom",
  model: "decision-alias",
  strategy: "decisions",
};

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
          startTime: reportStartedAt,
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
          analysisMetadata: previousMetadata,
          analysisLastError: previousFailure,
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
    await dbClient.resultError.create({
      data: {
        id: resultErrorId,
        type: "AssertionError",
        message: "reported assertion failure",
        callStack: ["at checkout.spec.ts:12:3"],
        rawLogs: ["original runner log"],
        location: "checkout.spec.ts:12:3",
        resultId,
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

  async function expectPersistedReportUnchanged() {
    const [persisted, persistedError] = await Promise.all([
      dbClient.result.findUniqueOrThrow({ where: { id: resultId } }),
      dbClient.resultError.findUniqueOrThrow({ where: { id: resultErrorId } }),
    ]);

    expect(persisted.status).toBe("failed");
    expect(persisted.duration).toBe(100);
    expect(persisted.startTime).toEqual(reportStartedAt);
    expect(persistedError.message).toBe("reported assertion failure");
    expect(persistedError.callStack).toEqual(["at checkout.spec.ts:12:3"]);
    expect(persistedError.rawLogs).toEqual(["original runner log"]);
  }

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
        metadata: new Map([
          [resultId, decisionsMetadata],
          [foreignResultId, decisionsMetadata],
        ]),
      }),
    ).rejects.toThrow("Could not persist the complete analysis batch");

    const persisted = await dbClient.result.findUniqueOrThrow({
      where: { id: resultId },
    });
    expect(persisted.analysisCategory).toBe("infra");
    expect(persisted.analysisConclusion).toBe("previous analysis");
    expect(persisted.analysisMetadata).toEqual(previousMetadata);
    expect(persisted.analysisLastError).toEqual(previousFailure);
    expect(persisted.analysisFeedbackCategory).toBe("script");
    expect(persisted.analysisFeedbackConfidence).toBe(5);
    expect(persisted.analysisFeedbackConclusion).toBe("reviewed conclusion");
    expect(persisted.analysisReviewedAt).toEqual(reviewedAt);
    expect(persisted.analysisReviewedById).toBe(reviewerId);
    await expectPersistedReportUnchanged();
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
      metadata: new Map([[resultId, decisionsMetadata]]),
    });

    const persisted = await dbClient.result.findUniqueOrThrow({
      where: { id: resultId },
    });
    expect(persisted.analysisCategory).toBe("bug");
    expect(persisted.analysisConclusion).toBe("new analysis");
    expect(persisted.analysisMetadata).toEqual(decisionsMetadata);
    expect(persisted.analysisLastError).toBeNull();
    expect(persisted.analysisFeedbackCategory).toBe("script");
    expect(persisted.analysisFeedbackConfidence).toBe(5);
    expect(persisted.analysisFeedbackConclusion).toBe("reviewed conclusion");
    expect(persisted.analysisReviewedAt).toEqual(reviewedAt);
    expect(persisted.analysisReviewedById).toBe(reviewerId);
    await expectPersistedReportUnchanged();
  });

  it("records a sanitized failure without overwriting successful analysis or feedback", async () => {
    await resultModel.recordAnalysisFailures({
      projectId,
      failures: new Map([
        [resultId, { status: "failed" as const, failure: failureMetadata }],
      ]),
    });

    const persisted = await dbClient.result.findUniqueOrThrow({
      where: { id: resultId },
    });
    expect(persisted.analysisCategory).toBe("bug");
    expect(persisted.analysisConclusion).toBe("new analysis");
    expect(persisted.analysisMetadata).toEqual(decisionsMetadata);
    expect(persisted.analysisLastError).toEqual(failureMetadata);
    expect(persisted.analysisFeedbackCategory).toBe("script");
    expect(persisted.analysisFeedbackConfidence).toBe(5);
    expect(persisted.analysisFeedbackConclusion).toBe("reviewed conclusion");
    expect(persisted.analysisReviewedAt).toEqual(reviewedAt);
    expect(persisted.analysisReviewedById).toBe(reviewerId);
    await expectPersistedReportUnchanged();
  });
});
