// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import * as aiConfig from "@/config/aiConfig";
import { createAiConfigStore, type AiConfigSnapshot } from "@/config/aiConfig";
import type { submitDecisionsRequest as submitDecisionsRequestType } from "@/lib/decisionsApi";
import {
  mapDecisionsConfidence,
  testAnalysisService,
  type StoredResultAnalysisInput,
} from "@/services/testAnalysisService";
import { testAnalysisSchema } from "@/schemas/testAnalysisSchemas";

const mockAiInvoke = jest.fn();
const mockWithStructuredOutput = jest.fn(() => ({ invoke: mockAiInvoke }));
jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn(),
}));
jest.mock("@/lib/generativeAi", () => {
  const actual = jest.requireActual("@/lib/generativeAi");
  return Object.assign({}, actual, {
    createGenerativeAiClient: jest.fn(() => ({
      model: { withStructuredOutput: mockWithStructuredOutput },
      invoke: (operation: () => Promise<unknown>) => operation(),
      connection: "openai",
      requestedModel: "synthetic-model",
    })),
  });
});
jest.mock("@/lib/decisionsApi", () => ({
  submitDecisionsRequest: jest.fn(),
}));
jest.mock("@/lib/logger", () => {
  const error = jest.fn();
  return {
    __esModule: true,
    __mocks__: { error },
    default: () => ({ info: jest.fn(), debug: jest.fn(), error }),
  };
});

const invoke = mockAiInvoke as jest.MockedFunction<
  (messages: Array<{ role: string; content: string }>) => Promise<unknown>
>;
const mockSubmitDecisionsRequest = jest.requireMock<{
  submitDecisionsRequest: jest.MockedFunction<
    typeof submitDecisionsRequestType
  >;
}>("@/lib/decisionsApi").submitDecisionsRequest;
const loggerMocks: { __mocks__: { error: jest.Mock } } =
  jest.requireMock("@/lib/logger");
const mockLoggerError = loggerMocks.__mocks__.error;

const decisionProbabilities = [
  { value: "infra", probability: 0.02 },
  { value: "performance", probability: 0.01 },
  { value: "script", probability: 0.01 },
  { value: "bug", probability: 0.95 },
  { value: "other", probability: 0.01 },
];

const validDecisionResponse = (overrides: Record<string, unknown> = {}) => ({
  answers: [
    {
      type: "choice",
      name: "category",
      choice: "bug",
      probabilities: decisionProbabilities,
      confidence: 0.75,
      ...overrides,
    },
  ],
  model: "gpt-6-luna",
});

async function makeDecisionsSnapshot() {
  return createAiConfigStore({
    env: () => ({
      USE_DECISIONS_API: "true",
      OPENAI_API_KEY: "synthetic-key",
    }),
    readFile: async () =>
      JSON.stringify({
        version: 1,
        operations: {
          classification: {
            model: "generative-classification-model",
            decisions: { model: "gpt-6-luna" },
          },
          formatting: { model: "format-model" },
          suggestions: { model: "suggestion-model" },
          insights: { model: "insights-model" },
        },
      }),
  }).initialize();
}

async function makeGenerativeSnapshot(): Promise<AiConfigSnapshot> {
  return createAiConfigStore({
    env: () => ({ OPENAI_API_KEY: "synthetic-key" }),
    readFile: async () =>
      JSON.stringify({
        version: 1,
        operations: {
          classification: { model: "generative-classification-model" },
          formatting: { model: "format-model" },
          suggestions: { model: "suggestion-model" },
          insights: { model: "insights-model" },
        },
      }),
  }).initialize();
}

let defaultGenerativeSnapshot: AiConfigSnapshot;

beforeAll(async () => {
  defaultGenerativeSnapshot = await makeGenerativeSnapshot();
});

const completion = (parsed: unknown) => ({
  raw: {
    response_metadata: { finish_reason: "stop", model: "synthetic-model" },
    additional_kwargs: {},
    content: "synthetic structured output",
  },
  parsed,
});

const classified = (id: string, status: "failed" | "flaky") => ({
  id,
  status,
  category: "bug" as const,
  confidence: 4,
  conclusion: "synthetic conclusion",
  errorQuality: status === "failed" ? null : null,
  errorQualityConclusion: null,
});

const result = (id: string, status: string): StoredResultAnalysisInput => ({
  id,
  status,
  duration: 100,
  startTime: new Date(),
  retry: 0,
  spec: { key: "key", title: "title", file: "test.ts" },
  execution: { name: "run", environment: "test" },
  errors: [],
});

