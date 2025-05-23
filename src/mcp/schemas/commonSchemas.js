/**
 * Common schemas used across multiple MCP tools
 */

/**
 * Empty schema for endpoints that don't require parameters
 */
export const emptySchema = {};

/**
 * Common pagination schema components
 */
export const paginationParams = {
  page: { type: "number", default: 1 },
  limit: { type: "number", default: 30 },
};
