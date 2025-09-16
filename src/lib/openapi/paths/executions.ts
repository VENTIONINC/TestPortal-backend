import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as Schemas from "../schemas";

export function registerExecutionPaths(registry: OpenAPIRegistry): void {
  // Execution routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/executions",
    description: "Retrieves all executions",
    responses: {
      200: {
        description: "List of executions",
        content: {
          "application/json": {
            schema: z.array(Schemas.ExecutionSchema),
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
    tags: ["Executions"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/executions/{executionId}",
    description: "Retrieves an execution by its ID",
    request: {
      params: z.object({
        executionId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Execution details",
        content: {
          "application/json": {
            schema: Schemas.ExecutionSchema,
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
        description: "Execution not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Executions"],
  });

}
