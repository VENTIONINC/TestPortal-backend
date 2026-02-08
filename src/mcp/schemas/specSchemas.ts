import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for getting a specific spec by ID
 */
export const getSpecByIdSchema: MCPToolSchema = {
  specId: z.string(),
  projectId: z.string(),
};

/**
 * Schema for deleting a spec
 */
export const deleteSpecSchema: MCPToolSchema = {
  specId: z.string(),
  projectId: z.string(),
};
