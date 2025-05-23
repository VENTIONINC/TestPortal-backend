import { z } from "zod";

/**
 * Schema for getting a specific execution by ID
 */
export const getExecutionByIdSchema = {
  executionId: z.string(),
};
