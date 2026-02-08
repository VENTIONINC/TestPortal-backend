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

jest.mock("@/handlers/mcpProjectHandler", () => ({
  mcpProjectHandler: {
    deleteProject: jest.fn(),
  },
}));

import { deleteProject } from "@/mcp/tools/projects";
import { mcpProjectHandler } from "@/handlers/mcpProjectHandler";

const mockedProjectHandler = mcpProjectHandler as jest.Mocked<
  typeof mcpProjectHandler
>;

describe("MCP project contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("delete-project", () => {
    it("requires projectId", () => {
      const [, , schema] = deleteProject;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(zodSchema.safeParse({ projectId: "proj-1" }).success).toBe(true);
      expect(zodSchema.safeParse({}).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = deleteProject;
      const payload = { projectId: "proj-1" };
      const deleted = {
        id: "proj-1",
        name: "Project",
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        isActive: true,
        ownerId: "user-1",
      };
      mockedProjectHandler.deleteProject.mockResolvedValue(deleted);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(normalizeJson(deleted));
      expect(mcpProjectHandler.deleteProject).toHaveBeenCalledWith(
        payload.projectId,
      );
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = deleteProject;
      const payload = { projectId: "proj-1" };
      mockedProjectHandler.deleteProject.mockRejectedValue(
        new Error("Project not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(response, "deleting project", "Project not found");
    });
  });
});
