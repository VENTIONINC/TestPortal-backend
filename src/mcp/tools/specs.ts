// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { mcpSpecHandler } from "@/handlers/mcpSpecHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import { getSpecByIdSchema } from "@/mcp/schemas/specSchemas";
import type { MCPToolResponse } from "@/types";

interface GetSpecByIdParams {
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
