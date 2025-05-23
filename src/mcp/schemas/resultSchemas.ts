import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for filtering and paginating test results
 */
export const getResultsSchema: MCPToolSchema = {
  tag: z.string().optional(),
  specId: z.string().optional(),
  specFile: z.string().optional(),
  specName: z.string().optional(),
  environment: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
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
};
