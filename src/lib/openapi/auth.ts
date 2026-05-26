import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";
import { UserSchema } from "./users";

const AuthProviderSchema = z.enum(["local", "cognito"]).openapi("AuthProvider");

const AuthConfigSchema = z
  .object({
    provider: AuthProviderSchema,
    capabilities: z.object({
      passwordLogin: z.boolean(),
      passwordSignup: z.boolean(),
      requiresRedirectLogin: z.boolean(),
      supportsNewPasswordChallenge: z.boolean(),
    }),
  })
  .openapi("AuthConfig");

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
    newPassword: z.string().optional(),
  })
  .openapi("UserLoginRequest");

const AuthChallengeResponseSchema = z
  .object({
    status: z.literal("NEW_PASSWORD_REQUIRED"),
    message: z.string(),
  })
  .openapi("AuthChallengeResponse");

const UserLoginResponseSchema = z
  .object({
    user: UserSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
    cognitoSession: z.unknown().optional(),
  })
  .openapi("UserLoginResponse");

const RefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string(),
  })
  .openapi("RefreshTokenRequest");

export function registerAuthRoutes(registry: OpenAPIRegistry) {
  registry.register("AuthProvider", AuthProviderSchema);
  registry.register("AuthConfig", AuthConfigSchema);
  registry.register("UserSignupRequest", UserSignupRequestSchema);
  registry.register("UserLoginRequest", UserLoginRequestSchema);
  registry.register("AuthChallengeResponse", AuthChallengeResponseSchema);
  registry.register("UserLoginResponse", UserLoginResponseSchema);
  registry.register("RefreshTokenRequest", RefreshTokenRequestSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/auth/config",
    description:
      "Returns the active authentication provider and capability flags for rendering the login experience",
    responses: {
      200: {
        description: "Auth provider configuration",
        content: {
          "application/json": {
            schema: AuthConfigSchema,
          },
        },
      },
    },
    tags: ["Authentication"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/auth/signup",
    description:
      "Creates a user account through the active authentication provider",
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
            schema: z.object({
              user: UserSchema,
              message: z.string().optional(),
            }),
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
    path: "/api/v2/auth/login",
    description:
      "Authenticates credentials with the active provider and returns internal JWT tokens or an auth challenge",
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
        description: "Login successful or challenge required",
        content: {
          "application/json": {
            schema: z.union([
              UserLoginResponseSchema,
              AuthChallengeResponseSchema,
            ]),
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
    path: "/api/v2/auth/refresh-token",
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

  registry.registerPath({
    method: "post",
    path: "/api/v2/auth/logout",
    description: "Signs out from the active authentication provider",
    responses: {
      200: {
        description: "Logout completed",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string(),
            }),
          },
        },
      },
      400: {
        description: "Bad request - logout failed",
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
  AuthProviderSchema,
  AuthConfigSchema,
  UserSignupRequestSchema,
  UserLoginRequestSchema,
  AuthChallengeResponseSchema,
  UserLoginResponseSchema,
  RefreshTokenRequestSchema,
};
