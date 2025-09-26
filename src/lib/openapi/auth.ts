import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";
import { UserSchema } from "./users";

const UserSignupRequestSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    password: z.string(),
  })
  .openapi("UserSignupRequest");

const UserLoginRequestSchema = z
  .object({
    email: z.string(),
    password: z.string(),
  })
  .openapi("UserLoginRequest");

const UserLoginResponseSchema = z
  .object({
    user: UserSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .openapi("UserLoginResponse");

const RefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string(),
  })
  .openapi("RefreshTokenRequest");

export function registerAuthRoutes(registry: OpenAPIRegistry) {
  registry.register("UserSignupRequest", UserSignupRequestSchema);
  registry.register("UserLoginRequest", UserLoginRequestSchema);
  registry.register("UserLoginResponse", UserLoginResponseSchema);
  registry.register("RefreshTokenRequest", RefreshTokenRequestSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v2/users/signup",
    description: "Creates a new user account with secure password hashing",
    request: {
      body: {
        content: {
          "application/json": {
            schema: UserSignupRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "User created successfully",
        content: {
          "application/json": {
            schema: UserSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Authentication"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/users/login",
    description: "Authenticates user credentials and returns JWT tokens",
    request: {
      body: {
        content: {
          "application/json": {
            schema: UserLoginRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description:
          "Login successful - returns user data, access token, and refresh token",
        content: {
          "application/json": {
            schema: UserLoginResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid credentials",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Authentication"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/users/refresh-token",
    description: "Refreshes access token using a valid refresh token",
    request: {
      body: {
        content: {
          "application/json": {
            schema: RefreshTokenRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description:
          "Token refresh successful - returns new access and refresh tokens",
        content: {
          "application/json": {
            schema: UserLoginResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - refresh token is required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or expired refresh token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Authentication"],
  });
}

export {
  UserSignupRequestSchema,
  UserLoginRequestSchema,
  UserLoginResponseSchema,
  RefreshTokenRequestSchema,
};
