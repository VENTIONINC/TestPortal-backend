import { jsonReportService } from "../services/jsonReportService.js";

export const jsonReportController = {
  /**
   * Handle POST request to process JSON test report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  processReport: async (req, res) => {
    try {
      const reportData = req.body;

      const result = await jsonReportService.processReport(reportData);

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to process JSON report. ${error.message}`,
      });
    }
  },
};
