// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Prompt evaluation runner for stored results analysis
 * Invokes LLM with structured output and validates expectations
 */

import { z } from "zod";
import {
  initializeAiConfig,
  type AiConfigSnapshot,
} from "@/config/aiConfig";
import type { AiOperationConfig } from "@/config/aiConfigSchema";
import {
  createGenerativeAiClient,
  parseStructuredCompletion,
  safeModelIdentifier,
} from "@/lib/generativeAi";
import { createUsageCollector, sumTokenUsage } from "../../helpers/evaluation";
import type { TestAnalysisResponse } from "@/schemas/testAnalysisSchemas";
import type { TestCase } from "../v1.1.0/templates/types";
import type { EvalResult, EvalFailure } from "./types";

/**
 * Prompt version configuration
 * Specifies which prompt and schema to use for evaluation
 */
export interface PromptVersion {
  version: string;
  getPrompt: (testResultsLength: number) => string;
  schema: z.ZodType<TestAnalysisResponse>;
}

/**
 * Configuration options for running prompt evaluation
 */
export interface RunEvalOptions {
  cases: TestCase[];
  version: PromptVersion;
  /** Legacy comparison controls. Baseline runs omit these and resolve runtime settings. */
  model?: string;
  temperature?: number;
  batchSize?: number;
  reasoningEffort?: AiOperationConfig["reasoningEffort"];
  useResponsesApi?: boolean;
  settingsOverride?: Partial<AiOperationConfig>;
  /** Synthetic transport tests may supply an isolated in-memory snapshot. */
  snapshot?: AiConfigSnapshot;
}

/**
 * Run prompt evaluation on test cases
 * @param options - Configuration with test cases and optional LLM settings
 * @returns Evaluation result with LLM response and validation failures
 */
