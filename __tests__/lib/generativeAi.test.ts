// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";

import type { AiConfigSnapshot } from "@/config/aiConfig";
import { createAiConfigStore } from "@/config/aiConfig";
import {
  createGenerativeAiClient,
  GenerativeAiError,
  parseStructuredCompletion,
} from "@/lib/generativeAi";
import { errorFormatterSchema } from "@/schemas/errorFormatterSchemas";

const defaultOperation = {
  model: "gpt-4.1-mini",
  api: "chat-completions" as const,
};

async function makeSnapshot(
  options: {
    baseUrl?: string;
    apiKey?: string;
    formatting?: Partial<AiConfigSnapshot["operations"]["formatting"]>;
    operations?: Partial<AiConfigSnapshot["operations"]>;
  } = {},
): Promise<AiConfigSnapshot> {
  const baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  const operations = {
    classification: { ...defaultOperation, ...options.operations?.classification },
    formatting: {
      ...defaultOperation,
      ...options.formatting,
      ...options.operations?.formatting,
    },
    suggestions: { ...defaultOperation, ...options.operations?.suggestions },
    insights: { ...defaultOperation, ...options.operations?.insights },
  };
  const json = JSON.stringify({
    version: 1,
    operations,
  });
  const store = createAiConfigStore({
    env: () => ({
      AI_API_BASE_URL: baseUrl,
      OPENAI_API_KEY: options.apiKey ?? "synthetic-key",
    }),
    readFile: async () => json,
  });
  return store.initialize();
}

