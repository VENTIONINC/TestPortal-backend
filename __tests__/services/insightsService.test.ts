// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { resolve } from "node:path";
import { jest } from "@jest/globals";
import { initializeAiConfig } from "@/config/aiConfig";
import {
  AI_INSIGHTS_FALLBACK_TEXT,
  AI_INSIGHTS_TIMEOUT_MS,
  insightsService,
} from "@/services/insightsService";

jest.mock("@langchain/openai", () => {
  const invokeMock = jest.fn();
  const chatOpenAIMock = jest.fn(() => ({
    invoke: invokeMock,
  }));

  return {
    ChatOpenAI: chatOpenAIMock,
    __mocks__: {
      invokeMock,
      chatOpenAIMock,
    },
  };
});

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  ...(() => {
    const errorMock = jest.fn();
    return {
      __mocks__: { errorMock },
      default: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: errorMock,
      }),
    };
  })(),
}));

beforeAll(async () => {
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  process.env.AI_CONFIG_PATH = resolve(
    process.cwd(),
    "src/config/ai-config.default.json",
  );
  await initializeAiConfig();
});

describe("insightsService.generateInsights", () => {
  const openAiMocks: {
    __mocks__: {
      invokeMock: jest.Mock;
      chatOpenAIMock: jest.Mock;
    };
  } = jest.requireMock("@langchain/openai");

  const invokeMock = openAiMocks.__mocks__.invokeMock;
  const chatOpenAIMock = openAiMocks.__mocks__.chatOpenAIMock;
  const loggerMocks: { __mocks__: { errorMock: jest.Mock } } =
    jest.requireMock("@/lib/logger");
  const loggerErrorMock = loggerMocks.__mocks__.errorMock;

  const params = {
    filters: {
      project: "ProjectA",
      executionType: "Nightly",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      granularity: "daily" as const,
      includeAiInsights: true,
    },
    dashboard: {
      summary: {
        totalRuns: 100,
        failures: 9,
        passRate: 91,
      },
      history: [
        {
          date: "2026-01-01",
          metrics: {
            total: 10,
            passed: 9,
            failed: 1,
            skipped: 0,
            timedOut: 0,
            duration: 1000,
            issues: {
              bug: 3,
              environment: 1,
              script: 0,
              performance: 0,
              other: 0,
            },
          },
        },
        {
          date: "2026-01-02",
          metrics: {
            total: 14,
            passed: 12,
            failed: 2,
            skipped: 0,
            timedOut: 0,
            duration: 1000,
            issues: {
              bug: 2,
              environment: 0,
              script: 0,
              performance: 0,
              other: 0,
            },
          },
        },
      ],
      recentExecutions: [],
    },
    kpis: {
      totalRuns: 100,
      failedRuns: 9,
      passRate: 91,
    },
    failureCauses: {
      bug: 5,
      environment: 1,
      script: 0,
      performance: 0,
      other: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("returns AI-generated text when the model succeeds", async () => {
    invokeMock.mockResolvedValue({
      content:
        "  Pass rate remained stable with a spike in total runs on 2026-01-02.  ",
    } as never);

    const result = await insightsService.generateInsights(params);

    expect(result).toBe(
      "Pass rate remained stable with a spike in total runs on 2026-01-02.",
    );
    expect(chatOpenAIMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        maxTokens: 400,
        maxRetries: 1,
        configuration: expect.objectContaining({
          baseURL: "https://api.openai.com/v1",
          maxRetries: 0,
        }),
      }),
    );
  });

  it("extracts supported string and text blocks", async () => {
    invokeMock.mockResolvedValue({
      content: [
        { type: "text", text: "  Pass rate improved. " },
        "Failures concentrated in checkout.",
        { type: "image", image_url: "ignored" },
      ],
    } as never);

    await expect(insightsService.generateInsights(params)).resolves.toBe(
      "Pass rate improved.  Failures concentrated in checkout.",
    );
  });

  it("returns fallback text when the model times out", async () => {
    jest.useFakeTimers();
    invokeMock.mockImplementation(() => new Promise(() => undefined));

    const resultPromise = insightsService.generateInsights(params);

    await jest.advanceTimersByTimeAsync(AI_INSIGHTS_TIMEOUT_MS + 1);

    await expect(resultPromise).resolves.toBe(AI_INSIGHTS_FALLBACK_TEXT);
  });

  it("returns fallback text when the model throws", async () => {
    invokeMock.mockRejectedValue(
      Object.assign(
        new Error("sk-secret https://provider.example/private response-body"),
        { status: 503, body: "response-body" },
      ) as never,
    );

    const result = await insightsService.generateInsights(params);

    expect(result).toBe(AI_INSIGHTS_FALLBACK_TEXT);
    expect(JSON.stringify(loggerErrorMock.mock.calls)).not.toMatch(
      /sk-secret|provider\.example|response-body/,
    );
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "AI insights generation failed",
      expect.objectContaining({
        category: "unavailable/timeout",
        connection: "openai",
      }),
    );
  });

  it("returns fallback text for an empty completion", async () => {
    invokeMock.mockResolvedValue({ content: [{ type: "image" }] } as never);

    await expect(insightsService.generateInsights(params)).resolves.toBe(
      AI_INSIGHTS_FALLBACK_TEXT,
    );
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "AI insights generation failed",
      expect.objectContaining({ category: "invalid-response" }),
    );
  });
});
