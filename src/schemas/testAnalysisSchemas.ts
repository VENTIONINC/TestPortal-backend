import { z } from "zod";

/**
 * Zod schema for individual test result analysis
 * Used by LangChain for structured output validation
 */
export const testResultSchema = z.object({
  id: z.string().describe("Test identifier extracted from test data"),
  status: z.enum(["passed", "failed"]).describe("Test execution status"),
  category: z
    .enum(["bug", "infra", "performance", "script", "other"])
    .describe("Failure category (only for failed tests)"),
  confidence: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("Confidence level of the analysis (1-5 scale)"),
  conclusion: z
    .string()
    .describe(
      "Brief explanation (2-3 sentences max) for the categorization decision, only for failed tests",
    ),
  errorQuality: z
    .number()
    .int()
    .min(1)
    .max(5)
    .nullable()
    .describe(
      "Error description quality rating (1-5 scale, only for failed tests)",
    ),
  errorQualityConclusion: z
    .string()
    .nullable()
    .describe(
      "Brief explanation for the error quality rating (only for failed tests)",
    ),
});

/**
 * Zod schema for complete test analysis response
 * Contains array of test result analyses
 */
export const testAnalysisSchema = z.object({
  results: z.array(testResultSchema),
});

/**
 * TypeScript interface for test result analysis
 * Used throughout the application for type safety
 */
export interface TestResultAnalysis {
  id: string;
  status: "passed" | "failed";
  category?: "bug" | "infra" | "performance" | "script" | "other";
  confidence: number;
  conclusion?: string;
  errorQuality: number | null;
  errorQualityConclusion: string | null;
}

/**
 * Type inferred from Zod schema for validation
 */
export type TestAnalysisResponse = z.infer<typeof testAnalysisSchema>;
