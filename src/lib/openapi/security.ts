import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

export function registerSecuritySchemes(registry: OpenAPIRegistry) {
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
