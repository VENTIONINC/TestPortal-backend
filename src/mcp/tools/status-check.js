import { createSuccessResponse, createMcpTool } from "../helpers/mcpHelpers.js";
import { emptySchema } from "../schemas/commonSchemas.js";

export const statusCheck = createMcpTool(
  "check-status",
  "Check the operational status and health of the test portal server",
  emptySchema,
  async () => {
    // TODO: Add actual health checks (database connectivity, etc.)
    const statusData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "test-portal-server",
    };

    return createSuccessResponse(statusData);
  },
  "checking status",
);
