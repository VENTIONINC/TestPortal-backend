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
    .optional()
    .describe("Failure category (only for failed tests)"),
  confidence: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe("Confidence level of the analysis"),
  workerIndex: z.number().describe("Worker index"),
  conclusion: z
    .string()
    .optional()
    .describe(
      "Brief explanation (2-3 sentences max) for the categorization decision, only for failed tests",
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
  workerIndex: number;
  conclusion?: string;
}

/**
 * Type inferred from Zod schema for validation
 */
export type TestAnalysisResponse = z.infer<typeof testAnalysisSchema>;
