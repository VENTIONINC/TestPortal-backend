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

function openAiResponse(
  body: Record<string, unknown>,
  responsesApi: boolean,
  isClassification: boolean,
) {
  const model = String(body.model);
  const output = isClassification ? classificationOutput : formatterOutput;
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
] as const)("synthetic operation transport: %s", (_label, baseUrl, api) => {
  afterEach(() => jest.restoreAllMocks());

  it("routes classification and formatting through the selected connection", async () => {
    const snapshot = await makeSnapshot(baseUrl, api);
    const requests: Array<{
      url: string;
      authorization: string | null;
      body: Record<string, unknown>;
    }> = [];
    jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      const requestUrl = String(input);
      requests.push({
        url: requestUrl,
        authorization: new Headers(init?.headers).get("authorization"),
        body,
      });
      return openAiResponse(
        body,
        requestUrl.endsWith("/responses"),
        requests.length === 1,
      );
    });

    const classifier = createGenerativeAiClient("classification", snapshot);
    const structuredClassifier = classifier.model.withStructuredOutput(
      testAnalysisSchemaV1_2_0,
      { name: "test_analysis", includeRaw: true },
    );
    const completion = await classifier.invoke(() =>
      structuredClassifier.invoke([
        { role: "system", content: "Synthetic classification prompt." },
        { role: "user", content: JSON.stringify([{ id: "case-1" }]) },
      ]),
    );
    expect(
      parseStructuredCompletion(
        classifier,
        completion,
        testAnalysisSchemaV1_2_0,
      ),
    ).toEqual(classificationOutput);

    const formatter = createGenerativeAiClient("formatting", snapshot);
    await errorFormatterService.formatErrorMessage(
      {
        name: "Checkout failure",
        description: "Synthetic request returned HTTP 503.",
      },
      formatter,
    );

    const endpoint = api === "responses" ? "/responses" : "/chat/completions";
    expect(requests.map(({ url }) => url)).toEqual([
      `${baseUrl}${endpoint}`,
      `${baseUrl}${endpoint}`,
    ]);
    expect(requests.map(({ authorization }) => authorization)).toEqual([
      "Bearer synthetic-key",
      "Bearer synthetic-key",
    ]);
    expect(requests.map(({ body }) => body.model)).toEqual(
      api === "chat-completions"
        ? ["o3-mini", "o3-mini"]
        : ["classification-alias", "formatting-alias"],
    );
    if (api === "responses") {
      expect(requests[0]?.body).toMatchObject({
        reasoning: { effort: "low" },
        max_output_tokens: 444,
      });
      expect(requests[1]?.body).toMatchObject({
        reasoning: { effort: "low" },
        max_output_tokens: 555,
      });
    } else {
      expect(requests[0]?.body).toMatchObject({
        reasoning_effort: "low",
        max_completion_tokens: 444,
      });
      expect(requests[1]?.body).toMatchObject({
        reasoning_effort: "low",
        max_completion_tokens: 555,
      });
    }
  });
});
