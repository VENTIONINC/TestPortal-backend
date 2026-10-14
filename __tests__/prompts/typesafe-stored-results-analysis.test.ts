// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

import {
  DEFAULT_TYPESAFE_MODEL,
  runTypeSafeStoredResultsAnalysis,
} from "../../__prompts-tests__/stored-results-analysis/runners/typesafe-stored-results-analysis";
import type {
  Category,
  TestCase,
} from "../../__prompts-tests__/stored-results-analysis/v1.1.0/templates/types";

const mockSystemOne = jest.fn();

jest.mock("@typesafe-ai/sdk", () => ({
  choice: jest.fn((instructions, criteria) => ({
    type: "choice",
    instructions,
    criteria,
  })),
  TypeSafeClient: jest.fn().mockImplementation(() => ({
    systemOne: mockSystemOne,
  })),
}));

const sampleCase: TestCase = {
  name: "network failure",
  input: {
    id: "case-1",
    specKey: "api/health.spec.ts",
    specTitle: "health endpoint",
    status: "failed",
    duration: 1200,
    retry: 1,
    executionName: "CI",
    errorMessage: "connect ETIMEDOUT 10.0.0.1:443",
  },
  expect: {
    category: "infra",
    status: "failed",
    errorQuality: "required",
  },
};

function makeCase(index: number, expectedCategory: Category = "infra"): TestCase {
  return {
    ...sampleCase,
    name: `case ${index}`,
    input: {
      ...sampleCase.input,
      id: `case-${index}`,
      specTitle: `case-${index}`,
    },
    expect: { ...sampleCase.expect, category: expectedCategory },
  };
}

function makeResponse(model: string, actualCategory: Category = "infra") {
  return {
    model,
    answers: {
      category: {
        type: "choice",
        choice: actualCategory,
        confidence: 0.873456789,
        probabilities: {
          infra: 0.873456789,
          performance: 0.052345678,
          script: 0.031234567,
          bug: 0.023456789,
          other: 0.019506177,
        },
      },
    },
    usage: { input_tokens: 37, output_tokens: 11 },
  };
}

