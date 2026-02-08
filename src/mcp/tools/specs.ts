import { mcpSpecHandler } from "@/handlers/mcpSpecHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import { getSpecByIdSchema, deleteSpecSchema } from "@/mcp/schemas/specSchemas";
import type { MCPToolResponse } from "@/types";

interface GetSpecByIdParams {
  specId: string;
  projectId: string;
}

interface DeleteSpecParams {
  specId: string;
  projectId: string;
}

export const getSpecById = createMcpTool(
  "get-spec-by-id",
  "Retrieve detailed information about a specific spec by its unique ID, including parsed tags and annotations",
  getSpecByIdSchema,
  async (params: GetSpecByIdParams): Promise<MCPToolResponse> => {
    const { specId, projectId } = params;
    const spec = await mcpSpecHandler.getSpecById(specId, projectId);
    return createSuccessResponse(spec);
  },
  "fetching spec",
);

export const deleteSpec = createMcpTool(
  "delete-spec",
  "Delete a spec by ID",
  deleteSpecSchema,
  async (params: DeleteSpecParams): Promise<MCPToolResponse> => {
    const { specId, projectId } = params;
    await mcpSpecHandler.deleteSpec(specId, projectId);
    return createSuccessResponse({ specId, projectId }, "Spec deleted successfully:");
  },
  "deleting spec",
);
