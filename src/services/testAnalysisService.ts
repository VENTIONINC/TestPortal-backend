// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

import { getAiConfigSnapshot, type AiConfigSnapshot } from "@/config/aiConfig";
import {
  createGenerativeAiClient,
  GenerativeAiError,
  invalidAiResponseError,
  parseStructuredCompletion,
  safeModelIdentifier,
  type GenerativeAiClientContext,
} from "@/lib/generativeAi";
import { submitDecisionsRequest } from "@/lib/decisionsApi";
import { normalizeJsonArrayForText } from "@/lib/jsonPayloads";
import getLogger from "@/lib/logger";
import {
  STORED_RESULT_CATEGORY_POLICY_VERSION,
  STORED_RESULT_CATEGORY_CHOICES,
  STORED_RESULT_CATEGORY_INSTRUCTIONS,
  STORED_RESULT_CATEGORY_PRIORITY,
} from "@/lib/storedResultCategoryPolicy";
import { getStoredResultsAnalysisPrompt } from "@/prompts/stored-results-analysis/v1.2.0";
import {
  testAnalysisSchema,
  type TestResultAnalysis,
} from "@/schemas/testAnalysisSchemas";
import type { AnalysisMetadata } from "@/schemas/analysisMetadataSchemas";

const logger = getLogger("test-analysis");
const MAX_DECISION_EVIDENCE_CHARS = 16_000;
const DECISION_CONCURRENCY = 8;

export interface DetailedStoredResultAnalysis {
  analyses: Map<string, TestResultAnalysis>;
  metadata: Map<string, AnalysisMetadata>;
}

export class StoredAnalysisBatchError extends GenerativeAiError {
  readonly resultIds: readonly string[];

  constructor(error: GenerativeAiError, resultIds: string[]) {
    super(error.diagnostic);
    this.name = "StoredAnalysisBatchError";
    this.resultIds = Object.freeze([...resultIds]);
  }
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

const finiteProbabilitySchema = z.number().finite().min(0).max(1);
const decisionCategorySchema = z.enum(STORED_RESULT_CATEGORY_PRIORITY);

const nativeDecisionProbabilitySchema = z
  .object({
    value: decisionCategorySchema,
    probability: finiteProbabilitySchema,
  })
  .strict();

const nativeDecisionAnswerSchema = z
  .object({
    type: z.literal("choice"),
    name: z.string().trim().min(1),
    choice: decisionCategorySchema,
    probabilities: z.array(nativeDecisionProbabilitySchema),
    confidence: finiteProbabilitySchema,
  })
  .strict();

const nativeDecisionsResponseSchema = z
  .object({
    answers: z.array(nativeDecisionAnswerSchema),
    status: z.literal("completed").optional(),
    incomplete_details: z.null().optional(),
    refusal: z.null().optional(),
  })
  .passthrough();

function isEligibleResult(
  result: StoredResultAnalysisInput,
): result is StoredResultAnalysisInput & { status: "failed" | "flaky" } {
  return result.status === "failed" || result.status === "flaky";
}

function getDecisionEvidence(
  result: StoredResultAnalysisInput & { status: "failed" | "flaky" },
  client: GenerativeAiClientContext,
): string {
  const lastError = result.errors[0];
  const evidence = {
    status: result.status,
    specKey: result.spec.key,
    specTitle: result.spec.title,
    specFile: result.spec.file,
    duration: result.duration,
    retry: result.retry,
    executionName: result.execution.name,
    executionEnvironment: result.execution.environment,
    ...(lastError
      ? {
          errorMessage: lastError.message,
          errorStack: normalizeJsonArrayForText(lastError.callStack),
          errorLocation: lastError.location,
        }
      : {}),
  };
  const input = JSON.stringify(evidence);
  if (input.length > MAX_DECISION_EVIDENCE_CHARS) {
    throw invalidAiResponseError(client);
  }
  return input;
}

function validateDecisionsCategory(
  value: unknown,
  client: GenerativeAiClientContext,
): {
  answer: z.infer<typeof nativeDecisionAnswerSchema>;
  returnedModel: string | null;
} {
  const parsed = nativeDecisionsResponseSchema.safeParse(value);
  if (!parsed.success || parsed.data.answers.length !== 1) {
    throw invalidAiResponseError(client);
  }

  const answer = parsed.data.answers[0];
  if (!answer || answer.name !== "category") {
    throw invalidAiResponseError(client);
  }

  const categoryValues = answer.probabilities.map(
    ({ value: category }) => category,
  );
  const uniqueValues = new Set(categoryValues);
  const hasCompleteDistribution =
    answer.probabilities.length === STORED_RESULT_CATEGORY_PRIORITY.length &&
    uniqueValues.size === STORED_RESULT_CATEGORY_PRIORITY.length &&
    STORED_RESULT_CATEGORY_PRIORITY.every((category) =>
      uniqueValues.has(category),
    );
  const distributionTotal = answer.probabilities.reduce(
    (sum, probability) => sum + probability.probability,
    0,
  );

  if (!hasCompleteDistribution || Math.abs(distributionTotal - 1) > 1e-6) {
    throw invalidAiResponseError(client);
  }
  return {
    answer,
    returnedModel: safeModelIdentifier(parsed.data.model) ?? null,
  };
}

export function mapDecisionsConfidence(confidence: number): number {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RangeError("Decisions confidence must be between 0 and 1.");
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
  ): Promise<DetailedStoredResultAnalysis> {
    let snapshot: AiConfigSnapshot;
    try {
      snapshot = getAiConfigSnapshot();
    } catch {
      logger.error("Error analyzing stored test results");
      throw new GenerativeAiError({
        category: "unknown",
        connection: "openai",
      });
    }

    if (snapshot.classificationStrategy === "decisions") {
      return this.analyzeDecisionsStoredResultsDetailed(results, snapshot);
    }

    const analyses = await this.analyzeGenerativeStoredResults(
      results,
      snapshot,
    );
    const requestedModel = safeModelIdentifier(
      snapshot.operations.classification.model,
    );
    const analyzedAt = new Date().toISOString();
    const metadata = new Map<string, AnalysisMetadata>();
    for (const id of analyses.keys()) {
      metadata.set(id, {
        version: 1,
        strategy: "generative",
        connection: snapshot.connection.connectionLabel,
        requestedModel: requestedModel ?? null,
        returnedModel: null,
        analyzedAt,
        latencyMs: null,
        attempts: null,
        rawConfidence: null,
        categoryProbabilities: null,
        categoryPolicyVersion: null,
        confidenceMappingVersion: null,
      });
    }
    return { analyses, metadata };
  },

