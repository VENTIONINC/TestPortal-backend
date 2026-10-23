// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { environment } from "@/config/environment";
import { normalizeJsonArrayForText } from "@/lib/jsonPayloads";
import {
  STORED_RESULT_CATEGORY_CRITERIA,
  STORED_RESULT_CATEGORY_INSTRUCTIONS,
  STORED_RESULT_CATEGORY_POLICY_VERSION,
} from "@/lib/storedResultCategoryPolicy";
import { submitOpenRouterDecision, OpenRouterDecisionsError } from "@/lib/openrouter-decisions/transport";
import { validateOpenRouterDecisionsResponse } from "@/lib/openrouter-decisions/response";
import type { OpenRouterDecisionsRequest } from "@/lib/openrouter-decisions/schemas";
import type { AnalysisLastError, AnalysisMetadata } from "@/schemas/analysisMetadataSchemas";
import getLogger from "@/lib/logger";
import { getStoredResultsAnalysisPrompt } from "@/prompts/stored-results-analysis/v1.1.0";
import {
  testAnalysisSchema,
  type TestResultAnalysis,
} from "@/schemas/testAnalysisSchemas";

const logger = getLogger("test-analysis");
export const STORED_RESULT_DECISIONS_MODEL = "openai/gpt-6-luna-decisions";
const MAX_DECISION_EVIDENCE_CHARS = 16_000;
const DECISION_CONCURRENCY = 8;

export interface DetailedAnalysisResult {
  analyses: Map<string, TestResultAnalysis>;
  metadata: Map<string, AnalysisMetadata>;
}

export class StoredAnalysisBatchError extends Error {
  constructor(readonly failures: Map<string, AnalysisLastError>, cause: unknown) {
    super("Stored-result analysis failed.", { cause });
    this.name = "StoredAnalysisBatchError";
  }
}

function toSanitizedAnalysisError(error: unknown): AnalysisLastError {
  const known = error instanceof OpenRouterDecisionsError ? error : null;
  const kind = known?.kind ?? "upstream";
  const safeMessages: Record<AnalysisLastError["kind"], string> = {
    configuration: "Analysis provider configuration is invalid.",
    authentication: "Analysis provider rejected authentication.",
    credit: "Analysis provider account has insufficient credit.",
    rate_limit: "Analysis provider rate limit was reached.",
    timeout: "Analysis provider request timed out.",
    network: "Analysis provider network request failed.",
    upstream: "Analysis provider request failed.",
    invalid_response: "Analysis provider returned an invalid response.",
    refusal: "Analysis provider refused the request.",
    persistence: "Analysis results could not be saved.",
  };
  return {
    version: 1,
    kind,
    message: safeMessages[kind],
    occurredAt: new Date().toISOString(),
    attempts: known?.attempts ?? null,
    httpStatus: known?.status ?? null,
    provider: "openrouter",
    model: STORED_RESULT_DECISIONS_MODEL,
    apiMode: "decisions",
  };
}

export function mapDecisionsConfidence(confidence: number): number {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Decisions confidence must be a finite value from 0 to 1.");
  }
  if (confidence < 0.6) return 1;
  if (confidence < 0.75) return 2;
  if (confidence < 0.9) return 3;
  if (confidence < 0.97) return 4;
  return 5;
}

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

