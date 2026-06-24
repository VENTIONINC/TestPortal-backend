// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import { emptySchema } from "@/mcp/schemas/commonSchemas";
import type { MCPToolResponse } from "@/types";

interface StatusData {
  status: string;
  timestamp: string;
  service: string;
}

export const statusCheck = createMcpTool(
  "check-status",
  "Check the operational status and health of the test portal server",
  emptySchema,
  async (): Promise<MCPToolResponse> => {
    // TODO: Add actual health checks (database connectivity, etc.)
    const statusData: StatusData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "test-portal-server",
    };

    return createSuccessResponse(statusData);
  },
  "checking status",
);
