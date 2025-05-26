import { mcpResultHandler } from "@/handlers/mcpResultHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  getResultsSchema,
  getResultByIdSchema,
} from "@/mcp/schemas/resultSchemas";
import type { GetResultsParams, MCPToolResponse } from "@/types";

interface GetResultByIdParams {
  resultId: string;
}

export const getResults = createMcpTool(
  "get-results",
  "Retrieve test execution results with comprehensive filtering options for analysis, reporting, and debugging",
  getResultsSchema,
  async (params: GetResultsParams = {}): Promise<MCPToolResponse> => {
    const results = await mcpResultHandler.getResults(params);
    return createSuccessResponse(results);
  },
  "fetching results",
);

export const getResultById = createMcpTool(
  "get-result-by-id",
  "Retrieve complete details for a specific test result including error information, call stacks, and execution data",
  getResultByIdSchema,
  async (params: GetResultByIdParams): Promise<MCPToolResponse> => {
    const { resultId } = params;
    const result = await mcpResultHandler.getResultById(resultId);
    return createSuccessResponse(result);
  },
  "fetching result",
);
