// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpResultHandler } from "@/handlers/mcpResultHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  getResultsSchema,
  getResultByIdSchema,
  getResultsStatsSchema,
} from "@/mcp/schemas/resultSchemas";
import type {
  GetResultsParams,
  GetResultsStatsParams,
  MCPToolResponse,
} from "@/types";

interface GetResultByIdParams {
  resultId: string;
  projectId: string;
}

export const getResults = createMcpTool(
  "get-results",
  "Retrieve test execution results with comprehensive filtering options for analysis, reporting, and debugging",
  getResultsSchema,
  async (params: GetResultsParams): Promise<MCPToolResponse> => {
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
    const { resultId, projectId } = params;
    const result = await mcpResultHandler.getResultById(resultId, projectId);
    return createSuccessResponse(result);
  },
  "fetching result",
);

export const getResultsStats = createMcpTool(
  "get-results-stats",
  "Retrieve statistical analysis of test results including status counts, entity counts, and top errors/issues for specified dates",
  getResultsStatsSchema,
  async (params: GetResultsStatsParams): Promise<MCPToolResponse> => {
    const stats = await mcpResultHandler.getResultsStats(params);
    return createSuccessResponse(stats);
  },
  "fetching results statistics",
);

