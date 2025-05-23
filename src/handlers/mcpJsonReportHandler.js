import { jsonReportService } from "../services/jsonReportService.js";

export const mcpJsonReportHandler = {
  async processReport(reportData) {
    return await jsonReportService.processReport(reportData);
  },
};
