// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpSpecHandler } from "@/handlers/mcpSpecHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  getSpecByIdSchema,
  listSpecsSchema,
  type ListSpecsActionInput,
} from "@/mcp/schemas/specSchemas";
import type { MCPToolResponse } from "@/types";

interface GetSpecByIdParams {
  specId: string;
  projectId: string;
}

export const listSpecs = createMcpTool(
  "list-specs",
  "Discover project automated Specs by key, title or file, including Specs without Results.",
  listSpecsSchema,
  async (params: ListSpecsActionInput): Promise<MCPToolResponse> =>
    createSuccessResponse(await mcpSpecHandler.listSpecs(params)),
  "listing Specs",
);

export const getSpecById = createMcpTool(
  "get-spec-by-id",
  "Retrieve detailed information about a specific spec by its unique ID, including normalized tags",
  getSpecByIdSchema,
  async (params: GetSpecByIdParams): Promise<MCPToolResponse> => {
    const { specId, projectId } = params;
    const spec = await mcpSpecHandler.getSpecById(specId, projectId);
    return createSuccessResponse(spec);
  },
  "fetching spec",
);
