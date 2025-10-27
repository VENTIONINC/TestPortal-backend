import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for assigning an issue to a result error
 */
export const assignIssueSchema: MCPToolSchema = {
  resultErrorId: z.string().describe("UUID of the result error"),
  assumptionId: z.string().describe("UUID of the assumption"),
};

/**
 * Schema for reviewing a result error
 */
export const reviewErrorSchema: MCPToolSchema = {
  resultErrorId: z.string(),
};

/**
 * Schema for bulk reviewing multiple result errors
 */
export const bulkReviewSchema: MCPToolSchema = {
  errorIds: z.array(z.number()),
};

/**
 * Schema for getting a specific result error by ID
 */
export const getResultErrorByIdSchema: MCPToolSchema = {
  resultErrorId: z.string(),
  projectId: z.string(),
};
