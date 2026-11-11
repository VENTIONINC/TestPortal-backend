// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";

import type { AiConfigSnapshot } from "@/config/aiConfig";
import { createAiConfigStore } from "@/config/aiConfig";
import {
  createGenerativeAiClient,
  GenerativeAiError,
} from "@/lib/generativeAi";

const defaultOperation = {
  model: "gpt-4.1-mini",
  api: "chat-completions" as const,
};

async function makeSnapshot(
  options: {
    baseUrl?: string;
    apiKey?: string;
    formatting?: Partial<AiConfigSnapshot["operations"]["formatting"]>;
  } = {},
): Promise<AiConfigSnapshot> {
  const baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  const formatting = { ...defaultOperation, ...options.formatting };
  const json = JSON.stringify({
    version: 1,
    operations: {
      classification: defaultOperation,
      formatting,
      suggestions: defaultOperation,
      insights: defaultOperation,
    },
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
});
