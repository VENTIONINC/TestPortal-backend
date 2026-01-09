import { jsonReportService } from "@/services/jsonReportService";
import { dashboardService } from "@/services/dashboardService";
import type { IdentifierStrategy } from "@/lib/executionIdentifiers";
import { DEFAULT_PROJECT_ID } from "@/config/environment";

interface ReportData {
  runId?: string;
  env?: string;
  version?: string;
  stats?: {
    startTime?: string | Date;
  };
  provider: string;
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
    const result = await jsonReportService.processReport(reportData, projectId);

    // Update dashboard stats asynchronously
    try {
      await dashboardService.updateStats(result.executionId, projectId);
    } catch (error) {
      console.error("Failed to update dashboard stats from MCP handler", error);
    }

    return result;
  },
};
