// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { Prisma } from "@prisma/client";
import { STORED_RESULT_CATEGORY_POLICY_VERSION } from "@/lib/storedResultCategoryPolicy";

const mockUpdateMany =
  jest.fn<(args: Record<string, unknown>) => Promise<{ count: number }>>();
const mockTransaction = jest.fn<
  (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>
>(async (callback) => callback({ result: { updateMany: mockUpdateMany } }));

jest.mock("@/prisma/client", () => ({
  dbClient: {
    result: { updateMany: mockUpdateMany },
    $transaction: mockTransaction,
  },
}));

import { resultModel } from "@/models/resultModel";

const analysis = (id: string) => ({
  id,
  status: "failed" as const,
  category: "bug" as const,
  confidence: 4,
  conclusion: "synthetic conclusion",
  errorQuality: 3,
  errorQualityConclusion: "synthetic quality",
});

const metadata = {
  version: 1 as const,
  strategy: "decisions" as const,
  connection: "openai" as const,
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
  confidenceMappingVersion: "decisions-confidence-v1" as const,
};

const metadataFor = (ids: string[]) =>
  new Map(ids.map((id) => [id, metadata] as const));

describe("resultModel.persistAnalysisBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("updates generated fields within project scope in one transaction", async () => {
    await resultModel.persistAnalysisBatch({
      projectId: "project-1",
      analyses: [analysis("result-1"), analysis("result-2")],
      metadata: metadataFor(["result-1", "result-2"]),
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "result-1",
        status: "failed",
        spec: { projectId: "project-1" },
        execution: { projectId: "project-1" },
      },
      data: {
        analysisStatus: "failed",
        analysisCategory: "bug",
        analysisConfidence: 4,
        analysisConclusion: "synthetic conclusion",
        analysisErrorQuality: 3,
        analysisErrorQualityConclusion: "synthetic quality",
        analysisMetadata: metadata,
        analysisLastError: Prisma.DbNull,
      },
    });
    expect(mockUpdateMany.mock.calls[0]?.[0]).not.toHaveProperty(
      "data.analysisFeedbackCategory",
    );
    expect(mockUpdateMany.mock.calls[0]?.[0]).not.toHaveProperty(
      "data.analysisReviewedAt",
    );
  });

  it.each([0, 2])(
    "rejects missing, foreign, or ambiguous affected-row counts (%s)",
    async (count) => {
      mockUpdateMany.mockResolvedValueOnce({ count });

      await expect(
        resultModel.persistAnalysisBatch({
          projectId: "project-1",
          analyses: [analysis("result-foreign")],
          metadata: metadataFor(["result-foreign"]),
        }),
      ).rejects.toThrow("Could not persist the complete analysis batch");
    },
  );

  it("stops on a later write failure so the enclosing transaction can roll back", async () => {
    mockUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(
      resultModel.persistAnalysisBatch({
        projectId: "project-1",
        analyses: [analysis("result-1"), analysis("result-2")],
        metadata: metadataFor(["result-1", "result-2"]),
      }),
    ).rejects.toThrow("Could not persist the complete analysis batch");
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("records only sanitized failure data within result and project scope", async () => {
    const failure = {
      version: 1 as const,
      kind: "rate_limit" as const,
      message: "Classification request failed (rate-limit).",
      occurredAt: "2026-11-12T12:00:00.000Z",
      connection: "custom" as const,
      model: "decision-alias",
      strategy: "decisions" as const,
    };

    await resultModel.recordAnalysisFailures({
      projectId: "project-1",
      failures: new Map([["result-1", { status: "failed" as const, failure }]]),
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "result-1",
        status: "failed",
        spec: { projectId: "project-1" },
        execution: { projectId: "project-1" },
      },
      data: { analysisLastError: failure },
    });
    expect(JSON.stringify(failure)).not.toMatch(/key|secret|response body/i);
  });
});
