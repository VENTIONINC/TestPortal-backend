/**
 * Helper functions for MCP tools to standardize responses and error handling
 */

import type { MCPToolResponse, MCPToolHandler, MCPToolSchema } from "@/types";

/**
 * Creates a successful MCP response with JSON content
 */
export const createSuccessResponse = (
  data: unknown,
  message: string | null = null,
): MCPToolResponse => {
  const content = message
    ? `${message}\n\n${JSON.stringify(data, null, 2)}`
    : JSON.stringify(data, null, 2);

  return {
    content: [
      {
        type: "text",
        text: content,
      },
    ],
  };
};

/**
 * Creates an error MCP response
 */
export const createErrorResponse = (
  operation: string,
  error: Error | string,
): MCPToolResponse => {
  const errorMessage = error instanceof Error ? error.message : error;

  return {
    content: [
      {
        type: "text",
        text: `Error ${operation}: ${errorMessage}`,
      },
    ],
    isError: true,
  };
};

/**
 * Wraps an async MCP tool handler with standard error handling
 */
export const withErrorHandling = <TInput = unknown>(
  handler: (params: TInput) => Promise<MCPToolResponse>,
  operation: string,
): MCPToolHandler<TInput> => {
  return async (params: TInput): Promise<MCPToolResponse> => {
    try {
      return await handler(params);
    } catch (error) {
      return createErrorResponse(operation, error as Error);
    }
  };
};

/**
 * Creates a standard MCP tool definition with error handling
 */
export const createMcpTool = <TInput = unknown>(
  name: string,
  description: string,
  schema: MCPToolSchema,
  handler: (params: TInput) => Promise<MCPToolResponse>,
  operation: string,
): [string, string, MCPToolSchema, MCPToolHandler<TInput>] => {
  return [name, description, schema, withErrorHandling(handler, operation)];
};
