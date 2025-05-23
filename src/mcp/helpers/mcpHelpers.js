/**
 * Helper functions for MCP tools to standardize responses and error handling
 */

/**
 * Creates a successful MCP response with JSON content
 * @param {any} data - The data to return
 * @param {string} message - Optional success message
 * @returns {Object} MCP response object
 */
export const createSuccessResponse = (data, message = null) => {
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
 * @param {string} operation - The operation that failed (e.g., "fetching issues")
 * @param {Error|string} error - The error object or message
 * @returns {Object} MCP error response object
 */
export const createErrorResponse = (operation, error) => {
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
 * @param {Function} handler - The async handler function
 * @param {string} operation - Description of the operation for error messages
 * @returns {Function} Wrapped handler function
 */
export const withErrorHandling = (handler, operation) => {
  return async (params) => {
    try {
      return await handler(params);
    } catch (error) {
      return createErrorResponse(operation, error);
    }
  };
};

/**
 * Creates a standard MCP tool definition with error handling
 * @param {string} name - Tool name
 * @param {string} description - Tool description
 * @param {Object} schema - Zod schema object
 * @param {Function} handler - Tool handler function
 * @param {string} operation - Operation description for errors
 * @returns {Array} MCP tool definition array
 */
export const createMcpTool = (
  name,
  description,
  schema,
  handler,
  operation,
) => {
  return [name, description, schema, withErrorHandling(handler, operation)];
};
