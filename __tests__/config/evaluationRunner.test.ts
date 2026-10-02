// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { jest } from "@jest/globals";
import { runEval as runStoredResultsEval } from "../../__prompts-tests__/stored-results-analysis/runners/stored-results-analysis";
import { DEFAULT_VERSION as storedVersion } from "../../__prompts-tests__/stored-results-analysis/runners/versions";
import { runEval as runErrorSolutionEval } from "../../__prompts-tests__/error-solution/runners/error-solution";
import { DEFAULT_VERSION as solutionVersion } from "../../__prompts-tests__/error-solution/runners/versions";

jest.mock("@langchain/openai", () => {
  const invokeMock = jest.fn<() => Promise<{ results: never[] }>>().mockResolvedValue({ results: [] });
  const chatOpenAIMock = jest.fn(() => ({
    withStructuredOutput: jest.fn(() => ({ invoke: invokeMock })),
  }));
  return { ChatOpenAI: chatOpenAIMock, __mocks__: { chatOpenAIMock, invokeMock } };
});

describe("prompt evaluation configuration", () => {
  const openAiMocks = jest.requireMock<{
    __mocks__: { chatOpenAIMock: jest.Mock; invokeMock: jest.Mock };
  }>("@langchain/openai");
  const chatOpenAIMock = openAiMocks.__mocks__.chatOpenAIMock;
  let tempDir: string;
  let configPath: string;
  let originalKey: string | undefined;
  let originalConfigPath: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "eval-ai-config-"));
    configPath = path.join(tempDir, "evaluation.json");
    writeFileSync(configPath, JSON.stringify({
      version: 1,
      profiles: {
        analysis: { provider: "openai", model: "gpt-4.1-mini" },
        suggestion: { provider: "openai", model: "gpt-4.1-mini" },
      },
      operations: {
        storedResultsAnalysis: { profile: "analysis", maxOutputTokens: 9000, maxRetries: 2 },
        solutionSuggestion: { profile: "suggestion", temperature: 0.6, maxOutputTokens: 900, maxRetries: 2 },
      },
    }));
    originalKey = process.env.OPENAI_API_KEY;
    originalConfigPath = process.env.AI_EVAL_CONFIG_PATH;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_EVAL_CONFIG_PATH = configPath;
    chatOpenAIMock.mockClear();
    openAiMocks.__mocks__.invokeMock.mockClear();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalConfigPath === undefined) delete process.env.AI_EVAL_CONFIG_PATH;
    else process.env.AI_EVAL_CONFIG_PATH = originalConfigPath;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("applies runner overrides over file settings and reports safe effective metadata", async () => {
    const result = await runStoredResultsEval({
      cases: [],
      version: storedVersion,
      model: "gpt-5.1",
      temperature: 0.4,
    });

    expect(chatOpenAIMock).toHaveBeenLastCalledWith({
      model: "gpt-5.1", temperature: 0.4, maxTokens: 9000, maxRetries: 2, cache: false,
    });
    expect(result.metadata).toMatchObject({
      suite: "stored-results-analysis",
      operation: "storedResultsAnalysis",
      configurationSource: "custom",
      requestedModel: "gpt-5.1",
      generationSettings: { temperature: 0.4, maxOutputTokens: 9000, maxRetries: 2, cache: false },
    });
    expect(JSON.stringify(result.metadata)).not.toContain("test-key");
    expect(JSON.stringify(result.metadata)).not.toContain("reasoning trace");
  });

  it("fails on missing credentials or an unreadable selected file before provider construction", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(runStoredResultsEval({ cases: [], version: storedVersion })).rejects.toThrow("OPENAI_API_KEY");
    expect(chatOpenAIMock).not.toHaveBeenCalled();

    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_EVAL_CONFIG_PATH = path.join(tempDir, "missing.json");
    await expect(runStoredResultsEval({ cases: [], version: storedVersion })).rejects.toThrow("Unable to read AI configuration");
    expect(chatOpenAIMock).not.toHaveBeenCalled();
  });

  it("fails on an invalid selected evaluation file before provider construction", async () => {
    writeFileSync(configPath, "{");
    await expect(runStoredResultsEval({ cases: [], version: storedVersion })).rejects.toThrow("Invalid JSON");
    expect(chatOpenAIMock).not.toHaveBeenCalled();
  });

  it.each([-1, 3, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid runner temperature override %s before constructing a provider",
    async (temperature) => {
      await expect(runStoredResultsEval({
        cases: [],
        version: storedVersion,
        temperature,
      })).rejects.toThrow("Invalid runner override temperature");
      expect(chatOpenAIMock).not.toHaveBeenCalled();
    },
  );

  it("keeps suite defaults from the evaluation file and includes configuration on success", async () => {
    const result = await runErrorSolutionEval({ cases: [], version: solutionVersion });

    expect(chatOpenAIMock).toHaveBeenLastCalledWith({
      model: "gpt-4.1-mini", temperature: 0.6, maxTokens: 900, maxRetries: 2, cache: false,
    });
    expect(result.metadata).toMatchObject({
      suite: "error-solution",
      promptVersion: solutionVersion.version,
      requestedModel: "gpt-4.1-mini",
      generationSettings: { temperature: 0.6, maxOutputTokens: 900 },
    });
  });
});
