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

interface CTRFProcessOptions {
  projectId: string;
}

interface CTRFProcessResult extends ProcessReportResult {
  analysis: TestResultAnalysis[] | undefined;
}

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

    // Step 2: Persist to database
    const processResult = await jsonReportService.processReport(
      {
        ...reportData,
        provider: "ctrf",
      },
      projectId.toString(),
    );

    // Step 3: Fetch just-created results from DB with relations
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

    // Step 4: Analyze stored results (POST-PERSIST)
    let analysisMap: Map<string, TestResultAnalysis> | null = null;
    try {
      analysisMap = await testAnalysisService.analyzeStoredResults(
        createdResults,
      );

      // Step 5: Update results with analysis fields
      logger.info(`Updating ${analysisMap.size} results with analysis data`);

      await Promise.all(
        Array.from(analysisMap.entries()).map(([resultId, analysis]) =>
          dbClient.result.update({
            where: { id: resultId },
            data: {
              analysisStatus: analysis.status,
              analysisCategory: analysis.category ?? null,
              analysisConfidence: analysis.confidence,
              analysisConclusion: analysis.conclusion ?? null,
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

  transformCtrfToReportData(ctrfReport: CTRFReport): ReportData {
    const { results } = ctrfReport;
    const { tool, summary, tests, environment } = results;

    const transformedTests = tests
      .filter((test) => test.status !== "skipped" && test.status !== "pending")
      .map((test) => this.transformCtrfTest(test));

    return {
      runId: environment?.buildNumber ?? `ctrf-${Date.now()}`,
      env: environment?.testEnvironment ?? "unknown",
      version: tool.version ?? "unknown",
      provider: "ctrf",
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
};
