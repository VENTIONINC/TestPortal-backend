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

  it("loads all four shipped production settings", () => {
    const config = loadAiConfiguration({ kind: "production", env: { OPENAI_API_KEY: "present" } });
    expect(config.source).toBe("shipped-production");
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

  it("loads a complete custom file using cwd-relative paths and replaces the shipped settings", () => {
    writeConfig({ version: 1, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini" } }, operations: {
      storedResultsAnalysis: { profile: "fast", maxOutputTokens: 2000, maxRetries: 1 },
      errorFormatting: { profile: "fast", maxOutputTokens: 250, maxRetries: 0 },
      solutionSuggestion: { profile: "fast", maxOutputTokens: 350, maxRetries: 1 },
      dashboardInsights: { profile: "fast", maxOutputTokens: 200, maxRetries: 0 },
    } });
    const relativePath = path.relative(process.cwd(), configPath);
    const loaded = loadAiConfiguration({ pathValue: relativePath, kind: "production", env: { OPENAI_API_KEY: "present" } });
    expect(loaded.source).toBe("custom");
    expect(resolveAiSettings(loaded, "storedResultsAnalysis")).toMatchObject({
      model: "gpt-4.1-mini", maxOutputTokens: 2000, maxRetries: 1,
    });
    expect(resolveAiSettings(loaded, "storedResultsAnalysis").temperature).toBeUndefined();
    expect(toChatOpenAIOptions(resolveAiSettings(loaded, "storedResultsAnalysis"))).toEqual({
      model: "gpt-4.1-mini", maxTokens: 2000, maxRetries: 1,
    });
  });

  it("selects both shipped files for unset or blank paths from the application root", () => {
    const previousCwd = process.cwd();
    try {
      process.chdir(tempDir);
      const production = loadAiConfiguration({ kind: "production", env: { OPENAI_API_KEY: "present" } });
      const blankProduction = loadAiConfiguration({ pathValue: "   ", kind: "production", env: { OPENAI_API_KEY: "present" } });
      const evaluation = loadEvaluationAiConfiguration({ AI_CONFIG_PATH: "/does/not/exist", AI_EVAL_CONFIG_PATH: " " });

      expect(production.source).toBe("shipped-production");
      expect(blankProduction.source).toBe("shipped-production");
      expect(evaluation.source).toBe("evaluation-baseline");
      expect(resolveAiSettings(blankProduction, "storedResultsAnalysis")).toMatchObject({
        temperature: 0, maxOutputTokens: 4000, maxRetries: 2,
      });
      expect(resolveAiSettings(evaluation, "solutionSuggestion")).toMatchObject({
        temperature: 0.3, maxOutputTokens: 600, maxRetries: 2,
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("rejects malformed JSON, unknown fields, invalid values, and bad references", () => {
    writeFileSync(configPath, "{");
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } })).toThrow("Invalid JSON");

    const base = { version: 1, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini" } }, operations: {
      storedResultsAnalysis: { profile: "fast", maxOutputTokens: 4000, maxRetries: 2 },
      errorFormatting: { profile: "fast", maxOutputTokens: 500, maxRetries: 2 },
      solutionSuggestion: { profile: "fast", maxOutputTokens: 700, maxRetries: 2 },
      dashboardInsights: { profile: "fast", maxOutputTokens: 400, maxRetries: 1 },
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

    writeConfig({ ...base, operations: { ...base.operations, errorFormatting: { profile: "missing", maxOutputTokens: 500, maxRetries: 2 } } });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } })).toThrow("unknown profile");
    writeConfig({ ...base, operations: { ...base.operations, errorFormatting: { profile: "fast", maxOutputTokens: 500, maxRetries: 2, temperature: 3 } } });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } })).toThrow("temperature");
    writeConfig({ ...base, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini", reasoning: { effort: "low" } } } });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } })).toThrow("reasoning.effort");
  });

  it("validates model-specific reasoning and resolves SDK option names", () => {
    const config = writeConfig({ version: 1, profiles: { reasoner: { provider: "openai", model: "gpt-5.1", reasoning: { effort: "medium" } } }, operations: {
          storedResultsAnalysis: { profile: "reasoner", maxOutputTokens: 4000, maxRetries: 2 },
          errorFormatting: { profile: "reasoner", maxOutputTokens: 500, maxRetries: 2 },
          solutionSuggestion: { profile: "reasoner", maxOutputTokens: 700, maxRetries: 2 },
          dashboardInsights: { profile: "reasoner", maxOutputTokens: 400, maxRetries: 1 },
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
        storedResultsAnalysis: { profile: "fast", maxOutputTokens: 4000, maxRetries: 2 },
        errorFormatting: { profile: "fast", maxOutputTokens: 500, maxRetries: 2 },
        solutionSuggestion: { profile: "fast", maxOutputTokens: 700, maxRetries: 2 },
        dashboardInsights: { profile: "fast", maxOutputTokens: 400, maxRetries: 1 },
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

  it("requires credentials for the shipped and custom production configurations", () => {
    expect(() => initializeProductionAiConfiguration({})).toThrow("OPENAI_API_KEY");
    expect(() => initializeProductionAiConfiguration({ OPENAI_API_KEY: "present", AI_CONFIG_PATH: " " })).not.toThrow();
    writeConfig({ version: 1, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini" } }, operations: {
      storedResultsAnalysis: { profile: "fast", maxOutputTokens: 4000, maxRetries: 2 },
      errorFormatting: { profile: "fast", maxOutputTokens: 500, maxRetries: 2 },
      solutionSuggestion: { profile: "fast", maxOutputTokens: 700, maxRetries: 2 },
      dashboardInsights: { profile: "fast", maxOutputTokens: 400, maxRetries: 1 },
    } });
    expect(() => loadAiConfiguration({ pathValue: configPath, kind: "production", env: {} })).toThrow("OPENAI_API_KEY");
    expect(() => loadAiConfiguration({ pathValue: path.join(tempDir, "missing.json"), kind: "production", env: { OPENAI_API_KEY: "present" } }))
      .toThrow("Unable to read AI configuration");
  });

  it("rejects operation mappings without required generation fields", () => {
    writeConfig({ version: 1, profiles: { fast: { provider: "openai", model: "gpt-4.1-mini" } }, operations: {
      storedResultsAnalysis: { profile: "fast", maxRetries: 2 },
      errorFormatting: { profile: "fast", maxOutputTokens: 500 },
      solutionSuggestion: { profile: "fast", maxOutputTokens: 700, maxRetries: 2 },
      dashboardInsights: { profile: "fast", maxOutputTokens: 400, maxRetries: 1 },
    } });
    const message = (() => {
      try {
        loadAiConfiguration({ pathValue: configPath, kind: "production", env: { OPENAI_API_KEY: "present" } });
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
      return "";
    })();
    expect(message).toContain("operations.storedResultsAnalysis.maxOutputTokens");
    expect(message).toContain("operations.errorFormatting.maxRetries");
  });

  it("keeps evaluation configuration independent and checks credentials before invocation", () => {
    const evaluation = loadEvaluationAiConfiguration({ AI_CONFIG_PATH: "/does/not/exist" });
    expect(evaluation.source).toBe("evaluation-baseline");
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
      $defs: { operation: { required: string[] } };
    };
    expect(Object.keys(schema.properties).sort()).toEqual(["$schema", "operations", "profiles", "version"]);
    expect(schema.$defs.operation.required).toEqual(expect.arrayContaining(["profile", "maxOutputTokens", "maxRetries"]));
  });

  it("passes distinct operation model settings through mocked constructor options", () => {
    const loaded = {
      kind: "production" as const,
      source: "custom" as const,
      config: {
        version: 1 as const,
        profiles: {
          fast: { provider: "openai" as const, model: "gpt-4.1-mini" },
          reasoner: { provider: "openai" as const, model: "gpt-5.1", reasoning: { effort: "high" as const } },
        },
        operations: {
          storedResultsAnalysis: { profile: "reasoner", maxOutputTokens: 8000, maxRetries: 2 },
          errorFormatting: { profile: "fast", temperature: 0.7, maxOutputTokens: 500, maxRetries: 2 },
          solutionSuggestion: { profile: "fast", temperature: 0.3, maxOutputTokens: 700, maxRetries: 2 },
          dashboardInsights: { profile: "reasoner", maxOutputTokens: 1000, maxRetries: 1 },
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
