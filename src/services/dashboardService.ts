// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import { Prisma, type Result } from "@prisma/client";
import type {
  DailyExecutionMetrics,
  DashboardIssueMetrics,
  DashboardResponse,
  ExecutionSummary,
  DashboardGranularity,
} from "@/types/dashboard";
import getLogger from "@/lib/logger";

const logger = getLogger("dashboard-service");

type AggregationResult = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  duration: number;
  issues: DashboardIssueMetrics;
};

function getISOWeekLabel(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getDateKey(date: Date, granularity: DashboardGranularity): string {
  if (granularity === "weekly") {
    return getISOWeekLabel(date);
  } else if (granularity === "monthly") {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${month}`;
  }
  return date.toISOString().split("T")[0] ?? "";
}

function toUtcStartOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toUtcEndExclusive(value: string): Date {
  const endExclusive = toUtcStartOfDay(value);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return endExclusive;
}

function getUtcDateString(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function getUtcStartOfDate(date: Date): Date | null {
  const dateStr = getUtcDateString(date);
  return dateStr ? toUtcStartOfDay(dateStr) : null;
}

function getUniqueUtcDateStarts(dates: Date[]): Date[] {
  const dateMap = new Map<string, Date>();

  for (const date of dates) {
    const dateStart = getUtcStartOfDate(date);
    if (dateStart) {
      dateMap.set(dateStart.toISOString(), dateStart);
    }
  }

  return Array.from(dateMap.values());
}

export const dashboardService = {
  /**
   * Updates the aggregated dashboard stats for a completed execution.
   */
  async updateStats(
    executionId: string,
    projectId: string,
    client: Prisma.TransactionClient,
  ): Promise<void> {
    logger.info(`Updating dashboard stats for execution ${executionId}`);

    const execution = await client.execution.findUnique({
      where: { id: executionId },
      include: {
        results: {
          select: {
            startTime: true,
          },
        },
      },
    });

    if (!execution) {
      logger.error(`Execution ${executionId} not found`);
      return;
    }

    if (execution.projectId !== projectId) {
      logger.warn(
        `Execution ${executionId} does not belong to project ${projectId}`,
      );
    }

    // 1. Determine Scope (Date, Env, Type)
    const environment = execution.environment || "Default";
    const type = execution.type || "Other";
    const dates = getUniqueUtcDateStarts(
      execution.results.length > 0
        ? execution.results.map((result) => result.startTime)
        : [execution.startedAt],
    );

    if (dates.length === 0) {
      logger.error(`Could not determine date for execution ${executionId}`);
      return;
    }

    for (const date of dates) {
      await this.refreshDailyStats(projectId, date, environment, type, client);
    }
  },

  /**
   * Recalculates and overwrites the daily stats for a specific bucket.
   * This is idempotent and self-healing.
   */
  async refreshDailyStats(
    projectId: string,
    date: Date,
    environment: string,
    type: string,
    client: Prisma.TransactionClient,
  ): Promise<void> {
    const dateStr = date.toISOString().split("T")[0] ?? "";
    const startDate = new Date(dateStr);
    const endDate = new Date(dateStr);
    endDate.setDate(endDate.getDate() + 1);

    // Fetch all results for this day/env/type and aggregate them by result time.
    const resultsForTheDay = await client.result.findMany({
      where: {
        startTime: {
          gte: startDate,
          lt: endDate,
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

    // 3. Aggregate Totals (Idempotent Recalculation)
    const dailyTotal = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      timedOutTests: 0,
      totalDuration: 0,
      issuesBug: 0,
      issuesEnvironment: 0,
      issuesScript: 0,
      issuesPerformance: 0,
      issuesOther: 0,
    };

    for (const res of resultsForTheDay) {
      dailyTotal.totalTests++;
      dailyTotal.totalDuration += res.duration || 0;

      if (res.status === "passed") {
        dailyTotal.passedTests++;
      } else if (res.status === "failed") {
        dailyTotal.failedTests++;
        const category = res.analysisCategory?.toLowerCase() ?? "other";
        if (category === "bug") dailyTotal.issuesBug++;
        else if (category === "environment") dailyTotal.issuesEnvironment++;
        else if (category === "script") dailyTotal.issuesScript++;
        else if (category === "performance") dailyTotal.issuesPerformance++;
        else dailyTotal.issuesOther++;
      } else if (res.status === "timedOut") {
        dailyTotal.timedOutTests++;
      } else if (res.status === "skipped") {
        dailyTotal.skippedTests++;
      }
    }

    // 4. Upsert Daily Execution Metric (Overwrite with Absolute Values)
    await client.dailyExecutionMetric.upsert({
      where: {
        projectId_environment_type_date: {
          projectId,
          environment,
          type,
          date: startDate,
        },
      },
      create: {
        projectId,
        environment,
        type,
        date: startDate,
        ...dailyTotal,
      },
      update: {
        ...dailyTotal, // This OVERWRITES the row with fresh aggregates
      },
    });

    logger.info(
      `Refreshed daily stats for ${dateStr} / ${type}: ${dailyTotal.totalTests} tests`,
    );
  },

  calculateExecutionStats(
    results: Result[],
    _execDuration: number,
  ): AggregationResult {
    // This helper function is actually no longer used by updateStats
    // but we can keep it for unit testing logic if needed.
    const metrics: AggregationResult = {
      total: results.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      duration: 0,
      issues: { bug: 0, environment: 0, script: 0, performance: 0, other: 0 },
    };

    for (const res of results) {
      if (res.status === "passed") metrics.passed++;
      else if (res.status === "failed") {
        metrics.failed++;
        // Categorize issue
        const category = res.analysisCategory?.toLowerCase() ?? "other";
        if (category in metrics.issues) {
          metrics.issues[category as keyof DashboardIssueMetrics]++;
        } else {
          metrics.issues.other++;
        }
      } else if (res.status === "timedOut") metrics.timedOut++;
      else if (res.status === "skipped") metrics.skipped++;

      metrics.duration += res.duration ?? 0;
    }

    return metrics;
  },

  /**
   * Retrieves dashboard data for client.
   */
  async getDashboard(
    projectId: string,
    environment: string,
    periodDays: number,
    filterType?: string,
    granularity: DashboardGranularity = "daily",
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardResponse> {
    let rangeStartDate: Date;
    let rangeEndExclusive: Date | undefined;

    if (startDate && endDate) {
      rangeStartDate = toUtcStartOfDay(startDate);
      rangeEndExclusive = toUtcEndExclusive(endDate);
    } else {
      rangeStartDate = new Date();
      rangeStartDate.setDate(rangeStartDate.getDate() - periodDays);
      rangeStartDate.setHours(0, 0, 0, 0);
    }

    // 1. Fetch Daily Metrics (Atomic Rows)
    const metricsWhere: Prisma.DailyExecutionMetricWhereInput = {
      projectId,
      environment,
      date: rangeEndExclusive
        ? { gte: rangeStartDate, lt: rangeEndExclusive }
        : { gte: rangeStartDate },
    };
    if (filterType) {
      metricsWhere.type = filterType;
    }

    const dailyRows = await dbClient.dailyExecutionMetric.findMany({
      where: metricsWhere,
      orderBy: { date: "asc" },
    });

    // 2. Aggregate into History & Summary
    const historyMap = new Map<string, DailyExecutionMetrics>();
    const summary = { totalRuns: 0, failures: 0, passRate: 0 };
    let totalSkipped = 0;

    for (const row of dailyRows) {
      const dateObj = row.date;
      const dateKey = getDateKey(dateObj, granularity);

      if (!dateKey) continue;

      const bucket = historyMap.get(dateKey) ?? {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          timedOut: 0,
          duration: 0,
          issues: {
            bug: 0,
            environment: 0,
            script: 0,
            performance: 0,
            other: 0,
          },
        };
      if (!historyMap.has(dateKey)) {
        historyMap.set(dateKey, bucket);
      }

      // Aggregate
      bucket.total += row.totalTests;
      bucket.passed += row.passedTests;
      bucket.failed += row.failedTests;
      bucket.skipped += row.skippedTests;
      bucket.timedOut += row.timedOutTests;
      bucket.duration += row.totalDuration;
      bucket.issues.bug += row.issuesBug;
      bucket.issues.environment += row.issuesEnvironment;
      bucket.issues.script += row.issuesScript;
      bucket.issues.performance += row.issuesPerformance;
      bucket.issues.other += row.issuesOther;

      // Global Summary
      summary.totalRuns += row.totalTests;
      summary.failures += row.failedTests + row.timedOutTests;
      totalSkipped += row.skippedTests;
    }

    const history = Array.from(historyMap.entries())
      .map(([date, metrics]) => ({ date, metrics }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate Pass Rate
    if (summary.totalRuns > 0) {
      const summaryNonSkipped = Math.max(summary.totalRuns - totalSkipped, 0);
      summary.passRate = Math.round(
        summaryNonSkipped > 0
          ? ((summaryNonSkipped - summary.failures) / summaryNonSkipped) * 100
          : 0,
      );
    }

    // 3. Fetch Recent Executions
    // We fetch actual recent entries from DB execution table
    const executionWhere: Prisma.ExecutionWhereInput = {
      projectId,
      environment, // Filter by env
      startedAt: rangeEndExclusive
        ? { gte: rangeStartDate, lt: rangeEndExclusive }
        : { gte: rangeStartDate },
    };
    if (filterType) {
      executionWhere.type = filterType;
    }

    const recentExecs = await dbClient.execution.findMany({
      where: executionWhere,
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        results: {
          select: { status: true, duration: true }, // optimization: only select status & duration
        },
      },
    });

    const recentExecutionsFormatted: ExecutionSummary[] = recentExecs.map(
      (ex) => {
        const passed = ex.results.filter((r) => r.status === "passed").length;
        const failed = ex.results.filter((r) => r.status === "failed").length;
        // Calculate duration from results since Execution doesn't store it
        const duration = ex.results.reduce(
          (sum, res) => sum + (res.duration ?? 0),
          0,
        );

        return {
          id: ex.id,
          name: ex.name,
          status: failed > 0 ? "failed" : "passed", // Simple logic
          startedAt: ex.startedAt.toISOString(),
          duration,
          type: ex.type,
          environment: ex.environment,
          metrics: {
            total: ex.results.length,
            passed,
            failed,
          },
        };
      },
    );

    return {
      summary: {
        totalRuns: summary.totalRuns,
        failures: summary.failures,
        passRate: summary.passRate,
      },
      history,
      recentExecutions: recentExecutionsFormatted,
    };
  },
};
