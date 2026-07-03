// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { dashboardService } from "@/services/dashboardService";
import { Prisma } from "@prisma/client";

// Mock generic logger to avoid cluttering test output
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe("dashboardService", () => {
  type MockTxClient = {
    execution: {
      findUnique: jest.Mock<() => Promise<unknown>>;
      findMany: jest.Mock<() => Promise<unknown>>;
    };
    result: {
      findMany: jest.Mock<() => Promise<unknown>>;
    };
    dailyExecutionMetric: {
      upsert: jest.Mock<() => Promise<unknown>>;
    };
  };

  let mockTxClient: MockTxClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTxClient = {
      execution: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      result: {
        findMany: jest.fn(),
      },
      dailyExecutionMetric: {
        upsert: jest.fn(),
      },
    };
  });

  describe("refreshDailyStats", () => {
    const projectId = "proj-123";
    const date = new Date("2025-01-01T12:00:00Z");
    const environment = "prod";
    const type = "e2e";

    it("should correctly aggregate stats from multiple executions", async () => {
      const mockResults = [
        { status: "passed", duration: 100, analysisCategory: null },
        { status: "passed", duration: 200, analysisCategory: null },
        { status: "failed", duration: 300, analysisCategory: "BUG" },
        { status: "timedOut", duration: 40, analysisCategory: null },
        { status: "skipped", duration: 0, analysisCategory: null },
        { status: "failed", duration: 50, analysisCategory: "ENVIRONMENT" },
      ];

      mockTxClient.result.findMany.mockResolvedValue(mockResults);

      await dashboardService.refreshDailyStats(
        projectId,
        date,
        environment,
        type,
        mockTxClient as unknown as Prisma.TransactionClient,
      );

      const expectedStartDate = new Date("2025-01-01T00:00:00.000Z");
      const expectedEndDate = new Date("2025-01-02T00:00:00.000Z");

      expect(mockTxClient.result.findMany).toHaveBeenCalledWith({
        where: {
          startTime: {
            gte: expectedStartDate,
            lt: expectedEndDate,
          },
          execution: {
            projectId,
            environment,
            type,
          },
        },
        select: {
          status: true,
          duration: true,
          analysisCategory: true,
        },
      });

      expect(mockTxClient.dailyExecutionMetric.upsert).toHaveBeenCalledWith({
        where: {
          projectId_environment_type_date: {
            projectId,
            environment,
            type,
            date: expectedStartDate,
          },
        },
        create: {
          projectId,
          environment,
          type,
          date: expectedStartDate,
          totalTests: 6,
          passedTests: 2,
          failedTests: 2,
          skippedTests: 1,
          timedOutTests: 1,
          totalDuration: 690,
          issuesBug: 1,
          issuesEnvironment: 1,
          issuesScript: 0,
          issuesPerformance: 0,
          issuesOther: 0,
        },
        update: {
          totalTests: 6,
          passedTests: 2,
          failedTests: 2,
          skippedTests: 1,
          timedOutTests: 1,
          totalDuration: 690,
          issuesBug: 1,
          issuesEnvironment: 1,
          issuesScript: 0,
          issuesPerformance: 0,
          issuesOther: 0,
        },
      });
    });

    it("should handle issue categorization case-insensitively", async () => {
      const mockResults = [
        { status: "failed", duration: 10, analysisCategory: "Script" },
        { status: "failed", duration: 10, analysisCategory: "PERFORMANCE" },
        { status: "failed", duration: 10, analysisCategory: "Unknown" },
        { status: "failed", duration: 10, analysisCategory: null },
      ];

      mockTxClient.result.findMany.mockResolvedValue(mockResults);

      await dashboardService.refreshDailyStats(
        projectId,
        date,
        environment,
        type,
        mockTxClient as unknown as Prisma.TransactionClient,
      );

      expect(mockTxClient.dailyExecutionMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            issuesScript: 1,
            issuesPerformance: 1,
            issuesOther: 2,
            issuesBug: 0,
            issuesEnvironment: 0,
          }),
        }),
      );
    });

    it("should handle empty executions list", async () => {
      mockTxClient.result.findMany.mockResolvedValue([]);

      await dashboardService.refreshDailyStats(
        projectId,
        date,
        environment,
        type,
        mockTxClient as unknown as Prisma.TransactionClient,
      );

      expect(mockTxClient.dailyExecutionMetric.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            timedOutTests: 0,
            totalDuration: 0,
          }),
        }),
      );
    });
  });

  describe("updateStats", () => {
    const projectId = "proj-123";
    const executionId = "exec-123";

    it("should find execution and refresh distinct result dates", async () => {
      const mockExecution = {
        id: executionId,
        projectId,
        environment: "staging",
        type: "api",
        startedAt: new Date("2025-06-15T10:00:00Z"),
        results: [
          { startTime: new Date("2025-06-16T10:00:00Z") },
          { startTime: new Date("2025-06-16T12:00:00Z") },
          { startTime: new Date("2025-06-17T10:00:00Z") },
        ],
      };

      mockTxClient.execution.findUnique.mockResolvedValue(mockExecution);
      const refreshSpy = jest.spyOn(dashboardService, "refreshDailyStats");
      mockTxClient.result.findMany.mockResolvedValue([]);

      await dashboardService.updateStats(
        executionId,
        projectId,
        mockTxClient as unknown as Prisma.TransactionClient,
      );

      expect(mockTxClient.execution.findUnique).toHaveBeenCalledWith({
        where: { id: executionId },
        include: {
          results: {
            select: {
              startTime: true,
            },
          },
        },
      });

      expect(refreshSpy).toHaveBeenCalledWith(
        projectId,
        new Date("2025-06-16T00:00:00.000Z"),
        "staging",
        "api",
        mockTxClient as unknown as Prisma.TransactionClient,
      );
      expect(refreshSpy).toHaveBeenCalledWith(
        projectId,
        new Date("2025-06-17T00:00:00.000Z"),
        "staging",
        "api",
        mockTxClient as unknown as Prisma.TransactionClient,
      );
      expect(refreshSpy).toHaveBeenCalledTimes(2);
    });

    it("should log error and return if execution not found", async () => {
      mockTxClient.execution.findUnique.mockResolvedValue(null);
      const refreshSpy = jest.spyOn(dashboardService, "refreshDailyStats");

      await dashboardService.updateStats(
        executionId,
        projectId,
        mockTxClient as unknown as Prisma.TransactionClient,
      );

      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("should default environment to 'Default' and type to 'Other' if missing", async () => {
      const date = new Date("2025-06-15T10:00:00Z");
      const mockExecution = {
        id: executionId,
        projectId,
        environment: null,
        type: null,
        startedAt: date,
        results: [],
      };

      mockTxClient.execution.findUnique.mockResolvedValue(mockExecution);
      mockTxClient.result.findMany.mockResolvedValue([]);
      const refreshSpy = jest.spyOn(dashboardService, "refreshDailyStats");

      await dashboardService.updateStats(
        executionId,
        projectId,
        mockTxClient as unknown as Prisma.TransactionClient,
      );

      expect(refreshSpy).toHaveBeenCalledWith(
        projectId,
        expect.any(Date),
        "Default",
        "Other",
        mockTxClient,
      );
    });
  });
});
