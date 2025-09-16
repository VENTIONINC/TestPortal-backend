import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

export function registerComponents(registry: OpenAPIRegistry): void {
  registry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "JWT Bearer token authentication",
  });

  registry.registerComponent("securitySchemes", "McpBearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "MCP Bearer token authentication",
  });
}

export const McpSessionHeaderParam = z.string().openapi({
  param: {
    name: "mcp-session-id",
    in: "header",
  },
  description: "MCP session ID",
  example: "session_12345",
});
