// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Type definitions for prompt evaluation runner
 */

import type { TestAnalysisResponse } from "@/schemas/testAnalysisSchemas";

/**
 * Represents a single validation failure
 */
export interface EvalFailure {
  testCaseName: string;
  reason: string;
}

/**
 * Result of prompt evaluation
 */
export interface EvalResult {
  response: TestAnalysisResponse;
  failures: EvalFailure[];
  metadata: EvalMetadata;
}

export interface EvalMetadata {
  suite: string;
  operation: string;
  promptVersion: string;
  configurationVersion: 1;
  configurationSource: "evaluation-baseline" | "custom";
  profile: string;
  provider: "openai";
  requestedModel: string;
  reasoning?: { effort: "none" | "low" | "medium" | "high" };
  generationSettings: {
    temperature?: number;
    maxOutputTokens: number;
    maxRetries: number;
    timeoutMs?: number;
    cache?: false;
  };
}
