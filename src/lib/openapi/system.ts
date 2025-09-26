import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const StatusResponseSchema = z
  .object({
    status: z.string(),
    database: z.string(),
    version: z.string(),
    timestamp: z.string().optional(),
  })
  .openapi("StatusResponse");

export function registerSystemRoutes(registry: OpenAPIRegistry) {
  registry.register("StatusResponse", StatusResponseSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v1/",
    description: "Welcome endpoint",
    responses: {
      200: {
        description: "Welcome message",
        content: {
          "text/plain": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["System"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/status",
    description: "Checks the status of the server and its connections",
    responses: {
      200: {
        description: "Server status",
        content: {
          "application/json": {
            schema: StatusResponseSchema,
          },
        },
      },
      503: {
        description: "Service unavailable",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["System"],
  });
}

export { StatusResponseSchema };
