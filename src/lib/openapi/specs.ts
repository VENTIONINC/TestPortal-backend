// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const SpecSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    custom_id: z.string().optional(),
    file: z.string().optional(),
    tags: z.array(z.string()).optional(),
    annotations: z.array(z.string()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Spec");

export function registerSpecRoutes(registry: OpenAPIRegistry) {
  registry.register("Spec", SpecSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/specs/{specId}",
    description: "Retrieves a specific spec by its ID (requires projectId)",
    request: {
      params: z.object({
        specId: z.string().uuid(),
      }),
      query: z.object({
        projectId: z.string().uuid().describe("Project ID to verify ownership of the spec"),
      }),
    },
    responses: {
      200: {
        description: "Spec details",
        content: {
          "application/json": {
            schema: SpecSchema,
          },
        },
      },
      400: {
        description: "Bad Request - Invalid spec ID format",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - Authentication required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Forbidden - Insufficient permissions",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Spec not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    tags: ["Specs"],
  });

  // V2 Delete Spec Route
  registry.registerPath({
    method: "delete",
    path: "/api/v2/specs/{specId}",
    description: "Delete a specific spec by its ID (requires projectId and authentication)",
    request: {
      params: z.object({
        specId: z.string().uuid().openapi({
          description: "Unique identifier of the spec to delete",
        }),
      }),
      query: z.object({
        projectId: z.string().uuid().describe("Project ID to verify ownership of the spec"),
      }),
    },
    responses: {
      204: {
        description: "Successfully deleted spec",
      },
      400: {
        description: "Bad Request - Invalid spec ID format or missing projectId",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - Authentication required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Forbidden - Insufficient permissions",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Spec not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    tags: ["Specs"],
  });
}

export { SpecSchema };
