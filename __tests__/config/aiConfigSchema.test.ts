// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { aiConfigSchema } from "@/config/aiConfigSchema";
import defaultConfig from "../../src/config/ai-config.default.json";

const operation = { model: "model-alias" };

const validConfig = () => ({
  version: 1,
  operations: {
    classification: { ...operation },
    formatting: { ...operation },
    suggestions: { ...operation },
    insights: { ...operation },
  },
});

describe("aiConfigSchema", () => {
  it("accepts the packaged generic defaults", () => {
    expect(
      aiConfigSchema.parse(defaultConfig).operations.formatting.model,
    ).toBe("gpt-4.1-mini");
  });

  it("accepts unevaluated aliases and supplies the default API", () => {
    const parsed = aiConfigSchema.parse(validConfig());

    expect(parsed.operations.formatting).toEqual({
      model: "model-alias",
      api: "chat-completions",
    });
  });

  it.each([
    ["unknown root property", () => ({ ...validConfig(), provider: "openai" })],
    [
      "unknown operation property",
      () => ({
        ...validConfig(),
        operations: {
          ...validConfig().operations,
          formatting: { ...operation, modelKwargs: { topP: 1 } },
        },
      }),
    ],
    ["connection fields", () => ({ ...validConfig(), apiKey: "secret" })],
    [
      "operation endpoint field",
      () => ({
        ...validConfig(),
        operations: {
          ...validConfig().operations,
          formatting: { ...operation, baseURL: "https://example.test" },
        },
      }),
    ],
    [
      "missing required operation",
      () => {
        const config = validConfig();
        delete (config.operations as Partial<typeof config.operations>)
          .insights;
        return config;
      },
    ],
    [
      "wrong model type",
      () => ({
        ...validConfig(),
        operations: {
          ...validConfig().operations,
          formatting: { model: 42 },
        },
      }),
    ],
    [
      "invalid temperature range",
      () => ({
        ...validConfig(),
        operations: {
          ...validConfig().operations,
          formatting: { ...operation, temperature: 2.1 },
        },
      }),
    ],
    [
      "non-positive token limit",
      () => ({
        ...validConfig(),
        operations: {
          ...validConfig().operations,
          formatting: { ...operation, maxOutputTokens: 0 },
        },
      }),
    ],
    [
      "temperature and reasoning conflict",
      () => ({
        ...validConfig(),
        operations: {
          ...validConfig().operations,
          formatting: {
            ...operation,
            temperature: 0.2,
            reasoningEffort: "low",
          },
        },
      }),
    ],
  ])("rejects %s", (_label, createInput) => {
    expect(aiConfigSchema.safeParse(createInput()).success).toBe(false);
  });
});
