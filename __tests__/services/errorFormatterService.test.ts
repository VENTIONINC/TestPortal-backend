// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { StructuredResultWithRelations } from "@/types";
import { errorFormatterService } from "@/services/errorFormatterService";
import { resultService } from "@/services/resultService";
import { testAnalysisService } from "@/services/testAnalysisService";

jest.mock("@langchain/core/prompts", () => {
  const formatMessagesMock = jest.fn();
  return {
    ChatPromptTemplate: {
      fromMessages: jest.fn(() => ({
        formatMessages: formatMessagesMock,
      })),
    },
    __mocks__: {
      formatMessagesMock,
    },
  };
});

jest.mock("@langchain/openai", () => {
  const invokeMock = jest.fn();
  const withStructuredOutputMock = jest.fn(() => ({
    invoke: invokeMock,
  }));
  const chatOpenAIMock = jest.fn(() => ({
    withStructuredOutput: withStructuredOutputMock,
  }));

  return {
    ChatOpenAI: chatOpenAIMock,
    __mocks__: {
      chatOpenAIMock,
      withStructuredOutputMock,
      invokeMock,
    },
  };
});

jest.mock("@/services/resultService", () => ({
  resultService: {
    getResultById: jest.fn(),
  },
}));

jest.mock("@/services/testAnalysisService", () => ({
  testAnalysisService: {
    analyzeStoredResults: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe("errorFormatterService.suggestFromResult", () => {
  const promptMocks: { __mocks__: { formatMessagesMock: jest.Mock } } =
    jest.requireMock("@langchain/core/prompts");
  const openAiMocks: {
    __mocks__: {
      invokeMock: jest.Mock;
      chatOpenAIMock: jest.Mock;
      withStructuredOutputMock: jest.Mock;
    };
  } = jest.requireMock("@langchain/openai");

  const formatMessagesMock = promptMocks.__mocks__
    .formatMessagesMock as unknown as jest.MockedFunction<
    (
      input: Record<string, unknown>,
    ) => Promise<Array<{ role: string; content: string }>>
  >;
  const invokeMock = openAiMocks.__mocks__
    .invokeMock as unknown as jest.MockedFunction<
    (
      messages: Array<{ role: string; content: string }>,
    ) => Promise<{ name: string; description: string } | { description: string }>
  >;
  const chatOpenAIMock = openAiMocks.__mocks__.chatOpenAIMock;
  const withStructuredOutputMock =
    openAiMocks.__mocks__.withStructuredOutputMock;

  const now = new Date("2025-01-01T10:00:00Z");
  const baseResult: StructuredResultWithRelations = {
    id: "result-1",
    createdAt: now,
    updatedAt: now,
    reportPortalLink: null,
    retry: 0,
    status: "failed",
    duration: 1000,
    startTime: now,
    specId: "spec-1-id",
    executionId: "exec-1-id",
    analysisStatus: null,
    analysisCategory: null,
    analysisConfidence: null,
    analysisConclusion: null,
    analysisErrorQuality: null,
    analysisErrorQualityConclusion: null,
    analysisReviewedAt: null,
    analysisReviewedById: null,
    analysisFeedbackCategory: null,
    analysisFeedbackConfidence: null,
    analysisFeedbackConclusion: null,
    spec: {
      id: "spec-1-id",
      createdAt: now,
      updatedAt: now,
      key: "spec-1",
      file: "spec.ts",
      title: "Spec",
      tags: [],
      annotations: [],
      projectId: "project-1",
    },
    execution: {
      id: "exec-1-id",
      createdAt: now,
      updatedAt: now,
      type: "e2e",
      name: "Run",
      environment: "staging",
      version: "1.0.0",
      startedAt: now,
      projectId: "project-1",
    },
    errors: [
      {
        id: "err-1",
        createdAt: now,
        updatedAt: now,
        type: "assertion",
        message: "Error",
        callLog: [],
        callStack: ["stack"],
        testAssertion: null,
        expectedPattern: null,
        receivedString: null,
        location: "loc",
        resultId: "result-1",
      },
    ],
  };

  const makeResult = (
    overrides: Partial<StructuredResultWithRelations>,
  ): StructuredResultWithRelations => ({
    ...baseResult,
    ...overrides,
    spec: {
      ...baseResult.spec,
      ...(overrides.spec ?? {}),
    },
    execution: {
      ...baseResult.execution,
      ...(overrides.execution ?? {}),
    },
    errors: overrides.errors ?? baseResult.errors,
  });

  const getResultByIdMock = resultService.getResultById as jest.MockedFunction<
    typeof resultService.getResultById
  >;
  const analyzeStoredResultsMock =
    testAnalysisService.analyzeStoredResults as jest.MockedFunction<
      typeof testAnalysisService.analyzeStoredResults
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    formatMessagesMock.mockResolvedValue([
      { role: "system", content: "system" },
      { role: "user", content: "user" },
    ]);
    invokeMock.mockResolvedValue({ description: "Suggested steps" });
  });

  it("passes canonical generic context to the formatter prompt without making it output data", async () => {
    invokeMock.mockResolvedValue({
      name: "Readable failure",
      description: "Actionable details",
    });

    const formatted = await errorFormatterService.formatErrorMessage({
      name: "Original failure",
      description: "Original details",
      contextCategory: "infra",
    });

    expect(invokeMock).toHaveBeenCalledWith([
      expect.objectContaining({ role: "system" }),
      expect.objectContaining({
        role: "user",
        content:
          "Name: Original failure\nDescription: Original details\nContext category: infra",
      }),
    ]);
    expect(formatted).toEqual({
      name: "Readable failure",
      description: "Actionable details",
    });
    expect(formatted).not.toHaveProperty("contextCategory");
  });

  it("throws when resultId is missing", async () => {
    await expect(
      errorFormatterService.suggestFromResult("", "project-1"),
    ).rejects.toThrow("Result ID is required");
  });

  it("throws when projectId is missing", async () => {
    await expect(
      errorFormatterService.suggestFromResult("result-1", ""),
    ).rejects.toThrow("Project ID is required");
  });

  it("throws when result status is not failed or flaky", async () => {
    getResultByIdMock.mockResolvedValue(
      makeResult({
        status: "passed",
      }),
    );

    await expect(
      errorFormatterService.suggestFromResult("result-1", "project-1"),
    ).rejects.toThrow("Only failed or flaky results can be analyzed");
  });

  it("throws when result has no errors", async () => {
    getResultByIdMock.mockResolvedValue(
      makeResult({
        errors: [],
      }),
    );

    await expect(
      errorFormatterService.suggestFromResult("result-1", "project-1"),
    ).rejects.toThrow("Result has no error details to analyze");
  });

  it("uses existing analysis when present without exposing its category", async () => {
    getResultByIdMock.mockResolvedValue(
      makeResult({
        analysisCategory: "bug",
        analysisConfidence: 4,
        analysisConclusion: "Conclusion",
        analysisErrorQuality: 3,
        analysisErrorQualityConclusion: "Quality",
      }),
    );

    const result = await errorFormatterService.suggestFromResult(
      "result-1",
      "project-1",
    );

    expect(testAnalysisService.analyzeStoredResults).not.toHaveBeenCalled();
    expect(chatOpenAIMock).toHaveBeenCalledTimes(1);
    expect(withStructuredOutputMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      description: "Suggested steps",
    });
  });

  it("uses authoritative feedback category ahead of the AI analysis category", async () => {
    getResultByIdMock.mockResolvedValue(
      makeResult({
        analysisCategory: "bug",
        analysisFeedbackCategory: "script",
      }),
    );

    await errorFormatterService.suggestFromResult("result-1", "project-1");

    expect(analyzeStoredResultsMock).not.toHaveBeenCalled();
    expect(formatMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({ analysisCategory: "script" }),
    );
  });

  it("keeps malformed authoritative feedback uncategorized without rerunning AI analysis", async () => {
    getResultByIdMock.mockResolvedValue(
      makeResult({
        analysisCategory: "bug",
        analysisFeedbackCategory: "unsupported-feedback-category",
      }),
    );

    await errorFormatterService.suggestFromResult("result-1", "project-1");

    expect(analyzeStoredResultsMock).not.toHaveBeenCalled();
    expect(formatMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({ analysisCategory: "uncategorized" }),
    );
  });

  it("runs analysis when missing without exposing its category", async () => {
    getResultByIdMock.mockResolvedValue(makeResult({}));

    const analysisMap = new Map();
    analysisMap.set("result-1", {
      status: "failed",
      category: "infra",
      confidence: 4,
      conclusion: "Conclusion",
      errorQuality: 3,
      errorQualityConclusion: "Quality",
    });

    analyzeStoredResultsMock.mockResolvedValue(analysisMap);

    const result = await errorFormatterService.suggestFromResult(
      "result-1",
      "project-1",
    );

    expect(testAnalysisService.analyzeStoredResults).toHaveBeenCalledTimes(1);
    expect(formatMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({ analysisCategory: "infra" }),
    );
    expect(result).toEqual({
      description: "Suggested steps",
    });
  });
});
