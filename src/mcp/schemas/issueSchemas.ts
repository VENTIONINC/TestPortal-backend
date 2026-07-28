// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for filtering and paginating issues
 */
export const getIssuesSchema: MCPToolSchema = {
  projectId: z
    .string()
    .describe("The UUID of the project to filter issues by (required)"),
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
  issueId: z.string().describe("The UUID of the issue to retrieve"),
  projectId: z
    .string()
    .describe("The UUID of the project this issue belongs to (required)"),
};

/**
 * Schema for creating a new issue
 */
export const createIssueSchema: MCPToolSchema = {
  name: z.string(),
  description: z.string().optional(),
  portal: z.string().optional(),
  service: z.string().optional(),
  ticket: z.string().optional(),
  projectId: z.string().describe("The UUID of the project this issue belongs to"),
};
