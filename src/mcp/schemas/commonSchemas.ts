/**
 * Common schemas used across multiple MCP tools
 */

import type { MCPToolSchema } from "@/types";

/**
 * Empty schema for tools that don't require parameters
 */
export const emptySchema: MCPToolSchema = {};

/**
 * Common pagination schema components
 */
export const paginationParams: MCPToolSchema = {
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 30 },
};
