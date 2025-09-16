import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as Schemas from "../schemas";

export function registerResultPaths(registry: OpenAPIRegistry): void {
  // Results routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/results",
    description: "Retrieves all results",
    responses: {
      200: {
        description: "List of results",
        content: {
          "application/json": {
            schema: z.array(Schemas.ResultSchema),
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
    tags: ["Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/results/{resultId}",
    description: "Retrieves a result by its ID",
    request: {
      params: z.object({
        resultId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Result details",
        content: {
          "application/json": {
            schema: Schemas.ResultSchema,
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
        description: "Result not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/results/{resultId}",
    description: "Updates result analysis",
    request: {
      params: z.object({
        resultId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: Schemas.UpdateResultAnalysisRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Result analysis updated",
        content: {
          "application/json": {
            schema: Schemas.ResultSchema,
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
        description: "Result not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results", "Test Analysis"],
  });

}
