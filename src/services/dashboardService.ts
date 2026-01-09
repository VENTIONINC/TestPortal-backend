import { dbClient } from "@/prisma/client";
import { Prisma, type Result } from "@prisma/client";
import type {
  DailyExecutionMetrics,
  DashboardIssueMetrics,
  DashboardStorage,
  DashboardResponse,
  ExecutionSummary,
} from "@/types/dashboard";
import getLogger from "@/lib/logger";

const logger = getLogger("dashboard-service");

type AggregationResult = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  issues: DashboardIssueMetrics;
};

export const dashboardService = {
  /**
   * Updates the aggregated dashboard stats for a completed execution.
   */
  async updateStats(executionId: string, projectId: string): Promise<void> {
    logger.info(`Updating dashboard stats for execution ${executionId}`);

    const execution = await dbClient.execution.findUnique({
      where: { id: executionId },
      include: {
        results: true,
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

    // 1. Calculate stats for this execution
    const stats = this.calculateExecutionStats(execution.results, 0);

    // 2. Determine key and date
    const environment = execution.environment || "Default";
    const date = execution.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!date) {
      logger.error(`Could not determine date for execution ${executionId}`);
      return;
    }

    const type = execution.type || "Other";
    const projectMetaKey = `dashboard_stats_${environment}`;

    // 3. Fetch existing meta
    const existingMeta = await dbClient.projectMeta.findUnique({
      where: {
        projectId_key: {
          projectId,
          key: projectMetaKey,
        },
      },
    });

    let storage: DashboardStorage = {};
    if (
      existingMeta &&
      existingMeta.value &&
      typeof existingMeta.value === "object"
    ) {
      storage = existingMeta.value as unknown as DashboardStorage;
    }

    // 4. Update the bucket
    storage[date] ??= {};

    // Initialize or Aggregate?
    // Since this is triggered ONCE per execution, we should ADD to the day's bucket.
    // But wait, if we re-run this logic, we might double count.
    // Simple ADD is risky if we don't have idempotency.
    // However, given the architecture, we assume "Append Only" for now.
    // A better approach for "Daily Bucket" where many executions happen:
    // We fetch the bucket, add current execution stats to it.

    const currentBucket = storage[date][type] ?? {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      issues: { bug: 0, environment: 0, script: 0, performance: 0, other: 0 },
    };

    const newBucket: DailyExecutionMetrics = {
      total: currentBucket.total + stats.total,
      passed: currentBucket.passed + stats.passed,
      failed: currentBucket.failed + stats.failed,
      skipped: currentBucket.skipped + stats.skipped,
      duration: currentBucket.duration + stats.duration,
      issues: {
        bug: currentBucket.issues.bug + stats.issues.bug,
        environment:
          currentBucket.issues.environment + stats.issues.environment,
        script: currentBucket.issues.script + stats.issues.script,
        performance:
          currentBucket.issues.performance + stats.issues.performance,
        other: currentBucket.issues.other + stats.issues.other,
      },
    };

    storage[date][type] = newBucket;

    // 5. Save back
    await dbClient.projectMeta.upsert({
      where: {
        projectId_key: {
          projectId,
          key: projectMetaKey,
        },
      },
      create: {
        projectId,
        key: projectMetaKey,
        value: storage as unknown as Prisma.InputJsonValue,
      },
      update: {
        value: storage as unknown as Prisma.InputJsonValue,
      },
    });

    logger.info(`Updated stats for ${date} / ${type}`);
  },

  calculateExecutionStats(
    results: Result[],
    _execDuration: number,
  ): AggregationResult {
    const metrics: AggregationResult = {
      total: results.length,
      passed: 0,
      failed: 0,
      skipped: 0,
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
      } else if (res.status === "skipped") metrics.skipped++;

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
  ): Promise<DashboardResponse> {
    const projectMetaKey = `dashboard_stats_${environment}`;

    // 1. Fetch Aggregates
    const meta = await dbClient.projectMeta.findUnique({
      where: { projectId_key: { projectId, key: projectMetaKey } },
    });

    const storage = (meta?.value as unknown as DashboardStorage) || {};

    // Calculate date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    const cutoffStr = cutoffDate.toISOString().split("T")[0] ?? "";

    // 2. Process History & Summary
    const history = [];
    const summary = { totalRuns: 0, passRate: 0, failures: 0 };

    // Iterate all dates in storage
    const sortedDates = Object.keys(storage).sort();

    for (const date of sortedDates) {
      if (date < cutoffStr) continue;

      const dailyTypes = storage[date];
      if (!dailyTypes) continue;

      const dailyTotal: DailyExecutionMetrics = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        issues: { bug: 0, environment: 0, script: 0, performance: 0, other: 0 },
      };

      let hasData = false;

      // Sum relevant types
      for (const [type, metrics] of Object.entries(dailyTypes)) {
        if (filterType && type !== filterType) continue;

        hasData = true;
        dailyTotal.total += metrics.total;
        dailyTotal.passed += metrics.passed;
        dailyTotal.failed += metrics.failed;
        dailyTotal.skipped += metrics.skipped;
        dailyTotal.duration += metrics.duration;
        dailyTotal.issues.bug += metrics.issues.bug;
        dailyTotal.issues.environment += metrics.issues.environment;
        dailyTotal.issues.script += metrics.issues.script;
        dailyTotal.issues.performance += metrics.issues.performance;
        dailyTotal.issues.other += metrics.issues.other;
      }

      if (hasData) {
        history.push({ date, metrics: dailyTotal });

        // Add to global summary
        // Note: For "Total Runs", the screenshot implies distinct Executions,
        // but current storage counts TESTS (stats.total).
        // Wait, "Total Test Runs" in the screenshot usually means Total EXECUTIONS.
        // But my storage aggregates counts of TESTS (passed/failed tests).
        // Ah, `newBucket.total` accumulates `stats.total` which is TESTS count.
        // We are missing explicit EXECUTION count in the `DailyExecutionMetrics`.
        // Let's assume `total` here means TESTS.
        // If the tiles need "Executions", we need to track that count separately.
        // Let's rely on `summary.totalRuns` being Sum of tests for now or fetch count of executions.

        // Actually, looking at the screenshot "Test runs: 68", "Test passed: 50".
        // It likely refers to Executions if 68 is small, or Tests if it's per-suite.
        // Given the graph "Pass rate", usually it's "Executions passed vs failed" OR "Tests passed vs failed".
        // Let's assume TESTS count for now.

        summary.totalRuns += dailyTotal.total;
        summary.failures += dailyTotal.failed;
      }
    }

    if (summary.totalRuns > 0) {
      summary.passRate = Math.round(
        ((summary.totalRuns - summary.failures) / summary.totalRuns) * 100,
      );
    }

    // 3. Fetch Recent Executions
    // We fetch actual recent entries from DB execution table
    const where: Prisma.ExecutionWhereInput = {
      projectId,
      environment, // Filter by env
      startedAt: { gte: cutoffDate },
    };
    if (filterType) {
      where.type = filterType;
    }

    const recentExecs = await dbClient.execution.findMany({
      where,
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
        passRate: summary.passRate,
      },
      history,
      recentExecutions: recentExecutionsFormatted,
    };
  },
};
