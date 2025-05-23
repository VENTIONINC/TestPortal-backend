import { mcpExecutionHandler } from "../../handlers/mcpExecutionHandler.js";
import { createSuccessResponse, createMcpTool } from "../helpers/mcpHelpers.js";
import { getExecutionByIdSchema } from "../schemas/executionSchemas.js";

export const getExecutionById = createMcpTool(
  "get-execution-by-id",
  "Retrieve detailed information about a specific execution by its unique ID",
  getExecutionByIdSchema,
  async (params) => {
    const { executionId } = params;
    const execution = await mcpExecutionHandler.getExecutionById(executionId);
    return createSuccessResponse(execution);
  },
  "fetching execution",
);
