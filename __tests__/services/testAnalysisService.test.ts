// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { testAnalysisService } from "@/services/testAnalysisService";
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
const loggerMocks: { __mocks__: { error: jest.Mock } } =
  jest.requireMock("@/lib/logger");
const mockLoggerError = loggerMocks.__mocks__.error;

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

const result = (id: string, status: string) => ({
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
  beforeEach(() => jest.clearAllMocks());

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
          output: [
            { type: "message", status: "incomplete", content: [] },
          ],
        },
        additional_kwargs: {},
        content: [],
      },
      parsed: { results: [classified("failed", "failed")] },
    });

    await expect(
      testAnalysisService.analyzeStoredResults([
        result("failed", "failed"),
      ]),
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
    expect(mockWithStructuredOutput).toHaveBeenCalledWith(
      testAnalysisSchema,
      { name: "test_analysis", includeRaw: true },
    );
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
});
