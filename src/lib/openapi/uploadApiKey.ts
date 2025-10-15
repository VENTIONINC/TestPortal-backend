import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

// Schema for UploadApiKey entity
const UploadApiKeySchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    projectName: z.string(),
    apiKey: z.string().describe("Hashed API key value"),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("UploadApiKey");

// Schema for API key generation response (includes the plain text key)
const GenerateApiKeyResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
      id: z.string().uuid(),
      projectId: z.string().uuid(),
      apiKey: z.string().describe("Plain text API key - only shown once at generation"),
      createdAt: z.string(),
    }),
  })
  .openapi("GenerateApiKeyResponse");

// Schema for listing API keys response
const ListApiKeysResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.array(UploadApiKeySchema),
  })
  .openapi("ListApiKeysResponse");

// Schema for revoke API key response
const RevokeApiKeyResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
  })
  .openapi("RevokeApiKeyResponse");

// Extended error response with details field
const DetailedErrorResponseSchema = z
  .object({
    error: z.string(),
    details: z.string().optional(),
  })
  .openapi("DetailedErrorResponse");

export function registerUploadApiKeyRoutes(registry: OpenAPIRegistry) {
  registry.register("UploadApiKey", UploadApiKeySchema);
  registry.register("GenerateApiKeyResponse", GenerateApiKeyResponseSchema);
  registry.register("ListApiKeysResponse", ListApiKeysResponseSchema);
  registry.register("RevokeApiKeyResponse", RevokeApiKeyResponseSchema);
  registry.register("DetailedErrorResponse", DetailedErrorResponseSchema);

  // POST /api/v2/upload/generate-key
  registry.registerPath({
    method: "post",
    path: "/api/v2/upload/generate-key",
    description:
      "Generate a new API key for a project. The API key is returned in plain text only once - it must be saved securely. Requires JWT authentication.",
    request: {
      query: z.object({
        projectId: z.string().uuid().describe("The UUID of the project to generate an API key for"),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description:
          "API key generated successfully. The plain text key is returned - save it securely as it will not be shown again.",
        content: {
          "application/json": {
            schema: GenerateApiKeyResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - project ID is missing or invalid",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - user not authenticated",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Forbidden - user does not have permission to generate API keys for this project",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - failed to generate API key",
        content: {
          "application/json": {
            schema: DetailedErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Upload API Keys"],
  });

  // GET /api/v2/upload/keys
  registry.registerPath({
    method: "get",
    path: "/api/v2/upload/keys",
    description:
      "List all API keys for the authenticated user. Returns metadata about API keys but not the actual key values. Requires JWT authentication.",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of API keys for the authenticated user",
        content: {
          "application/json": {
            schema: ListApiKeysResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - user not authenticated",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - failed to list API keys",
        content: {
          "application/json": {
            schema: DetailedErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Upload API Keys"],
  });

  // DELETE /api/v2/upload/keys/:id
  registry.registerPath({
    method: "delete",
    path: "/api/v2/upload/keys/{id}",
    description:
      "Revoke an API key by setting isActive to false. The key will no longer be valid for authentication. Requires JWT authentication and ownership of the key.",
    request: {
      params: z.object({
        id: z.string().uuid().describe("The UUID of the API key to revoke"),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "API key revoked successfully",
        content: {
          "application/json": {
            schema: RevokeApiKeyResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - API key ID is missing or invalid",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - user not authenticated",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Forbidden - user does not have permission to revoke this API key",
        content: {
          "application/json": {
            schema: DetailedErrorResponseSchema,
          },
        },
      },
      404: {
        description: "API key not found",
        content: {
          "application/json": {
            schema: DetailedErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - failed to revoke API key",
        content: {
          "application/json": {
            schema: DetailedErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Upload API Keys"],
  });
}

export {
  UploadApiKeySchema,
  GenerateApiKeyResponseSchema,
  ListApiKeysResponseSchema,
  RevokeApiKeyResponseSchema,
  DetailedErrorResponseSchema,
};
