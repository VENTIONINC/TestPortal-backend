import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as Schemas from "../schemas";

export function registerSpecPaths(registry: OpenAPIRegistry): void {
  // Spec routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/specs",
    description: "Retrieves all specs",
    responses: {
      200: {
        description: "List of specs",
        content: {
          "application/json": {
            schema: z.array(Schemas.SpecSchema),
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
    tags: ["Specs"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/specs/{specId}",
    description: "Retrieves a spec by its ID",
    request: {
      params: z.object({
        specId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Spec details",
        content: {
          "application/json": {
            schema: Schemas.SpecSchema,
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
        description: "Spec not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Specs"],
  });

}
