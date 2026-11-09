// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { testAnalysisService } from "@/services/testAnalysisService";
import { testAnalysisSchema } from "@/schemas/testAnalysisSchemas";

jest.mock("@langchain/openai", () => {
  const invoke = jest.fn();
  const withStructuredOutput = jest.fn(() => ({ invoke }));
  return {
    ChatOpenAI: jest.fn(() => ({ withStructuredOutput })),
    __mocks__: { invoke, withStructuredOutput },
  };
});
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({ info: jest.fn(), debug: jest.fn(), error: jest.fn() }),
}));

const mocks: {
  __mocks__: { invoke: jest.Mock; withStructuredOutput: jest.Mock };
} = jest.requireMock("@langchain/openai");
const invoke = mocks.__mocks__.invoke as jest.MockedFunction<
  (messages: Array<{ role: string; content: string }>) => Promise<unknown>
>;

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

  it("sends only failed and flaky IDs and maps reordered responses by their original IDs", async () => {
    const failed = {
      id: "f",
      status: "failed",
      category: "bug",
      confidence: 5,
      conclusion: "failure",
      errorQuality: null,
      errorQualityConclusion: null,
    };
    const flaky = {
      id: "r",
      status: "flaky",
      category: "other",
      confidence: 1,
      conclusion: "uncertain",
      errorQuality: null,
      errorQualityConclusion: null,
    };
    invoke.mockResolvedValueOnce({ results: [flaky, failed] });
    const actual = await testAnalysisService.analyzeStoredResults([
      result("p", "passed"),
      result("f", "failed"),
      result("r", "flaky"),
    ]);
    expect(actual.get("f")).toEqual(failed);
    expect(actual.get("r")).toEqual(flaky);
    expect(mocks.__mocks__.withStructuredOutput).toHaveBeenCalledWith(
      testAnalysisSchema,
      { name: "test_analysis" },
    );
    const messages = invoke.mock.calls[0]?.[0];
    expect(messages?.[1]).toBeDefined();
    const sent = JSON.parse(messages?.[1]?.content ?? "[]") as Array<{
      id: string;
    }>;
    expect(sent.map((entry) => entry.id)).toEqual(["f", "r"]);
  });
});
