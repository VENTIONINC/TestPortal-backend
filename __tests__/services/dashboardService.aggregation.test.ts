// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { dashboardService } from "@/services/dashboardService";
import { dbClient } from "@/prisma/client";

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
  const environment = "prod";

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
      totalDuration: 200,
      issuesBug: 5,
      issuesEnvironment: 0,
      issuesScript: 0,
      issuesPerformance: 0,
      issuesOther: 0,
    },
  ];

  it("should aggregate data by week correctly", async () => {
    (dbClient.dailyExecutionMetric.findMany as any).mockResolvedValue(
      mockDailyRows,
    );
    (dbClient.execution.findMany as any).mockResolvedValue([]);

    const result = await dashboardService.getDashboard(
      projectId,
      environment,
      30,
      undefined,
      "weekly",
    );

    expect(result.summary.totalRuns).toBe(40);
    expect(result.summary.failures).toBe(8);
    expect(result.summary.passRate).toBe(80);

    // Should have 2 entries: 2025-W01 and 2025-W02
    expect(result.history).toHaveLength(2);

    const week1 = result.history.find((h) => h.date === "2025-W01");
    expect(week1).toBeDefined();
    // Week 1 totals: 10+10 tests, 8+9 passed, 2+1 failed
    if (week1) {
      expect(week1.metrics.total).toBe(20);
      expect(week1.metrics.passed).toBe(17);
      expect(week1.metrics.failed).toBe(3);
    }

    const week2 = result.history.find((h) => h.date === "2025-W02");
    expect(week2).toBeDefined();
    // Week 2 totals: 20 tests, 15 passed, 5 failed
    if (week2) {
      expect(week2.metrics.total).toBe(20);
      expect(week2.metrics.passed).toBe(15);
      expect(week2.metrics.failed).toBe(5);
    }
  });

  it("should aggregate data by month correctly", async () => {
    (dbClient.dailyExecutionMetric.findMany as any).mockResolvedValue(
      mockDailyRows,
    );
    (dbClient.execution.findMany as any).mockResolvedValue([]);

    const result = await dashboardService.getDashboard(
      projectId,
      environment,
      30,
      undefined,
      "monthly",
    );

    expect(result.summary.totalRuns).toBe(40);
    expect(result.summary.failures).toBe(8);
    expect(result.summary.passRate).toBe(80);

    // Should have 1 entry: 2025-01
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toBeDefined();
    if (result.history[0]) {
      expect(result.history[0].date).toBe("2025-01");

      // Monthly totals: 10+10+20 tests
      expect(result.history[0].metrics.total).toBe(40);
      expect(result.history[0].metrics.passed).toBe(32);
      expect(result.history[0].metrics.failed).toBe(8);
    }
  });

  it("should use explicit UTC date range when startDate and endDate are provided", async () => {
    (dbClient.dailyExecutionMetric.findMany as any).mockResolvedValue([]);
    (dbClient.execution.findMany as any).mockResolvedValue([]);

    await dashboardService.getDashboard(
      projectId,
      environment,
      999,
      undefined,
      "daily",
      "2025-01-10",
      "2025-01-12",
    );

    expect(dbClient.dailyExecutionMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId,
          environment,
          date: {
            gte: new Date("2025-01-10T00:00:00.000Z"),
            lt: new Date("2025-01-13T00:00:00.000Z"),
          },
        }),
      }),
    );

    expect(dbClient.execution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId,
          environment,
          startedAt: {
            gte: new Date("2025-01-10T00:00:00.000Z"),
            lt: new Date("2025-01-13T00:00:00.000Z"),
          },
        }),
      }),
    );
  });
});
