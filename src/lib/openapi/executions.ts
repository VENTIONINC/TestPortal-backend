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
    path: "/api/v1/executions/{executionId}",
    description: "Retrieves an execution by its ID",
    request: {
      params: z.object({
        executionId: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Execution details",
        content: {
          "application/json": {
            schema: ExecutionSchema,
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
