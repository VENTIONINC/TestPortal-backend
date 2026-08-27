// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const reviewedAt = new Date("2026-08-27T10:00:00.000Z");
const resultContext = {
  id: "result-1",
  startTime: reviewedAt,
  execution: {
    projectId: "project-1",
    environment: "staging",
    type: "e2e",
  },
};

const createdIssue = {
  id: "issue-1",
  name: "Checkout failure",
  category: "bug",
  description: null,
  portal: null,
  service: null,
  ticket: null,
  projectId: "project-1",
  createdById: "user-1",
  updatedById: "user-1",
  createdAt: reviewedAt,
  updatedAt: reviewedAt,
};

const confirmedAssumption = {
  id: "assumption-1",
  issueId: "issue-1",
  resultErrorId: "error-1",
  madeBy: "user",
  isConfirmed: true,
  score: 1,
  createdAt: reviewedAt,
  updatedAt: reviewedAt,
};

const mockTx = {
  resultError: {
    findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
  },
  issue: {
    create: jest.fn<(args: unknown) => Promise<unknown>>(),
    update: jest.fn<(args: unknown) => Promise<unknown>>(),
  },
  assumption: {
    create: jest.fn<(args: unknown) => Promise<unknown>>(),
    findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
  },
  result: {
    update: jest.fn<(args: unknown) => Promise<unknown>>(),
  },
};

const mockTransaction = jest.fn(
  async (callback: (client: typeof mockTx) => Promise<unknown>) =>
    await callback(mockTx),
);

jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: mockTransaction,
  },
}));

jest.mock("@/services/dashboardService", () => ({
  dashboardService: {
    refreshDailyStats: jest.fn(),
  },
}));

import { dashboardService } from "@/services/dashboardService";
import { resultErrorService } from "@/services/resultErrorService";

const mockRefreshDailyStats = dashboardService.refreshDailyStats as jest.Mock;

describe("resultErrorService issue modal workflows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.resultError.findFirst.mockResolvedValue({
      id: "error-1",
      result: resultContext,
    });
    mockTx.issue.create.mockResolvedValue(createdIssue);
    mockTx.assumption.create.mockResolvedValue(confirmedAssumption);
    mockTx.result.update.mockResolvedValue({
      id: "result-1",
      analysisFeedbackCategory: "bug",
    });
  });

  it("creates the issue, confirmed assumption, result feedback, and dashboard bucket atomically", async () => {
    const createIssue: unknown = Reflect.get(resultErrorService, "createIssue");
    expect(createIssue).toEqual(expect.any(Function));
    if (typeof createIssue !== "function") return;

    const response = await createIssue.call(
      resultErrorService,
      "error-1",
      {
        projectId: "project-1",
        name: "Checkout failure",
        category: "bug",
      },
      "user-1",
    );

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.resultError.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "error-1",
          result: expect.objectContaining({
            execution: { projectId: "project-1" },
            spec: { projectId: "project-1" },
          }),
        }),
      }),
    );
    expect(mockTx.issue.create).toHaveBeenCalledWith({
      data: {
        projectId: "project-1",
        name: "Checkout failure",
        category: "bug",
        createdById: "user-1",
        updatedById: "user-1",
      },
    });
    expect(mockTx.assumption.create).toHaveBeenCalledWith({
      data: {
        issueId: "issue-1",
        resultErrorId: "error-1",
        madeBy: "user",
        isConfirmed: true,
        score: 1,
      },
    });
    expect(mockTx.result.update).toHaveBeenCalledWith({
      where: { id: "result-1" },
      data: {
        analysisFeedbackCategory: "bug",
        analysisReviewedAt: expect.any(Date),
        analysisReviewedById: "user-1",
      },
      select: { id: true, analysisFeedbackCategory: true },
    });
    expect(mockRefreshDailyStats).toHaveBeenCalledWith(
      "project-1",
      reviewedAt,
      "staging",
      "e2e",
      mockTx,
    );
    expect(response).toEqual({
      issue: createdIssue,
      assumption: confirmedAssumption,
      result: { id: "result-1", analysisFeedbackCategory: "bug" },
    });
  });

  it("edits the confirmed issue and only the containing result in one transaction", async () => {
    mockTx.assumption.findFirst.mockResolvedValue({
      ...confirmedAssumption,
      resultError: { result: resultContext },
    });
    mockTx.issue.update.mockResolvedValue({
      ...createdIssue,
      name: "Updated checkout failure",
      category: "infra",
    });
    mockTx.result.update.mockResolvedValue({
      id: "result-1",
      analysisFeedbackCategory: "infra",
    });

    const updateIssue: unknown = Reflect.get(resultErrorService, "updateIssue");
    expect(updateIssue).toEqual(expect.any(Function));
    if (typeof updateIssue !== "function") return;

    const response = await updateIssue.call(
      resultErrorService,
      "error-1",
      {
        projectId: "project-1",
        name: "Updated checkout failure",
        category: "infra",
      },
      "user-1",
    );

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.assumption.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          resultErrorId: "error-1",
          isConfirmed: true,
          resultError: expect.objectContaining({
            result: expect.objectContaining({
              execution: { projectId: "project-1" },
              spec: { projectId: "project-1" },
            }),
          }),
        }),
      }),
    );
    expect(mockTx.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-1" },
      data: {
        name: "Updated checkout failure",
        category: "infra",
        updatedById: "user-1",
      },
    });
    expect(mockTx.result.update).toHaveBeenCalledTimes(1);
    expect(mockTx.result.update).toHaveBeenCalledWith({
      where: { id: "result-1" },
      data: {
        analysisFeedbackCategory: "infra",
        analysisReviewedAt: expect.any(Date),
        analysisReviewedById: "user-1",
      },
      select: { id: true, analysisFeedbackCategory: true },
    });
    expect(mockRefreshDailyStats).toHaveBeenCalledWith(
      "project-1",
      reviewedAt,
      "staging",
      "e2e",
      mockTx,
    );
    expect(response).toEqual({
      issue: expect.objectContaining({
        id: "issue-1",
        category: "infra",
      }),
      assumption: expect.objectContaining({ id: "assumption-1" }),
      result: { id: "result-1", analysisFeedbackCategory: "infra" },
    });
  });

  it.each(["Bug", "environment", "unknown"])(
    "rejects non-lowercase or unsupported workflow category %s",
    async (category) => {
      const createIssue: unknown = Reflect.get(
        resultErrorService,
        "createIssue",
      );
      expect(createIssue).toEqual(expect.any(Function));
      if (typeof createIssue !== "function") return;

      await expect(
        createIssue.call(
          resultErrorService,
          "error-1",
          { projectId: "project-1", name: "Failure", category },
          "user-1",
        ),
      ).rejects.toThrow(
        "Invalid issue category. Must be one of: bug, infra, performance, script, other",
      );
      expect(mockTransaction).not.toHaveBeenCalled();
    },
  );
});
