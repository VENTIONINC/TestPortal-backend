import { mcpIssueHandler } from "../../handlers/mcpIssueHandler.js";
import { createSuccessResponse, createMcpTool } from "../helpers/mcpHelpers.js";
import {
  getIssuesSchema,
  getIssueByIdSchema,
  createIssueSchema,
} from "../schemas/issueSchemas.js";
import { emptySchema } from "../schemas/commonSchemas.js";

export const getIssues = createMcpTool(
  "get-issues",
  "Retrieve issues with optional filtering by category, name, with pagination support",
  getIssuesSchema,
  async (params = {}) => {
    const issues = await mcpIssueHandler.getAllIssues(params);
    return createSuccessResponse(issues);
  },
  "fetching issues",
);

export const getIssueById = createMcpTool(
  "get-issue-by-id",
  "Retrieve detailed information about a specific issue by its unique ID",
  getIssueByIdSchema,
  async (params) => {
    const { issueId } = params;
    const issue = await mcpIssueHandler.getIssueById(issueId);
    return createSuccessResponse(issue);
  },
  "fetching issue",
);

export const createIssue = createMcpTool(
  "create-issue",
  "Create a new issue with name (required) and optional category, description, portal, service, and ticket information",
  createIssueSchema,
  async (params) => {
    const issue = await mcpIssueHandler.createIssue(params);
    return createSuccessResponse(issue, "Issue created successfully:");
  },
  "creating issue",
);

export const getMockIssues = createMcpTool(
  "get-mock-issues",
  "Get mock issues for testing and demonstration purposes",
  emptySchema,
  async () => {
    const issues = await mcpIssueHandler.getMockIssues();
    return createSuccessResponse(issues);
  },
  "fetching mock issues",
);
