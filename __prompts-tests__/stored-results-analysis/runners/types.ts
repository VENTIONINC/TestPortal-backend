// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Type definitions for prompt evaluation runner
 */

import type { TestAnalysisResponse } from "@/schemas/testAnalysisSchemas";
import type { AiOperationConfig } from "@/config/aiConfigSchema";
import type { EvaluationTokenUsage } from "./evaluation-report";

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
  model: string;
  settings: AiOperationConfig & { maxRetries: number; sdkMaxRetries: 0 };
  connection: "openai" | "custom";
  returnedModels: string[];
  mode: "baseline" | "comparison";
  overrides: Partial<AiOperationConfig>;
  requestCount: number;
  durationMs: number;
  usage: EvaluationTokenUsage | null;
}
