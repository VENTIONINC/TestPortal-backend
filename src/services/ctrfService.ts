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
