/**
 * Type definitions for error solution prompt tests
 */

export interface ErrorSolutionInput {
  errorMessage: string;
  errorStack: string;
  errorLocation: string;
  analysisCategory: string;
  analysisConfidence: number | string;
  analysisConclusion: string;
  errorQuality: number | string;
  errorQualityConclusion: string;
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
