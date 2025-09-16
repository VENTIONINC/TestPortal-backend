import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import * as Schemas from "../schemas";

export function registerErrorFormatterPaths(registry: OpenAPIRegistry): void {
  // Error Formatter routes
  registry.registerPath({
    method: "post",
    path: "/api/v1/error-formatter",
    description: "Formats error messages",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.ErrorFormatterRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Error formatted",
        content: {
          "application/json": {
            schema: Schemas.ErrorFormatterResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Error Formatter"],
  });
}
