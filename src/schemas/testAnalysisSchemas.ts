import { z } from "zod";

/**
 * Zod schema for individual test result analysis
 * Used by LangChain for structured output validation
 */
const base = z.object({
  id: z.string(),
  status: z.enum(["failed", "flaky"]),
  category: z.enum(["bug", "infra", "performance", "script", "other"]),
  confidence: z.number().int().min(1).max(5),
  conclusion: z.string(),
});

export const testResultSchema = z.discriminatedUnion("status", [
  base.extend({
    status: z.literal("failed"),
    errorQuality: z.number().int().min(1).max(5),
    errorQualityConclusion: z.string(),
  }),
  base.extend({
    status: z.literal("flaky"),
    errorQuality: z.null(),
    errorQualityConclusion: z.null(),
  }),
]);

/**
 * Zod schema for complete test analysis response
 * Contains array of test result analyses
 */
export const testAnalysisSchema = z.object({
  results: z.array(testResultSchema),
});

export type TestResultAnalysis = z.infer<typeof testResultSchema>;

/**
 * Type inferred from Zod schema for validation
 */
export type TestAnalysisResponse = z.infer<typeof testAnalysisSchema>;
