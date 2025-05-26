import { Request, Response } from "express";
import { jsonReportService } from "@/services/jsonReportService";

export const jsonReportController = {
  /**
   * Handle POST request to process JSON test report
   */
  processReport: async (req: Request, res: Response): Promise<void> => {
    try {
      const reportData = req.body;

      if (!reportData) {
        res.status(400).json({
          error: "Report data is required",
        });
        return;
      }

      const result = await jsonReportService.processReport(reportData);

      res.status(201).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to process JSON report. ${err.message}`,
      });
    }
  },
};
