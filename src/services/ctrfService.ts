// Copyright 2026 VENSOLUTIONSGROUP LTD
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

    // Step 2: Persist atomically. Analysis and dashboard work intentionally run
    // after this transaction commits so external work cannot expire it.
    const processResult = await jsonReportService.processReport(
      {
        ...reportData,
        provider: reportData.provider || "ctrf",
      },
      projectId.toString(),
    );

    // Step 3: Check if analysis is enabled for project owner
    const project = await dbClient.project.findUnique({
      where: { id: projectId },
      include: { owner: true },
    });

    const shouldAnalyze = project?.owner.analyzeEnabled ?? false;

    let result: CTRFProcessResult = {
      ...processResult,
      analysis: undefined,
    };

    if (!shouldAnalyze) {
      logger.info("Analysis disabled for user, skipping analysis");
    } else {
      // Step 4: Fetch just-created results from DB with relations
      const createdResults = await dbClient.result.findMany({
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

      if (!this.shouldSkipAnalysis(createdResults)) {
        // Step 5: Analyze stored results (POST-PERSIST)
        let analysisMap: Map<string, TestResultAnalysis> | null = null;
        try {
          analysisMap =
            await testAnalysisService.analyzeStoredResults(createdResults);

          // Step 6: Update results with analysis fields (POST-PERSIST)
          logger.info(
            `Updating ${analysisMap.size} results with analysis data`,
          );

          await Promise.all(
            Array.from(analysisMap.entries()).map(([resultId, analysis]) =>
              dbClient.result.update({
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

        result = {
          ...processResult,
          analysis: analysisMap ? Array.from(analysisMap.values()) : undefined,
        };
      }
    }

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
      .map((test, index) => this.transformCtrfTest(test, summary.start, index));

    const providerName = tool?.name.toLowerCase() || "ctrf";
    const executionType = environment?.executionType?.trim();

    return {
      runId: environment?.buildNumber ?? `${providerName}-${Date.now()}`,
      env: environment?.testEnvironment ?? "N/A",
      version: tool.version ?? "N/A",
      provider: providerName,
      ...(executionType ? { executionType } : {}),
      stats: {
        startTime: new Date(summary.start),
      },
      tests: transformedTests,
      identifierStrategy: "time-period",
    };
  },

  transformCtrfTest(
    ctrfTest: CTRFTest,
    fallbackStartTime: number,
    index: number,
  ) {
    const results = [
      {
        retry: ctrfTest.retry ?? 0,
        status: this.mapCtrfStatus(ctrfTest.status),
        duration: ctrfTest.duration,
        startTime: this.getCtrfTestStartTime(
          ctrfTest,
          fallbackStartTime,
          index,
        ),
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
      custom_id: this.getCtrfTestIdentifier(ctrfTest),
    };

    return testSpec;
  },

  getCtrfTestStartTime(
    ctrfTest: CTRFTest,
    fallbackStartTime: number,
    index: number,
  ): Date {
    const startTime = ctrfTest.start ?? fallbackStartTime + index;
    return new Date(startTime);
  },

  getCtrfTestIdentifier(ctrfTest: CTRFTest): string {
    if (typeof ctrfTest.meta?.testId === "string" && ctrfTest.meta.testId) {
      return ctrfTest.meta.testId;
    }

    return [
      ctrfTest.filePath ?? "unknown",
      ctrfTest.suite ?? "default",
      ctrfTest.name,
    ].join("::");
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
