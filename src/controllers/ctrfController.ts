import type { Request, Response } from "express";
import { ctrfService } from "@/services/ctrfService";
import { testAnalysisService } from "@/services/testAnalysisService";
import type { CTRFReport } from "@/types/ctrf";
import getLogger from "@/lib/logger";

const logger = getLogger("ctrf-controller");

export const ctrfController = {
  async processReport(req: Request, res: Response): Promise<void> {
    try {
      const ctrfReport: CTRFReport = req.body;
      const projectId = req.query.projectId as string;

      if (!projectId) {
        res.status(400).json({
          error: "Missing required query parameter: projectId"
        });
        return;
      }

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

  async updateReport(req: Request, res: Response): Promise<void> {
    try {
      const { executionId } = req.params;
      const ctrfReportUpdate: any = req.body; // Using any for partial update structure

      if (!executionId || isNaN(Number(executionId))) {
        res.status(400).json({
          error: "Invalid execution ID - must be a valid number"
        });
        return;
      }

      if (!ctrfReportUpdate?.results) {
        res.status(400).json({
          error: "Invalid CTRF update format - missing results object"
        });
        return;
      }

      logger.info(`Updating CTRF report for execution ${executionId}`);

      const result = await ctrfService.updateReport(Number(executionId), ctrfReportUpdate);

      res.json({
        success: true,
        message: `Updated CTRF report for execution ${executionId}`,
        executionId: result.executionId,
        data: result,
      });
    } catch (error) {
      logger.error("Error updating CTRF report:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({
          error: "Execution not found",
          details: error.message
        });
        return;
      }

      res.status(500).json({
        error: "Failed to update CTRF report",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  },

  async processRawReportFile(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: "CTRF report file is required",
        });
        return;
      }

      // Parse the file content as JSON
      const fileContent = file.buffer.toString("utf8");
      let ctrfReport: CTRFReport;

      try {
        ctrfReport = JSON.parse(fileContent);
      } catch (parseError) {
        res.status(400).json({
          error: `Invalid JSON format in uploaded file: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
        });
        return;
      }

      // Extract projectId from form data (multipart form upload)
      const { projectId } = req.body;
      if (!projectId) {
        res.status(400).json({
          error: "Missing required form field: projectId"
        });
        return;
      }

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

      logger.info(`Processing uploaded CTRF report with ${ctrfReport.results.tests.length} tests for project ${projectId}`);

      // Analyze test results before processing
      let analysisResults = null;
      try {
        analysisResults = await testAnalysisService.analyzeCtrfTestResults(ctrfReport);
        logger.info(
          "CTRF Analysis completed:",
          analysisResults.length,
          "tests analyzed",
        );
      } catch (analysisError) {
        logger.warn(
          "CTRF Analysis failed, proceeding without analysis:",
          analysisError,
        );
        // Continue without analysis - don't fail the entire process
      }

      const result = await ctrfService.processReport(ctrfReport, { projectId });

      // Include analysis results in the response
      const response = {
        success: true,
        message: `Processed ${result.specsProcessed} test specs from uploaded file`,
        executionId: result.executionId,
        data: result,
        ...(analysisResults && { analysis: analysisResults }),
      };

      res.json(response);
    } catch (error) {
      logger.error("Error processing uploaded CTRF report file:", error);
      res.status(500).json({
        error: "Failed to process uploaded CTRF report file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  },
};
