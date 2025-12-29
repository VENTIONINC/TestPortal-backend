import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import getLogger from "@/lib/logger";
import { getStoredResultsAnalysisPrompt } from "@/prompts/stored-results-analysis/v1.0.0";
import {
  testAnalysisSchema,
  type TestResultAnalysis,
} from "@/schemas/testAnalysisSchemas";

const logger = getLogger("test-analysis");

export interface TestAnalysisRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: object;
    };
  };
}

export const testAnalysisService = {
  /**
   * Analyze test results that have already been persisted to the database.
   * Uses real DB IDs instead of workerIndex for matching.
   *
   * @param results - Array of Result records with spec, execution, and errors relations
   * @returns Map of resultId → TestResultAnalysis
   */
  async analyzeStoredResults(
    results: Array<{
      id: string;
      status: string;
      duration: number;
      startTime: Date;
      retry: number;
      spec: { key: string; title: string; file: string };
      execution: { name: string; environment: string };
      errors: Array<{ message: string; callStack: string; location: string }>;
    }>,
  ): Promise<Map<string, TestResultAnalysis>> {
    try {
      logger.info(`Analyzing ${results.length} stored test results`);

      // Filter to only failed tests
      const failedResults = results.filter(
        (result) => result.status !== "passed",
      );

      logger.info(
        `Found ${failedResults.length} failed results out of ${results.length} total`,
      );
      logger.debug(
        `Failed result statuses: ${failedResults.map((r) => r.status).join(", ")}`,
      );

      if (failedResults.length === 0) {
        logger.info("All stored tests passed, skipping analysis");
        return new Map();
      }

      // Transform stored results to essential data for AI analysis
      const essentialData = failedResults.map((result) => {
        const essentialResult: {
          id: string;
          specKey: string;
          specTitle: string;
          status: string;
          duration: number;
          retry: number;
          executionName: string;
          errorMessage?: string;
          errorStack?: string;
          errorLocation?: string;
        } = {
          id: result.id,
          specKey: result.spec.key,
          specTitle: result.spec.title,
          status: result.status,
          duration: result.duration,
          retry: result.retry,
          executionName: result.execution.name,
        };

        // Add error information if present
        if (result.errors.length > 0) {
          const firstError = result.errors[0];
          if (firstError) {
            essentialResult.errorMessage = firstError.message;
            essentialResult.errorStack = firstError.callStack;
            essentialResult.errorLocation = firstError.location;
          }
        }

        return essentialResult;
      });

      const systemPrompt = getStoredResultsAnalysisPrompt(essentialData.length);
      const userPrompt = JSON.stringify(essentialData);

      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        maxTokens: 4000,
        maxRetries: 2,
      });

      const structuredModel = model.withStructuredOutput<
        z.infer<typeof testAnalysisSchema>
      >(testAnalysisSchema, {
        name: "test_analysis",
      });

      const analysisResponse = await structuredModel.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      logger.info(
        `AI returned ${analysisResponse.results.length} analysis results (expected ${failedResults.length})`,
      );

      // Convert array to Map keyed by result ID
      const analysisMap = new Map<string, TestResultAnalysis>();
      for (const result of analysisResponse.results) {
        analysisMap.set(result.id, {
          id: result.id,
          status: result.status,
          confidence: result.confidence,
          category: result.category,
          conclusion: result.conclusion,
          errorQuality: result.errorQuality,
          errorQualityConclusion: result.errorQualityConclusion,
        });
      }

      logger.info(
        `Successfully analyzed ${analysisMap.size} stored test results`,
      );

      return analysisMap;
    } catch (error) {
      logger.error("Error analyzing stored test results:", error);
      throw error;
    }
  },
};
