import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for creating a new assumption
 */
export const createAssumptionSchema: MCPToolSchema = {
  issueId: z.string().describe("UUID of the issue"),
  resultErrorId: z.string().describe("UUID of the result error"),
  madeBy: z.string().optional(),
  isConfirmed: z.boolean().optional(),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  evidence: z.string().optional(),
};

/**
 * Schema for updating an assumption
 */
export const updateAssumptionSchema: MCPToolSchema = {
  assumptionId: z.string().describe("UUID of the assumption"),
  madeBy: z.string(),
  isConfirmed: z.boolean().optional(),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  evidence: z.string().optional(),
};

/**
 * Schema for getting a specific assumption by ID
 */
export const getAssumptionByIdSchema: MCPToolSchema = {
  assumptionId: z.string().describe("UUID of the assumption"),
  projectId: z.string().describe("UUID of the project"),
};
