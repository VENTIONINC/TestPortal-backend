import { z } from "zod";

/**
 * Schema for filtering and paginating issues
 */
export const getIssuesSchema = {
  category: z.string().optional(),
  name: z.string().optional(),
  page: z.number().default(1).optional(),
  limit: z.number().default(30).optional(),
};

/**
 * Schema for getting a specific issue by ID
 */
export const getIssueByIdSchema = {
  issueId: z.string(),
};

/**
 * Schema for creating a new issue
 */
export const createIssueSchema = {
  name: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
  portal: z.string().optional(),
  service: z.string().optional(),
  ticket: z.string().optional(),
};
