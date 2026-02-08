import { mcpIssueHandler } from "@/handlers/mcpIssueHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  getIssuesSchema,
  getIssueByIdSchema,
  createIssueSchema,
  updateIssueSchema,
  deleteIssueSchema,
} from "@/mcp/schemas/issueSchemas";
import type { MCPToolResponse } from "@/types";
import { IssueCategory } from "@/types/enums";

interface GetIssuesParams {
  projectId: string;
  category?: IssueCategory;
  name?: string;
  page?: number;
  limit?: number;
}

interface GetIssueByIdParams {
  issueId: string;
  projectId: string;
}

interface CreateIssueParams {
  name: string;
  category: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  projectId: string;
}

interface UpdateIssueParams {
  issueId: string;
  name?: string;
  category?: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
}

interface DeleteIssueParams {
  issueId: string;
  projectId: string;
}

export const getIssues = createMcpTool(
  "get-issues",
  "Retrieve issues with optional filtering by category, name, with pagination support. Requires projectId parameter.",
  getIssuesSchema,
  async (params: GetIssuesParams): Promise<MCPToolResponse> => {
    const issues = await mcpIssueHandler.getAllIssues(params);
    return createSuccessResponse(issues);
  },
  "fetching issues",
);

export const getIssuesWithStats = createMcpTool(
  "get-issues-with-stats",
  "Retrieve issues with their statistics including occurrence count, first/last occurrence, and impacted tests count. Requires projectId parameter.",
  getIssuesSchema,
  async (params: GetIssuesParams): Promise<MCPToolResponse> => {
    const issues = await mcpIssueHandler.getAllIssuesWithStats(params);
    return createSuccessResponse(issues);
  },
  "fetching issues with statistics",
);

export const getIssueById = createMcpTool(
  "get-issue-by-id",
  "Retrieve detailed information about a specific issue by its unique ID. Requires projectId parameter.",
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
  "Create a new issue with name (required) and optional category, description, portal, service, and ticket information",
  createIssueSchema,
  async (params: CreateIssueParams, context): Promise<MCPToolResponse> => {
    if (!context?.mcpUserId) {
      throw new Error("MCP user ID is required");
    }

    const issue = await mcpIssueHandler.createIssue({
      ...params,
      createdById: context.mcpUserId,
      updatedById: context.mcpUserId,
    });
    return createSuccessResponse(issue, "Issue created successfully:");
  },
  "creating issue",
);

export const updateIssue = createMcpTool(
  "update-issue",
  "Update an existing issue by ID with optional fields like name, category, description, portal, service, and ticket",
  updateIssueSchema,
  async (params: UpdateIssueParams, context): Promise<MCPToolResponse> => {
    if (!context?.mcpUserId) {
      throw new Error("MCP user ID is required");
    }

    const { issueId, ...updateData } = params;
    const issue = await mcpIssueHandler.updateIssue(issueId, {
      ...updateData,
      updatedById: context.mcpUserId,
    });
    return createSuccessResponse(issue, "Issue updated successfully:");
  },
  "updating issue",
);

export const deleteIssue = createMcpTool(
  "delete-issue",
  "Delete an issue by ID and remove all associated assumptions",
  deleteIssueSchema,
  async (params: DeleteIssueParams): Promise<MCPToolResponse> => {
    const { issueId, projectId } = params;
    const issue = await mcpIssueHandler.deleteIssue(issueId, projectId);
    return createSuccessResponse(issue, "Issue deleted successfully:");
  },
  "deleting issue",
);
