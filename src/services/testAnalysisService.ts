// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

import {
  createGenerativeAiClient,
  GenerativeAiError,
  invalidAiResponseError,
  parseStructuredCompletion,
} from "@/lib/generativeAi";
import { normalizeJsonArrayForText } from "@/lib/jsonPayloads";
import getLogger from "@/lib/logger";
import { getStoredResultsAnalysisPrompt } from "@/prompts/stored-results-analysis/v1.2.0";
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
      errors: Array<{ message: string; callStack: unknown; location: string }>;
    }>,
  ): Promise<Map<string, TestResultAnalysis>> {
    try {
      logger.info(`Analyzing ${results.length} stored test results`);

      // Classification trusts only unique, eligible source results.
      const eligibleResults = results.filter(
        ({ status }) => status === "failed" || status === "flaky",
      );
      const resultsById = new Map<string, (typeof eligibleResults)[number]>();
      for (const result of eligibleResults) {
        const existing = resultsById.get(result.id);
        if (existing && existing.status !== result.status) {
          throw new Error("Conflicting statuses in classification input");
        }
        if (!existing) resultsById.set(result.id, result);
      }
      const resultsForAnalysis = [...resultsById.values()];
      const resultsForAnalysisCount = resultsForAnalysis.length;

      logger.info(
        `Found ${resultsForAnalysisCount} non-passing results (failed/flaky) out of ${results.length} total`,
      );
      logger.debug(
        `Non-passing statuses: ${resultsForAnalysis.map((r) => r.status).join(", ")}`,
      );

      if (resultsForAnalysisCount === 0) {
        logger.info("All stored tests passed, skipping analysis");
        return new Map();
      }

      // Transform stored results to essential data for AI analysis
      const essentialData = resultsForAnalysis.map((result) => {
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
          const lastError = result.errors[0];
          if (lastError) {
            essentialResult.errorMessage = lastError.message;
            essentialResult.errorStack = normalizeJsonArrayForText(
              lastError.callStack,
            );
            essentialResult.errorLocation = lastError.location;
          }
        }

        return essentialResult;
      });

      const systemPrompt = getStoredResultsAnalysisPrompt(essentialData.length);
      const userPrompt = JSON.stringify(essentialData);

      const client = createGenerativeAiClient("classification");

      const structuredModel = client.model.withStructuredOutput<
        z.infer<typeof testAnalysisSchema>
      >(testAnalysisSchema, { name: "test_analysis", includeRaw: true });

      const rawResponse: unknown = await client.invoke(() =>
        structuredModel.invoke([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]),
      );
      const analysisResponse = parseStructuredCompletion(
        client,
        rawResponse,
        testAnalysisSchema,
      );

      logger.info(
        `AI returned ${analysisResponse.results.length} analysis results (expected ${resultsForAnalysisCount})`,
      );

      // Convert array to Map keyed by result ID
      const analysisMap = new Map<string, TestResultAnalysis>();
      for (const result of analysisResponse.results) {
        const trusted = resultsById.get(result.id);
        if (
          !trusted ||
          analysisMap.has(result.id) ||
          trusted.status !== result.status
        ) {
          throw invalidAiResponseError(client);
        }
        analysisMap.set(result.id, result);
      }

      if (analysisMap.size !== resultsForAnalysisCount) {
        throw invalidAiResponseError(client);
      }

      logger.info(
        `Successfully analyzed ${analysisMap.size} stored test results`,
      );

      return analysisMap;
    } catch (error) {
      if (error instanceof GenerativeAiError) {
        logger.error("Error analyzing stored test results:", error.diagnostic);
        throw error;
      }
      logger.error("Error analyzing stored test results");
      throw new GenerativeAiError({
        category: "unknown",
        connection: "openai",
      });
    }
  },
};
