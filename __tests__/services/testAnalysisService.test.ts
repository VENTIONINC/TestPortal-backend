// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { OpenRouterDecisionsError, submitOpenRouterDecision } from "@/lib/openrouter-decisions/transport";
import {
  STORED_RESULT_CATEGORY_CRITERIA,
  STORED_RESULT_CATEGORY_INSTRUCTIONS,
  STORED_RESULT_CATEGORY_POLICY_VERSION,
} from "@/lib/storedResultCategoryPolicy";
import { mapDecisionsConfidence, StoredAnalysisBatchError } from "@/services/testAnalysisService";
import { testAnalysisService } from "@/services/testAnalysisService";

jest.mock("@/lib/openrouter-decisions/transport", () => ({
  OpenRouterDecisionsError: class OpenRouterDecisionsError extends Error {
    kind: string;
    status: number | undefined;
    attempts: number;
    constructor(kind: string, message: string, options: { status?: number; attempts?: number } = {}) {
      super(message);
      this.kind = kind;
      this.status = options.status;
      this.attempts = options.attempts ?? 0;
    }
  },
  submitOpenRouterDecision: jest.fn(),
}));

describe("mapDecisionsConfidence", () => {
  it.each([
    [0, 1],
    [0.599999, 1],
    [0.6, 2],
    [0.749999, 2],
    [0.75, 3],
    [0.899999, 3],
    [0.9, 4],
    [0.969999, 4],
    [0.97, 5],
    [1, 5],
  ])("maps confidence %s to %s", (raw, expected) => {
    expect(mapDecisionsConfidence(raw)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01])(
    "rejects invalid confidence %s",
    (raw) => expect(() => mapDecisionsConfidence(raw)).toThrow(
      "Decisions confidence must be a finite value from 0 to 1.",
    ),
  );
});

describe("OpenAI Luna Decisions stored-result classification", () => {
  const submitMock = submitOpenRouterDecision as jest.MockedFunction<typeof submitOpenRouterDecision>;

  beforeEach(() => jest.clearAllMocks());

  it("submits only diagnostic evidence and validates the pinned category decision", async () => {
    submitMock.mockResolvedValue({
      data: {
        model: "openai/gpt-6-luna-decisions",
        provider: "provider-a",
        id: "request-1",
        answers: {
          category: {
            type: "choice",
            choice: "performance",
            confidence: 0.8,
            probabilities: { infra: 0.05, performance: 0.8, script: 0.05, bug: 0.05, other: 0.05 },
          },
        },
        usage: { input_tokens: 23, output_tokens: 2, total_tokens: 25, cost: 0.0001 },
      },
      attempts: 1,
      durationMs: 42,
    });

    const detailed = await testAnalysisService.analyzeDecisionsResultsDetailed([
      {
        id: "result-1",
        status: "failed",
        duration: 1200,
        startTime: new Date("2026-01-01T00:00:00Z"),
        retry: 0,
        spec: { key: "CASE-1", title: "Checkout", file: "checkout.spec.ts" },
        execution: { name: "nightly", environment: "staging" },
        errors: [{ message: "request timed out", callStack: ["frame"], location: "checkout.spec.ts:9" }],
      },
      {
        id: "result-2",
        status: "flaky",
        duration: 1300,
        startTime: new Date("2026-01-01T00:00:00Z"),
        retry: 1,
        spec: { key: "CASE-2", title: "Checkout retry", file: "checkout.spec.ts" },
        execution: { name: "nightly", environment: "staging" },
        errors: [{ message: "request timed out", callStack: ["frame"], location: "checkout.spec.ts:9" }],
      },
    ]);

    const [request, options] = submitMock.mock.calls[0] ?? [];
    expect(request?.model).toBe("openai/gpt-6-luna-decisions");
    expect(JSON.parse(String(request?.state))).toMatchObject({
      status: "failed",
      specKey: "CASE-1",
      duration: 1200,
      errorMessage: "request timed out",
      errorLocation: "checkout.spec.ts:9",
    });
    expect(request).not.toHaveProperty("expectedLabels");
    expect(request).not.toHaveProperty("temperature");
    expect(request).not.toHaveProperty("max_tokens");
    expect(request?.questions.category).toMatchObject({
      type: "choice",
      criteria: { infra: expect.any(String), performance: expect.any(String), script: expect.any(String), bug: expect.any(String), other: expect.any(String) },
    });
    const categoryQuestion = request?.questions.category;
    expect(categoryQuestion?.type).toBe("choice");
    if (categoryQuestion?.type !== "choice") {
      throw new Error("Expected a category choice question");
    }
    expect(categoryQuestion.instructions).toBe(STORED_RESULT_CATEGORY_INSTRUCTIONS);
    expect(categoryQuestion.criteria).toEqual(STORED_RESULT_CATEGORY_CRITERIA);
    expect(options).toMatchObject({ timeoutMs: 30_000, maxRetries: 0 });
    expect(detailed.analyses.get("result-1")).toMatchObject({
      category: "performance",
      confidence: 3,
      conclusion: "Explanation is not available from the Decisions API.",
      errorQuality: null,
      errorQualityConclusion: null,
    });
    expect(detailed.analyses.get("result-2")).toMatchObject({
      status: "flaky",
      errorQuality: null,
      errorQualityConclusion: null,
    });
    expect(submitMock).toHaveBeenCalledTimes(2);
    expect(detailed.metadata.get("result-1")).toMatchObject({
      provider: "openrouter",
      returnedModel: "openai/gpt-6-luna-decisions",
      totalTokens: 25,
      categoryPolicyVersion: STORED_RESULT_CATEGORY_POLICY_VERSION,
      confidenceMappingVersion: "decisions-confidence-v1",
    });
  });

  it("returns a sanitized error only for a result whose request was attempted", async () => {
    submitMock.mockRejectedValue(
      new OpenRouterDecisionsError("rate_limit", "secret provider body", {
        status: 429,
        attempts: 1,
      }),
    );
    const results = Array.from({ length: 9 }, (_, index) => ({
      id: `result-${index}`,
      status: "failed",
      duration: 1,
      startTime: new Date("2026-01-01T00:00:00Z"),
      retry: 0,
      spec: { key: `CASE-${index}`, title: "Case", file: "case.spec.ts" },
      execution: { name: "nightly", environment: "staging" },
      errors: [],
    }));

    let caught: unknown;
    try {
      await testAnalysisService.analyzeDecisionsResultsDetailed(results);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(StoredAnalysisBatchError);
    const batchError = caught as StoredAnalysisBatchError;
    expect(batchError.failures.size).toBeLessThanOrEqual(8);
    expect(batchError.failures.size).toBeGreaterThan(0);
    for (const failure of batchError.failures.values()) {
      expect(failure).toMatchObject({
        kind: "rate_limit",
        message: "Analysis provider rate limit was reached.",
        httpStatus: 429,
      });
      expect(JSON.stringify(failure)).not.toContain("secret provider body");
    }
    expect(submitMock).toHaveBeenCalledTimes(8);
  });
});
