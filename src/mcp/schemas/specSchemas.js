import { z } from "zod";

/**
 * Schema for getting a specific spec by ID
 */
export const getSpecByIdSchema = {
  specId: z.string(),
};
