import getLogger from "@/lib/logger";
import type { CTRFReport, CTRFTest } from "@/types/ctrf";
import type {
  ReportData,
  ProcessReportResult,
} from "@/services/jsonReportService";
import { jsonReportService } from "@/services/jsonReportService";

const logger = getLogger("ctrf-service");

interface CTRFProcessOptions {
  projectId: string;
}

export const ctrfService = {
  async processReport(
    ctrfReport: CTRFReport,
    options: CTRFProcessOptions,
  ): Promise<ProcessReportResult> {
    const { projectId } = options;
    const { results } = ctrfReport;

    logger.info(`Processing CTRF report with ${results.tests.length} tests`);

    const reportData = this.transformCtrfToReportData(ctrfReport);

    return await jsonReportService.processReport(
      reportData,
      projectId.toString(),
    );
  },

  async updateReport(
    executionId: number,
    ctrfReportUpdate: any,
  ): Promise<ProcessReportResult> {
    logger.info(`Updating CTRF report for execution ${executionId}`);

    // For now, implement a basic update that processes the partial data
    // In a full implementation, you might want to merge with existing data
    const { results } = ctrfReportUpdate;
    
    if (!results) {
      throw new Error("Invalid update data - missing results object");
    }

    // Transform the partial CTRF data to ReportData format
    const reportData = this.transformCtrfToReportData({ results } as any);

    // Use the existing jsonReportService to update the execution
    // Note: This is a simplified approach - in a full implementation,
    // you might want to implement proper partial updates
    try {
      // For this implementation, we'll just process it as a new report
      // since jsonReportService doesn't have updateExecution method yet
      const projectId = "1"; // This should be retrieved from the execution
      return await jsonReportService.processReport(reportData, projectId);
    } catch (error) {
      throw new Error(`Failed to update execution ${executionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  transformCtrfToReportData(ctrfReport: CTRFReport): ReportData {
    const { results } = ctrfReport;
    const { tool, summary, tests, environment } = results;

    const transformedTests = tests.map((test) => this.transformCtrfTest(test));

    return {
      runId: environment?.buildNumber ?? `ctrf-${Date.now()}`,
      env: environment?.testEnvironment ?? "unknown",
      version: tool.version ?? "unknown",
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
