import { mcpExecutionHandler } from "@/handlers/mcpExecutionHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  getExecutionByIdSchema,
  deleteExecutionSchema,
} from "@/mcp/schemas/executionSchemas";
import type { MCPToolResponse } from "@/types";

interface GetExecutionByIdParams {
  executionId: string;
  projectId: string;
}

interface DeleteExecutionParams {
  executionId: string;
  projectId: string;
}

export const getExecutionById = createMcpTool(
  "get-execution-by-id",
  "Retrieve detailed information about a specific execution by its unique ID",
  getExecutionByIdSchema,
  async (params: GetExecutionByIdParams): Promise<MCPToolResponse> => {
    const { executionId, projectId } = params;
    const execution = await mcpExecutionHandler.getExecutionById(executionId, projectId);
    return createSuccessResponse(execution);
  },
  "fetching execution",
);

export const deleteExecution = createMcpTool(
  "delete-execution",
  "Delete an execution by ID",
  deleteExecutionSchema,
  async (params: DeleteExecutionParams): Promise<MCPToolResponse> => {
    const { executionId, projectId } = params;
    await mcpExecutionHandler.deleteExecution(executionId, projectId);
    return createSuccessResponse(
      { executionId, projectId },
      "Execution deleted successfully:",
    );
  },
  "deleting execution",
);
