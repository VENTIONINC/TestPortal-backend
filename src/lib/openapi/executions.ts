import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const ExecutionSchema = z
  .object({
    id: z.string().uuid(),
    runId: z.string(),
    env: z.string().optional(),
    version: z.string().optional(),
    provider: z.string(),
    startTime: z.string(),
    endTime: z.string().optional(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Execution");

export function registerExecutionRoutes(registry: OpenAPIRegistry) {
  registry.register("Execution", ExecutionSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/executions/{executionId}",
    description: "Retrieves an execution by its ID (v2)",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        executionId: z.string().uuid().openapi({
          description: "Unique identifier of the execution",
        }),
      }),
    },
    responses: {
      200: {
        description: "Execution details retrieved successfully",
        content: {
          "application/json": {
            schema: ExecutionSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - Authentication token is missing or invalid",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Execution not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Executions"],
  });
}

export { ExecutionSchema };