describe("runTypeSafeStoredResultsAnalysis", () => {
  const originalApiKey = process.env.TYPESAFE_API_KEY;
  const originalDefaultModel = process.env.TYPESAFE_DEFAULT_MODEL;

  beforeEach(() => {
    process.env.TYPESAFE_API_KEY = " test-key ";
    delete process.env.TYPESAFE_DEFAULT_MODEL;
    mockSystemOne.mockReset();
    jest.mocked(TypeSafeClient).mockClear();
    jest.mocked(choice).mockClear();
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.TYPESAFE_API_KEY;
    } else {
      process.env.TYPESAFE_API_KEY = originalApiKey;
    }
    if (originalDefaultModel === undefined) {
      delete process.env.TYPESAFE_DEFAULT_MODEL;
    } else {
      process.env.TYPESAFE_DEFAULT_MODEL = originalDefaultModel;
    }
  });

  test("uses the reference model and preserves prediction/provider metadata", async () => {
    mockSystemOne.mockResolvedValue(makeResponse(DEFAULT_TYPESAFE_MODEL));

    const result = await runTypeSafeStoredResultsAnalysis({ cases: [sampleCase] });

    expect(TypeSafeClient).toHaveBeenCalledWith({
      apiKey: "test-key",
      retry: { maxRetries: 0 },
    });
    expect(mockSystemOne).toHaveBeenCalledTimes(1);
    expect(mockSystemOne).toHaveBeenCalledWith({
      state: {
        specKey: "api/health.spec.ts",
        specTitle: "health endpoint",
        status: "failed",
        duration: 1200,
        retry: 1,
        executionName: "CI",
        errorMessage: "connect ETIMEDOUT 10.0.0.1:443",
        errorStack: null,
        errorLocation: null,
      },
      model: DEFAULT_TYPESAFE_MODEL,
      questions: {
        category: expect.objectContaining({ type: "choice" }),
      },
    });

    const [providerRequest] = mockSystemOne.mock.calls[0] ?? [];
    expect(providerRequest.state).not.toHaveProperty("id");
    expect(providerRequest.state).not.toHaveProperty("expect");
    expect(providerRequest.state).not.toHaveProperty("expectedCategory");
    expect(result).toMatchObject({
      provider: "typesafe",
      model: DEFAULT_TYPESAFE_MODEL,
      accuracy: 1,
      requestCount: 1,
      usage: { inputTokens: 37, outputTokens: 11, totalTokens: 48 },
      predictions: [
        {
          id: "case-1",
          name: "network failure",
          expectedCategory: "infra",
          actualCategory: "infra",
          confidence: 0.873456789,
          probabilities: {
            infra: 0.873456789,
            performance: 0.052345678,
            script: 0.031234567,
            bug: 0.023456789,
            other: 0.019506177,
          },
          model: DEFAULT_TYPESAFE_MODEL,
          inputTokens: 37,
          outputTokens: 11,
        },
      ],
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(jest.mocked(choice).mock.calls[0]?.[1]).toEqual({
      infra: expect.stringContaining("Explicit network"),
      performance: expect.stringContaining("Timeouts without explicit"),
      script: expect.stringContaining("automation"),
      bug: expect.stringContaining("application under test"),
      other: expect.stringContaining("Insufficient or conflicting"),
    });
  });

  test("uses an explicit model override", async () => {
    mockSystemOne.mockResolvedValue(makeResponse("jev-custom"));

    const result = await runTypeSafeStoredResultsAnalysis({
      cases: [sampleCase],
      model: "jev-custom",
    });

    expect(mockSystemOne).toHaveBeenCalledWith(
      expect.objectContaining({ model: "jev-custom" }),
    );
    expect(result.model).toBe("jev-custom");
    expect(result.predictions[0]?.model).toBe("jev-custom");
  });

  test("honors TYPESAFE_DEFAULT_MODEL when no option override is supplied", async () => {
    process.env.TYPESAFE_DEFAULT_MODEL = "jev-env-override";
    mockSystemOne.mockResolvedValue(makeResponse("jev-env-override"));

    const result = await runTypeSafeStoredResultsAnalysis({ cases: [sampleCase] });

    expect(mockSystemOne).toHaveBeenCalledWith(
      expect.objectContaining({ model: "jev-env-override" }),
    );
    expect(result.model).toBe("jev-env-override");
  });

  test("keeps predictions in input order while respecting the concurrency bound", async () => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const completionOrder: string[] = [];
    mockSystemOne.mockImplementation(
      async (request: { state: { specTitle: string } }) => {
        activeRequests += 1;
        maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
        const title = request.state.specTitle;
        await new Promise((resolve) =>
          setTimeout(resolve, title === "case-0" ? 20 : 1),
        );
        completionOrder.push(title);
        activeRequests -= 1;
        return makeResponse(DEFAULT_TYPESAFE_MODEL);
      },
    );

    const cases = [0, 1, 2, 3].map((index) => makeCase(index));
    const result = await runTypeSafeStoredResultsAnalysis({
      cases,
      concurrency: 2,
    });

    expect(maximumActiveRequests).toBe(2);
    expect(completionOrder).not.toEqual(["case-0", "case-1", "case-2", "case-3"]);
    expect(result.predictions.map((prediction) => prediction.name)).toEqual(
      cases.map((testCase) => testCase.name),
    );
  });

  test("reports category mismatches and aggregates usage for all cases", async () => {
    mockSystemOne.mockResolvedValue(makeResponse(DEFAULT_TYPESAFE_MODEL));
    const cases = Array.from({ length: 10 }, (_, index) =>
      makeCase(index, index === 0 ? "bug" : "infra"),
    );

    const result = await runTypeSafeStoredResultsAnalysis({ cases });

    expect(result.accuracy).toBe(0.9);
    expect(result.failures).toEqual([
      {
        testCaseName: "case 0",
        expectedCategory: "bug",
        actualCategory: "infra",
      },
    ]);
    expect(result.requestCount).toBe(10);
    expect(result.usage).toEqual({
      inputTokens: 370,
      outputTokens: 110,
      totalTokens: 480,
    });
  });

  test("rejects missing and whitespace-only credentials before client creation", async () => {
    delete process.env.TYPESAFE_API_KEY;

    await expect(
      runTypeSafeStoredResultsAnalysis({ cases: [sampleCase] }),
    ).rejects.toThrow("TYPESAFE_API_KEY is required");
    expect(TypeSafeClient).not.toHaveBeenCalled();
    expect(mockSystemOne).not.toHaveBeenCalled();

    process.env.TYPESAFE_API_KEY = " \t ";
    await expect(
      runTypeSafeStoredResultsAnalysis({ cases: [sampleCase] }),
    ).rejects.toThrow("TYPESAFE_API_KEY is required");
    expect(TypeSafeClient).not.toHaveBeenCalled();
    expect(mockSystemOne).not.toHaveBeenCalled();
  });

  test("returns empty metrics without constructing a client for empty input", async () => {
    const result = await runTypeSafeStoredResultsAnalysis({ cases: [] });

    expect(result).toMatchObject({
      provider: "typesafe",
      model: DEFAULT_TYPESAFE_MODEL,
      predictions: [],
      failures: [],
      accuracy: 1,
      durationMs: 0,
      requestCount: 0,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    });
    expect(TypeSafeClient).not.toHaveBeenCalled();
    expect(mockSystemOne).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid concurrency %s before provider work",
    async (concurrency) => {
      await expect(
        runTypeSafeStoredResultsAnalysis({ cases: [sampleCase], concurrency }),
      ).rejects.toThrow("concurrency must be a positive integer");
      expect(TypeSafeClient).not.toHaveBeenCalled();
      expect(mockSystemOne).not.toHaveBeenCalled();
    },
  );

  test("propagates provider failures without returning a successful report", async () => {
    mockSystemOne.mockRejectedValue(new Error("provider unavailable"));

    await expect(
      runTypeSafeStoredResultsAnalysis({ cases: [sampleCase], concurrency: 1 }),
    ).rejects.toThrow("provider unavailable");
    expect(mockSystemOne).toHaveBeenCalledTimes(1);
  });

  test("stops scheduling cases after a provider failure", async () => {
    const providerError = new Error("provider unavailable");
    let resolveSecondRequest: (() => void) | undefined;
    mockSystemOne.mockImplementation(
      (request: { state: { specTitle: string } }) => {
        if (request.state.specTitle === "case-0") {
          return Promise.reject(providerError);
        }
        if (request.state.specTitle === "case-1") {
          return new Promise((resolve) => {
            resolveSecondRequest = () =>
              resolve(makeResponse(DEFAULT_TYPESAFE_MODEL));
          });
        }
        return Promise.resolve(makeResponse(DEFAULT_TYPESAFE_MODEL));
      },
    );

    const evaluation = runTypeSafeStoredResultsAnalysis({
      cases: Array.from({ length: 6 }, (_, index) => makeCase(index)),
      concurrency: 2,
    });
    const rejectionAssertion = expect(evaluation).rejects.toBe(providerError);

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(resolveSecondRequest).toBeDefined();
    resolveSecondRequest?.();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mockSystemOne).toHaveBeenCalledTimes(2);
    await rejectionAssertion;
  });
});
