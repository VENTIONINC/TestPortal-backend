import { Request, Response } from "express";
import { jsonReportService } from "@/services/jsonReportService";
import { testAnalysisService } from "@/services/testAnalysisService";

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

  /**
   * Handle POST request to process raw JSON report and transform it
   */
  processRawReport: async (req: Request, res: Response): Promise<void> => {
    try {
      const rawJsonReport = req.body;

      if (!rawJsonReport) {
        res.status(400).json({
          error: "Raw JSON report data is required",
        });
        return;
      }

      // Transform raw JSON to the expected format (like seed script does)
      const transformedReport =
        await jsonReportController._transformRawReport(rawJsonReport);

      const result = await jsonReportService.processReport(transformedReport);

      res.status(201).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to process raw JSON report. ${err.message}`,
      });
    }
  },

  /**
   * Handle POST request to process raw JSON report file and transform it
   */
  processRawReportFile: async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: "JSON report file is required",
        });
        return;
      }

      // Parse the file content as JSON
      const fileContent = file.buffer.toString("utf8");
      let rawJsonReport;

      try {
        rawJsonReport = JSON.parse(fileContent);
      } catch (parseError) {
        res.status(400).json({
          error: `Invalid JSON format in uploaded file: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
        });
        return;
      }

      // Transform raw JSON to the expected format (like seed script does)
      const transformedReport =
        await jsonReportController._transformRawReport(rawJsonReport);

      // Analyze test results before processing
      let analysisResults = null;
      try {
        analysisResults =
          await testAnalysisService.analyzeTestResults(rawJsonReport);
        console.log(
          "Analysis completed:",
          analysisResults.length,
          "tests analyzed",
        );
      } catch (analysisError) {
        console.warn(
          "Analysis failed, proceeding without analysis:",
          analysisError,
        );
        // Continue without analysis - don't fail the entire process
      }

      const result = await jsonReportService.processReport({
        ...transformedReport,
        analysis: analysisResults,
      });

      // Include analysis results in the response
      const response = {
        ...result,
        ...(analysisResults && { analysis: analysisResults }),
      };

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
          return {
            reportPortalLink:
              result.reportPortalLink ??
              "https://automation.qa.theguarantors.com/allure-report/index.html",
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
