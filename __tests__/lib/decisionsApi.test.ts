// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";

import { createAiConfigStore } from "@/config/aiConfig";
import { GenerativeAiError } from "@/lib/generativeAi";
import {
  buildDecisionsEndpoint,
  DECISIONS_REQUEST_TIMEOUT_MS,
  submitDecisionsRequest,
  type DecisionsRequestInput,
} from "@/lib/decisionsApi";

const request: DecisionsRequestInput = {
  input: "Synthetic failed test evidence.",
  questions: [
    {
      type: "choice",
      name: "category",
      instructions: "Choose the best supported category.",
      choices: [
        { value: "bug", description: "A product defect." },
        { value: "infra", description: "An environment or service failure." },
        { value: "performance", description: "A timing or resource issue." },
        { value: "script", description: "A test script issue." },
        { value: "other", description: "Anything not covered above." },
      ],
    },
  ],
};

async function makeSnapshot(
  baseUrl: string,
  options: { apiKey?: string; model?: string } = {},
) {
  const store = createAiConfigStore({
    env: () => ({
      USE_DECISIONS_API: "true",
      AI_API_BASE_URL: baseUrl,
      OPENAI_API_KEY: options.apiKey ?? "synthetic-key",
    }),
    readFile: async () =>
      JSON.stringify({
        version: 1,
        operations: {
          classification: {
            model: "generative-classifier",
            decisions: { model: options.model ?? "gpt-6-luna" },
          },
          formatting: { model: "format-model" },
          suggestions: { model: "suggestion-model" },
          insights: { model: "insights-model" },
        },
      }),
  });
  return store.initialize();
}

describe("submitDecisionsRequest", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [
      "direct OpenAI",
      "https://api.openai.com/v1///",
      "https://api.openai.com/v1/decisions",
      "gpt-6-luna",
    ],
    [
      "compatible gateway",
      "https://gateway.example.test/team/v1///",
      "https://gateway.example.test/team/v1/decisions",
      "tp-decisions-alias",
    ],
  ])(
    "captures one native request for %s with a safely joined endpoint",
    async (_label, baseUrl, expectedUrl, model) => {
      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ answers: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      const timeoutMock = jest
        .spyOn(AbortSignal, "timeout")
        .mockReturnValue(new AbortController().signal);
      const snapshot = await makeSnapshot(baseUrl, { model });

      await expect(submitDecisionsRequest(request, snapshot)).resolves.toEqual({
        answers: [],
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(String(url)).toBe(expectedUrl);
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer synthetic-key",
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        model,
        input: request.input,
        questions: request.questions,
      });
      expect(init?.body).not.toContain("temperature");
      expect(init?.body).not.toContain("max_output_tokens");
      expect(init?.body).not.toContain("response_format");
      expect(timeoutMock).toHaveBeenCalledWith(DECISIONS_REQUEST_TIMEOUT_MS);
      expect(DECISIONS_REQUEST_TIMEOUT_MS).toBe(30_000);
    },
  );

  it("does not retry provider failures and keeps diagnostics sanitized", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "secret raw provider payload" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );
    const snapshot = await makeSnapshot("https://api.openai.com/v1");

    let thrown: unknown;
    try {
      await submitDecisionsRequest(request, snapshot);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(GenerativeAiError);
    expect((thrown as GenerativeAiError).diagnostic).toEqual({
      category: "unavailable/timeout",
      connection: "openai",
      requestedModel: "gpt-6-luna",
    });
    expect((thrown as Error).message).not.toContain(
      "secret raw provider payload",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requires the shared key only when a native request is used", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    const snapshot = await makeSnapshot("https://ai.example.test/custom/v2", {
      apiKey: "",
    });

    await expect(
      submitDecisionsRequest(request, snapshot),
    ).rejects.toMatchObject({
      diagnostic: {
        category: "authentication/configuration",
        connection: "custom",
        configurationSetting: "OPENAI_API_KEY",
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("joins the configured base path without a duplicate separator", () => {
    expect(buildDecisionsEndpoint("https://api.openai.com/v1/")).toBe(
      "https://api.openai.com/v1/decisions",
    );
    expect(buildDecisionsEndpoint("https://gateway.example/v1")).toBe(
      "https://gateway.example/v1/decisions",
    );
  });
});
