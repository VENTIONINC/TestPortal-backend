import { Request, Response } from "express";
import { testAnalysisService } from "@/services/testAnalysisService";

export const testAnalysisController = {
  analyzeTestResults: async (req: Request, res: Response): Promise<void> => {
    try {
      const { testResults } = req.body ?? {};

      // If testResults provided in body, validate it
      if (testResults && !Array.isArray(testResults)) {
        res.status(400).json({
          success: false,
          error: "testResults must be an array if provided"
        });
        return;
      }

      // Call service with testResults (could be undefined to trigger local file reading)
      const analysisResults = await testAnalysisService.analyzeTestResults(testResults);
      
      const dataSource = testResults ? "request body" : "local files";
      
      res.status(200).json({
        success: true,
        data: {
          dataSource,
          totalTests: analysisResults.length,
          analysisResults
        }
      });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
}; 