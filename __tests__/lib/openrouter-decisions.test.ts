// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  openRouterDecisionsRequestSchema,
  type OpenRouterDecisionsRequest,
} from "@/lib/openrouter-decisions/schemas";
import {
  OPENROUTER_DECISIONS_ENDPOINT,
  OpenRouterDecisionsError,
  submitOpenRouterDecision,
} from "@/lib/openrouter-decisions/transport";
import { validateOpenRouterDecisionsResponse } from "@/lib/openrouter-decisions/response";

const validRequest = {
  model: "openai/gpt-6-luna-decisions",
  state: { status: "failed", duration: 1200 },
  questions: {
    is_bug: {
      type: "noul",
      instructions: "Is this a bug?",
      criteria: { false: "No", true: "Yes" },
    },
    category: {
      type: "choice",
      instructions: "Choose a category",
      criteria: { bug: "Application defect", other: "Unclear" },
    },
    severity: {
      type: "score",
      instructions: "Rate severity",
      criteria: ["low", "high"],
    },
  },
} satisfies OpenRouterDecisionsRequest;

describe("OpenRouter Decisions request schema", () => {
  test.each([
    "text state",
    { status: "failed", details: ["timeout", null, 1] },
  ])("accepts valid JSON-compatible state: %j", (state) => {
    expect(
      openRouterDecisionsRequestSchema.safeParse({ ...validRequest, state })
        .success,
    ).toBe(true);
  });

  test("accepts root JSON arrays allowed by the official contract", () => {
    expect(
      openRouterDecisionsRequestSchema.safeParse({
        ...validRequest,
        state: ["case", { status: "failed" }],
      }).success,
    ).toBe(true);
  });

  test.each([
    { ...validRequest, model: "  " },
    { ...validRequest, questions: {} },
    {
      ...validRequest,
      questions: {
        category: {
          type: "choice",
          instructions: "Choose",
          criteria: { bug: "Defect", " ": "Other" },
        },
      },
    },
    {
      ...validRequest,
      questions: {
        category: {
          type: "choice",
          instructions: "Choose",
          criteria: { bug: "Defect" },
        },
      },
    },
    { model: "openai/gpt", input: "direct payload", questions: [] },
    { ...validRequest, temperature: 0 },
  ])("rejects unsupported or invalid request: %j", (request) => {
    expect(openRouterDecisionsRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });
});

describe("submitOpenRouterDecision", () => {
  const savedEnvironment = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  afterAll(() => {
    for (const [name, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  test("sends the exact endpoint, authenticated JSON, and disables fallback", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
      new Response(JSON.stringify({ answers: {} }), { status: 200 }),
      );

    await submitOpenRouterDecision(validRequest, {
      apiKey: " injected-openrouter-key ",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(OPENROUTER_DECISIONS_ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer injected-openrouter-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      ...validRequest,
      provider: { allow_fallbacks: false },
    });
  });

  test("rejects missing OpenRouter credentials without using direct-provider keys", async () => {
    delete process.env.OPENROUTER_API_KEY;
    process.env.OPENAI_API_KEY = "openai-only";
    const fetchImpl = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

    await expect(
      submitOpenRouterDecision(validRequest, { fetchImpl }),
    ).rejects.toMatchObject({ kind: "configuration", attempts: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("records exactly one attempt by default for a network failure", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(new Error("offline"));

    const result = submitOpenRouterDecision(validRequest, {
      apiKey: "secret-key",
      fetchImpl,
    });

    await expect(result).rejects.toMatchObject({ kind: "network", attempts: 1 });
    await expect(result).rejects.not.toThrow("secret-key");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("validates timeout and retry bounds before fetch", async () => {
    const fetchImpl = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

    await expect(
      submitOpenRouterDecision(validRequest, {
        apiKey: "key",
        timeoutMs: 0,
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(OpenRouterDecisionsError);
    await expect(
      submitOpenRouterDecision(validRequest, {
        apiKey: "key",
        maxRetries: 4,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ kind: "configuration" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test.each([
    [401, "authentication"],
    [403, "authentication"],
    [402, "credit"],
    [429, "rate_limit"],
    [503, "upstream"],
  ] as const)("maps HTTP %i to stable %s failure", async (status, kind) => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response("{}", { status }));

    await expect(
      submitOpenRouterDecision(validRequest, {
        apiKey: "secret-key",
        fetchImpl,
      }),
    ).rejects.toMatchObject({ kind, status, attempts: 1 });
  });

  test.each([413, 400])(
    "treats HTTP %i input-limit responses as permanent failures even with retries enabled",
    async (status) => {
      const state = {
        status: "failed",
        errorMessage: "x".repeat(20_000),
      };
      const request = { ...validRequest, state };
      const fetchImpl = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockResolvedValue(
          new Response('{"error":"context limit exceeded"}', { status }),
        );
      const sleep = jest.fn().mockResolvedValue(undefined);

      await expect(
        submitOpenRouterDecision(request, {
          apiKey: "key",
          maxRetries: 2,
          fetchImpl,
          sleep,
        }),
      ).rejects.toMatchObject({ kind: "upstream", status, attempts: 1 });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
      const [, init] = fetchImpl.mock.calls[0] ?? [];
      expect(JSON.parse(String(init?.body)).state).toEqual(state);
    },
  );

  test("aborts a timed-out attempt and retains its attempt count", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      );

    await expect(
      submitOpenRouterDecision(validRequest, {
        apiKey: "key",
        timeoutMs: 5,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ kind: "timeout", attempts: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("rejects malformed JSON as an invalid response without retrying", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response("not-json", { status: 200 }));

    await expect(
      submitOpenRouterDecision(validRequest, {
        apiKey: "key",
        fetchImpl,
      }),
    ).rejects.toMatchObject({ kind: "invalid_response", attempts: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("retries transient network failures only to the configured limit", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await submitOpenRouterDecision(validRequest, {
      apiKey: "key",
      maxRetries: 2,
      fetchImpl,
      sleep,
    });

    expect(result.attempts).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  test("retries transient 5xx failures and retains actual attempts", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValue(new Response(JSON.stringify(validResponse), { status: 200 }));
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await submitOpenRouterDecision(validRequest, {
      apiKey: "key",
      maxRetries: 1,
      fetchImpl,
      sleep,
    });

    expect(result.attempts).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  test("bounds 429 retry-after delays and retries only within the limit", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 429,
          headers: { "retry-after": "30" },
        }),
      )
      .mockResolvedValue(new Response(JSON.stringify(validResponse), { status: 200 }));
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await submitOpenRouterDecision(validRequest, {
      apiKey: "key",
      maxRetries: 1,
      fetchImpl,
      sleep,
    });

    expect(result.attempts).toBe(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  test("does not expose a credential echoed in a network error", async () => {
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(new Error("failed Authorization: Bearer secret-key"));

    try {
      await submitOpenRouterDecision(validRequest, {
        apiKey: "secret-key",
        fetchImpl,
      });
      throw new Error("expected the request to fail");
    } catch (error) {
      expect(error).toMatchObject({ kind: "network", attempts: 1 });
      expect((error as Error).message).not.toContain("secret-key");
      expect((error as Error).cause).toBeUndefined();
    }
  });
});

const validResponse = {
  answers: {
    is_bug: { type: "noul", noul: 0.8 },
    category: {
      type: "choice",
      choice: "other",
      confidence: 0.75,
      probabilities: { bug: 0.25, other: 0.75 },
    },
    severity: {
      type: "score",
      score: 0.5,
      confidence: 0.8,
      legend: { "0": "low", "1": "high" },
      probabilities: { "0": 0.5, "1": 0.5 },
    },
  },
  model: "openai/gpt-6-luna-decisions-20261001",
  provider: "OpenAI",
  id: "gen-dec-abc123",
  usage: { input_tokens: 17, output_tokens: 8, cost: 0.00012 },
};

describe("validateOpenRouterDecisionsResponse", () => {
  test("correlates mixed answers and preserves supplied gateway metadata", () => {
    const result = validateOpenRouterDecisionsResponse(validResponse, validRequest, 1);

    expect(result).toEqual({
      answers: {
        is_bug: { type: "noul", probabilityTrue: 0.8 },
        category: {
          type: "choice",
          choice: "other",
          confidence: 0.75,
          probabilities: { bug: 0.25, other: 0.75 },
        },
        severity: {
          type: "score",
          score: 0.5,
          confidence: 0.8,
          legend: { "0": "low", "1": "high" },
          probabilities: { "0": 0.5, "1": 0.5 },
        },
      },
      model: "openai/gpt-6-luna-decisions-20261001",
      provider: "OpenAI",
      id: "gen-dec-abc123",
      usage: {
        inputTokens: 17,
        outputTokens: 8,
        totalTokens: null,
        cost: 0.00012,
      },
    });
  });

  test.each([
    { ...validResponse, answers: { category: validResponse.answers.category } },
    {
      ...validResponse,
      answers: {
        ...validResponse.answers,
        extra: validResponse.answers.category,
      },
    },
    {
      ...validResponse,
      answers: {
        ...validResponse.answers,
        category: { ...validResponse.answers.category, type: "noul", noul: 0.7 },
      },
    },
    {
      ...validResponse,
      answers: {
        ...validResponse.answers,
        category: {
          ...validResponse.answers.category,
          choice: "unknown",
        },
      },
    },
    {
      ...validResponse,
      answers: {
        ...validResponse.answers,
        category: {
          ...validResponse.answers.category,
          probabilities: { bug: 0.2, other: 0.2 },
        },
      },
    },
    {
      ...validResponse,
      answers: {
        ...validResponse.answers,
        severity: { ...validResponse.answers.severity, score: 2 },
      },
    },
    {
      ...validResponse,
      answers: {
        ...validResponse.answers,
        is_bug: { type: "noul", noul: Number.NaN },
      },
    },
    { ...validResponse, model: " " },
  ])("rejects invalid answer correlation or metadata: %j", (response) => {
    expect(() =>
      validateOpenRouterDecisionsResponse(response, validRequest, 2),
    ).toThrow(OpenRouterDecisionsError);
  });

  test("keeps absent upstream identity and usage explicitly unavailable", () => {
    const { provider: _provider, id: _id, usage: _usage, ...withoutOptional } =
      validResponse;
    const result = validateOpenRouterDecisionsResponse(
      withoutOptional,
      validRequest,
      1,
    );

    expect(result.provider).toBeNull();
    expect(result.id).toBeNull();
    expect(result.usage).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      cost: null,
    });
  });

  test("rejects error-shaped answers rather than converting them to a category", () => {
    expect(() =>
      validateOpenRouterDecisionsResponse(
        { error: { code: "refused", message: "not allowed" } },
        validRequest,
        1,
      ),
    ).toThrow("invalid Decisions response");
    expect(() =>
      validateOpenRouterDecisionsResponse(
        {
          ...validResponse,
          answers: {
            ...validResponse.answers,
            category: { type: "refusal", refusal: "not allowed" },
          },
        },
        validRequest,
        1,
      ),
    ).toThrow("invalid Decisions response");
  });
});
