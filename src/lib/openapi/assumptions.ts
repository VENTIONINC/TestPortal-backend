// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const AssumptionSchema = z
  .object({
    id: z.string().uuid(),
    issueId: z.string().uuid(),
    resultErrorId: z.string().uuid(),
    madeBy: z.string().optional(),
    isConfirmed: z.boolean().optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Assumption");

const CreateAssumptionRequestSchema = z
  .object({
    issueId: z.string().uuid(),
    resultErrorId: z.string().uuid(),
    madeBy: z.string().optional(),
    isConfirmed: z.boolean().optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.string().optional(),
    score: z.number().optional(),
  })
  .openapi("CreateAssumptionRequest");

const UpdateAssumptionRequestSchema = z
  .object({
    madeBy: z.string().optional(),
    isConfirmed: z.boolean().optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.string().optional(),
  })
  .openapi("UpdateAssumptionRequest");

export function registerAssumptionRoutes(registry: OpenAPIRegistry) {
  registry.register("Assumption", AssumptionSchema);
  registry.register("CreateAssumptionRequest", CreateAssumptionRequestSchema);
  registry.register("UpdateAssumptionRequest", UpdateAssumptionRequestSchema);

  // V2 Create Assumption Route
  registry.registerPath({
    method: "post",
    path: "/api/v2/assumptions",
    description: "Create a new assumption for a specific issue and result error (requires authentication)",
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateAssumptionRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Successfully created assumption",
        content: {
          "application/json": {
            schema: AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request validation error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions"],
  });

  // V2 Update Assumption Route
  registry.registerPath({
    method: "patch",
    path: "/api/v2/assumptions/{assumptionId}",
    description: "Update an existing assumption by its ID (requires authentication)",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        assumptionId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateAssumptionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Successfully updated assumption",
        content: {
          "application/json": {
            schema: AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request validation error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Assumption not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions"],
  });

  // V2 Get Assumption by ID Route
  registry.registerPath({
    method: "get",
    path: "/api/v2/assumptions/{assumptionId}",
    description: "Retrieve an existing assumption by its ID (requires projectId)",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        assumptionId: z.string().uuid(),
      }),
      query: z.object({
        projectId: z.string().uuid().describe("Project ID to verify ownership of the assumption"),
      }),
    },
    responses: {
      200: {
        description: "Successfully retrieved assumption",
        content: {
          "application/json": {
            schema: AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request - missing required projectId parameter",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Assumption not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions"],
  });

  // V2 Delete Assumption Route
  registry.registerPath({
    method: "delete",
    path: "/api/v2/assumptions/{assumptionId}",
    description: "Delete an existing assumption by its ID (requires projectId and authentication)",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        assumptionId: z.string().uuid().openapi({
          description: "Unique identifier of the assumption to delete",
        }),
      }),
      query: z.object({
        projectId: z.string().uuid().describe("Project ID to verify ownership of the assumption"),
      }),
    },
    responses: {
      204: {
        description: "Successfully deleted assumption",
      },
      400: {
        description: "Bad request - missing required projectId parameter",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Assumption not found",
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
    tags: ["Assumptions"],
  });
}

export {
  AssumptionSchema,
  CreateAssumptionRequestSchema,
  UpdateAssumptionRequestSchema,
};
