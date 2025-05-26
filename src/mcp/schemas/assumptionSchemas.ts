import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for creating a new assumption
 */
export const createAssumptionSchema: MCPToolSchema = {
  issueId: z.number(),
  resultErrorId: z.number(),
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
  assumptionId: z.string(),
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
  assumptionId: z.string(),
};
