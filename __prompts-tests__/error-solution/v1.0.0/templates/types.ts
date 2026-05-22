// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

/**
 * Type definitions for error solution prompt tests
 */

export interface ErrorSolutionInput {
  errorMessage: string;
  errorStack: string;
  errorLocation: string;
  analysisCategory: string;
}

export interface Expectations {
  minLength: number;
  minSteps: number;
  requireStepsHeading?: boolean;
}

export interface TestCase {
  name: string;
  tags?: string[];
  input: ErrorSolutionInput;
  expect: Expectations;
}
