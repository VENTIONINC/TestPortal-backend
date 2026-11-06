// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpProjectHandler } from "@/handlers/mcpProjectHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import type { MCPToolResponse } from "@/types";

export const getAvailableProjects = createMcpTool(
  "get-available-projects",
  "List all active projects available to project-scoped tools. Use a returned project id with other project-scoped tools.",
  {},
  async (_params: Record<string, never>): Promise<MCPToolResponse> => {
    const projects = await mcpProjectHandler.getAvailableProjects();
    return createSuccessResponse(projects);
  },
  "fetching available projects",
);
