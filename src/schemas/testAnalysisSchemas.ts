import { z } from "zod";

/**
 * Base schema shared between all prompt versions
 * Contains fields common to all test result analyses
 */
const base = z.object({
  id: z.string(),
  status: z.enum(["failed", "flaky"]),
  category: z.enum(["bug", "infra", "performance", "script", "other"]),
  confidence: z.number().int().min(1).max(5),
  conclusion: z.string(),
});

// =============================================================================
// v1.0.0 Schema (Historical Baseline)
// =============================================================================

/**
 * v1.0.0: errorQuality fields can be null (for non-failed tests)
 * OpenAI structured output requires nullable() instead of optional()
 * This preserves the v1.0.0 behavior while being API-compatible
 */
export const testResultSchemaV1_0_0 = base.extend({
  errorQuality: z.number().int().min(1).max(5).nullable(),
  errorQualityConclusion: z.string().nullable(),
});

export const testAnalysisSchemaV1_0_0 = z.object({
  results: z.array(testResultSchemaV1_0_0),
});

export type TestResultAnalysisV1_0_0 = z.infer<typeof testResultSchemaV1_0_0>;
export type TestAnalysisResponseV1_0_0 = z.infer<
  typeof testAnalysisSchemaV1_0_0
>;

// =============================================================================
// v1.1.0 Schema (Current)
// =============================================================================

/**
 * v1.1.0: errorQuality fields always present (null for flaky, values for failed)
 * Uses discriminated union to enforce strict type safety based on status
 */
export const testResultSchemaV1_1_0 = z.discriminatedUnion("status", [
  base.extend({
    status: z.literal("failed"),
    errorQuality: z.number().int().min(1).max(5).nullable(),
    errorQualityConclusion: z.string().nullable(),
  }),
  base.extend({
    status: z.literal("flaky"),
    errorQuality: z.null(),
    errorQualityConclusion: z.null(),
  }),
]);

export const testAnalysisSchemaV1_1_0 = z.object({
  results: z.array(testResultSchemaV1_1_0),
});

export type TestResultAnalysisV1_1_0 = z.infer<typeof testResultSchemaV1_1_0>;
export type TestAnalysisResponseV1_1_0 = z.infer<
  typeof testAnalysisSchemaV1_1_0
>;

// =============================================================================
// Backward Compatibility Exports
// =============================================================================

/**
 * Default exports maintain backward compatibility with existing code
 * These point to v1.1.0 schemas (current production version)
 */
export const testResultSchema = testResultSchemaV1_1_0;
export const testAnalysisSchema = testAnalysisSchemaV1_1_0;
export type TestResultAnalysis = TestResultAnalysisV1_1_0;
export type TestAnalysisResponse = TestAnalysisResponseV1_1_0;
