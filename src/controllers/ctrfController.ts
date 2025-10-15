import type { Request, Response } from "express";
import { ctrfService } from "@/services/ctrfService";
import { testAnalysisService } from "@/services/testAnalysisService";
import type { CTRFReport } from "@/types/ctrf";
import type { ApiKeyAuthenticatedRequest } from "@/middleware/apiKeyMiddleware";
import type { ProcessReportResult } from "@/services/jsonReportService";
import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";
import getLogger from "@/lib/logger";

const logger = getLogger("ctrf-controller");

interface ProcessReportResponse extends ProcessReportResult {
  analysis?: TestResultAnalysis[];
}

export const ctrfController = {
  /**
   * Core method to process raw CTRF report file
   * Used by both JWT and API key authentication routes
   */
  async _processRawReportFileCore(
    file: Express.Multer.File | undefined,
    projectId: string | undefined,
  ): Promise<ProcessReportResponse> {
    if (!file) {
      throw new Error("CTRF report file is required");
    }

    if (!projectId) {
      throw new Error("Missing required form field: projectId");
    }

    // Parse the file content as JSON
    const fileContent = file.buffer.toString("utf8");
    let ctrfReport: CTRFReport;

    try {
      ctrfReport = JSON.parse(fileContent);
    } catch (parseError) {
      throw new Error(
        `Invalid JSON format in uploaded file: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
      );
    }

    if (!ctrfReport?.results) {
      throw new Error("Invalid CTRF report format - missing results object");
    }

    if (!ctrfReport.results.tests || !Array.isArray(ctrfReport.results.tests)) {
      throw new Error(
        "Invalid CTRF report format - missing or invalid tests array",
      );
    }

    logger.info(
      `Processing uploaded CTRF report with ${ctrfReport.results.tests.length} tests for project ${projectId}`,
    );

    // Analyze test results before processing
    let analysisResults = null;
    try {
      analysisResults =
        await testAnalysisService.analyzeCtrfTestResults(ctrfReport);
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
    }

    const result = await ctrfService.processReport(ctrfReport, { projectId });

    return {
      ...result,
      ...(analysisResults && { analysis: analysisResults }),
    };
  },

  async processRawReportFile(req: Request, res: Response): Promise<void> {
    try {
      // Extract projectId from form data (multipart form upload)
      const projectId = req.body.projectId;

      const response = await ctrfController._processRawReportFileCore(
        req.file,
        projectId,
      );

      res.status(201).json(response);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to process raw CTRF report file. ${err.message}`,
      });
    }
  },

  /**
   * Handle POST request to process raw CTRF report file with API key authentication
   */
  async processRawReportFileWithApiKey(
    req: ApiKeyAuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      // Extract projectId from validated API key
      const projectId = req.apiKey?.projectId;

      const response = await ctrfController._processRawReportFileCore(
        req.file,
        projectId,
      );

      res.status(201).json(response);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to process raw CTRF report file. ${err.message}`,
      });
    }
  },
};
