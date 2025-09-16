import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import * as Schemas from "../schemas";

export function registerMcpTokenPaths(registry: OpenAPIRegistry): void {
  // MCP Token routes
  registry.registerPath({
    method: "post",
    path: "/api/v1/mcp/token",
    description: "Generate MCP access token (requires authentication)",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Token generated",
        content: {
          "application/json": {
            schema: Schemas.McpTokenResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["MCP"],
  });
}
