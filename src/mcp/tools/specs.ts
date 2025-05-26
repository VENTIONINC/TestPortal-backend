import { mcpSpecHandler } from "@/handlers/mcpSpecHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import { getSpecByIdSchema } from "@/mcp/schemas/specSchemas";
import type { MCPToolResponse } from "@/types";

interface GetSpecByIdParams {
  specId: string;
}

export const getSpecById = createMcpTool(
  "get-spec-by-id",
  "Retrieve detailed information about a specific spec by its unique ID, including parsed tags and annotations",
  getSpecByIdSchema,
  async (params: GetSpecByIdParams): Promise<MCPToolResponse> => {
    const { specId } = params;
    const spec = await mcpSpecHandler.getSpecById(specId);
    return createSuccessResponse(spec);
  },
  "fetching spec",
);
