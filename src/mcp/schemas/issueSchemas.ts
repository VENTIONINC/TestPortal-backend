import { z } from "zod";
import type { MCPToolSchema } from "@/types";
import { IssueCategory } from "@/types/enums";

/**
 * Schema for filtering and paginating issues
 */
export const getIssuesSchema: MCPToolSchema = {
  category: z.nativeEnum(IssueCategory).optional(),
  name: z.string().optional(),
  page: z.string().default("1").optional(),
  limit: z.string().default("10").optional(),
  statFrom: z.string().datetime().optional(),
  statTo: z.string().datetime().optional(),
};

/**
 * Schema for getting a specific issue by ID
 */
export const getIssueByIdSchema: MCPToolSchema = {
  issueId: z.string(),
};

/**
 * Schema for creating a new issue
 */
export const createIssueSchema: MCPToolSchema = {
  name: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
  portal: z.string().optional(),
  service: z.string().optional(),
  ticket: z.string().optional(),
  projectId: z.string().describe("The UUID of the project this issue belongs to"),
};