export interface StoredResultAnalysisInput {
  id: string;
  status: string;
  duration: number;
  startTime: Date;
  retry: number;
  spec: { key: string; title: string; file: string };
  execution: { name: string; environment: string };
  errors: Array<{ message: string; callStack: unknown; location: string }>;
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
    results: StoredResultAnalysisInput[],
  ): Promise<Map<string, TestResultAnalysis>> {
    return (await this.analyzeStoredResultsDetailed(results)).analyses;
  },

  async analyzeStoredResultsDetailed(
    results: StoredResultAnalysisInput[],
  ): Promise<DetailedAnalysisResult> {
    if (environment.decisions.enabled) {
      return this.analyzeDecisionsResultsDetailed(results);
    }
    const analyses = await this.analyzeGenerativeStoredResults(results);
    const metadata = new Map<string, AnalysisMetadata>();
    for (const id of analyses.keys()) {
      metadata.set(id, {
        version: 1,
        provider: "openai",
        apiMode: "chat_completions",
        metricsScope: "shared_request",
        requestedModel: "gpt-4.1-mini",
        returnedModel: null,
        upstreamProvider: null,
        requestId: null,
        analyzedAt: new Date().toISOString(),
        latencyMs: null,
        attempts: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        cost: null,
        rawConfidence: null,
        categoryProbabilities: null,
        categoryPolicyVersion: null,
        confidenceMappingVersion: null,
      });
    }
    return { analyses, metadata };
  },

  async analyzeGenerativeStoredResults(
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

      // Filter to only failed tests
      const resultsForAnalysis = results.filter(
        ({ status }) => status === "failed" || status === "flaky",
      );
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

      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0,
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
        `AI returned ${analysisResponse.results.length} analysis results (expected ${resultsForAnalysisCount})`,
      );

      // Convert array to Map keyed by result ID
      const analysisMap = new Map<string, TestResultAnalysis>();
      for (const result of analysisResponse.results) {
        analysisMap.set(result.id, result);
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

  async analyzeDecisionsResults(
    results: StoredResultAnalysisInput[],
  ): Promise<Map<string, TestResultAnalysis>> {
    return (await this.analyzeDecisionsResultsDetailed(results)).analyses;
  },

  async analyzeDecisionsResultsDetailed(
    results: StoredResultAnalysisInput[],
  ): Promise<DetailedAnalysisResult> {
    const eligible = results.filter(({ status }) => status === "failed" || status === "flaky");
    const analyses = new Map<string, TestResultAnalysis>();
    const metadata = new Map<string, AnalysisMetadata>();
    if (eligible.length === 0) return { analyses, metadata };

    let nextIndex = 0;
    let failure: unknown;
    const failures = new Map<string, AnalysisLastError>();
    const worker = async (): Promise<void> => {
      while (!failure) {
        const index = nextIndex++;
        const result = eligible[index];
        if (!result) return;
        try {
          const error = result.errors[0];
          const evidence = {
            status: result.status,
            specKey: result.spec.key,
            specTitle: result.spec.title,
            specFile: result.spec.file,
            duration: result.duration,
            retry: result.retry,
            executionName: result.execution.name,
            executionEnvironment: result.execution.environment,
            ...(error ? {
              errorMessage: error.message,
              errorStack: normalizeJsonArrayForText(error.callStack),
              errorLocation: error.location,
            } : {}),
          };
          const state = JSON.stringify(evidence);
          if (state.length > MAX_DECISION_EVIDENCE_CHARS) {
            throw new OpenRouterDecisionsError("invalid_response", "Analysis evidence exceeds the supported input limit");
          }
          const request: OpenRouterDecisionsRequest = {
            model: STORED_RESULT_DECISIONS_MODEL,
            state,
            questions: {
              category: {
                type: "choice",
                instructions: STORED_RESULT_CATEGORY_INSTRUCTIONS,
                criteria: STORED_RESULT_CATEGORY_CRITERIA,
              },
            },
          };
          const submitted = await submitOpenRouterDecision(request, {
            apiKey: environment.decisions.openRouterApiKey,
            timeoutMs: 30_000,
            maxRetries: 0,
          });
          const validated = validateOpenRouterDecisionsResponse(submitted.data, request, submitted.attempts);
          const answer = validated.answers.category;
          if (!answer || answer.type !== "choice") {
            throw new OpenRouterDecisionsError("invalid_response", "OpenRouter returned no valid category answer", { attempts: submitted.attempts });
          }
          analyses.set(result.id, {
            id: result.id,
            status: result.status as "failed" | "flaky",
            category: answer.choice as TestResultAnalysis["category"],
            confidence: mapDecisionsConfidence(answer.confidence),
            conclusion: "Explanation is not available from the Decisions API.",
            errorQuality: null,
            errorQualityConclusion: null,
          });
          metadata.set(result.id, {
            version: 1,
            provider: "openrouter",
            apiMode: "decisions",
            metricsScope: "per_result",
            requestedModel: STORED_RESULT_DECISIONS_MODEL,
            returnedModel: validated.model,
            upstreamProvider: validated.provider,
            requestId: validated.id,
            analyzedAt: new Date().toISOString(),
            latencyMs: submitted.durationMs,
            attempts: submitted.attempts,
            inputTokens: validated.usage.inputTokens,
            outputTokens: validated.usage.outputTokens,
            totalTokens: validated.usage.totalTokens,
            cost: validated.usage.cost,
            rawConfidence: answer.confidence,
            categoryProbabilities: answer.probabilities,
            categoryPolicyVersion: STORED_RESULT_CATEGORY_POLICY_VERSION,
            confidenceMappingVersion: "decisions-confidence-v1",
          });
        } catch (error) {
          failures.set(result.id, toSanitizedAnalysisError(error));
          failure ??= error;
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(DECISION_CONCURRENCY, eligible.length) }, worker));
    if (failure) throw new StoredAnalysisBatchError(failures, failure);
    return {
      analyses: new Map(eligible.flatMap(({ id }) => {
        const analysis = analyses.get(id);
        return analysis ? [[id, analysis] as const] : [];
      })),
      metadata: new Map(eligible.flatMap(({ id }) => {
        const entry = metadata.get(id);
        return entry ? [[id, entry] as const] : [];
      })),
    };
  },
};