  async analyzeGenerativeStoredResults(
    results: StoredResultAnalysisInput[],
    snapshot: AiConfigSnapshot,
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

      const client = createGenerativeAiClient("classification", snapshot);

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

  async analyzeDecisionsStoredResults(
    results: StoredResultAnalysisInput[],
    snapshot: AiConfigSnapshot = getAiConfigSnapshot(),
  ): Promise<Map<string, TestResultAnalysis>> {
    return (await this.analyzeDecisionsStoredResultsDetailed(results, snapshot))
      .analyses;
  },

  async analyzeDecisionsStoredResultsDetailed(
    results: StoredResultAnalysisInput[],
    snapshot: AiConfigSnapshot = getAiConfigSnapshot(),
  ): Promise<DetailedStoredResultAnalysis> {
    const requestedModel =
      snapshot.operations.classification.decisions?.model ?? "";
    const client: GenerativeAiClientContext = {
      connection: snapshot.connection.connectionLabel,
      requestedModel,
    };
    const eligibleById = new Map<
      string,
      StoredResultAnalysisInput & { status: "failed" | "flaky" }
    >();

    for (const result of results) {
      if (!isEligibleResult(result)) continue;
      const existing = eligibleById.get(result.id);
      if (existing && existing.status !== result.status) {
        throw invalidAiResponseError(client);
      }
      if (!existing) eligibleById.set(result.id, result);
    }

    const eligible = [...eligibleById.values()];
    if (eligible.length === 0) {
      return { analyses: new Map(), metadata: new Map() };
    }

    const analyses: Array<TestResultAnalysis | undefined> = new Array(
      eligible.length,
    );
    const metadata: Array<AnalysisMetadata | undefined> = new Array(
      eligible.length,
    );
    let nextIndex = 0;
    let failure: GenerativeAiError | undefined;
    const attemptedResultIds = new Set<string>();

    const worker = async (): Promise<void> => {
      while (!failure) {
        const index = nextIndex++;
        const result = eligible[index];
        if (!result) return;

        try {
          attemptedResultIds.add(result.id);
          const startedAt = Date.now();
          const input = getDecisionEvidence(result, client);
          const response = await submitDecisionsRequest(
            {
              input,
              questions: [
                {
                  type: "choice",
                  name: "category",
                  instructions: STORED_RESULT_CATEGORY_INSTRUCTIONS,
                  choices: [...STORED_RESULT_CATEGORY_CHOICES],
                },
              ],
            },
            snapshot,
          );
          const validated = validateDecisionsCategory(response, client);
          const { answer } = validated;
          let confidence: number;
          try {
            confidence = mapDecisionsConfidence(answer.confidence);
          } catch {
            throw invalidAiResponseError(client);
          }

          analyses[index] = {
            id: result.id,
            status: result.status,
            category: answer.choice,
            confidence,
            conclusion: "Explanation is not available from the Decisions API.",
            errorQuality: null,
            errorQualityConclusion: null,
          };
          metadata[index] = {
            version: 1,
            strategy: "decisions",
            connection: snapshot.connection.connectionLabel,
            requestedModel: safeModelIdentifier(requestedModel) ?? null,
            returnedModel: validated.returnedModel,
            analyzedAt: new Date().toISOString(),
            latencyMs: Math.max(0, Date.now() - startedAt),
            attempts: 1,
            rawConfidence: answer.confidence,
            categoryProbabilities: Object.fromEntries(
              answer.probabilities.map(({ value, probability }) => [
                value,
                probability,
              ]),
            ),
            categoryPolicyVersion: STORED_RESULT_CATEGORY_POLICY_VERSION,
            confidenceMappingVersion: "decisions-confidence-v1",
          };
        } catch (error) {
          if (error instanceof GenerativeAiError) {
            failure ??= error;
          } else {
            const safeRequestedModel = safeModelIdentifier(requestedModel);
            failure ??= new GenerativeAiError({
              category: "unknown",
              connection: snapshot.connection.connectionLabel,
              ...(safeRequestedModel
                ? { requestedModel: safeRequestedModel }
                : {}),
            });
          }
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(DECISION_CONCURRENCY, eligible.length) },
        worker,
      ),
    );

    if (failure) {
      logger.error("Error analyzing stored test results:", failure.diagnostic);
      throw new StoredAnalysisBatchError(failure, [...attemptedResultIds]);
    }

    const analysisMap = new Map<string, TestResultAnalysis>();
    const metadataMap = new Map<string, AnalysisMetadata>();
    eligible.forEach((result, index) => {
      const analysis = analyses[index];
      const resultMetadata = metadata[index];
      if (!analysis || !resultMetadata) throw invalidAiResponseError(client);
      analysisMap.set(result.id, analysis);
      metadataMap.set(result.id, resultMetadata);
    });
    return { analyses: analysisMap, metadata: metadataMap };
  },
};
