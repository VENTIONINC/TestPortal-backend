import { jsonReportService } from "@/services/jsonReportService";

interface ReportData {
  runId: string;
  env: string;
  version: string;
  stats?: {
    startTime?: string | Date;
  };
  tests: Array<{
    title: string;
    custom_id?: string;
    location?: {
      file: string;
    };
    tags?: string[];
    annotations?: unknown[];
    results: Array<{
      allureLink?: string;
      retry: number;
      status: string;
      duration: number;
      startTime: string | Date;
      error?: {
        message: string;
        stack: string;
        location?: string;
      };
    }>;
  }>;
}

interface ProcessReportResult {
  success: boolean;
  executionId: number;
  specsProcessed: number;
}

export const mcpJsonReportHandler = {
  async processReport(reportData: ReportData): Promise<ProcessReportResult> {
    return await jsonReportService.processReport(reportData);
  },
};
