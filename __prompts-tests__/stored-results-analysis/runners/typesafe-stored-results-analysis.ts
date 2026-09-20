// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

import type { EvaluationTokenUsage } from "./evaluation-report";
import type { EvalFailure } from "./types";
import type {
  Category,
  TestCase,
  TestInput,
} from "../v1.1.0/templates/types";

const CATEGORY_CRITERIA = {
  infra:
    "Environment or infrastructure failures, including explicit network errors, DNS, connection failures, TLS/certificates, deployment, credentials, or external authentication systems.",
  performance:
    "Timeouts without explicit network error codes, slow responses, excessive waits, resource exhaustion, or failures caused by runtime performance constraints.",
  script:
    "Test automation defects, including missing selectors, framework errors, invalid fixtures, broken setup, incorrect waits, assertions, or test data.",
  bug: "Application defects or logic errors, including clear expected-versus-actual mismatches, incorrect application behavior, application exceptions, or deterministic product failures.",
  other:
    "Insufficient, missing, generic, unknown, or conflicting evidence that does not clearly establish any of the other categories.",
} as const;

const CATEGORY_QUESTION = choice(
  {
    task: "Choose the root-cause category for `result`.",
    priority:
      "Apply the first matching category in this order: infra, performance, script, bug, other.",
    constraint:
      "Base the decision only on evidence in `result`; use other when the evidence is insufficient or conflicting.",
  },
  CATEGORY_CRITERIA,
);

export interface TypeSafePrediction {
  id: string;
  name: string;
  expected: Category;
  actual: Category;
  confidence: number;
  probabilities: Record<Category, number>;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface TypeSafeEvalResult {
  predictions: TypeSafePrediction[];
  failures: EvalFailure[];
  accuracy: number;
  durationMs: number;
  usage: EvaluationTokenUsage;
}

export interface RunTypeSafeEvalOptions {
  cases: TestCase[];
  model?: string;
  concurrency?: number;
}

function toState(input: TestInput) {
  return {
    result: {
      id: input.id,
      specKey: input.specKey,
      specTitle: input.specTitle,
      status: input.status,
      duration: input.duration,
      retry: input.retry,
      executionName: input.executionName,
      errorMessage: input.errorMessage ?? null,
      errorStack: input.errorStack ?? null,
      errorLocation: input.errorLocation ?? null,
    },
  };
}

async function classifyCase(
  client: TypeSafeClient,
  testCase: TestCase,
  model: string,
): Promise<TypeSafePrediction> {
  const response = await client.systemOne({
    model,
    state: toState(testCase.input),
    questions: { category: CATEGORY_QUESTION },
  });
  const answer = response.answers.category;

  return {
    id: testCase.input.id,
    name: testCase.name,
    expected: testCase.expect.category,
    actual: answer.choice,
    confidence: answer.confidence,
    probabilities: { ...answer.probabilities },
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

export async function runTypeSafeEval(
  options: RunTypeSafeEvalOptions,
): Promise<TypeSafeEvalResult> {
  const {
    cases,
    model = "jev-1.13.0",
    concurrency = 8,
  } = options;
  const client = new TypeSafeClient({ defaultModel: model });
  const predictions = new Array<TypeSafePrediction>(cases.length);
  let nextIndex = 0;
  const startedAt = Date.now();

  async function worker(): Promise<void> {
    while (nextIndex < cases.length) {
      const index = nextIndex;
      nextIndex += 1;
      const testCase = cases[index];
      if (!testCase) continue;
      predictions[index] = await classifyCase(client, testCase, model);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, cases.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const failures = predictions
    .filter((prediction) => prediction.actual !== prediction.expected)
    .map((prediction) => ({
      testCaseName: prediction.name,
      reason: `Category mismatch: expected ${prediction.expected}, got ${prediction.actual} (confidence=${prediction.confidence.toFixed(3)})`,
    }));
  const correct = predictions.length - failures.length;
  const inputTokens = predictions.reduce(
    (sum, prediction) => sum + prediction.inputTokens,
    0,
  );
  const outputTokens = predictions.reduce(
    (sum, prediction) => sum + prediction.outputTokens,
    0,
  );

  return {
    predictions,
    failures,
    accuracy: predictions.length === 0 ? 1 : correct / predictions.length,
    durationMs: Date.now() - startedAt,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
  };
}
