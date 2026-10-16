// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

import type { Category, TestCase, TestInput } from "../v1.1.0/templates/types";
import type { EvaluationUsage } from "./evaluation-report";

export const DEFAULT_TYPESAFE_MODEL = "jev-1.13.0";
export const DEFAULT_TYPESAFE_CONCURRENCY = 8;

const CATEGORY_PRIORITY = [
  "infra",
  "performance",
  "script",
  "bug",
  "other",
] as const satisfies readonly Category[];

const CATEGORY_CRITERIA: Record<Category, string> = {
  infra:
    "Explicit network, DNS, connection, TLS, deployment, credential, or external authentication failures.",
  performance:
    "Timeouts without explicit network error codes, or evidence that performance constraints were exceeded.",
  script:
    "Defects in test automation scripts, selectors, setup, or test harness behavior.",
  bug: "Defects in the application under test, including incorrect behavior or failed assertions.",
  other: "Insufficient or conflicting evidence for the other categories.",
};

const CATEGORY_QUESTION = `Classify this test result using only the supplied result evidence. Choose the first matching category in this priority order: ${CATEGORY_PRIORITY.join(", ")}. Explicit infrastructure failures take priority over generic timeouts. Use other when evidence is insufficient or conflicting.`;

export interface TypeSafePrediction {
  id: string;
  name: string;
  expectedCategory: Category;
  actualCategory: Category;
  confidence: number;
  probabilities: Record<Category, number>;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface TypeSafeEvalFailure {
  testCaseName: string;
  expectedCategory: Category;
  actualCategory: Category;
}

export interface TypeSafeEvalResult {
  provider: "typesafe";
  model: string;
  predictions: TypeSafePrediction[];
  failures: TypeSafeEvalFailure[];
  accuracy: number;
  durationMs: number;
  requestCount: number;
  usage: EvaluationUsage;
}

export interface RunTypeSafeEvalOptions {
  cases: TestCase[];
  model?: string;
  concurrency?: number;
}

function toProviderState(input: TestInput): Record<string, string | number | null> {
  return {
    specKey: input.specKey,
    specTitle: input.specTitle,
    status: input.status,
    duration: input.duration,
    retry: input.retry,
    executionName: input.executionName,
    errorMessage: input.errorMessage ?? null,
    errorStack: input.errorStack ?? null,
    errorLocation: input.errorLocation ?? null,
  };
}

async function classifyCase(
  client: TypeSafeClient,
  testCase: TestCase,
  model: string,
): Promise<TypeSafePrediction> {
  const response = await client.systemOne({
    state: toProviderState(testCase.input),
    model,
    questions: {
      category: choice(CATEGORY_QUESTION, CATEGORY_CRITERIA),
    },
  });
  const answer = response.answers.category;

  return {
    id: testCase.input.id,
    name: testCase.name,
    expectedCategory: testCase.expect.category,
    actualCategory: answer.choice,
    confidence: answer.confidence,
    probabilities: {
      infra: answer.probabilities.infra,
      performance: answer.probabilities.performance,
      script: answer.probabilities.script,
      bug: answer.probabilities.bug,
      other: answer.probabilities.other,
    },
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/** Run a TypeSafe category evaluation without changing production analysis. */
export async function runTypeSafeStoredResultsAnalysis(
  options: RunTypeSafeEvalOptions,
): Promise<TypeSafeEvalResult> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "TYPESAFE_API_KEY is required to run TypeSafe stored-results evaluation",
    );
  }

  const requestedModel =
    options.model?.trim() ||
    process.env.TYPESAFE_DEFAULT_MODEL?.trim() ||
    DEFAULT_TYPESAFE_MODEL;
  const concurrency = options.concurrency ?? DEFAULT_TYPESAFE_CONCURRENCY;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer");
  }

  if (options.cases.length === 0) {
    return {
      provider: "typesafe",
      model: requestedModel,
      predictions: [],
      failures: [],
      accuracy: 1,
      durationMs: 0,
      requestCount: 0,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  const client = new TypeSafeClient({
    apiKey: apiKey.trim(),
    retry: { maxRetries: 0 },
  });
  const startedAt = Date.now();
  const results = new Array<TypeSafePrediction>(options.cases.length);
  let nextIndex = 0;
  let hasProviderFailure = false;
  let firstProviderFailure: unknown;

  const worker = async (): Promise<void> => {
    while (!hasProviderFailure && nextIndex < options.cases.length) {
      const index = nextIndex;
      nextIndex += 1;

      try {
        const testCase = options.cases[index];
        if (!testCase) {
          throw new Error(`Missing TypeSafe case at index ${index}`);
        }
        results[index] = await classifyCase(client, testCase, requestedModel);
      } catch (error) {
        if (!hasProviderFailure) {
          hasProviderFailure = true;
          firstProviderFailure = error;
        }
        return;
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, options.cases.length) },
      () => worker(),
    ),
  );

  if (hasProviderFailure) {
    throw firstProviderFailure;
  }

  const predictions = results.map((prediction, index) => {
    if (!prediction) {
      throw new Error(`Missing TypeSafe prediction for case index ${index}`);
    }
    return prediction;
  });
  const failures = predictions
    .filter((prediction) => prediction.actualCategory !== prediction.expectedCategory)
    .map((prediction) => ({
      testCaseName: prediction.name,
      expectedCategory: prediction.expectedCategory,
      actualCategory: prediction.actualCategory,
    }));
  const correctCount = predictions.length - failures.length;
  const usage = predictions.reduce(
    (total, prediction) => ({
      inputTokens: total.inputTokens + prediction.inputTokens,
      outputTokens: total.outputTokens + prediction.outputTokens,
      totalTokens:
        total.totalTokens + prediction.inputTokens + prediction.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );

  return {
    provider: "typesafe",
    model: predictions[0]?.model ?? requestedModel,
    predictions,
    failures,
    accuracy: correctCount / predictions.length,
    durationMs: Date.now() - startedAt,
    requestCount: predictions.length,
    usage,
  };
}
