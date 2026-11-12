// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { createAiConfigStore } from "@/config/aiConfig";
import type { AiOperationConfig } from "@/config/aiConfigSchema";
import {
  createGenerativeAiClient,
  parseStructuredCompletion,
} from "@/lib/generativeAi";
import { errorFormatterService } from "@/services/errorFormatterService";
import { runEval } from "../../__prompts-tests__/stored-results-analysis/runners/stored-results-analysis";
import type { PromptVersion } from "../../__prompts-tests__/stored-results-analysis/runners/stored-results-analysis";
import { createUsageCollector } from "../../__prompts-tests__/helpers/evaluation";
import { testAnalysisSchemaV1_2_0 } from "@/schemas/testAnalysisSchemas";

const classificationOutput = {
  results: [
    {
      id: "case-1",
      status: "failed",
      conclusion: "Synthetic failure with reproducible checkout evidence.",
      category: "bug",
      confidence: 4,
      errorQuality: 3,
      errorQualityConclusion: "The synthetic failure has usable details.",
    },
  ],
};

const formatterOutput = {
  name: "Checkout request failed",
  description: "The synthetic checkout request returned an error.",
};

const cases = [
  {
    name: "synthetic checkout failure",
    input: {
      id: "case-1",
      specKey: "checkout",
      specTitle: "Checkout",
      status: "failed" as const,
      duration: 100,
      retry: 0,
      executionName: "synthetic run",
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

const version: PromptVersion = {
  version: "synthetic-v1.2.0",
  getPrompt: () => "Synthetic classification prompt.",
  schema: testAnalysisSchemaV1_2_0,
};

function openAiResponse(
  body: Record<string, unknown>,
  responsesApi: boolean,
  requestNumber: number,
) {
  const model = String(body.model);
  const output = requestNumber <= 2 ? classificationOutput : formatterOutput;
  const serialized = JSON.stringify(output);
  if (responsesApi) {
    return new Response(
      JSON.stringify({
        id: "resp-synthetic",
        object: "response",
        created_at: 1,
        model,
        status: "completed",
        output_text: serialized,
        output: [
          {
            id: "msg-synthetic",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text: serialized, annotations: [] }],
          },
        ],
        usage: { input_tokens: 11, output_tokens: 7, total_tokens: 18 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      id: "chatcmpl-synthetic",
      object: "chat.completion",
      created: 1,
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: serialized },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

async function makeSnapshot(baseUrl: string, api: AiOperationConfig["api"]) {
  const operation = (model: string, maxOutputTokens: number): AiOperationConfig => ({
    model,
    api,
    reasoningEffort: "low",
    maxOutputTokens,
  });
  const config = {
    version: 1,
    operations: {
      classification: operation(
        api === "chat-completions" ? "o3-mini" : "classification-alias",
        444,
      ),
      formatting: operation(
        api === "chat-completions" ? "o3-mini" : "formatting-alias",
        555,
      ),
      suggestions: operation("suggestion-alias", 666),
      insights: operation("insight-alias", 777),
    },
  };
  return createAiConfigStore({
    env: () => ({ AI_API_BASE_URL: baseUrl, OPENAI_API_KEY: "synthetic-key" }),
    readFile: async () => JSON.stringify(config),
  }).initialize();
}

describe.each([
  ["canonical Chat Completions", "https://api.openai.com/v1", "chat-completions"],
  ["canonical Responses", "https://api.openai.com/v1", "responses"],
  ["custom Chat Completions", "https://ai.example.test/custom/v1", "chat-completions"],
  ["custom Responses", "https://ai.example.test/custom/v1", "responses"],
] as const)("runtime/evaluation transport parity: %s", (_label, baseUrl, api) => {
  afterEach(() => jest.restoreAllMocks());

  it("keeps classification and formatter requests unchanged by usage observation", async () => {
    const snapshot = await makeSnapshot(baseUrl, api);
    const requests: Array<{
      url: string;
      authorization: string | null;
      body: Record<string, unknown>;
    }> = [];
    jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      const url = String(input);
      const authorization = new Headers(init?.headers).get("authorization");
      requests.push({ url, authorization, body });
      return openAiResponse(body, url.endsWith("/responses"), requests.length);
    });

    const classifier = createGenerativeAiClient("classification", snapshot);
    const classifierStructured = classifier.model.withStructuredOutput(
      testAnalysisSchemaV1_2_0,
      { name: "test_analysis", includeRaw: true },
    );
    const classificationMessages = [
      { role: "system", content: version.getPrompt(1) },
      { role: "user", content: JSON.stringify(cases.map(({ input }) => input)) },
    ];
    const runtimeClassification = await classifier.invoke(() =>
      classifierStructured.invoke(classificationMessages),
    );
    parseStructuredCompletion(
      classifier,
      runtimeClassification,
      testAnalysisSchemaV1_2_0,
    );
    const runtimeClassificationRequest = requests.at(-1)?.body;

    const evaluationResult = await runEval({ cases, version, snapshot });
    const evaluationClassificationRequest = requests.at(-1)?.body;
    expect(evaluationResult.usage).toEqual({
      inputTokens: 11,
      outputTokens: 7,
      totalTokens: 18,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    });
    expect(evaluationClassificationRequest).toEqual(runtimeClassificationRequest);

    const formatter = createGenerativeAiClient("formatting", snapshot);
    const input = {
      name: "Checkout failure",
      description: "Synthetic request returned HTTP 503.",
    };
    await errorFormatterService.formatErrorMessage(input, formatter);
    const runtimeFormatterRequest = requests.at(-1)?.body;

    const usage = createUsageCollector();
    await errorFormatterService.formatErrorMessage(input, formatter, {
      callbacks: usage.callbacks,
    });
    const evaluationFormatterRequest = requests.at(-1)?.body;
    expect(usage.usageEntries).toEqual([
      expect.objectContaining({ input_tokens: 11, output_tokens: 7 }),
    ]);
    expect(evaluationFormatterRequest).toEqual(runtimeFormatterRequest);

    expect(requests.map(({ url }) => url)).toEqual([
      `${baseUrl}/${api === "responses" ? "responses" : "chat/completions"}`,
      `${baseUrl}/${api === "responses" ? "responses" : "chat/completions"}`,
      `${baseUrl}/${api === "responses" ? "responses" : "chat/completions"}`,
      `${baseUrl}/${api === "responses" ? "responses" : "chat/completions"}`,
    ]);
    expect(requests.map(({ authorization }) => authorization)).toEqual(
      Array(4).fill("Bearer synthetic-key"),
    );
    expect(requests[0]?.body.model).toBe(
      api === "chat-completions" ? "o3-mini" : "classification-alias",
    );
    expect(requests[2]?.body.model).toBe(
      api === "chat-completions" ? "o3-mini" : "formatting-alias",
    );
    if (api === "responses") {
      expect(requests[0]?.body).toMatchObject({
        reasoning: { effort: "low" },
        max_output_tokens: 444,
      });
      expect(requests[2]?.body).toMatchObject({
        reasoning: { effort: "low" },
        max_output_tokens: 555,
      });
    } else {
      expect(requests[0]?.body).toMatchObject({
        reasoning_effort: "low",
        max_completion_tokens: 444,
      });
      expect(requests[2]?.body).toMatchObject({
        reasoning_effort: "low",
        max_completion_tokens: 555,
      });
    }
  });
});
