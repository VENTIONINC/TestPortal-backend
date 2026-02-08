import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { MCPToolResponse } from "@/types";
import {
  buildSchema,
  defaultContext,
  expectErrorResponse,
  normalizeJson,
  parseResponseJson,
  type ZodShape,
} from "@/test-utils/mcpContractTestUtils";

jest.mock("@/handlers/mcpIssueHandler", () => ({
  mcpIssueHandler: {
    getAllIssues: jest.fn(),
    getIssueById: jest.fn(),
    deleteIssue: jest.fn(),
  },
}));

import { getIssues, getIssueById, deleteIssue } from "@/mcp/tools/issues";
import { mcpIssueHandler } from "@/handlers/mcpIssueHandler";

const mockedIssueHandler = mcpIssueHandler as jest.Mocked<
  typeof mcpIssueHandler
>;

describe("MCP issue contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("get-issues", () => {
    it("requires projectId", () => {
      const [, , schema] = getIssues;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(zodSchema.safeParse({ projectId: "proj-1" }).success).toBe(true);
      expect(zodSchema.safeParse({}).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = getIssues;
      const payload = { projectId: "proj-1" };
      const issue = {
        id: "issue-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Issue",
        category: "bug",
        projectId: "proj-1",
      };
      const issues = { issues: [issue], total: 1, page: 1, totalPages: 1 };
      mockedIssueHandler.getAllIssues.mockResolvedValue(issues);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(normalizeJson(issues));
      expect(mcpIssueHandler.getAllIssues).toHaveBeenCalledWith(payload);
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = getIssues;
      const payload = { projectId: "proj-1" };
      mockedIssueHandler.getAllIssues.mockRejectedValue(
        new Error("Project not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(response, "fetching issues", "Project not found");
    });
  });

  describe("get-issue-by-id", () => {
    it("requires issueId and projectId", () => {
      const [, , schema] = getIssueById;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(
        zodSchema.safeParse({ issueId: "issue-1", projectId: "proj-1" })
          .success,
      ).toBe(true);
      expect(zodSchema.safeParse({ issueId: "issue-1" }).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = getIssueById;
      const payload = { issueId: "issue-1", projectId: "proj-1" };
      const issue = {
        id: "issue-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Issue",
        category: "bug",
        projectId: "proj-1",
      };
      mockedIssueHandler.getIssueById.mockResolvedValue(issue);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(normalizeJson(issue));
      expect(mcpIssueHandler.getIssueById).toHaveBeenCalledWith(
        payload.issueId,
        payload.projectId,
      );
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = getIssueById;
      const payload = { issueId: "issue-1", projectId: "proj-1" };
      mockedIssueHandler.getIssueById.mockRejectedValue(
        new Error("Issue not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(response, "fetching issue", "Issue not found");
    });
  });

  describe("delete-issue", () => {
    it("requires issueId and projectId", () => {
      const [, , schema] = deleteIssue;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(
        zodSchema.safeParse({ issueId: "issue-1", projectId: "proj-1" })
          .success,
      ).toBe(true);
      expect(zodSchema.safeParse({ issueId: "issue-1" }).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = deleteIssue;
      const payload = { issueId: "issue-1", projectId: "proj-1" };
      const deleted = {
        id: "issue-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Issue",
        category: "bug",
        projectId: "proj-1",
      };
      mockedIssueHandler.deleteIssue.mockResolvedValue(deleted);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(normalizeJson(deleted));
      expect(mcpIssueHandler.deleteIssue).toHaveBeenCalledWith(
        payload.issueId,
        payload.projectId,
      );
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = deleteIssue;
      const payload = { issueId: "issue-1", projectId: "proj-1" };
      mockedIssueHandler.deleteIssue.mockRejectedValue(
        new Error("Issue not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(response, "deleting issue", "Issue not found");
    });
  });
});
