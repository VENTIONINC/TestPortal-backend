// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";

const mockUpdateMany = jest.fn<
  (args: Record<string, unknown>) => Promise<{ count: number }>
>();
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

describe("resultModel.persistAnalysisBatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("updates generated fields within project scope in one transaction", async () => {
    await resultModel.persistAnalysisBatch({
      projectId: "project-1",
      analyses: [analysis("result-1"), analysis("result-2")],
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
      }),
    ).rejects.toThrow("Could not persist the complete analysis batch");
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
  });
});
