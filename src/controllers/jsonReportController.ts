import { Response } from "express";
import {
  jsonReportService,
  type ProcessReportResult,
} from "@/services/jsonReportService";
import { testAnalysisService } from "@/services/testAnalysisService";
import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";
import type { ApiKeyAuthenticatedRequest } from "@/middleware/apiKeyMiddleware";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import { dbClient } from "@/prisma/client";
import getLogger from "@/lib/logger";
import { dashboardService } from "@/services/dashboardService";

const logger = getLogger("json-report-controller");

interface ProcessReportResponse extends ProcessReportResult {
  analysis?: TestResultAnalysis[] | undefined;
}

export const jsonReportController = {
  /**
   * Core method to process raw JSON report file
   * Used by both JWT and API key authentication routes
   */
  _processRawReportFileCore: async (
    file: Express.Multer.File | undefined,
    projectId: string | undefined,
    userId: string | undefined,
  ): Promise<ProcessReportResponse> => {
    if (!file) {
      throw new Error("JSON report file is required");
    }

    if (!projectId) {
      throw new Error("Valid projectId is required");
    }

    if (!userId) {
      throw new Error("Valid userId is required");
    }

    // Parse the file content as JSON
    const fileContent = file.buffer.toString("utf8");
    let rawJsonReport;

    try {
      rawJsonReport = JSON.parse(fileContent);
    } catch (parseError) {
      throw new Error(
        `Invalid JSON format in uploaded file: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
      );
    }

    // Transform raw JSON to the expected format (like seed script does)
    const transformedReport =
      await jsonReportController._transformRawReport(rawJsonReport);

    // Step 1: Persist to database WITHOUT analysis
    const processResult = await jsonReportService.processReport(
      {
        ...transformedReport,
        provider: "Playwright",
      },
      projectId,
    );

    // Step 2: Check if analysis is enabled for current user
    const user = await dbClient.user.findUnique({
      where: { id: userId },
    });

    const shouldAnalyze = user?.analyzeEnabled ?? false;

    if (!shouldAnalyze) {
      logger.info("Analysis disabled for user, skipping analysis");

      // Update stats even without analysis
      try {
        await dashboardService.updateStats(
          processResult.executionId,
          projectId,
        );
      } catch (err) {
        logger.error(`Failed to update dashboard stats: ${err}`);
      }

      return {
        ...processResult,
        analysis: undefined,
      };
    }

    // Step 3: Fetch just-created results from DB with relations
    const createdResults = await dbClient.result.findMany({
      where: { executionId: processResult.executionId },
      include: {
        spec: true,
        execution: true,
        errors: true,
      },
    });

    logger.info(
      `Fetched ${createdResults.length} results from DB for analysis`,
    );

    // Step 4: Analyze stored results (POST-PERSIST)
    let analysisMap = null;
    try {
      analysisMap =
        await testAnalysisService.analyzeStoredResults(createdResults);

      // Step 5: Update results with analysis fields
      logger.info(`Updating ${analysisMap.size} results with analysis data`);

      await Promise.all(
        Array.from(analysisMap.entries()).map(([resultId, analysis]) =>
          dbClient.result.update({
            where: { id: resultId },
            data: {
              analysisStatus: analysis.status,
              analysisCategory: analysis.category ?? null,
              analysisConfidence: analysis.confidence,
              analysisConclusion: analysis.conclusion ?? null,
              analysisErrorQuality: analysis.errorQuality ?? null,
              analysisErrorQualityConclusion:
                analysis.errorQualityConclusion ?? null,
            },
          }),
        ),
      );

      logger.info(
        `Successfully updated ${analysisMap.size} results with analysis`,
      );
    } catch (analysisError) {
      logger.warn(
        "Analysis failed, results saved without analysis:",
        analysisError,
      );
    }

    // Update stats after analysis (or failure)
    try {
      await dashboardService.updateStats(processResult.executionId, projectId);
    } catch (err) {
      logger.error(`Failed to update dashboard stats: ${err}`);
    }

    return {
      ...processResult,
      analysis: analysisMap ? Array.from(analysisMap.values()) : undefined,
    };
  },

  /**
   * Handle POST request to process raw JSON report file and transform it
   */
  processRawReportFile: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const projectId = (req.body as { projectId?: string | undefined })
        .projectId;
      const userId = req.user?.id;

      const response = await jsonReportController._processRawReportFileCore(
        req.file,
        projectId,
        userId,
      );

      res.status(201).json(response);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to process raw JSON report file. ${err.message}`,
      });
    }
  },

  /**
   * Handle POST request to process raw JSON report file with API key authentication
   */
  processRawReportFileWithApiKey: async (
    req: ApiKeyAuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const projectId = req.apiKey?.projectId;
      const userId = req.apiKey?.ownerId;

      const response = await jsonReportController._processRawReportFileCore(
        req.file,
        projectId,
        userId,
      );

      res.status(201).json(response);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to process raw JSON report file. ${err.message}`,
      });
    }
  },

  /**
   * Transform raw JSON report to the expected format
   */
  _transformRawReport: async (rawJsonReport: any) => {
    const config = rawJsonReport.config ?? {};
    config.env = config.env ?? "staging";
    config.runId = rawJsonReport.runId;
    config.stats = rawJsonReport.stats;
    config.hash = rawJsonReport.hash;

    const tests = jsonReportController
      ._getTestCases(rawJsonReport.suites ?? [])
      .map((test) => {
        test.results = test.results.map((result: any) => {
          const reportPortalLink =
            result.reportPortalLink ??
            result.allureReportLink ??
            "https://automation.qa.theguarantors.com/allure-report/index.html";

          return {
            reportPortalLink,
            ...result,
          };
        });
        return test;
      });

    return {
      ...config,
      tests,
      isJson: true,
    };
  },

  /**
   * Extract and flatten test cases from suites (like seed script does)
   */
  _getTestCases: (suitesList: any[], testCases: any[] = []) => {
    for (const { suites, specs } of suitesList) {
      if (suites) {
        jsonReportController._getTestCases(suites, testCases);
      }

      if (specs) {
        for (const spec of specs) {
          const flatSpecs = spec.tests.map((t: any) => ({
            ok: spec.ok,
            custom_id: spec.id,
            location: {
              file: spec.file,
              line: spec.line,
              column: spec.column,
            },
            title: spec.title,
            tags: spec.tags,
            timeout: t.timeout,
            annotations: t.annotations,
            expectedStatus: t.expectedStatus,
            projectId: t.projectId,
            projectName: t.projectName,
            results: t.results.map((r: any) => {
              const { /* errors, */ ...rest } = r;
              const maxSize = 10000;

              if (rest.error?.message?.length > maxSize) {
                rest.error.message = rest.error.message.slice(0, maxSize);
                rest.error.stack = rest.error.stack.slice(0, maxSize);

                if (rest.error.matcherResult) {
                  rest.error.matcherResult.message =
                    rest.error.matcherResult.message.slice(0, maxSize);
                }
              }

              return rest;
            }),
            status: t.status,
            titlePath: [spec.file],
          }));

          testCases.push(...flatSpecs);
        }
      }
    }

    return testCases;
  },
};