describe("stored result analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(aiConfig, "getAiConfigSnapshot")
      .mockReturnValue(defaultGenerativeSnapshot);
  });

  it("skips the provider when no failed or flaky results exist", async () => {
    expect(
      await testAnalysisService.analyzeStoredResults([
        result("pass", "passed"),
      ]),
    ).toEqual(new Map());
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects an incomplete output item when the overall Responses status completed", async () => {
    invoke.mockResolvedValueOnce({
      raw: {
        response_metadata: {
          status: "completed",
          output: [{ type: "message", status: "incomplete", content: [] }],
        },
        additional_kwargs: {},
        content: [],
      },
      parsed: { results: [classified("failed", "failed")] },
    });

    await expect(
      testAnalysisService.analyzeStoredResults([result("failed", "failed")]),
    ).rejects.toThrow("AI request failed (invalid-response).");
  });

  it("sends only failed and flaky IDs and maps reordered responses by their original IDs", async () => {
    const failed = classified("f", "failed");
    const flaky = classified("r", "flaky");
    invoke.mockResolvedValueOnce(completion({ results: [flaky, failed] }));
    const actual = await testAnalysisService.analyzeStoredResults([
      result("p", "passed"),
      result("f", "failed"),
      result("r", "flaky"),
    ]);
    expect(actual.get("f")).toEqual(failed);
    expect(actual.get("r")).toEqual(flaky);
    expect(mockWithStructuredOutput).toHaveBeenCalledWith(testAnalysisSchema, {
      name: "test_analysis",
      includeRaw: true,
    });
    const messages = invoke.mock.calls[0]?.[0];
    expect(messages?.[1]).toBeDefined();
    const sent = JSON.parse(messages?.[1]?.content ?? "[]") as Array<{
      id: string;
    }>;
    expect(sent.map((entry) => entry.id)).toEqual(["f", "r"]);
  });

  it.each([
    ["unknown ID", [classified("unknown", "failed")]],
    ["duplicate ID", [classified("f", "failed"), classified("f", "failed")]],
    ["missing ID", []],
    ["status mismatch", [classified("f", "flaky")]],
  ])("rejects a classification batch with %s", async (_label, rows) => {
    invoke.mockResolvedValueOnce(completion({ results: rows }));

    await expect(
      testAnalysisService.analyzeStoredResults([result("f", "failed")]),
    ).rejects.toMatchObject({
      diagnostic: { category: "invalid-response" },
    });
  });

  it("sanitizes provider and construction failures before logging and propagation", async () => {
    invoke.mockRejectedValueOnce(
      new Error("sk-sensitive https://private.example/raw-body"),
    );

    await expect(
      testAnalysisService.analyzeStoredResults([result("f", "failed")]),
    ).rejects.toMatchObject({ diagnostic: { category: "unknown" } });
    expect(JSON.stringify(mockLoggerError.mock.calls)).not.toMatch(
      /sk-sensitive|private\.example|raw-body/,
    );
  });

  it("uses one named category question and maps the selected category probability", async () => {
    mockSubmitDecisionsRequest.mockResolvedValueOnce(validDecisionResponse());
    const snapshot = await makeDecisionsSnapshot();

    const detailed =
      await testAnalysisService.analyzeDecisionsStoredResultsDetailed(
        [result("failed-1", "failed")],
        snapshot,
      );
    const analyses = detailed.analyses;

    expect(analyses.get("failed-1")).toEqual({
      id: "failed-1",
      status: "failed",
      category: "bug",
      confidence: 4,
      conclusion: "Explanation is not available from the Decisions API.",
      errorQuality: null,
      errorQualityConclusion: null,
    });
    expect(detailed.metadata.get("failed-1")).toEqual(
      expect.objectContaining({
        strategy: "decisions",
        connection: "openai",
        requestedModel: "gpt-6-luna",
        returnedModel: "gpt-6-luna",
        attempts: 1,
        rawConfidence: 0.95,
        categoryProbabilities: {
          infra: 0.02,
          performance: 0.01,
          script: 0.01,
          bug: 0.95,
          other: 0.01,
        },
        categoryPolicyVersion: "stored-results-analysis-v1.1.0-category-v2",
        confidenceMappingVersion: "decisions-confidence-v2",
      }),
    );
    const decisionRequest = mockSubmitDecisionsRequest.mock.calls[0]?.[0];
    expect(decisionRequest?.questions).toEqual([
      expect.objectContaining({
        type: "choice",
        name: "category",
        choices: [
          expect.objectContaining({ value: "infra" }),
          expect.objectContaining({ value: "performance" }),
          expect.objectContaining({ value: "script" }),
          expect.objectContaining({ value: "bug" }),
          expect.objectContaining({ value: "other" }),
        ],
      }),
    ]);
    const evidence = JSON.parse(decisionRequest?.input ?? "{}") as Record<
      string,
      unknown
    >;
    expect(evidence).toMatchObject({
      status: "failed",
      specKey: "key",
      specTitle: "title",
      specFile: "test.ts",
      duration: 100,
      executionName: "run",
      executionEnvironment: "test",
    });
    expect(evidence).not.toHaveProperty("id");
  });

  it("routes the selected strategy through stored-result analysis", async () => {
    mockSubmitDecisionsRequest.mockResolvedValue(validDecisionResponse());
    const snapshot = await makeDecisionsSnapshot();
    const snapshotSpy = jest
      .spyOn(aiConfig, "getAiConfigSnapshot")
      .mockReturnValue(snapshot);

    try {
      const analyses = await testAnalysisService.analyzeStoredResults([
        result("passed-1", "passed"),
        result("failed-1", "failed"),
        result("flaky-1", "flaky"),
      ]);

      expect([...analyses.keys()]).toEqual(["failed-1", "flaky-1"]);
      expect(mockSubmitDecisionsRequest).toHaveBeenCalledTimes(2);
      expect(mockWithStructuredOutput).not.toHaveBeenCalled();
      expect(invoke).not.toHaveBeenCalled();
    } finally {
      snapshotSpy.mockRestore();
    }
  });

  it.each([
    [0, 1],
    [0.5999, 1],
    [0.6, 2],
    [0.7499, 2],
    [0.75, 3],
    [0.8999, 3],
    [0.9, 4],
    [0.9699, 4],
    [0.97, 5],
    [1, 5],
  ])("maps Decisions confidence %s to %s", (confidence, expected) => {
    expect(mapDecisionsConfidence(confidence)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01])(
    "rejects out-of-range confidence %s before mapping",
    (confidence) => {
      expect(() => mapDecisionsConfidence(confidence)).toThrow(RangeError);
    },
  );

  it.each([
    ["refusal", { answers: [{ type: "refusal", name: "category" }] }],
    [
      "incomplete response status",
      { ...validDecisionResponse(), status: "incomplete" },
    ],
    [
      "incomplete response details",
      { ...validDecisionResponse(), incomplete_details: { reason: "pending" } },
    ],
    ["incomplete answer list", { answers: [] }],
    ["wrong answer name", validDecisionResponse({ name: "other" })],
    ["unknown category", validDecisionResponse({ choice: "unknown" })],
    [
      "incomplete distribution",
      validDecisionResponse({
        probabilities: decisionProbabilities.slice(0, 4),
      }),
    ],
    [
      "invalid distribution probability",
      validDecisionResponse({
        probabilities: decisionProbabilities.map((entry) =>
          entry.value === "bug" ? { ...entry, probability: 1.01 } : entry,
        ),
      }),
    ],
    ["out-of-range confidence", validDecisionResponse({ confidence: -0.1 })],
  ] as Array<[string, unknown]>)(
    "rejects a %s native answer without recording analysis",
    async (_label, response) => {
      mockSubmitDecisionsRequest.mockResolvedValueOnce(response);
      const snapshot = await makeDecisionsSnapshot();

      await expect(
        testAnalysisService.analyzeDecisionsStoredResults(
          [result("failed-1", "failed")],
          snapshot,
        ),
      ).rejects.toMatchObject({ diagnostic: { category: "invalid-response" } });
    },
  );

  it("rejects oversized evidence without truncation or a provider request", async () => {
    const oversized = result("failed-1", "failed");
    oversized.errors = [
      { message: "x".repeat(16_100), callStack: null, location: "" },
    ];
    const snapshot = await makeDecisionsSnapshot();

    await expect(
      testAnalysisService.analyzeDecisionsStoredResults([oversized], snapshot),
    ).rejects.toMatchObject({ diagnostic: { category: "invalid-response" } });
    expect(mockSubmitDecisionsRequest).not.toHaveBeenCalled();
  });

  it("bounds Decisions classification concurrency", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    mockSubmitDecisionsRequest.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      return validDecisionResponse();
    });
    const snapshot = await makeDecisionsSnapshot();
    const results = Array.from({ length: 10 }, (_, index) =>
      result(`failed-${index}`, "failed"),
    );

    const analyses = await testAnalysisService.analyzeDecisionsStoredResults(
      results,
      snapshot,
    );

    expect(analyses.size).toBe(10);
    expect(mockSubmitDecisionsRequest).toHaveBeenCalledTimes(10);
    expect(maxInFlight).toBe(8);
  });
});
