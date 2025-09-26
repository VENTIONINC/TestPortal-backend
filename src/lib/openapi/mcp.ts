import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const McpSessionHeaderParam = z.string().openapi({
  param: {
    name: "mcp-session-id",
    in: "header",
  },
  description: "MCP session ID",
  example: "session_12345",
});

export function registerMcpRoutes(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: "post",
    path: "/api/v1/mcp",
    description:
      "MCP server endpoint for tool execution (requires MCP Bearer token)",
    request: {
      headers: [McpSessionHeaderParam.optional()],
      body: {
        content: {
          "application/json": {
            schema: z.any().describe("MCP JSON-RPC request"),
          },
        },
      },
    },
    security: [{ McpBearerAuth: [] }],
    responses: {
      200: {
        description: "MCP response",
        content: {
          "application/json": {
            schema: z.any().describe("MCP JSON-RPC response"),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing MCP token",
        content: {
          "application/json": {
            schema: z.object({
              jsonrpc: z.string(),
              error: z.object({
                code: z.number(),
                message: z.string(),
              }),
              id: z.any().nullable(),
            }),
          },
        },
      },
      400: {
        description: "Bad request - invalid session or request format",
        content: {
          "application/json": {
            schema: z.object({
              jsonrpc: z.string(),
              error: z.object({
                code: z.number(),
                message: z.string(),
              }),
              id: z.any().nullable(),
            }),
          },
        },
      },
    },
    tags: ["MCP"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/mcp",
    description: "MCP session management endpoint (requires MCP Bearer token)",
    request: {
      headers: [McpSessionHeaderParam],
    },
    security: [{ McpBearerAuth: [] }],
    responses: {
      200: {
        description: "MCP session response",
        content: {
          "application/json": {
            schema: z.any().describe("MCP session data"),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing MCP token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid or missing session ID",
        content: {
          "text/plain": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["MCP"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/mcp",
    description: "MCP session cleanup endpoint (requires MCP Bearer token)",
    request: {
      headers: [McpSessionHeaderParam],
    },
    security: [{ McpBearerAuth: [] }],
    responses: {
      200: {
        description: "Session cleanup successful",
        content: {
          "application/json": {
            schema: z.any().describe("MCP cleanup response"),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing MCP token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid or missing session ID",
        content: {
          "text/plain": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["MCP"],
  });
}

export { McpSessionHeaderParam };
