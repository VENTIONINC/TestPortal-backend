// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpIssueHandler } from "@/handlers/mcpIssueHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  getIssuesSchema,
  getIssueByIdSchema,
  createIssueSchema,
} from "@/mcp/schemas/issueSchemas";
import type { MCPToolResponse, ResultCategory } from "@/types";

interface GetIssuesParams {
  projectId: string;
  category?: ResultCategory;
  name?: string;
  page?: number;
  limit?: number;
  statFrom?: string;
  statTo?: string;
}

interface GetIssueByIdParams {
  issueId: string;
  projectId: string;
}

interface CreateIssueParams {
  name: string;
  category: ResultCategory;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  projectId: string;
}

export const getIssues = createMcpTool(
  "get-issues",
  "Retrieve issues with persisted category and optional category/name filtering, pagination, and linked-result category summaries. Requires projectId.",
  getIssuesSchema,
  async (params: GetIssuesParams): Promise<MCPToolResponse> => {
    const issues = await mcpIssueHandler.getAllIssues(params);
    return createSuccessResponse(issues);
  },
  "fetching issues",
);

export const getIssuesWithStats = createMcpTool(
  "get-issues-with-stats",
  "Retrieve issues with persisted category, statistics, and linked-result category summaries. Optional category and statFrom/statTo filters are supported. Requires projectId.",
  getIssuesSchema,
  async (params: GetIssuesParams): Promise<MCPToolResponse> => {
    const issues = await mcpIssueHandler.getAllIssuesWithStats(params);
    return createSuccessResponse(issues);
  },
  "fetching issues with statistics",
);

export const getIssueById = createMcpTool(
  "get-issue-by-id",
  "Retrieve an issue with its persisted category and linked-result category summary. Requires projectId.",
  getIssueByIdSchema,
  async (params: GetIssueByIdParams): Promise<MCPToolResponse> => {
    const { issueId, projectId } = params;
    const issue = await mcpIssueHandler.getIssueById(issueId, projectId);
    return createSuccessResponse(issue);
  },
  "fetching issue",
);

export const createIssue = createMcpTool(
  "create-issue",
  "Create a new issue with required name and lowercase category, plus optional description, portal, service, and ticket information.",
  createIssueSchema,
  async (params: CreateIssueParams): Promise<MCPToolResponse> => {
    const issue = await mcpIssueHandler.createIssue(params);
    return createSuccessResponse(issue, "Issue created successfully:");
  },
  "creating issue",
);
