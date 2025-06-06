import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import { emptySchema } from "@/mcp/schemas/commonSchemas";
import type { MCPToolResponse } from "@/types";

interface TimeData {
  date: string;
  timestamp: string;
}

export const currentTime = createMcpTool(
  "current-time",
  "Return the current date and time in ISO 8601 format",
  emptySchema,
  async (): Promise<MCPToolResponse> => {
    const now = new Date();
    const data: TimeData = {
      date: now.toISOString().substring(0, 10),
      timestamp: now.toISOString(),
    };
    return createSuccessResponse(data);
  },
  "getting current time",
);