function chatResponse(model: string) {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-synthetic",
      object: "chat.completion",
      created: 1,
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "synthetic response" },
          finish_reason: "stop",
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("createGenerativeAiClient", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends Chat Completions to the selected connection with the configured model and reasoning", async () => {
    let requestUrl = "";
    let authorization: string | null | undefined;
    let requestBody: Record<string, unknown> | undefined;
    jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      requestUrl = String(input);
      const headers = init?.headers;
      if (headers instanceof Headers) {
        authorization = headers.get("authorization");
      } else if (Array.isArray(headers)) {
        authorization = headers.find(
          ([name]) => name?.toLowerCase() === "authorization",
        )?.[1];
      } else if (headers && typeof headers === "object") {
        authorization = (headers as Record<string, string>).authorization;
      }
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return chatResponse("o3-mini");
    });

    const client = createGenerativeAiClient(
      "formatting",
      await makeSnapshot({
        baseUrl: "https://ai.example.test/custom/v2/",
        formatting: { model: "o3-mini", reasoningEffort: "low" },
      }),
    );
    await client.invoke(() => client.model.invoke("synthetic prompt"));

    expect(requestUrl).toBe(
      "https://ai.example.test/custom/v2/chat/completions",
    );
    expect(authorization).toBe("Bearer synthetic-key");
    expect(requestBody).toMatchObject({
      model: "o3-mini",
      reasoning_effort: "low",
    });
    expect(requestBody).not.toHaveProperty("temperature");
    expect(requestBody).not.toHaveProperty("max_tokens");
  });

  it("sends Responses API reasoning fields without direct defaults", async () => {
    let requestUrl = "";
    let requestBody: Record<string, unknown> | undefined;
    jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          id: "resp-synthetic",
          object: "response",
          created_at: 1,
          model: "reasoning-alias",
          status: "completed",
          output_text: "synthetic response",
          output: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const client = createGenerativeAiClient(
      "formatting",
      await makeSnapshot({
        baseUrl: "https://ai.example.test/custom/v2",
        formatting: {
          model: "reasoning-alias",
          api: "responses",
          reasoningEffort: "medium",
        },
      }),
    );
    await client.invoke(() => client.model.invoke("synthetic prompt"));

    expect(requestUrl).toBe("https://ai.example.test/custom/v2/responses");
    expect(requestBody).toMatchObject({
      model: "reasoning-alias",
      reasoning: { effort: "medium" },
    });
    expect(requestBody).not.toHaveProperty("temperature");
    expect(requestBody).not.toHaveProperty("max_output_tokens");
  });

  it("preserves supported explicit generation settings for a custom URL", async () => {
    let requestBody: Record<string, unknown> | undefined;
    jest.spyOn(global, "fetch").mockImplementation(async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return chatResponse("custom-model");
    });

    const client = createGenerativeAiClient(
      "formatting",
      await makeSnapshot({
        baseUrl: "https://ai.example.test/gateway/v1",
        formatting: {
          model: "custom-model",
          temperature: 0.25,
          maxOutputTokens: 123,
        },
      }),
    );
    await client.invoke(() => client.model.invoke("synthetic prompt"));

    expect(requestBody).toMatchObject({
      model: "custom-model",
      temperature: 0.25,
      max_tokens: 123,
    });
  });

  it("requires credentials before any transport request", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    try {
      createGenerativeAiClient(
        "formatting",
        await makeSnapshot({ apiKey: "" }),
      );
      throw new Error("Expected client acquisition to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(GenerativeAiError);
      expect((error as GenerativeAiError).diagnostic).toEqual({
        category: "authentication/configuration",
        connection: "openai",
        configurationSetting: "OPENAI_API_KEY",
        requestedModel: "gpt-4.1-mini",
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "https://private.example/token?key=synthetic-secret",
    "sk-proj-secretcredential",
    "model\nAuthorization: Bearer synthetic-secret",
  ])(
    "omits unsafe model metadata when credentials are absent: %s",
    async (model) => {
      const fetchMock = jest.spyOn(global, "fetch");
      const snapshot = await makeSnapshot({
        apiKey: "",
        formatting: { model },
      });
      try {
        createGenerativeAiClient("formatting", snapshot);
        throw new Error("Expected client acquisition to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(GenerativeAiError);
        expect((error as GenerativeAiError).diagnostic).toEqual({
          category: "authentication/configuration",
          connection: "openai",
          configurationSetting: "OPENAI_API_KEY",
        });
      }
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["classification", undefined, 4000, 2],
    ["formatting", 0.7, 500, 2],
    ["suggestions", 0.3, 700, 2],
    ["insights", 0.2, 400, 1],
  ] as const)(
    "applies the %s canonical operation policy to captured requests",
    async (operation, temperature, maxTokens, retries) => {
      const fetchMock = jest.spyOn(global, "fetch").mockImplementation(
        async () =>
          new Response(JSON.stringify({ error: { message: "unavailable" } }), {
            status: 503,
            headers: { "content-type": "application/json" },
          }),
      );
      const snapshot = await makeSnapshot();
      const client = createGenerativeAiClient(operation, snapshot);
      await expect(
        client.invoke(() => client.model.invoke("synthetic prompt")),
      ).rejects.toBeInstanceOf(GenerativeAiError);

      const requestBody = JSON.parse(
        String(fetchMock.mock.calls[0]?.[1]?.body),
      ) as Record<string, unknown>;
      expect(requestBody.model).toBe("gpt-4.1-mini");
      expect(requestBody.temperature).toBe(temperature);
      expect(requestBody.max_tokens).toBe(maxTokens);
      expect(fetchMock).toHaveBeenCalledTimes(retries + 1);
      expect(client.model).toBeDefined();
    },
    15000,
  );

  it.each([
    "classification",
    "formatting",
    "suggestions",
    "insights",
  ] as const)(
    "omits implicit generation defaults and retries for custom %s requests",
    async (operation) => {
      const fetchMock = jest.spyOn(global, "fetch").mockImplementation(
        async () => chatResponse("gpt-4.1-mini"),
      );
      const client = createGenerativeAiClient(
        operation,
        await makeSnapshot({ baseUrl: "https://ai.example.test/v1" }),
      );
      await client.invoke(() => client.model.invoke("synthetic prompt"));

      const requestBody = JSON.parse(
        String(fetchMock.mock.calls[0]?.[1]?.body),
      ) as Record<string, unknown>;
      expect(requestBody).not.toHaveProperty("temperature");
      expect(requestBody).not.toHaveProperty("max_tokens");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps per-operation explicit settings and reasoning translation", async () => {
    let requestBody: Record<string, unknown> | undefined;
    jest.spyOn(global, "fetch").mockImplementation(async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          id: "resp-reasoning",
          object: "response",
          created_at: 1,
          model: "reasoning-alias",
          status: "completed",
          output_text: "synthetic response",
          output: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const client = createGenerativeAiClient(
      "suggestions",
      await makeSnapshot({
        operations: {
          suggestions: {
            model: "reasoning-alias",
            api: "responses",
            reasoningEffort: "low",
            maxOutputTokens: 123,
          },
        },
      }),
    );
    await client.invoke(() => client.model.invoke("synthetic prompt"));

    expect(requestBody).toMatchObject({
      model: "reasoning-alias",
      reasoning: { effort: "low" },
      max_output_tokens: 123,
    });
    expect(requestBody).not.toHaveProperty("temperature");
    expect(requestBody).not.toHaveProperty("max_tokens");
  });

  it("keeps nested suggestion and migrated classification request settings isolated", async () => {
    const requests: Array<{
      url: string;
      authorization: string | null;
      body: Record<string, unknown>;
    }> = [];
    jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const headers = new Headers(init?.headers);
      requests.push({
        url: String(input),
        authorization: headers.get("authorization"),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      if (String(input).endsWith("/responses")) {
        return new Response(
          JSON.stringify({
            id: "resp-classification",
            object: "response",
            created_at: 1,
            model: "gpt-6-luna",
            status: "completed",
            output_text: "synthetic classification",
            output: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return chatResponse("gpt-4.1-mini");
    });

    const snapshot = await makeSnapshot({
      operations: {
        classification: {
          model: "gpt-6-luna",
          api: "responses",
          reasoningEffort: "low",
          maxOutputTokens: 4000,
        },
        suggestions: {
          model: "gpt-4.1-mini",
          api: "chat-completions",
          temperature: 0.3,
          maxOutputTokens: 700,
        },
      },
    });
    const classification = createGenerativeAiClient("classification", snapshot);
    const suggestions = createGenerativeAiClient("suggestions", snapshot);

    await classification.invoke(() =>
      classification.model.invoke("synthetic classification"),
    );
    await suggestions.invoke(() =>
      suggestions.model.invoke("synthetic suggestion"),
    );

    expect(requests).toHaveLength(2);
    expect(requests.map(({ url }) => url)).toEqual([
      "https://api.openai.com/v1/responses",
      "https://api.openai.com/v1/chat/completions",
    ]);
    expect(requests.map(({ authorization }) => authorization)).toEqual([
      "Bearer synthetic-key",
      "Bearer synthetic-key",
    ]);
    expect(requests[0]?.body).toMatchObject({
      model: "gpt-6-luna",
      reasoning: { effort: "low" },
      max_output_tokens: 4000,
    });
    expect(requests[0]?.body).not.toHaveProperty("temperature");
    expect(requests[1]?.body).toMatchObject({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      max_tokens: 700,
    });
  });

  it.each([
    ["classification", "canonical", undefined, 4000],
    ["formatting", "canonical", 0.7, 500],
    ["suggestions", "canonical", 0.3, 700],
    ["insights", "canonical", 0.2, 400],
    ["classification", "custom", undefined, undefined],
    ["formatting", "custom", undefined, undefined],
    ["suggestions", "custom", undefined, undefined],
    ["insights", "custom", undefined, undefined],
  ] as const)(
    "captures the %s Responses request policy for a %s URL",
    async (operation, connection, temperature, maxOutputTokens) => {
      let requestUrl = "";
      let requestBody: Record<string, unknown> | undefined;
      jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
        requestUrl = String(input);
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            id: "resp-captured",
            object: "response",
            created_at: 1,
            model: "gpt-4.1-mini",
            status: "completed",
            output_text: "synthetic response",
            output: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      });
      const baseUrl =
        connection === "canonical"
          ? "https://api.openai.com/v1/"
          : "https://ai.example.test/custom/v1";
      const client = createGenerativeAiClient(
        operation,
        await makeSnapshot({
          baseUrl,
          operations: { [operation]: { ...defaultOperation, api: "responses" } },
        }),
      );
      await client.invoke(() => client.model.invoke("synthetic prompt"));

      expect(requestUrl).toBe(`${baseUrl.replace(/\/$/, "")}/responses`);
      expect(requestBody).toMatchObject({ model: "gpt-4.1-mini" });
      expect(requestBody?.temperature).toBe(temperature);
      expect(requestBody?.max_output_tokens).toBe(maxOutputTokens);
    },
  );

  it.each([
    ["chat completion refusal", { response_metadata: {}, additional_kwargs: { refusal: "no" }, content: "" }],
    ["chat completion truncation", { response_metadata: { finish_reason: "length" }, additional_kwargs: {}, content: "{}" }],
    ["incomplete Responses status", { response_metadata: { status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }, additional_kwargs: {}, content: "" }],
    ["incomplete Responses output item", { response_metadata: { status: "completed", output: [{ type: "message", status: "incomplete", content: [] }] }, additional_kwargs: {}, content: "" }],
  ])("rejects %s before returning structured output", (_label, raw) => {
    const client = { connection: "openai" as const, requestedModel: "safe-model" };
    expect(() =>
      parseStructuredCompletion(
        client,
        { raw, parsed: { name: "name", description: "description" } },
        errorFormatterSchema,
      ),
    ).toThrow(GenerativeAiError);
  });

  it("rejects unparseable chat and Responses structured results", () => {
    const client = { connection: "custom" as const, requestedModel: "alias" };
    for (const raw of [
      { response_metadata: { finish_reason: "stop" }, content: "not json" },
      { response_metadata: { status: "completed" }, content: [] },
    ]) {
      expect(() =>
        parseStructuredCompletion(
          client,
          { raw, parsed: null },
          errorFormatterSchema,
        ),
      ).toThrow(GenerativeAiError);
    }
  });

  it.each([
    ["canonical OpenAI", "https://api.openai.com/v1/", 3],
    ["custom URL", "https://ai.example.test/v1", 1],
  ])(
    "uses the expected transport retry count for %s",
    async (_label, baseUrl, attempts) => {
      const fetchMock = jest.spyOn(global, "fetch").mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ error: { message: "sensitive provider detail" } }),
            {
              status: 503,
              headers: { "content-type": "application/json" },
            },
          ),
      );
      const client = createGenerativeAiClient(
        "formatting",
        await makeSnapshot({ baseUrl }),
      );

      await expect(
        client.invoke(() => client.model.invoke("synthetic prompt")),
      ).rejects.toBeInstanceOf(GenerativeAiError);
      expect(fetchMock).toHaveBeenCalledTimes(attempts);
      if (baseUrl === "https://api.openai.com/v1/") {
        expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
          "https://api.openai.com/v1/chat/completions",
        );
      }
    },
    15000,
  );

  it("maps typical provider failures safely and falls back for unknown errors", async () => {
    const snapshot = await makeSnapshot();
    const client = createGenerativeAiClient("formatting", snapshot);
    const providerError = Object.assign(
      new Error("sk-secret https://private.test"),
      {
        status: 429,
        headers: { authorization: "Bearer secret" },
        body: "private body",
        model: "safe-returned-model",
      },
    );
    let thrown: unknown;
    try {
      await client.invoke(async () => Promise.reject(providerError));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(GenerativeAiError);
    expect((thrown as GenerativeAiError).diagnostic).toEqual({
      category: "rate-limit",
      connection: "openai",
      requestedModel: "gpt-4.1-mini",
      returnedModel: "safe-returned-model",
    });
    expect((thrown as Error).message).not.toMatch(
      /sk-secret|private\.test|private body/,
    );

    let unknown: unknown;
    try {
      await client.invoke(async () => Promise.reject({ private: "secret" }));
    } catch (error) {
      unknown = error;
    }
    expect((unknown as GenerativeAiError).diagnostic.category).toBe("unknown");
    expect((unknown as Error).message).not.toContain("secret");

    let credentialModel: unknown;
    try {
      await client.invoke(async () =>
        Promise.reject({ status: 503, model: "sk-proj-secretcredential" }),
      );
    } catch (error) {
      credentialModel = error;
    }
    expect(
      (credentialModel as GenerativeAiError).diagnostic,
    ).not.toHaveProperty("returnedModel");

    let timeout: unknown;
    try {
      await client.invoke(async () => Promise.reject({ status: 408 }));
    } catch (error) {
      timeout = error;
    }
    expect((timeout as GenerativeAiError).diagnostic.category).toBe(
      "unavailable/timeout",
    );
  });

  it.each([
    ["authentication", 401, "authentication/configuration"],
    ["model or parameter", 400, "invalid-response"],
    ["credit", 402, "unknown"],
    ["rate limit", 429, "rate-limit"],
    ["availability", 503, "unavailable/timeout"],
    ["timeout", 408, "unavailable/timeout"],
  ] as const)(
    "sanitizes %s diagnostics before they reach a service",
    async (_label, status, category) => {
      const client = createGenerativeAiClient(
        "classification",
        await makeSnapshot({ baseUrl: "https://ai.example.test/v1" }),
      );
      const failure = Object.assign(
        new Error("sk-sensitive https://private.example/raw-response"),
        {
          status,
          headers: { authorization: "Bearer hidden" },
          body: "sensitive response body",
        },
      );

      let thrown: unknown;
      try {
        await client.invoke(async () => Promise.reject(failure));
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toMatchObject({
        diagnostic: { category },
        message: `AI request failed (${category}).`,
      });
      expect((thrown as Error).message).not.toMatch(
        /sk-sensitive|private\.example|sensitive response|Bearer hidden/,
      );
    },
  );
});
