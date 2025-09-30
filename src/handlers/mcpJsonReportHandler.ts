import { jsonReportService } from "@/services/jsonReportService";
import type { IdentifierStrategy } from "@/lib/executionIdentifiers";
import { DEFAULT_PROJECT_ID } from "@/config/environment";

interface ReportData {
  runId?: string;
  env?: string;
  version?: string;
  stats?: {
    startTime?: string | Date;
  };
  identifierStrategy?: IdentifierStrategy;
  tests: Array<{
    title: string;
    custom_id?: string;
    location: {
      file: string;
      line: number;
    };
    tags?: string[];
    annotations?: unknown[];
    results: Array<{
      reportPortalLink?: string;
      retry: number;
      status: string;
      duration: number;
      startTime: string | Date;
      workerIndex: number;
      error?: {
        message: string;
        stack: string;
        location: {
          file: string;
          line: number;
        };
      };
    }>;
  }>;
}

interface ProcessReportResult {
  success: boolean;
  executionId: string;
  specsProcessed: number;
}

export const mcpJsonReportHandler = {
  async processReport(
    reportData: ReportData,
    projectId = DEFAULT_PROJECT_ID,
  ): Promise<ProcessReportResult> {
    return await jsonReportService.processReport(reportData, projectId);
  },
};
