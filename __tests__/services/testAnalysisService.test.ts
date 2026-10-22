// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { testAnalysisService } from "@/services/testAnalysisService";

jest.mock("@langchain/openai", () => {
  const response = { results: [{
    id: "result-1",
    status: "failed" as const,
    category: "bug" as const,
    confidence: 4,
    conclusion: "The assertion failed because the expected value was incorrect.",
    errorQuality: 3,
    errorQualityConclusion: "The error includes useful context.",
  }] };
  const invokeMock = jest.fn<() => Promise<typeof response>>().mockResolvedValue(response);
  const withStructuredOutputMock = jest.fn(() => ({ invoke: invokeMock }));
  const chatOpenAIMock = jest.fn(() => ({ withStructuredOutput: withStructuredOutputMock }));
  return { ChatOpenAI: chatOpenAIMock, __mocks__: { chatOpenAIMock, withStructuredOutputMock, invokeMock } };
});

describe("testAnalysisService.analyzeStoredResults", () => {
  const openAiMocks = jest.requireMock<{
    __mocks__: { chatOpenAIMock: jest.Mock; invokeMock: jest.Mock };
  }>("@langchain/openai");

  it("uses resolved analysis settings and maps structured results by id", async () => {
    const result = await testAnalysisService.analyzeStoredResults([{
      id: "result-1",
      status: "failed",
      duration: 120,
      startTime: new Date("2026-01-01T00:00:00Z"),
      retry: 0,
      spec: { key: "case-1", title: "loads a page", file: "test.spec.ts" },
      execution: { name: "nightly", environment: "staging" },
      errors: [{ message: "assertion failed", callStack: ["line 1"], location: "test.spec.ts:5" }],
    }]);

    expect(openAiMocks.__mocks__.chatOpenAIMock).toHaveBeenCalledWith({
      model: "gpt-6-luna", useResponsesApi: true, modelKwargs: { reasoning: { effort: "low" } }, maxTokens: 4000, maxRetries: 2,
    });
    expect(result.get("result-1")).toMatchObject({
      id: "result-1", category: "bug", confidence: 4,
      errorQuality: 3, errorQualityConclusion: "The error includes useful context.",
    });
    expect(openAiMocks.__mocks__.invokeMock).toHaveBeenCalledTimes(1);
  });
});
