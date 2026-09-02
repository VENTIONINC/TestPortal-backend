// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Central export point for all Zod schemas and types
 * This provides a single import point for schema-related functionality
 */

// Error Formatter schemas and types
export {
  contextCategorySchema,
  errorFormatterRequestSchema,
  errorFormatterSchema,
  type ErrorFormatterInput,
  type ErrorFormatterOutput,
} from "./errorFormatterSchemas";

// Error suggestion schemas and types
export {
  errorSuggestionSchema,
  type ErrorSuggestionOutput,
} from "./errorSuggestionSchemas";

// Test Analysis schemas and types
export {
  testResultSchema,
  testAnalysisSchema,
  type TestResultAnalysis,
  type TestAnalysisResponse,
} from "./testAnalysisSchemas";

export { pdfExportSchema, type PdfExportInput } from "./reportExportSchemas";

export {
  testScenarioEvidenceParamsSchema,
  testScenarioEvidenceQuerySchema,
  testScenarioSpecLinkBodySchema,
  testScenarioSpecLinkDeleteParamsSchema,
  testScenarioSpecLinkListQuerySchema,
  testScenarioSpecLinkParamsSchema,
  testScenarioSpecLinkQuerySchema,
  type TestScenarioEvidenceParams,
  type TestScenarioEvidenceQuery,
  type TestScenarioSpecLinkBody,
  type TestScenarioSpecLinkDeleteParams,
  type TestScenarioSpecLinkListQuery,
  type TestScenarioSpecLinkParams,
  type TestScenarioSpecLinkQuery,
} from "./testScenarioIntegrationSchemas";
