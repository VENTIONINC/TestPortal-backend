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
      const mockExecutions = [
        {
          id: "exec-1",
          results: [
            { status: "passed", duration: 100, analysisCategory: null },
            { status: "passed", duration: 200, analysisCategory: null },
            { status: "failed", duration: 300, analysisCategory: "BUG" },
          ],
        },
        {
          id: "exec-2",
          results: [
            { status: "skipped", duration: 0, analysisCategory: null },
            { status: "failed", duration: 50, analysisCategory: "ENVIRONMENT" },
          ],
        },
      ];

      mockTxClient.execution.findMany.mockResolvedValue(mockExecutions);

      await dashboardService.refreshDailyStats(
        projectId,
        date,
        environment,
        type,
        mockTxClient as unknown as Prisma.TransactionClient,
      );

      const expectedStartDate = new Date("2025-01-01T00:00:00.000Z");
      const expectedEndDate = new Date("2025-01-02T00:00:00.000Z");

      expect(mockTxClient.execution.findMany).toHaveBeenCalledWith({
        where: {
          projectId,
          environment,
          type,
          createdAt: {
            gte: expectedStartDate,
            lt: expectedEndDate,
          },
        },
        include: {
          results: {
            select: {
              status: true,
              duration: true,
              analysisCategory: true,
            },
          },
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
          totalTests: 5,
          passedTests: 2,
          failedTests: 2,
          skippedTests: 1,
          totalDuration: 650,
          issuesBug: 1,
          issuesEnvironment: 1,
          issuesScript: 0,
          issuesPerformance: 0,
          issuesOther: 0,
        },
        update: {
          totalTests: 5,
          passedTests: 2,
          failedTests: 2,
          skippedTests: 1,
          totalDuration: 650,
          issuesBug: 1,
          issuesEnvironment: 1,
          issuesScript: 0,
          issuesPerformance: 0,
          issuesOther: 0,
        },
      });
    });

    it("should handle issue categorization case-insensitively", async () => {
      const mockExecutions = [
        {
          id: "exec-1",
          results: [
            { status: "failed", duration: 10, analysisCategory: "Script" },
            { status: "failed", duration: 10, analysisCategory: "PERFORMANCE" },
            { status: "failed", duration: 10, analysisCategory: "Unknown" },
            { status: "failed", duration: 10, analysisCategory: null },
          ],
        },
      ];

      mockTxClient.execution.findMany.mockResolvedValue(mockExecutions);

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
      mockTxClient.execution.findMany.mockResolvedValue([]);

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
            totalDuration: 0,
          }),
        }),
      );
    });
  });

  describe("updateStats", () => {
    const projectId = "proj-123";
    const executionId = "exec-123";

    it("should find execution and delegate to refreshDailyStats", async () => {
      const date = new Date("2025-06-15T10:00:00Z");
      const mockExecution = {
        id: executionId,
        projectId,
        environment: "staging",
        type: "api",
        createdAt: date,
        results: [],
      };

      mockTxClient.execution.findUnique.mockResolvedValue(mockExecution);
      const refreshSpy = jest.spyOn(dashboardService, "refreshDailyStats");
      mockTxClient.execution.findMany.mockResolvedValue([]);

      await dashboardService.updateStats(
        executionId,
        projectId,
        mockTxClient as unknown as Prisma.TransactionClient,
      );

      expect(mockTxClient.execution.findUnique).toHaveBeenCalledWith({
        where: { id: executionId },
        include: { results: true },
      });

      const expectedDate = new Date("2025-06-15");

      expect(refreshSpy).toHaveBeenCalledWith(
        projectId,
        expectedDate,
        "staging",
        "api",
        mockTxClient as unknown as Prisma.TransactionClient,
      );
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
        createdAt: date,
        results: [],
      };

      mockTxClient.execution.findUnique.mockResolvedValue(mockExecution);
      mockTxClient.execution.findMany.mockResolvedValue([]);
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
