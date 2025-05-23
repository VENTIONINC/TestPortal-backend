import { mcpSpecHandler } from "../../handlers/mcpSpecHandler.js";
import { createSuccessResponse, createMcpTool } from "../helpers/mcpHelpers.js";
import { getSpecByIdSchema } from "../schemas/specSchemas.js";

export const getSpecById = createMcpTool(
  "get-spec-by-id",
  "Retrieve detailed information about a specific spec by its unique ID, including parsed tags and annotations",
  getSpecByIdSchema,
  async (params) => {
    const { specId } = params;
    const spec = await mcpSpecHandler.getSpecById(specId);
    return createSuccessResponse(spec);
  },
  "fetching spec",
);