export async function runEval(options: RunEvalOptions): Promise<EvalResult> {
  const supportedOptions = new Set([
    "cases",
    "version",
    "model",
    "temperature",
    "batchSize",
    "reasoningEffort",
    "useResponsesApi",
    "settingsOverride",
    "snapshot",
  ]);
  const unsupportedOptions = Object.keys(options).filter(
    (key) => !supportedOptions.has(key),
  );
  if (unsupportedOptions.length > 0) {
    throw new Error(
      `Unsupported evaluation option(s): ${unsupportedOptions.join(", ")}. Use model, api, temperature, maxOutputTokens, or reasoningEffort overrides; retry policy is fixed.`,
    );
  }
  if (
    options.temperature !== undefined &&
    options.reasoningEffort !== undefined
  ) {
    throw new Error(
      "Conflicting evaluation settings: temperature and reasoningEffort cannot be combined.",
    );
  }
  const {
    cases,
    version,
    batchSize = 25,
    model,
    temperature,
    reasoningEffort,
    useResponsesApi,
    settingsOverride,
    snapshot: suppliedSnapshot,
  } = options;
  const startedAt = Date.now();
  const legacyOverrides: Partial<AiOperationConfig> = {
    ...(model !== undefined ? { model } : {}),
    ...(temperature !== undefined
      ? { temperature, reasoningEffort: undefined }
      : {}),
    ...(reasoningEffort !== undefined
      ? { reasoningEffort, temperature: undefined }
      : {}),
    ...(useResponsesApi !== undefined
      ? { api: useResponsesApi ? "responses" : "chat-completions" }
      : {}),
  };
  for (const [key, value] of Object.entries(legacyOverrides)) {
    if (
      settingsOverride &&
      key in settingsOverride &&
      settingsOverride[key as keyof AiOperationConfig] !== value
    ) {
      throw new Error(
        `Conflicting evaluation settings for ${key}; pass one explicit value.`,
      );
    }
  }
  const overrides = { ...legacyOverrides, ...settingsOverride };
  const snapshot = suppliedSnapshot ?? (await initializeAiConfig());
  const client = createGenerativeAiClient("classification", snapshot, overrides);
  const { usageEntries, callbacks } = createUsageCollector();

  const structuredModel = client.model.withStructuredOutput<TestAnalysisResponse>(
    version.schema,
    {
      name: "test_analysis",
      includeRaw: true,
    },
  );

  const batches: TestCase[][] = [];
  for (let index = 0; index < cases.length; index += batchSize) {
    batches.push(cases.slice(index, index + batchSize));
  }

  const batchResponses = await Promise.all(
    batches.map(async (batch) => {
      const result = await structuredModel.invoke([
        { role: "system", content: version.getPrompt(batch.length) },
        { role: "user", content: JSON.stringify(batch.map((c) => c.input)) },
      ], { callbacks });
      const response = parseStructuredCompletion(
        client,
        result,
        version.schema,
      );

      if (response.results.length !== batch.length) {
        throw new Error(
          `Contract violation (${version.version}): Expected ${batch.length} results, got ${response.results.length}`,
        );
      }

      return {
        response,
        returnedModel:
          typeof result.raw === "object" && result.raw !== null &&
          "response_metadata" in result.raw &&
          typeof result.raw.response_metadata === "object" &&
          result.raw.response_metadata !== null &&
          "model" in result.raw.response_metadata &&
          safeModelIdentifier(result.raw.response_metadata.model),
      };
    }),
  );
  const response: TestAnalysisResponse = {
    results: batchResponses.flatMap((batch) => batch.response.results),
  };
  const usage = sumTokenUsage(usageEntries);
  const returnedModels = Array.from(
    new Set(
      batchResponses
        .map((batch) => batch.returnedModel)
        .filter((model): model is string => model !== undefined),
    ),
  );

  // Contract validation: Combined response length must match input length
  if (response.results.length !== cases.length) {
    throw new Error(
      `Contract violation (${version.version}): Expected ${cases.length} results, got ${response.results.length}`,
    );
  }

  // Build map for quick lookup by ID
  const byId = new Map(response.results.map((r) => [r.id, r]));
  const failures: EvalFailure[] = [];

  // Validate expectations for each test case
  for (const tc of cases) {
    const out = byId.get(tc.input.id);

    // Check if result exists
    if (!out) {
      failures.push({
        testCaseName: tc.name,
        reason: `Missing output for id=${tc.input.id}`,
      });
      continue;
    }

    // Validate: Status must be preserved from input
    if (out.status !== tc.input.status) {
      failures.push({
        testCaseName: tc.name,
        reason: `Status mismatch: expected ${tc.input.status}, got ${out.status}`,
      });
    }

    // Validate: Category must match expected
    if (out.category !== tc.expect.category) {
      failures.push({
        testCaseName: tc.name,
        reason: `Category mismatch: expected ${tc.expect.category}, got ${out.category}`,
      });
    }

    // Validate: errorQuality rules based on test status
    if (tc.expect.errorQuality === "required") {
      // For failed tests, errorQuality fields must be present/non-null
      if (out.status !== "failed") {
        failures.push({
          testCaseName: tc.name,
          reason: `Expected failed status for required errorQuality`,
        });
      }

      // Validation for errorQuality fields
      if (out.errorQuality === null || out.errorQualityConclusion === null) {
        failures.push({
          testCaseName: tc.name,
          reason: `Expected non-null errorQuality fields for failed test (${version.version}), got null`,
        });
      }
    } else {
      // For flaky tests (errorQuality: "null"), fields must be null
      if (out.errorQuality !== null || out.errorQualityConclusion !== null) {
        failures.push({
          testCaseName: tc.name,
          reason: `Expected null errorQuality fields for flaky test (${version.version}), got non-null values`,
        });
      }
    }

    // Validate: Confidence must be within expected range
    if (
      tc.expect.confidenceMin != null &&
      out.confidence < tc.expect.confidenceMin
    ) {
      failures.push({
        testCaseName: tc.name,
        reason: `Confidence too low: expected >=${tc.expect.confidenceMin}, got ${out.confidence}`,
      });
    }
    if (
      tc.expect.confidenceMax != null &&
      out.confidence > tc.expect.confidenceMax
    ) {
      failures.push({
        testCaseName: tc.name,
        reason: `Confidence too high: expected <=${tc.expect.confidenceMax}, got ${out.confidence}`,
      });
    }

    // Validate: Conclusion must be meaningful (not empty/too short)
    if (
      typeof out.conclusion !== "string" ||
      out.conclusion.trim().length < 20
    ) {
      failures.push({
        testCaseName: tc.name,
        reason: `Conclusion too short or empty: length=${out.conclusion?.length ?? 0}`,
      });
    }
  }

  return {
    response,
    failures,
    model: client.requestedModel,
    settings: client.effectiveSettings,
    connection: client.connection,
    returnedModels,
    mode: Object.keys(overrides).length > 0 ? "comparison" : "baseline",
    overrides,
    requestCount: batches.length,
    durationMs: Date.now() - startedAt,
    usage,
  };
}
