// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { resultService } from "@/services/resultService";
import { resultModel } from "@/models/resultModel";
import type { ResultWithRelations } from "@/types";

jest.mock("@/models/resultModel");

const mockTx = {};

jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(mockTx),
    ),
  },
}));

const mockResultModel = resultModel as jest.Mocked<typeof resultModel>;

describe("resultService.updateAnalysisFeedback", () => {
  const resultId = "result-1";
  const reviewerId = "user-1";
  const now = new Date("2025-01-01T10:00:00Z");

  const mockResult = {
    id: resultId,
    createdAt: now,
    updatedAt: now,
    reportPortalLink: null,
    retry: 0,
    status: "failed",
    duration: 1000,
    startTime: now,
    specId: "spec-1",
    executionId: "exec-1",
    analysisStatus: null,
    analysisCategory: null,
    analysisConfidence: null,
    analysisConclusion: null,
    analysisErrorQuality: null,
    analysisErrorQualityConclusion: null,
    analysisReviewedAt: null,
    analysisReviewedById: null,
    analysisFeedbackCategory: null,
    analysisFeedbackConfidence: null,
    analysisFeedbackConclusion: null,
    spec: {
      id: "spec-1",
      createdAt: now,
      updatedAt: now,
      key: "SPEC-1",
      file: "spec.ts",
      title: "Spec",
      tags: ["smoke"],
      annotations: [],
      projectId: "project-1",
    },
    execution: {
      id: "exec-1",
      createdAt: now,
      updatedAt: now,
      type: "e2e",
      name: "Run 1",
      environment: "staging",
      version: "1.0.0",
      startedAt: now,
      projectId: "project-1",
    },
    errors: [],
  } as unknown as ResultWithRelations;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResultModel.updateAnalysisFeedback.mockResolvedValue(mockResult);
  });

  it("should throw when resultId is missing", async () => {
    await expect(
      resultService.updateAnalysisFeedback("", {}, reviewerId),
    ).rejects.toThrow("Result ID is required");
  });

  it("should throw when reviewerId is missing", async () => {
    await expect(
      resultService.updateAnalysisFeedback(resultId, {}, ""),
    ).rejects.toThrow("Reviewer ID is required");
  });

  it("should throw for invalid category", async () => {
    await expect(
      resultService.updateAnalysisFeedback(
        resultId,
        { analysisFeedbackCategory: "invalid" },
        reviewerId,
      ),
    ).rejects.toThrow(
      "Invalid analysis feedback category. Must be one of: bug, infra, performance, script, other",
    );
  });

  it("should throw for invalid confidence", async () => {
    await expect(
      resultService.updateAnalysisFeedback(
        resultId,
        { analysisFeedbackConfidence: 0 },
        reviewerId,
      ),
    ).rejects.toThrow("Feedback confidence must be between 1 and 5");
  });

  it("should throw when no feedback fields are provided", async () => {
    await expect(
      resultService.updateAnalysisFeedback(resultId, {}, reviewerId),
    ).rejects.toThrow(
      "At least one feedback field must be provided (analysisFeedbackCategory, analysisFeedbackConfidence, analysisFeedbackConclusion)",
    );
  });

  it("should update feedback and return result", async () => {
    const response = await resultService.updateAnalysisFeedback(
      resultId,
      {
        analysisFeedbackCategory: "bug",
        analysisFeedbackConfidence: 4,
        analysisFeedbackConclusion: "Human label",
      },
      reviewerId,
    );

    expect(mockResultModel.updateAnalysisFeedback).toHaveBeenCalledWith(
      resultId,
      expect.objectContaining({
        analysisReviewedAt: expect.any(Date),
        analysisReviewedById: reviewerId,
        analysisFeedbackCategory: "bug",
        analysisFeedbackConfidence: 4,
        analysisFeedbackConclusion: "Human label",
      }),
      mockTx,
    );
    expect(response).toMatchObject({
      id: resultId,
      spec: expect.objectContaining({
        tags: ["smoke"],
      }),
    });
  });
});
