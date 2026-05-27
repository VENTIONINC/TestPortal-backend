// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

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

  registry.registerComponent("securitySchemes", "ApiKeyAuth", {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: "API key authentication for upload endpoints. Generate keys via /api/v2/upload/generate-key",
  });
}
