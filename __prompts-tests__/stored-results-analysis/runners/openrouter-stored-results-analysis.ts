// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { OpenRouterDecisionsRequest } from "@/lib/openrouter-decisions/schemas";
import {
  validateOpenRouterDecisionsResponse,
  type CorrelatedOpenRouterAnswer,
  type OpenRouterUsageMetadata,
} from "@/lib/openrouter-decisions/response";
import {
  OpenRouterDecisionsError,
  submitOpenRouterDecision,
  type OpenRouterTransportOptions,
  type OpenRouterTransportResult,
} from "@/lib/openrouter-decisions/transport";
import type { Category, TestCase } from "@/root/__prompts-tests__/stored-results-analysis/v1.1.0/templates/types";
import {
  resolveOpenRouterProfile,
  type OpenRouterProfileId,
} from "./openrouter-profiles";
import {
  createOpenRouterCategoryQuestion,
  toOpenRouterEvidence,
} from "./openrouter-policy";

export interface OpenRouterPrediction {
  id: string;
  name: string;
  expectedCategory: Category;
  actualCategory: Category;
  confidence: number;
  probabilities: Record<Category, number>;
  requestedModel: string;
  returnedModel: string;
  provider: string | null;
  upstreamRequestId: string | null;
  durationMs: number;
  attempts: number;
  usage: OpenRouterUsageMetadata;
  rawAnswer: Extract<CorrelatedOpenRouterAnswer, { type: "choice" }>;
}

export interface OpenRouterUsageAggregate {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
}

export interface OpenRouterEvalResult {
  profile: OpenRouterProfileId;
  requestedModel: string;
  predictions: OpenRouterPrediction[];
  failures: Array<{
    testCaseName: string;
    expectedCategory: Category;
    actualCategory: Category;
  }>;
  accuracy: number | null;
  durationMs: number;
  requestCount: number;
  attemptCount: number;
  usage: OpenRouterUsageAggregate;
}

export class OpenRouterEvaluationRunError extends Error {
  readonly kind: string;
  readonly requestCount: number;
  readonly attemptCount: number;
  readonly completedPredictions: OpenRouterPrediction[];

  constructor(
    error: unknown,
    requestCount: number,
    attemptCount: number,
    completedPredictions: OpenRouterPrediction[],
  ) {
    const kind =
      error instanceof OpenRouterDecisionsError ? error.kind : "upstream";
    super(
      error instanceof OpenRouterDecisionsError
        ? error.message
        : "OpenRouter evaluation request failed",
    );
    this.name = "OpenRouterEvaluationRunError";
    this.kind = kind;
    this.requestCount = requestCount;
    this.attemptCount = attemptCount;
    this.completedPredictions = completedPredictions;
  }
}

export interface RunOpenRouterEvalOptions {
  cases: TestCase[];
  profile: OpenRouterProfileId;
  concurrency?: number;
  timeoutMs?: number;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  submitRequest?: (
    request: OpenRouterDecisionsRequest,
    options?: OpenRouterTransportOptions,
  ) => Promise<OpenRouterTransportResult>;
}

function aggregateUsage(predictions: OpenRouterPrediction[]): OpenRouterUsageAggregate {
  const aggregate = (key: keyof OpenRouterUsageMetadata): number | null => {
    const values = predictions.map((prediction) => prediction.usage[key]);
    if (values.length === 0 || values.some((value) => value === null)) return null;
    return (values as number[]).reduce((sum, value) => sum + value, 0);
  };

  return {
    inputTokens: aggregate("inputTokens"),
    outputTokens: aggregate("outputTokens"),
    totalTokens: aggregate("totalTokens"),
    cost: aggregate("cost"),
  };
}

function buildRequest(
  testCase: TestCase,
  model: string,
): OpenRouterDecisionsRequest {
  return {
    model,
    state: toOpenRouterEvidence(testCase.input),
    questions: { category: createOpenRouterCategoryQuestion() },
  };
}

