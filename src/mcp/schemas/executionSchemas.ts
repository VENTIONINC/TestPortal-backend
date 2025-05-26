import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for getting a specific execution by ID
 */
export const getExecutionByIdSchema: MCPToolSchema = {
  executionId: z.string(),
};
