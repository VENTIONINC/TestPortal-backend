// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { resolve } from "node:path";
import { jest } from "@jest/globals";
import { initializeAiConfig } from "@/config/aiConfig";
import type { StructuredResultWithRelations } from "@/types";
import { getErrorFormatterPrompt } from "@/prompts/error-formatter/v1.1.0";
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

jest.mock("@/lib/logger", () => {
  const errorMock = jest.fn();
  return {
    __esModule: true,
    __mocks__: { errorMock },
    default: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: errorMock,
    }),
  };
});

beforeAll(async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  process.env.AI_CONFIG_PATH = resolve(
    process.cwd(),
    "src/config/ai-config.default.json",
  );
  await initializeAiConfig();
});

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
    (messages: Array<{ role: string; content: string }>) => Promise<unknown>
  >;
  const chatOpenAIMock = openAiMocks.__mocks__.chatOpenAIMock;
  const withStructuredOutputMock =
    openAiMocks.__mocks__.withStructuredOutputMock;
  const loggerMocks: { __mocks__: { errorMock: jest.Mock } } =
    jest.requireMock("@/lib/logger");
  const loggerErrorMock = loggerMocks.__mocks__.errorMock;

  const formatterResult = (
    parsed: unknown,
    metadata: Record<string, unknown> = {
      finish_reason: "stop",
      model: "gpt-4.1-mini",
    },
    additionalKwargs: Record<string, unknown> = {},
  ) => ({
    raw: {
      response_metadata: metadata,
      additional_kwargs: additionalKwargs,
    },
    parsed,
  });

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
        rawLogs: [],
        sourceSnippet: null,
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
    invokeMock.mockResolvedValue({
      ...formatterResult({
        category: "bug",
        name: "Checkout request fails",
        description: "Suggested steps",
      }),
    });
  });

  it("does not construct an AI client during service import", () => {
    expect(chatOpenAIMock).not.toHaveBeenCalled();
  });

  it("passes canonical generic context to the formatter prompt without making it output data", async () => {
    invokeMock.mockResolvedValue(
      formatterResult({
        name: "Readable failure",
        description: "Actionable details",
      }),
    );

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
    expect(withStructuredOutputMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includeRaw: true }),
    );
  });

  it("preserves multiline diagnostic values, negation, and uncertainty", async () => {
    const input = {
      name: "checkout timeout (ETIMEDOUT)",
      description:
        "Request did not reach api.internal.example within 12000ms.\n" +
        "Failure at tests/checkout.spec.ts:42:7; expected 200, received 504.\n" +
        "The cause may be a transient proxy issue.",
    };
    invokeMock.mockResolvedValueOnce(
      formatterResult({
        name: "Checkout request timed out",
        description: input.description,
      }),
    );

    await errorFormatterService.formatErrorMessage(input);

    expect(invokeMock).toHaveBeenCalledWith([
      {
        role: "system",
        content: getErrorFormatterPrompt(),
      },
      {
        role: "user",
        content: `Name: ${input.name}\nDescription: ${input.description}`,
      },
    ]);
    expect(getErrorFormatterPrompt()).toContain(
      "Preserve negation and uncertainty",
    );
    expect(getErrorFormatterPrompt()).toContain(
      "do not omit or alter these details",
    );
    expect(invokeMock.mock.calls[0]?.[0][1]?.content).not.toContain(
      "Context category:",
    );
    expect(resultService.getResultById).not.toHaveBeenCalled();
    expect(testAnalysisService.analyzeStoredResults).not.toHaveBeenCalled();
  });

  it("retains the public formatter failure message when invocation fails", async () => {
    invokeMock.mockRejectedValueOnce(
      Object.assign(new Error("sk-sensitive https://private.example/secret"), {
        status: 401,
        headers: { authorization: "Bearer secret" },
        body: "private response body",
      }),
    );

    await expect(
      errorFormatterService.formatErrorMessage({
        name: "Synthetic failure",
        description: "Synthetic details",
      }),
    ).rejects.toThrow("Failed to format error message");
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Error formatting message:",
      expect.objectContaining({
        category: "authentication/configuration",
        connection: "openai",
      }),
    );
    expect(JSON.stringify(loggerErrorMock.mock.calls)).not.toMatch(
      /sk-sensitive|private\.example|private response body|Bearer secret/,
    );
  });

  it.each([
    ["malformed structured result", formatterResult(null)],
    [
      "refusal",
      formatterResult(
        { name: "Refused", description: "No" },
        { finish_reason: "stop", model: "gpt-4.1-mini" },
        { refusal: "private refusal detail" },
      ),
    ],
    [
      "truncated output",
      formatterResult(
        { name: "Partial", description: "Partial" },
        { finish_reason: "length", model: "gpt-4.1-mini" },
      ),
    ],
    [
      "incomplete Responses output",
      formatterResult(
        { name: "Partial", description: "Partial" },
        {
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          model: "gpt-4.1-mini",
        },
      ),
    ],
    [
      "incomplete Responses message item with completed response status",
      formatterResult(
        { name: "Partial", description: "Partial" },
        {
          status: "completed",
          output: [{ type: "message", status: "incomplete", content: [] }],
          model: "gpt-4.1-mini",
        },
      ),
    ],
  ])(
    "rejects %s through the public formatter error",
    async (_label, result) => {
      invokeMock.mockResolvedValueOnce(result);

      await expect(
        errorFormatterService.formatErrorMessage({
          name: "Synthetic failure",
          description: "Synthetic details",
        }),
      ).rejects.toThrow("Failed to format error message");

      expect(loggerErrorMock).toHaveBeenCalledWith(
        "Error formatting message:",
        expect.objectContaining({ category: "invalid-response" }),
      );
      expect(JSON.stringify(loggerErrorMock.mock.calls)).not.toMatch(
        /private refusal detail|max_output_tokens/,
      );
    },
  );

  it("throws when resultId is missing", async () => {
    await expect(
      errorFormatterService.suggestFromResult("", "project-1"),
    ).rejects.toThrow("Result ID is required");
  });

  it("formats multiline details without adding absent category context", async () => {
    const output = {
      name: "Readable timeout",
      description: "Timeout at checkout",
    };
    invokeMock.mockResolvedValueOnce(formatterResult(output));
    const input = {
      name: "checkout timeout",
      description: "Timeout 12000ms\n at tests/checkout.ts:42:7",
    };

    await expect(
      errorFormatterService.formatErrorMessage(input),
    ).resolves.toEqual(output);
    expect(invokeMock).toHaveBeenCalledWith([
      expect.objectContaining({ role: "system" }),
      {
        role: "user",
        content: `Name: ${input.name}\nDescription: ${input.description}`,
      },
    ]);
    expect(resultService.getResultById).not.toHaveBeenCalled();
    expect(testAnalysisService.analyzeStoredResults).not.toHaveBeenCalled();
  });

  it("returns the formatter error contract when the model fails", async () => {
    invokeMock.mockRejectedValueOnce(new Error("Provider unavailable"));
    await expect(
      errorFormatterService.formatErrorMessage({
        name: "Failure",
        description: "Details",
      }),
    ).rejects.toThrow("Failed to format error message");
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
    expect(analyzeStoredResultsMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
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
    expect(analyzeStoredResultsMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("returns the complete issue draft generated from existing analysis", async () => {
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
      category: "bug",
      name: "Checkout request fails",
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

  it("runs analysis when missing and returns the complete issue draft", async () => {
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
      category: "bug",
      name: "Checkout request fails",
      description: "Suggested steps",
    });
  });

  it("fails closed when the required classification result is missing", async () => {
    getResultByIdMock.mockResolvedValue(makeResult({}));
    analyzeStoredResultsMock.mockResolvedValue(new Map());

    await expect(
      errorFormatterService.suggestFromResult("result-1", "project-1"),
    ).rejects.toThrow("Failed to generate error suggestion");

    expect(analyzeStoredResultsMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("fails closed when nested classification rejects invalid output", async () => {
    getResultByIdMock.mockResolvedValue(makeResult({}));
    analyzeStoredResultsMock.mockRejectedValue(
      new Error("AI request failed (invalid-response)."),
    );

    await expect(
      errorFormatterService.suggestFromResult("result-1", "project-1"),
    ).rejects.toThrow("Failed to generate error suggestion");

    expect(analyzeStoredResultsMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid schema output", formatterResult(null)],
    [
      "refusal",
      formatterResult(
        {
          category: "bug",
          name: "Private refusal detail",
          description: "No",
        },
        { finish_reason: "stop" },
        { refusal: "Private refusal detail" },
      ),
    ],
    [
      "truncated output",
      formatterResult(
        { category: "bug", name: "Partial", description: "Partial" },
        { finish_reason: "length" },
      ),
    ],
    [
      "incomplete Responses output",
      formatterResult(
        { category: "bug", name: "Partial", description: "Partial" },
        { status: "incomplete", incomplete_details: { reason: "private" } },
      ),
    ],
    [
      "incomplete Responses message item with completed response status",
      formatterResult(
        { category: "bug", name: "Partial", description: "Partial" },
        {
          status: "completed",
          output: [{ type: "message", status: "incomplete", content: [] }],
        },
      ),
    ],
  ])("rejects %s without exposing completion metadata", async (_label, raw) => {
    getResultByIdMock.mockResolvedValue(
      makeResult({ analysisCategory: "bug" }),
    );
    invokeMock.mockResolvedValueOnce(raw);

    await expect(
      errorFormatterService.suggestFromResult("result-1", "project-1"),
    ).rejects.toThrow("Failed to generate error suggestion");

    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Error generating solution suggestion:",
      expect.objectContaining({ category: "invalid-response" }),
    );
    expect(JSON.stringify(loggerErrorMock.mock.calls)).not.toMatch(
      /Private refusal detail|private/,
    );
  });

  it("sanitizes suggestion provider failures while retaining local validation errors", async () => {
    getResultByIdMock.mockResolvedValue(
      makeResult({ analysisCategory: "bug" }),
    );
    invokeMock.mockRejectedValueOnce(
      Object.assign(
        new Error("sk-private https://provider.example/secret private body"),
        { status: 503, body: "private body" },
      ),
    );

    await expect(
      errorFormatterService.suggestFromResult("result-1", "project-1"),
    ).rejects.toThrow("Failed to generate error suggestion");
    expect(JSON.stringify(loggerErrorMock.mock.calls)).not.toMatch(
      /sk-private|provider\.example|private body/,
    );
    expect(resultService.getResultById).toHaveBeenCalledWith(
      "result-1",
      "project-1",
    );
  });
});
