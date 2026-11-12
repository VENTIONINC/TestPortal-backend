// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { LLMResult } from "@langchain/core/outputs";
import { resolve } from "node:path";
import { jest } from "@jest/globals";
import {
  createUsageCollector,
  sumTokenUsage,
} from "../../__prompts-tests__/helpers/evaluation";
import { initializeAiConfig, getAiConfigSnapshot } from "@/config/aiConfig";
import { createGenerativeAiClient } from "@/lib/generativeAi";
import { runEval } from "../../__prompts-tests__/stored-results-analysis/runners/stored-results-analysis";
import { testAnalysisSchemaV1_2_0 } from "@/schemas/testAnalysisSchemas";
import { createFormatterEvaluationClient } from "../../__prompts-tests__/helpers/formatter-evaluation";

jest.mock("@langchain/openai", () => {
  const invokeMock = jest.fn();
  const modelMock = jest.fn(() => ({
    withStructuredOutput: jest.fn(() => ({ invoke: invokeMock })),
  }));
  return { ChatOpenAI: modelMock, __mocks__: { modelMock, invokeMock } };
});

const openAiMocks: {
  __mocks__: { modelMock: jest.Mock; invokeMock: jest.Mock };
} = jest.requireMock("@langchain/openai");

describe("prompt evaluation usage", () => {
  beforeAll(async () => {
    process.env.OPENAI_API_KEY = "synthetic-evaluation-key";
    process.env.AI_CONFIG_PATH = resolve(
      process.cwd(),
      "src/config/ai-config.default.json",
    );
    await initializeAiConfig();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    openAiMocks.__mocks__.invokeMock.mockResolvedValue({
      parsed: {
        results: [
          {
            id: "case-1",
            status: "failed",
            conclusion: "Synthetic analysis conclusion with enough detail.",
            category: "bug",
            confidence: 4,
            errorQuality: 3,
            errorQualityConclusion: "Synthetic quality conclusion.",
          },
        ],
      },
      raw: {
        content: [],
        additional_kwargs: {},
        response_metadata: {
          finish_reason: "stop",
          model: "gpt-4.1-mini",
        },
      },
    } as never);
  });

  it("sums calls without double counting cached input or reasoning tokens", () => {
    expect(
      sumTokenUsage([
        {
          input_tokens: 100,
          output_tokens: 40,
          total_tokens: 140,
          input_token_details: { cache_read: 60 },
          output_token_details: { reasoning: 30 },
        },
        { input_tokens: 20, output_tokens: 10, total_tokens: 30 },
      ]),
    ).toEqual({
      inputTokens: 120,
      outputTokens: 50,
      totalTokens: 170,
      cachedInputTokens: 60,
      reasoningTokens: 30,
    });
  });

  it.each([
    [],
    [null],
    [undefined],
    [{ input_tokens: 1, output_tokens: 2, total_tokens: 3 }, null],
  ])("does not report incomplete usage as zero: %j", (...entries) => {
    expect(sumTokenUsage(entries)).toBeNull();
  });

  it("records missing callback usage so the suite can reject incomplete reports", () => {
    const { usageEntries, callbacks } = createUsageCollector();
    const result: LLMResult = { generations: [[{ text: "response" }]] };
    callbacks[0]?.handleLLMEnd(result);
    expect(usageEntries).toEqual([null]);
  });

  it("keeps the synthetic baseline evaluation request identical to runtime policy", async () => {
    const snapshot = getAiConfigSnapshot();
    const runtime = createGenerativeAiClient("classification", snapshot);
    const runtimeOptions = openAiMocks.__mocks__.modelMock.mock.calls[0]?.[0];
    const cases = [
      {
        name: "case",
        input: {
          id: "case-1",
          specKey: "case",
          specTitle: "Case",
          status: "failed" as const,
          duration: 12,
          retry: 0,
          executionName: "run",
        },
        expect: {
          category: "bug" as const,
          status: "failed" as const,
          errorQuality: "required" as const,
          confidenceMin: 1,
          confidenceMax: 5,
        },
      },
    ];
    const result = await runEval({
      cases,
      version: {
        version: "synthetic",
        getPrompt: () => "synthetic prompt",
        schema: testAnalysisSchemaV1_2_0,
      },
    });
    const evaluationOptions = openAiMocks.__mocks__.modelMock.mock.calls[1]?.[0];

    expect(evaluationOptions).toEqual(runtimeOptions);
    expect(result.mode).toBe("baseline");
    expect(result.connection).toBe("openai");
    expect(result.settings).toMatchObject({
      model: "gpt-4.1-mini",
      api: "chat-completions",
      maxOutputTokens: 4000,
      maxRetries: 2,
      sdkMaxRetries: 0,
    });
    expect(result.returnedModels).toEqual(["gpt-4.1-mini"]);
    expect(runtime.effectiveSettings).toEqual(result.settings);
  });

  it("isolates valid comparison overrides and rejects conflicts before construction", async () => {
    const cases = [
      {
        name: "case",
        input: {
          id: "case-1",
          specKey: "case",
          specTitle: "Case",
          status: "failed" as const,
          duration: 12,
          retry: 0,
          executionName: "run",
        },
        expect: {
          category: "bug" as const,
          status: "failed" as const,
          errorQuality: "required" as const,
        },
      },
    ];
    const snapshotBefore = JSON.stringify(getAiConfigSnapshot().operations);
    const result = await runEval({
      cases,
      version: {
        version: "comparison",
        getPrompt: () => "synthetic prompt",
        schema: testAnalysisSchemaV1_2_0,
      },
      settingsOverride: {
        model: "compatible-alias",
        api: "responses",
        reasoningEffort: "low",
        maxOutputTokens: 321,
      },
    });
    expect(result.mode).toBe("comparison");
    expect(result.settings).toMatchObject({
      model: "compatible-alias",
      api: "responses",
      reasoningEffort: "low",
      maxOutputTokens: 321,
    });
    expect(JSON.stringify(getAiConfigSnapshot().operations)).toBe(snapshotBefore);

    const constructed = openAiMocks.__mocks__.modelMock.mock.calls.length;
    await expect(
      runEval({
        cases,
        version: {
          version: "invalid",
          getPrompt: () => "synthetic prompt",
          schema: testAnalysisSchemaV1_2_0,
        },
        settingsOverride: { temperature: 0.4, reasoningEffort: "low" },
      }),
    ).rejects.toThrow(/invalid at temperature/);
    expect(openAiMocks.__mocks__.modelMock).toHaveBeenCalledTimes(constructed);

    await expect(
      runEval({
        cases,
        version: {
          version: "legacy-control",
          getPrompt: () => "synthetic prompt",
          schema: testAnalysisSchemaV1_2_0,
        },
        maxRetries: 9,
      } as unknown as Parameters<typeof runEval>[0]),
    ).rejects.toThrow(/Unsupported evaluation option.*maxRetries/);
    expect(openAiMocks.__mocks__.modelMock).toHaveBeenCalledTimes(constructed);

    await expect(
      runEval({
        cases,
        version: {
          version: "conflicting-legacy-controls",
          getPrompt: () => "synthetic prompt",
          schema: testAnalysisSchemaV1_2_0,
        },
        temperature: 0.2,
        reasoningEffort: "low",
      }),
    ).rejects.toThrow(/temperature and reasoningEffort cannot be combined/);
    expect(openAiMocks.__mocks__.modelMock).toHaveBeenCalledTimes(constructed);

    const formatterFactory = jest.fn(() => ({}));
    expect(() =>
      createFormatterEvaluationClient(formatterFactory, {
        ERROR_FORMATTER_TEMPERATURE: "0.2",
        ERROR_FORMATTER_REASONING: "low",
      }),
    ).toThrow(/ERROR_FORMATTER_TEMPERATURE and ERROR_FORMATTER_REASONING/);
    expect(formatterFactory).not.toHaveBeenCalled();
  });
});
