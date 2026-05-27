// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { mcpExecutionHandler } from "@/handlers/mcpExecutionHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import { getExecutionByIdSchema } from "@/mcp/schemas/executionSchemas";
import type { MCPToolResponse } from "@/types";

interface GetExecutionByIdParams {
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
