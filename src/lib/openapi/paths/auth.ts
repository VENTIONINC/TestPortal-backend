import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import * as Schemas from "../schemas";

export function registerAuthPaths(registry: OpenAPIRegistry): void {
  // Authentication routes
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/signup",
    description: "User signup",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.UserSignupRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "User created successfully",
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
    },
    tags: ["Authentication"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/login",
    description: "User login",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.UserLoginRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Login successful",
        content: {
          "application/json": {
            schema: Schemas.UserLoginResponseSchema,
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
    tags: ["Authentication"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/refresh-token",
    description: "Refresh access token",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.RefreshTokenRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Token refreshed successfully",
        content: {
          "application/json": {
            schema: Schemas.UserLoginResponseSchema,
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
    tags: ["Authentication"],
  });
}
