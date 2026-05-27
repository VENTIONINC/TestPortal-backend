// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import getLogger from "@/lib/logger";
import { dbClient } from "@/prisma/client";
import type { CTRFReport, CTRFTest } from "@/types/ctrf";
import type {
  ReportData,
  ProcessReportResult,
} from "@/services/jsonReportService";
import { jsonReportService } from "@/services/jsonReportService";
import { testAnalysisService } from "@/services/testAnalysisService";
import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";

const logger = getLogger("ctrf-service");
const ANALYSIS_MAX_NON_PASSING_RATIO = 0.5;

interface CTRFProcessOptions {
  projectId: string;
}

interface CTRFProcessResult extends ProcessReportResult {
  analysis: TestResultAnalysis[] | undefined;
}

import { dashboardService } from "@/services/dashboardService";

export const ctrfService = {
  async processReport(
    ctrfReport: CTRFReport,
    options: CTRFProcessOptions,
  ): Promise<CTRFProcessResult> {
    const { projectId } = options;
    const { results } = ctrfReport;

    logger.info(`Processing CTRF report with ${results.tests.length} tests`);

    // Step 1: Transform CTRF to report data WITHOUT analysis
    const reportData = this.transformCtrfToReportData(ctrfReport);

    const result = await dbClient.$transaction(
      async (tx) => {
        // Step 2: Persist to database
        const processResult = await jsonReportService.processReport(
          {
            ...reportData,
            provider: reportData.provider || "ctrf",
          },
          projectId.toString(),
          tx,
        );

        // Step 3: Check if analysis is enabled for project owner
        const project = await tx.project.findUnique({
          where: { id: projectId },
          include: { owner: true },
        });

        const shouldAnalyze = project?.owner.analyzeEnabled ?? false;

        if (!shouldAnalyze) {
          logger.info("Analysis disabled for user, skipping analysis");
          return {
            ...processResult,
            analysis: undefined,
          };
        }

        // Step 4: Fetch just-created results from DB with relations
        const createdResults = await tx.result.findMany({
          where: { executionId: processResult.executionId },
          include: {
            spec: true,
            execution: true,
            errors: true,
          },
        });

        logger.info(
          `Fetched ${createdResults.length} results from DB for analysis`,
        );

        if (this.shouldSkipAnalysis(createdResults)) {
          return {
            ...processResult,
            analysis: undefined,
          };
        }

        // Step 5: Analyze stored results (POST-PERSIST)
        let analysisMap: Map<string, TestResultAnalysis> | null = null;
        try {
          analysisMap =
            await testAnalysisService.analyzeStoredResults(createdResults);

          // Step 6: Update results with analysis fields
          logger.info(
            `Updating ${analysisMap.size} results with analysis data`,
          );

          await Promise.all(
            Array.from(analysisMap.entries()).map(([resultId, analysis]) =>
              tx.result.update({
                where: { id: resultId },
                data: {
                  analysisStatus: analysis.status,
                  analysisCategory: analysis.category ?? null,
                  analysisConfidence: analysis.confidence,
                  analysisConclusion: analysis.conclusion ?? null,
                  analysisErrorQuality: analysis.errorQuality ?? null,
                  analysisErrorQualityConclusion:
                    analysis.errorQualityConclusion ?? null,
                },
              }),
            ),
          );

          logger.info(
            `Successfully updated ${analysisMap.size} results with analysis`,
          );
        } catch (analysisError) {
          logger.warn(
            "Analysis failed, results saved without analysis:",
            analysisError,
          );
        }

        return {
          ...processResult,
          analysis: analysisMap ? Array.from(analysisMap.values()) : undefined,
        };
      },
      {
        timeout: 30000, // Increase timeout for analysis
      },
    );

    // Update dashboard metrics asynchronously (fire and forget or await?)
    // Awaiting to ensure data consistency in case subsequent calls depend on it,
    // but catching errors so we don't fail the request.
    try {
      await dashboardService.updateStats(
        result.executionId,
        projectId,
        dbClient,
      );
    } catch (error) {
      logger.error(
        `Failed to update dashboard stats for execution ${result.executionId}`,
        error,
      );
    }

    return result;
  },

  transformCtrfToReportData(ctrfReport: CTRFReport): ReportData {
    const { results } = ctrfReport;
    const { tool, summary, tests, environment } = results;

    const transformedTests = tests
      .filter((test) => test.status !== "pending")
      .map((test) => this.transformCtrfTest(test));

    const providerName = tool?.name.toLowerCase() || "ctrf";

    return {
      runId: environment?.buildNumber ?? `${providerName}-${Date.now()}`,
      env: environment?.testEnvironment ?? "N/A",
      version: tool.version ?? "N/A",
      provider: providerName,
      stats: {
        startTime: new Date(summary.start),
      },
      tests: transformedTests,
      identifierStrategy: "time-period",
    };
  },

  transformCtrfTest(ctrfTest: CTRFTest) {
    const results = [
      {
        retry: ctrfTest.retry ?? 0,
        status: this.mapCtrfStatus(ctrfTest.status),
        duration: ctrfTest.duration,
        startTime: new Date(),
        ...(ctrfTest.message
          ? {
              error: {
                message: ctrfTest.message,
                stack: ctrfTest.trace ?? "",
                location: this.parseLocation(ctrfTest.filePath),
              },
            }
          : {}),
        workerIndex: 0,
      },
    ];

    const testSpec = {
      title: ctrfTest.name,
      location: this.parseLocation(ctrfTest.filePath),
      tags: ctrfTest.tags ?? [],
      annotations: [],
      results,
      ...(ctrfTest.meta?.testId
        ? { custom_id: ctrfTest.meta.testId as string }
        : {}),
    };

    return testSpec;
  },

  mapCtrfStatus(status: string): string {
    switch (status) {
      case "passed":
        return "passed";
      case "failed":
        return "failed";
      case "skipped":
        return "skipped";
      case "pending":
        return "skipped";
      case "other":
        return "timedOut";
      default:
        return "failed";
    }
  },

  parseLocation(filePath?: string) {
    if (!filePath) {
      return { file: "unknown", line: 1 };
    }
    return { file: filePath, line: 1 };
  },

  shouldSkipAnalysis(results: Array<{ status: string }>): boolean {
    if (results.length === 0) {
      return false;
    }

    const nonPassingCount = results.filter(
      ({ status }) => status === "failed" || status === "flaky",
    ).length;

    const ratio = nonPassingCount / results.length;
    if (ratio <= ANALYSIS_MAX_NON_PASSING_RATIO) {
      return false;
    }

    logger.info(
      `Analysis skipped: ${nonPassingCount}/${results.length} non-passing results exceed ${ANALYSIS_MAX_NON_PASSING_RATIO * 100}% threshold`,
    );
    return true;
  },
};