/** Evaluate category-only test-result evidence through a selected OpenRouter profile. */
export async function runOpenRouterStoredResultsAnalysis(
  options: RunOpenRouterEvalOptions,
): Promise<OpenRouterEvalResult> {
  if (Object.hasOwn(options, "model")) {
    throw new Error(
      "OpenRouter evaluation model overrides are not supported; select a pinned profile",
    );
  }
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new OpenRouterDecisionsError(
      "configuration",
      "OPENROUTER_API_KEY is required to run OpenRouter stored-results evaluation",
    );
  }

  const profile = resolveOpenRouterProfile(options.profile, {
    ...(options.concurrency === undefined
      ? {}
      : { concurrency: options.concurrency }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  if (options.cases.length === 0) {
    return {
      profile: profile.id,
      requestedModel: profile.model,
      predictions: [],
      failures: [],
      accuracy: null,
      durationMs: 0,
      requestCount: 0,
      attemptCount: 0,
      usage: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        cost: null,
      },
    };
  }

  const startedAt = Date.now();
  const predictions = new Array<OpenRouterPrediction>(options.cases.length);
  const submit = options.submitRequest ?? submitOpenRouterDecision;
  let nextIndex = 0;
  let requestCount = 0;
  let attemptCount = 0;
  let hasFailure = false;
  let firstFailure: unknown;

  const worker = async (): Promise<void> => {
    while (!hasFailure && nextIndex < options.cases.length) {
      const index = nextIndex;
      nextIndex += 1;
      const testCase = options.cases[index];
      if (!testCase) {
        hasFailure = true;
        firstFailure = new Error(`Missing OpenRouter case at index ${index}`);
        return;
      }

      requestCount += 1;
      let requestAttemptsCounted = false;
      try {
        const request = buildRequest(testCase, profile.model);
        const response = await submit(request, {
          apiKey: apiKey.trim(),
          timeoutMs: profile.timeoutMs,
          maxRetries: profile.maxRetries,
          ...(options.fetchImpl === undefined
            ? {}
            : { fetchImpl: options.fetchImpl }),
        });
        attemptCount += response.attempts;
        requestAttemptsCounted = true;
        const validated = validateOpenRouterDecisionsResponse(
          response.data,
          request,
          response.attempts,
        );
        const answer = validated.answers.category;
        if (!answer || answer.type !== "choice") {
          throw new OpenRouterDecisionsError(
            "invalid_response",
            "OpenRouter category answer was not a choice",
            { attempts: response.attempts },
          );
        }
        const actualCategory = answer.choice as Category;
        predictions[index] = {
          id: testCase.input.id,
          name: testCase.name,
          expectedCategory: testCase.expect.category,
          actualCategory,
          confidence: answer.confidence,
          probabilities: answer.probabilities as Record<Category, number>,
          requestedModel: profile.model,
          returnedModel: validated.model,
          provider: validated.provider,
          upstreamRequestId: validated.id,
          durationMs: response.durationMs,
          attempts: response.attempts,
          usage: validated.usage,
          rawAnswer: answer,
        };
      } catch (error) {
        if (!requestAttemptsCounted && error instanceof OpenRouterDecisionsError) {
          attemptCount += error.attempts;
        }
        if (!hasFailure) {
          hasFailure = true;
          firstFailure = error;
        }
        return;
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(profile.concurrency, options.cases.length) },
      () => worker(),
    ),
  );

  const completedPredictions = predictions.filter(
    (prediction): prediction is OpenRouterPrediction => prediction !== undefined,
  );
  if (hasFailure) {
    throw new OpenRouterEvaluationRunError(
      firstFailure,
      requestCount,
      attemptCount,
      completedPredictions,
    );
  }

  const orderedPredictions = predictions.map((prediction, index) => {
    if (!prediction) {
      throw new OpenRouterEvaluationRunError(
        new Error(`Missing OpenRouter prediction at index ${index}`),
        requestCount,
        attemptCount,
        completedPredictions,
      );
    }
    return prediction;
  });
  const failures = orderedPredictions
    .filter((prediction) => prediction.actualCategory !== prediction.expectedCategory)
    .map((prediction) => ({
      testCaseName: prediction.name,
      expectedCategory: prediction.expectedCategory,
      actualCategory: prediction.actualCategory,
    }));
  const correctCount = orderedPredictions.length - failures.length;

  return {
    profile: profile.id,
    requestedModel: profile.model,
    predictions: orderedPredictions,
    failures,
    accuracy: correctCount / orderedPredictions.length,
    durationMs: Date.now() - startedAt,
    requestCount,
    attemptCount,
    usage: aggregateUsage(orderedPredictions),
  };
}
