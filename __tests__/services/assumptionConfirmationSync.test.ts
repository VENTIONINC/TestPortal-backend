// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { CreateAssumptionRequest } from "@/types";

const occurredAt = new Date("2026-08-27T10:00:00.000Z");
const baseAssumption = {
  id: "assumption-1",
  issueId: "issue-1",
  resultErrorId: "error-1",
  madeBy: "agent",
  isConfirmed: false,
  score: 0.8,
  createdAt: occurredAt,
  updatedAt: occurredAt,
};

const mockTx = {
  $queryRaw: jest.fn<() => Promise<unknown>>(),
  assumption: {
    create: jest.fn<(args: unknown) => Promise<unknown>>(),
    findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
    findUnique: jest.fn<(args: unknown) => Promise<unknown>>(),
    update: jest.fn<(args: unknown) => Promise<unknown>>(),
  },
  result: { update: jest.fn<(args: unknown) => Promise<unknown>>() },
};
const mockTransaction = jest.fn(
  async (callback: (client: typeof mockTx) => Promise<unknown>) =>
    await callback(mockTx),
);
const mockCreate = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpdate = jest.fn<(id: string, data: unknown) => Promise<unknown>>();
const mockDelete = jest.fn<(id: string) => Promise<unknown>>();

jest.mock("@/prisma/client", () => ({
  dbClient: { $transaction: mockTransaction },
}));

jest.mock("@/models/assumptionModel", () => ({
  assumptionModel: {
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

jest.mock("@/services/dashboardService", () => ({
  dashboardService: { refreshDailyStats: jest.fn() },
}));

import { dashboardService } from "@/services/dashboardService";
import { assumptionService } from "@/services/assumptionService";

const mockRefreshDailyStats = dashboardService.refreshDailyStats as jest.Mock;

describe("assumption confirmation synchronization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(baseAssumption);
    mockDelete.mockResolvedValue(baseAssumption);
    mockTx.$queryRaw.mockResolvedValue([{ id: "error-1" }]);
    mockTx.assumption.create.mockResolvedValue(baseAssumption);
    mockTx.assumption.findFirst.mockResolvedValue(null);
    mockTx.assumption.findUnique.mockResolvedValue({ resultErrorId: "error-1" });
    mockTx.assumption.update.mockResolvedValue({
      ...baseAssumption,
      madeBy: "user",
      isConfirmed: true,
      issue: { id: "issue-1", category: "performance" },
      resultError: {
        id: "error-1",
        result: {
          id: "result-1",
          startTime: occurredAt,
          analysisCategory: "bug",
          execution: {
            projectId: "project-1",
            environment: "production",
            type: "api",
          },
        },
      },
    });
    mockTx.result.update.mockResolvedValue({
      id: "result-1",
      analysisFeedbackCategory: "performance",
    });
  });

  it("confirms the assumption and synchronizes feedback and dashboard in one transaction", async () => {
    const updateAssumption: unknown = Reflect.get(
      assumptionService,
      "updateAssumption",
    );
    expect(updateAssumption).toEqual(expect.any(Function));
    if (typeof updateAssumption !== "function") return;

    const response = await updateAssumption.call(
      assumptionService,
      "assumption-1",
      { madeBy: "user", isConfirmed: true },
      "reviewer-1",
    );

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockTx.assumption.findFirst).toHaveBeenCalledWith({
      where: {
        resultErrorId: "error-1",
        isConfirmed: true,
        id: { not: "assumption-1" },
      },
      select: { id: true },
    });
    expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.assumption.findFirst.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockTx.assumption.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.assumption.update.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockTx.assumption.update).toHaveBeenCalledWith({
      where: { id: "assumption-1" },
      data: { madeBy: "user", isConfirmed: true },
      include: {
        issue: true,
        resultError: {
          include: {
            result: { include: { execution: true } },
          },
        },
      },
    });
    expect(mockTx.result.update).toHaveBeenCalledWith({
      where: { id: "result-1" },
      data: {
        analysisFeedbackCategory: "performance",
        analysisReviewedAt: expect.any(Date),
        analysisReviewedById: "reviewer-1",
      },
    });
    expect(mockTx.result.update.mock.calls[0]?.[0]).not.toHaveProperty(
      "data.analysisCategory",
    );
    expect(mockRefreshDailyStats).toHaveBeenCalledWith(
      "project-1",
      occurredAt,
      "production",
      "api",
      mockTx,
    );
    expect(response).toEqual(
      expect.objectContaining({
        action: "updated",
        assumption: expect.objectContaining({
          id: "assumption-1",
          isConfirmed: true,
        }),
      }),
    );
  });

  it("does not change result feedback when an assumption is rejected", async () => {
    const updateAssumption: unknown = Reflect.get(
      assumptionService,
      "updateAssumption",
    );
    expect(updateAssumption).toEqual(expect.any(Function));
    if (typeof updateAssumption !== "function") return;

    await updateAssumption.call(
      assumptionService,
      "assumption-1",
      { madeBy: "user", isConfirmed: false },
      "reviewer-1",
    );

    expect(mockDelete).toHaveBeenCalledWith("assumption-1");
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockTx.result.update).not.toHaveBeenCalled();
    expect(mockRefreshDailyStats).not.toHaveBeenCalled();
  });

  it("never copies category through generic assumption creation", async () => {
    const request = {
      issueId: "issue-1",
      resultErrorId: "error-1",
      madeBy: "user",
      isConfirmed: true,
      score: 1,
      category: "bug",
    } as unknown as CreateAssumptionRequest;

    await assumptionService.createAssumption(request);

    expect(mockTx.assumption.create).toHaveBeenCalledWith({
      data: {
        issueId: "issue-1",
        resultErrorId: "error-1",
        madeBy: "user",
        isConfirmed: true,
        score: 1,
      },
    });
    expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.assumption.findFirst.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockTx.assumption.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.assumption.create.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockTx.result.update).not.toHaveBeenCalled();
  });

  it("rejects confirmation after the shared lock when another assumption is confirmed", async () => {
    mockTx.assumption.findFirst.mockResolvedValue({ id: "assumption-2" });

    await expect(
      assumptionService.updateAssumption(
        "assumption-1",
        { madeBy: "user", isConfirmed: true },
        "reviewer-1",
      ),
    ).rejects.toThrow(
      "Result error with ID error-1 already has a confirmed assumption",
    );

    expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.assumption.findFirst.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockTx.assumption.update).not.toHaveBeenCalled();
  });

  it("rejects confirmed generic creation after the shared lock when one already exists", async () => {
    mockTx.assumption.findFirst.mockResolvedValue({ id: "assumption-2" });

    await expect(
      assumptionService.createAssumption({
        issueId: "issue-1",
        resultErrorId: "error-1",
        madeBy: "user",
        isConfirmed: true,
        score: 1,
      }),
    ).rejects.toThrow(
      "Result error with ID error-1 already has a confirmed assumption",
    );

    expect(mockTx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.assumption.findFirst.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockTx.assumption.create).not.toHaveBeenCalled();
  });
});
