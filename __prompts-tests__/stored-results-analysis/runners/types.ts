// Copyright 2026 Vention
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
}
