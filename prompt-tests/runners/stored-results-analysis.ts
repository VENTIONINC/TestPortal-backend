/**
 * Prompt evaluation runner for stored results analysis
 * Invokes LLM with structured output and validates expectations
 */

import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { testAnalysisSchema } from "@/schemas/testAnalysisSchemas";
import { getStoredResultsAnalysisPrompt } from "@/prompts/stored-results-analysis/v1.1.0";
import type { TestCase } from "../templates/types";
import type { EvalResult, EvalFailure } from "./types";

/**
 * Configuration options for running prompt evaluation
 */
export interface RunEvalOptions {
  cases: TestCase[];
  model?: string;
  temperature?: number;
}

/**
 * Run prompt evaluation on test cases
 * @param options - Configuration with test cases and optional LLM settings
 * @returns Evaluation result with LLM response and validation failures
 */
export async function runEval(
  options: RunEvalOptions,
): Promise<EvalResult> {
  const {
    cases,
    model = "gpt-4.1-mini",
    temperature = 0.1,
  } = options;

  // Prepare prompt and input
  const systemPrompt = getStoredResultsAnalysisPrompt(cases.length);
  const userPrompt = JSON.stringify(cases.map((c) => c.input));

  // Setup LLM with structured output
  const llm = new ChatOpenAI({
    model,
    temperature,
    maxTokens: 4000,
    maxRetries: 2,
  });

  const structuredModel = llm.withStructuredOutput<
    z.infer<typeof testAnalysisSchema>
  >(testAnalysisSchema, { name: "test_analysis" });

  // Invoke LLM
  const response = await structuredModel.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  // Contract validation: Response length must match input length
  if (response.results.length !== cases.length) {
    throw new Error(
      `Contract violation: Expected ${cases.length} results, got ${response.results.length}`,
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
      // For failed tests, errorQuality fields must be non-null
      if (out.status !== "failed") {
        failures.push({
          testCaseName: tc.name,
          reason: `Expected failed status for required errorQuality`,
        });
      }
      if (out.errorQuality == null || out.errorQualityConclusion == null) {
        failures.push({
          testCaseName: tc.name,
          reason: `Expected non-null errorQuality fields for failed test, got null`,
        });
      }
    } else {
      // For flaky tests (errorQuality: "null"), fields must be null
      if (out.errorQuality !== null || out.errorQualityConclusion !== null) {
        failures.push({
          testCaseName: tc.name,
          reason: `Expected null errorQuality fields for flaky test, got non-null values`,
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
        reason: `Conclusion too short or empty: length=${out.conclusion?.length || 0}`,
      });
    }
  }

  return { response, failures };
}
