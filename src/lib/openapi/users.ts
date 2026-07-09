// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema, SuccessResponseSchema } from "./common";

const UserStatusSchema = z
  .enum(["pending", "active", "suspended"])
  .openapi("UserStatus");

const UserRoleSchema = z.enum(["admin", "member"]).openapi("UserRole");

const UserSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    status: UserStatusSchema,
    role: UserRoleSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    mcpToken: z.string().optional(),
    reportPortalUrl: z.string().nullable().optional(),
    reportPortalEnabled: z.boolean(),
    monitoringPortalUrl: z.string().nullable().optional(),
    monitoringPortalEnabled: z.boolean(),
    analyzeEnabled: z.boolean(),
  })
  .openapi("User");

const AdminManagedUserSchema = UserSchema.omit({ mcpToken: true }).openapi(
  "AdminManagedUser",
);

const AdminUserRoleUpdateRequestSchema = z
  .object({
    role: UserRoleSchema,
  })
  .openapi("AdminUserRoleUpdateRequest");

const UserUpdateRequestSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
  })
  .openapi("UserUpdateRequest");

const UserIntegrationsUpdateRequestSchema = z
  .object({
    reportPortalUrl: z.string().nullable().optional(),
    reportPortalEnabled: z.boolean().optional(),
    monitoringPortalUrl: z.string().nullable().optional(),
    monitoringPortalEnabled: z.boolean().optional(),
    analyzeEnabled: z.boolean().optional(),
  })
  .openapi("UserIntegrationsUpdateRequest");

const McpTokenResponseSchema = z
  .object({
    token: z.string(),
    expiresAt: z.string(),
    message: z.string(),
  })
  .openapi("McpTokenResponse");

export function registerUserRoutes(registry: OpenAPIRegistry) {
  registry.register("User", UserSchema);
  registry.register("AdminManagedUser", AdminManagedUserSchema);
  registry.register("UserStatus", UserStatusSchema);
  registry.register("UserRole", UserRoleSchema);
  registry.register("UserUpdateRequest", UserUpdateRequestSchema);
  registry.register(
    "UserIntegrationsUpdateRequest",
    UserIntegrationsUpdateRequestSchema,
  );
  registry.register(
    "AdminUserRoleUpdateRequest",
    AdminUserRoleUpdateRequestSchema,
  );
  registry.register("McpTokenResponse", McpTokenResponseSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/users/{userId}",
    description: "Retrieves user information by ID (requires authentication)",
    request: {
      params: z.object({
        userId: z.string().uuid(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "User details",
        content: {
          "application/json": {
            schema: UserSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Users"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/users/{userId}",
    description: "Updates user information (requires authentication)",
    request: {
      params: z.object({
        userId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UserUpdateRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "User updated successfully",
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
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Users"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/users/{userId}/integrations",
    description:
      "Updates user integration settings for Report Portal and Monitoring Portal (requires authentication)",
    request: {
      params: z.object({
        userId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UserIntegrationsUpdateRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "User integrations updated successfully",
        content: {
          "application/json": {
            schema: UserSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors or invalid URL format",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Users"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/users/{userId}/mcp-token",
    description:
      "Generates a new MCP token for the user (requires authentication)",
    request: {
      params: z.object({
        userId: z.string().uuid(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "MCP token generated successfully",
        content: {
          "application/json": {
            schema: McpTokenResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid user ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["MCP"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/users/{userId}/mcp-token",
    description: "Revokes the user's MCP token (requires authentication)",
    request: {
      params: z.object({
        userId: z.string().uuid(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "MCP token revoked successfully",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid user ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found or no MCP token to revoke",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["MCP"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/admin/users",
    description: "Lists users for administrator account management",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "User list returned successfully",
        content: {
          "application/json": {
            schema: z.array(AdminManagedUserSchema),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Forbidden - admin access required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Admin Users"],
  });

  for (const route of [
    {
      method: "post" as const,
      path: "/api/v2/admin/users/{userId}/approve",
      description: "Approves a pending user account",
    },
    {
      method: "post" as const,
      path: "/api/v2/admin/users/{userId}/suspend",
      description: "Suspends a user account",
    },
    {
      method: "post" as const,
      path: "/api/v2/admin/users/{userId}/restore",
      description: "Restores a suspended user account",
    },
  ]) {
    registry.registerPath({
      method: route.method,
      path: route.path,
      description: route.description,
      request: {
        params: z.object({
          userId: z.string().uuid(),
        }),
      },
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "User updated successfully",
          content: {
            "application/json": {
              schema: AdminManagedUserSchema,
            },
          },
        },
        400: {
          description: "Bad request - invalid transition or last-admin guardrail",
          content: {
            "application/json": {
              schema: ErrorResponseSchema,
            },
          },
        },
        401: {
          description: "Unauthorized - invalid or missing token",
          content: {
            "application/json": {
              schema: ErrorResponseSchema,
            },
          },
        },
        403: {
          description: "Forbidden - admin access required",
          content: {
            "application/json": {
              schema: ErrorResponseSchema,
            },
          },
        },
        404: {
          description: "User not found",
          content: {
            "application/json": {
              schema: ErrorResponseSchema,
            },
          },
        },
      },
      tags: ["Admin Users"],
    });
  }

  registry.registerPath({
    method: "patch",
    path: "/api/v2/admin/users/{userId}/role",
    description: "Changes a user's application role",
    request: {
      params: z.object({
        userId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: AdminUserRoleUpdateRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "User role updated successfully",
        content: {
            "application/json": {
              schema: AdminManagedUserSchema,
            },
          },
        },
      400: {
        description: "Bad request - invalid role or last-admin guardrail",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Forbidden - admin access required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Admin Users"],
  });
}

export {
  UserStatusSchema,
  UserRoleSchema,
  UserSchema,
  UserUpdateRequestSchema,
  UserIntegrationsUpdateRequestSchema,
  AdminUserRoleUpdateRequestSchema,
  McpTokenResponseSchema,
};
