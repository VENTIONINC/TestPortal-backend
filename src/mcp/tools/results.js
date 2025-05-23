import { mcpResultHandler } from "../../handlers/mcpResultHandler.js";
import { createSuccessResponse, createMcpTool } from "../helpers/mcpHelpers.js";
import {
  getResultsSchema,
  getResultByIdSchema,
} from "../schemas/resultSchemas.js";

export const getResults = createMcpTool(
  "get-results",
  "Retrieve test execution results with comprehensive filtering options for analysis, reporting, and debugging",
  getResultsSchema,
  async (params = {}) => {
    const results = await mcpResultHandler.getResults(params);
    return createSuccessResponse(results);
  },
  "fetching results",
);

export const getResultById = createMcpTool(
  "get-result-by-id",
  "Retrieve complete details for a specific test result including error information, call stacks, and execution data",
  getResultByIdSchema,
  async (params) => {
    const { resultId } = params;
    const result = await mcpResultHandler.getResultById(resultId);
    return createSuccessResponse(result);
  },
  "fetching result",
);
