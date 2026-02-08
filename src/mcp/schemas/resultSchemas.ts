import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for filtering and paginating test results
 */
export const getResultsSchema: MCPToolSchema = {
  projectId: z.string(),
  tag: z.string().optional(),
  specId: z.string().optional(),
  specFile: z.string().optional(),
  specName: z.string().optional(),
  environment: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  reviewStatus: z.string().optional(),
  errorMessage: z.string().optional(),
  issueName: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().default(1).optional(),
  limit: z.number().default(1000).optional(),
};

/**
 * Schema for getting a specific result by ID
 */
export const getResultByIdSchema: MCPToolSchema = {
  resultId: z.string(),
  projectId: z.string(),
};

/**
 * Schema for getting results statistics
 */
export const getResultsStatsSchema: MCPToolSchema = {
  projectId: z.string(),
  dates: z.array(z.string()).optional(),
};

/**
 * Schema for updating result analysis
 */
export const updateResultAnalysisSchema: MCPToolSchema = {
  resultId: z.string(),
  analysisStatus: z.string().optional(),
  analysisCategory: z
    .enum(["bug", "infra", "performance", "script", "other"])
    .optional(),
  analysisConfidence: z.number().min(0).max(1).optional(),
  analysisConclusion: z.string().optional(),
};

/**
 * Schema for updating result analysis feedback
 */
export const updateResultAnalysisFeedbackSchema: MCPToolSchema = {
  resultId: z.string(),
  analysisFeedbackCategory: z
    .enum(["bug", "infra", "performance", "script", "other"])
    .optional(),
  analysisFeedbackConfidence: z.number().min(0).max(1).optional(),
  analysisFeedbackConclusion: z.string().optional(),
};

/**
 * Schema for deleting a result
 */
export const deleteResultSchema: MCPToolSchema = {
  resultId: z.string(),
  projectId: z.string(),
};

