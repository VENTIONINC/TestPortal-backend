import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import * as Schemas from "../schemas";

export function registerUserPaths(registry: OpenAPIRegistry): void {
  // User routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/users/me",
    description: "Get current user",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Current user",
        content: {
          "application/json": {
            schema: Schemas.UserSchema,
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
    tags: ["Users"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/users/me",
    description: "Update current user",
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.UserUpdateRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "User updated",
        content: {
          "application/json": {
            schema: Schemas.UserSchema,
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
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Users"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/users/me/integrations",
    description: "Update current user's integrations",
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.UserIntegrationsUpdateRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Integrations updated",
        content: {
          "application/json": {
            schema: Schemas.UserSchema,
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
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Users"],
  });
}
