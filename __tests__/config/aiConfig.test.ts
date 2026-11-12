// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";

import {
  CANONICAL_OPENAI_BASE_URL,
  createAiConfigStore,
  normalizeAiBaseUrl,
  type AiConfigEnvironment,
} from "@/config/aiConfig";

const createJson = (formattingModel: string) =>
  JSON.stringify({
    version: 1,
    operations: {
      classification: { model: "classification-model" },
      formatting: { model: formattingModel },
      suggestions: { model: "suggestions-model" },
      insights: { model: "insights-model" },
    },
  });

describe("aiConfig", () => {
  it("normalizes canonical trailing slashes and preserves custom URL paths", () => {
    expect(normalizeAiBaseUrl("https://api.openai.com/v1///")).toBe(
      CANONICAL_OPENAI_BASE_URL,
    );
    expect(normalizeAiBaseUrl("https://ai.example.test/custom/v2/")).toBe(
      "https://ai.example.test/custom/v2",
    );
  });

  it.each([
    "not-a-url",
    "ftp://ai.example.test/v1",
    "https://user:password@ai.example.test/v1",
    "https://ai.example.test/v1?token=secret",
    "https://ai.example.test/v1#fragment",
  ])("rejects malformed or unsafe endpoint %s", (url) => {
    expect(() => normalizeAiBaseUrl(url)).toThrow("AI_API_BASE_URL");
  });

  it("loads the default configuration once into a deep immutable snapshot", async () => {
    let env: AiConfigEnvironment = { OPENAI_API_KEY: "test-key" };
    const readFileMock = jest.fn(async () => createJson("format-model-a"));
    const store = createAiConfigStore({
      env: () => env,
      readFile: readFileMock,
      defaultConfigPath: new URL("file:///test/default.json"),
    });

    const first = await store.initialize();
    env = {
      OPENAI_API_KEY: "changed-key",
      AI_API_BASE_URL: "https://ai.example.test/v1",
    };
    const second = await store.initialize();

    expect(first).toBe(second);
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(first.connection).toEqual({
      baseUrl: CANONICAL_OPENAI_BASE_URL,
      connectionLabel: "openai",
    });
    expect(JSON.stringify(first)).not.toContain("test-key");
    expect(first.operations.formatting.model).toBe("format-model-a");
    expect(first.operations.classification.model).toBe("classification-model");
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.connection)).toBe(true);
    expect(Object.isFrozen(first.operations)).toBe(true);
    expect(Object.isFrozen(first.operations.formatting)).toBe(true);
  });

  it("loads packaged defaults independently of the entry script and working directory", async () => {
    const originalEntrypoint = process.argv[1];
    const cwdMock = jest
      .spyOn(process, "cwd")
      .mockReturnValue("/unrelated-directory");
    process.argv[1] = "/external/tools/runner.mjs";
    try {
      const snapshot = await createAiConfigStore({
        env: () => ({}),
      }).initialize();
      expect(snapshot.operations.formatting.model).toBe("gpt-4.1-mini");
    } finally {
      if (originalEntrypoint === undefined) {
        delete process.argv[1];
      } else {
        process.argv[1] = originalEntrypoint;
      }
      cwdMock.mockRestore();
    }
  });

  it("allows non-AI startup without an API key", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    const store = createAiConfigStore({
      env: () => ({}),
      readFile: async () => createJson("formatting-alias"),
      defaultConfigPath: new URL("file:///test/default.json"),
    });

    const snapshot = await store.initialize();

    expect(snapshot.connection).toEqual({
      baseUrl: CANONICAL_OPENAI_BASE_URL,
      connectionLabel: "openai",
    });
    expect(snapshot.operations.formatting.model).toBe("formatting-alias");
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("uses the selected file and only exposes actionable safe read errors", async () => {
    const store = createAiConfigStore({
      env: () => ({ AI_CONFIG_PATH: "private/config.json" }),
      cwd: () => "/service",
      readFile: async () => {
        throw new Error("/service/private/config.json contains secret");
      },
    });

    await expect(store.initialize()).rejects.toThrow(
      "Could not read the file selected by AI_CONFIG_PATH",
    );
    await expect(store.initialize()).rejects.not.toThrow("secret");
  });

  it("resolves a selected relative path from the configured working directory", async () => {
    const readFileMock = jest.fn(async () => createJson("selected-model"));
    const store = createAiConfigStore({
      env: () => ({ AI_CONFIG_PATH: "private/config.json" }),
      cwd: () => "/service",
      readFile: readFileMock,
    });

    await store.initialize();

    expect(readFileMock).toHaveBeenCalledWith(
      "/service/private/config.json",
      "utf8",
    );
  });

  it("preserves selected operation models and generation settings without model-based inference", async () => {
    const selectedConfig = {
      version: 1,
      operations: {
        classification: {
          model: "synthetic-classifier",
          api: "responses",
          reasoningEffort: "low",
          maxOutputTokens: 901,
        },
        formatting: {
          model: "synthetic-formatter",
          api: "responses",
          reasoningEffort: "none",
          maxOutputTokens: 502,
        },
        suggestions: {
          model: "synthetic-suggester",
          api: "chat-completions",
          temperature: 0.4,
          maxOutputTokens: 703,
        },
        insights: {
          model: "synthetic-insights",
          api: "chat-completions",
          temperature: 0.1,
          maxOutputTokens: 404,
        },
      },
    };
    const snapshot = await createAiConfigStore({
      env: () => ({ AI_CONFIG_PATH: "/private/current.json" }),
      readFile: async () => JSON.stringify(selectedConfig),
    }).initialize();

    expect(snapshot.operations).toEqual(selectedConfig.operations);
  });

  it("does not fall back to packaged defaults when the explicitly selected profile is absent", async () => {
    const readFileMock = jest.fn(async () => {
      throw new Error("selected profile is absent");
    });
    const store = createAiConfigStore({
      env: () => ({ AI_CONFIG_PATH: "/private/current.json" }),
      readFile: readFileMock,
      defaultConfigPath: new URL("file:///packaged/default.json"),
    });

    await expect(store.initialize()).rejects.toThrow(
      "Could not read the file selected by AI_CONFIG_PATH",
    );
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledWith(
      "/private/current.json",
      "utf8",
    );
  });

  it("rejects invalid selected JSON and schema values without echoing them", async () => {
    const invalidJsonStore = createAiConfigStore({
      env: () => ({ AI_CONFIG_PATH: "/secret/invalid.json" }),
      readFile: async () => "{not-json secret-value}",
    });
    await expect(invalidJsonStore.initialize()).rejects.toThrow(
      "not valid JSON",
    );
    await expect(invalidJsonStore.initialize()).rejects.not.toThrow(
      "secret-value",
    );

    const invalidSchemaStore = createAiConfigStore({
      env: () => ({ AI_CONFIG_PATH: "/secret/schema.json" }),
      readFile: async () => JSON.stringify({ version: 1, operations: {} }),
    });
    await expect(invalidSchemaStore.initialize()).rejects.toThrow(
      "AI configuration is invalid at operations",
    );
  });

  it("requires explicit initialization before the snapshot can be read", () => {
    const store = createAiConfigStore({
      readFile: async () => createJson("alias"),
    });
    expect(() => store.getSnapshot()).toThrow("has not been initialized");
  });
});
