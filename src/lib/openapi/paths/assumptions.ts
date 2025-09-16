import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as Schemas from "../schemas";

export function registerAssumptionPaths(registry: OpenAPIRegistry): void {
  // Assumption routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/assumptions",
    description: "Retrieves all assumptions",
    responses: {
      200: {
        description: "List of assumptions",
        content: {
          "application/json": {
            schema: z.array(Schemas.AssumptionSchema),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assumptions",
    description: "Creates a new assumption",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.CreateAssumptionRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Assumption created successfully",
        content: {
          "application/json": {
            schema: Schemas.AssumptionSchema,
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
    tags: ["Assumptions"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assumptions/{assumptionId}",
    description: "Retrieves an assumption by its ID",
    request: {
      params: z.object({
        assumptionId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Assumption details",
        content: {
          "application/json": {
            schema: Schemas.AssumptionSchema,
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
      404: {
        description: "Assumption not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/assumptions/{assumptionId}",
    description: "Updates an existing assumption",
    request: {
      params: z.object({
        assumptionId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: Schemas.UpdateAssumptionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Assumption updated successfully",
        content: {
          "application/json": {
            schema: Schemas.AssumptionSchema,
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
      404: {
        description: "Assumption not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/assumptions/{assumptionId}",
    description: "Deletes an assumption by its ID",
    request: {
      params: z.object({
        assumptionId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Assumption deleted successfully",
        content: {
          "application/json": {
            schema: Schemas.SuccessResponseSchema,
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
      404: {
        description: "Assumption not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions"],
  });

}
