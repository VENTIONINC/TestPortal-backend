import type { Request, Response } from "express";
import { ctrfService } from "@/services/ctrfService";
import type { CTRFReport } from "@/types/ctrf";
import getLogger from "@/lib/logger";

const logger = getLogger("ctrf-controller");

export const ctrfController = {
  async processReport(req: Request, res: Response): Promise<void> {
    try {
      const ctrfReport: CTRFReport = req.body;
      const projectId = (req.query.projectId as string) || "1";

      if (!ctrfReport?.results) {
        res.status(400).json({
          error: "Invalid CTRF report format - missing results object"
        });
        return;
      }

      if (!ctrfReport.results.tests || !Array.isArray(ctrfReport.results.tests)) {
        res.status(400).json({
          error: "Invalid CTRF report format - missing or invalid tests array"
        });
        return;
      }

      logger.info(`Received CTRF report with ${ctrfReport.results.tests.length} tests for project ${projectId}`);

      const result = await ctrfService.processReport(ctrfReport, { projectId });

      res.json({
        success: true,
        message: `Processed ${result.specsProcessed} test specs`,
        executionId: result.executionId,
        data: result,
      });
    } catch (error) {
      logger.error("Error processing CTRF report:", error);
      res.status(500).json({
        error: "Failed to process CTRF report",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  },
};