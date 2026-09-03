// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { dashboardService } from "@/services/dashboardService";
import { dbClient } from "@/prisma/client";

const mockDailyExecutionMetricFindMany =
  dbClient.dailyExecutionMetric.findMany as jest.Mock;
const mockExecutionFindMany = dbClient.execution.findMany as jest.Mock;

// Mock generic logger
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock dbClient
jest.mock("@/prisma/client", () => ({
  dbClient: {
    dailyExecutionMetric: {
      findMany: jest.fn(),
    },
    execution: {
      findMany: jest.fn(),
    },
  },
}));

describe("dashboardService Aggregation", () => {
  const projectId = "proj-agg-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDailyRows = [
    {
      date: new Date("2025-01-01T00:00:00Z"), // Week 1 (Wed)
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      skippedTests: 0,
      timedOutTests: 1,
      totalDuration: 100,
      issuesBug: 1,
      issuesEnvironment: 1,
      issuesScript: 0,
      issuesPerformance: 0,
      issuesOther: 0,
    },
    {
      date: new Date("2025-01-02T00:00:00Z"), // Week 1 (Thu)
      totalTests: 10,
      passedTests: 9,
      failedTests: 1,
      skippedTests: 0,
      timedOutTests: 2,
      totalDuration: 100,
      issuesBug: 0,
      issuesEnvironment: 1,
      issuesScript: 0,
      issuesPerformance: 0,
      issuesOther: 0,
    },
    {
      date: new Date("2025-01-08T00:00:00Z"), // Week 2 (Wed)
      totalTests: 20,
      passedTests: 15,
      failedTests: 5,
      skippedTests: 0,
      timedOutTests: 3,
      totalDuration: 200,
      issuesBug: 5,
      issuesEnvironment: 0,
      issuesScript: 0,
      issuesPerformance: 0,
      issuesOther: 0,
    },
  ];

  it("should aggregate data by week correctly", async () => {
    mockDailyExecutionMetricFindMany.mockResolvedValue(mockDailyRows as never);
    mockExecutionFindMany.mockResolvedValue([] as never);

    const result = await dashboardService.getDashboard(
      projectId,
      30,
      undefined,
      "weekly",
    );

    expect(result.summary.totalRuns).toBe(40);
    expect(result.summary.failures).toBe(14);
    expect(result.summary.passRate).toBe(65);

    // Should have 2 entries: 2025-W01 and 2025-W02
    expect(result.history).toHaveLength(2);

    const week1 = result.history.find((h) => h.date === "2025-W01");
    expect(week1).toBeDefined();
    // Week 1 totals: 10+10 tests, 8+9 passed, 2+1 failed
    if (week1) {
      expect(week1.metrics.total).toBe(20);
      expect(week1.metrics.passed).toBe(17);
      expect(week1.metrics.failed).toBe(3);
      expect(week1.metrics.timedOut).toBe(3);
    }

    const week2 = result.history.find((h) => h.date === "2025-W02");
    expect(week2).toBeDefined();
    // Week 2 totals: 20 tests, 15 passed, 5 failed
    if (week2) {
      expect(week2.metrics.total).toBe(20);
      expect(week2.metrics.passed).toBe(15);
      expect(week2.metrics.failed).toBe(5);
      expect(week2.metrics.timedOut).toBe(3);
    }
  });

  it("should aggregate data by month correctly", async () => {
    mockDailyExecutionMetricFindMany.mockResolvedValue(mockDailyRows as never);
    mockExecutionFindMany.mockResolvedValue([] as never);

    const result = await dashboardService.getDashboard(
      projectId,
      30,
      undefined,
      "monthly",
    );

    expect(result.summary.totalRuns).toBe(40);
    expect(result.summary.failures).toBe(14);
    expect(result.summary.passRate).toBe(65);

    // Should have 1 entry: 2025-01
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toBeDefined();
    if (result.history[0]) {
      expect(result.history[0].date).toBe("2025-01");

      // Monthly totals: 10+10+20 tests
      expect(result.history[0].metrics.total).toBe(40);
      expect(result.history[0].metrics.passed).toBe(32);
      expect(result.history[0].metrics.failed).toBe(8);
      expect(result.history[0].metrics.timedOut).toBe(6);
    }
  });

  it("counts skipped tests as non-failures while timed-out tests reduce pass rate", async () => {
    (dbClient.dailyExecutionMetric.findMany as any).mockResolvedValue([
      {
        date: new Date("2025-01-01T00:00:00Z"),
        totalTests: 10,
        passedTests: 4,
        failedTests: 2,
        skippedTests: 3,
        timedOutTests: 1,
        totalDuration: 100,
        issuesBug: 1,
        issuesEnvironment: 0,
        issuesScript: 0,
        issuesPerformance: 0,
        issuesOther: 0,
      },
    ]);
    (dbClient.execution.findMany as any).mockResolvedValue([]);

    const result = await dashboardService.getDashboard(
      projectId,
      30,
    );

    expect(result.summary.failures).toBe(3);
    expect(result.summary.passRate).toBe(57);
    expect(result.history[0]?.metrics.timedOut).toBe(1);
  });

  it("should use explicit UTC date range when startDate and endDate are provided", async () => {
    mockDailyExecutionMetricFindMany.mockResolvedValue([] as never);
    mockExecutionFindMany.mockResolvedValue([] as never);

    await dashboardService.getDashboard(
      projectId,
      999,
      "Nightly",
      "daily",
      "2025-01-10",
      "2025-01-12",
    );

    expect(dbClient.dailyExecutionMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId,
          date: {
            gte: new Date("2025-01-10T00:00:00.000Z"),
            lt: new Date("2025-01-13T00:00:00.000Z"),
          },
          type: "Nightly",
        },
      }),
    );

    expect(dbClient.execution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId,
          startedAt: {
            gte: new Date("2025-01-10T00:00:00.000Z"),
            lt: new Date("2025-01-13T00:00:00.000Z"),
          },
          type: "Nightly",
        },
      }),
    );
  });
});
