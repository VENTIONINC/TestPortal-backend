// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  aiConfigurationSchema,
  assertEvaluationCredentials,
  initializeProductionAiConfiguration,
  loadAiConfiguration,
  loadEvaluationAiConfiguration,
  resolveAiSettings,
  toChatOpenAIOptions,
} from "@/config/serverAiConfig";

describe("server AI configuration", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "server-ai-config-"));
    configPath = path.join(tempDir, "config.json");
  });

  afterEach(() => rmSync(tempDir, { recursive: true, force: true }));

  const writeConfig = (config: unknown): string => {
    writeFileSync(configPath, JSON.stringify(config));
    return configPath;
  };

  it("preserves all four legacy defaults", () => {
    const config = loadAiConfiguration({ kind: "production", env: {} });
    expect([
      resolveAiSettings(config, "storedResultsAnalysis"),
      resolveAiSettings(config, "errorFormatting"),
      resolveAiSettings(config, "solutionSuggestion"),
      resolveAiSettings(config, "dashboardInsights"),
    ].map(({ model, temperature, maxOutputTokens, maxRetries }) => ({
      model, temperature, maxOutputTokens, maxRetries,
    }))).toEqual([
      { model: "gpt-4.1-mini", temperature: 0, maxOutputTokens: 4000, maxRetries: 2 },
      { model: "gpt-4.1-mini", temperature: 0.7, maxOutputTokens: 500, maxRetries: 2 },
      { model: "gpt-4.1-mini", temperature: 0.3, maxOutputTokens: 700, maxRetries: 2 },
      { model: "gpt-4.1-mini", temperature: 0.2, maxOutputTokens: 400, maxRetries: 1 },
    ]);
  });

  it("loads an explicit file using cwd-relative paths", () => {
    writeConfig({ version: 1, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini" } }, operations: {
      storedResultsAnalysis: { profile: "fast" }, errorFormatting: { profile: "fast" },
      solutionSuggestion: { profile: "fast" }, dashboardInsights: { profile: "fast" },
    } });
    const relativePath = path.relative(process.cwd(), configPath);
    const loaded = loadAiConfiguration({ pathValue: relativePath, kind: "production", env: { OPENAI_API_KEY: "present" } });
    expect(loaded.source).toBe("explicit-file");
    expect(resolveAiSettings(loaded, "storedResultsAnalysis").model).toBe("gpt-4.1-mini");
  });

  it("rejects malformed JSON, unknown fields, invalid values, and bad references", () => {
    writeFileSync(configPath, "{");
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } })).toThrow("Invalid JSON");

    const base = { version: 1, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini" } }, operations: {
      storedResultsAnalysis: { profile: "fast" }, errorFormatting: { profile: "fast" },
      solutionSuggestion: { profile: "fast" }, dashboardInsights: { profile: "fast" },
    } };
    writeConfig({ ...base, unexpected: "secret-value" });
    let validationMessage = "";
    try {
      loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } });
    } catch (error) {
      validationMessage = error instanceof Error ? error.message : String(error);
    }
    expect(validationMessage).toContain("Unrecognized key");
    expect(validationMessage).not.toContain("secret-value");

    writeConfig({ ...base, operations: { ...base.operations, errorFormatting: { profile: "missing" } } });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } })).toThrow("unknown profile");
    writeConfig({ ...base, operations: { ...base.operations, errorFormatting: { profile: "fast", temperature: 3 } } });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } })).toThrow("temperature");
    writeConfig({ ...base, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini", reasoning: { effort: "low" } } } });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } })).toThrow("reasoning.effort");
  });

  it("validates model-specific reasoning and resolves SDK option names", () => {
    const config = writeConfig({ version: 1, profiles: { reasoner: { provider: "openai", model: "gpt-5.1", reasoning: { effort: "medium" } } }, operations: {
      storedResultsAnalysis: { profile: "reasoner" }, errorFormatting: { profile: "reasoner" },
      solutionSuggestion: { profile: "reasoner" }, dashboardInsights: { profile: "reasoner" },
    } });
    const loaded = loadAiConfiguration({ pathValue: config, kind: "production", env: { OPENAI_API_KEY: "present" } });
    const settings = resolveAiSettings(loaded, "storedResultsAnalysis");
    expect(settings.temperature).toBeUndefined();
    expect(toChatOpenAIOptions(settings)).toEqual({
      model: "gpt-5.1", reasoning: { effort: "medium" }, maxTokens: 4000, maxRetries: 2,
    });
    expect(() => resolveAiSettings(loaded, "storedResultsAnalysis", { temperature: 0 })).toThrow("Temperature is not supported");
    expect(() => resolveAiSettings(loaded, "storedResultsAnalysis", { model: "unknown" })).toThrow("Unsupported OpenAI model");
  });

  it("rejects unsupported model and reasoning settings in unreferenced profiles", () => {
    const base = {
      version: 1,
      profiles: {
        fast: { provider: "openai", model: "gpt-4.1-mini" },
        unused: { provider: "openai", model: "gpt-unknown" },
      },
      operations: {
        storedResultsAnalysis: { profile: "fast" },
        errorFormatting: { profile: "fast" },
        solutionSuggestion: { profile: "fast" },
        dashboardInsights: { profile: "fast" },
      },
    };
    writeConfig(base);
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } }))
      .toThrow("profiles.unused.model is unsupported");

    writeConfig({
      ...base,
      profiles: {
        ...base.profiles,
        unused: { provider: "openai", model: "gpt-4.1-mini", reasoning: { effort: "low" } },
      },
    });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } }))
      .toThrow("profiles.unused.reasoning.effort is unsupported");
  });

  it("starts with legacy defaults without credentials and rejects explicit config without credentials", () => {
    expect(() => initializeProductionAiConfiguration({})).not.toThrow();
    writeConfig({ version: 1, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini" } }, operations: {
      storedResultsAnalysis: { profile: "fast" }, errorFormatting: { profile: "fast" },
      solutionSuggestion: { profile: "fast" }, dashboardInsights: { profile: "fast" },
    } });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: {} })).toThrow("OPENAI_API_KEY");
  });

  it("keeps evaluation configuration independent and checks credentials before invocation", () => {
    const evaluation = loadEvaluationAiConfiguration({ AI_CONFIG_PATH: "/does/not/exist" });
    expect(evaluation.source).toBe("baseline");
    expect(resolveAiSettings(evaluation, "storedResultsAnalysis")).toMatchObject({
      model: "gpt-4.1-mini", temperature: 0.1, maxOutputTokens: 4000, maxRetries: 2, cache: false,
    });
    expect(resolveAiSettings(evaluation, "solutionSuggestion")).toMatchObject({
      temperature: 0.3, maxOutputTokens: 600, maxRetries: 2, cache: false,
    });
    expect(() => assertEvaluationCredentials({})).toThrow("OPENAI_API_KEY");
    expect(() => assertEvaluationCredentials({ OPENAI_API_KEY: "present" })).not.toThrow();
  });

  it("keeps the published examples valid against runtime validation", () => {
    for (const example of ["server.example.json", "evaluation.baseline.json"]) {
      const parsed = JSON.parse(readFileSync(path.resolve("config/ai", example), "utf8")) as unknown;
      expect(aiConfigurationSchema.safeParse(parsed).success).toBe(true);
    }
    const schema = JSON.parse(readFileSync("config/ai/server.schema.json", "utf8")) as {
      properties: Record<string, unknown>;
    };
    expect(Object.keys(schema.properties).sort()).toEqual(["$schema", "operations", "profiles", "version"]);
  });

  it("passes distinct operation model settings through mocked constructor options", () => {
    const loaded = {
      kind: "production" as const,
      source: "explicit-file" as const,
      config: {
        version: 1 as const,
        profiles: {
          fast: { provider: "openai" as const, model: "gpt-4.1-mini" },
          reasoner: { provider: "openai" as const, model: "gpt-5.1", reasoning: { effort: "high" as const } },
        },
        operations: {
          storedResultsAnalysis: { profile: "reasoner", maxOutputTokens: 8000 },
          errorFormatting: { profile: "fast", temperature: 0.7, maxOutputTokens: 500 },
          solutionSuggestion: { profile: "fast", temperature: 0.3, maxOutputTokens: 700 },
          dashboardInsights: { profile: "reasoner", maxOutputTokens: 1000 },
        },
      },
    };
    const mockedConstructor = jest.fn((options: unknown) => options);
    const operations = ["storedResultsAnalysis", "errorFormatting", "solutionSuggestion", "dashboardInsights"] as const;
    const options = operations.map((operation) => mockedConstructor(
      toChatOpenAIOptions(resolveAiSettings(loaded, operation)),
    ));

    expect(mockedConstructor).toHaveBeenCalledTimes(4);
    expect(options).toEqual([
      { model: "gpt-5.1", reasoning: { effort: "high" }, maxTokens: 8000, maxRetries: 2 },
      { model: "gpt-4.1-mini", temperature: 0.7, maxTokens: 500, maxRetries: 2 },
      { model: "gpt-4.1-mini", temperature: 0.3, maxTokens: 700, maxRetries: 2 },
      { model: "gpt-5.1", reasoning: { effort: "high" }, maxTokens: 1000, maxRetries: 1 },
    ]);
  });
});
