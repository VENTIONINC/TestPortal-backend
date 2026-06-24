// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Type definitions for prompt testing framework
 * Matches the structure expected by testAnalysisService
 */

/**
 * Test status for analysis (subset of full status types)
 */
export type StatusForAnalysis = "failed" | "flaky";

/**
 * Test failure categories
 */
export type Category = "bug" | "infra" | "performance" | "script" | "other";

/**
 * Test input structure matching prompt expectations
 * Based on the format used by testAnalysisService.analyzeStoredResults()
 */
export interface TestInput {
  id: string;
  specKey: string;
  specTitle: string;
  status: StatusForAnalysis;
  duration: number;
  retry: number;
  executionName: string;
  errorMessage?: string;
  errorStack?: string | null;
  errorLocation?: string | null;
}

/**
 * Expected outcomes for a test case
 */
export interface Expectations {
  category: Category;
  status: StatusForAnalysis;
  errorQuality: "required" | "null";
  confidenceMin?: number;
  confidenceMax?: number;
}

/**
 * Complete test case definition
 */
export interface TestCase {
  name: string;
  tags?: string[];
  input: TestInput;
  expect: Expectations;
}
