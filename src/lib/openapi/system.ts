import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const StatusResponseSchema = z
  .object({
    status: z.string(),
    version: z.string(),
  })
  .openapi("StatusResponse");

const MetaResponseSchema = z
  .object({
    name: z.string(),
    component: z.literal("backend"),
    version: z.string(),
    buildHash: z.string(),
    buildTime: z.string(),
    env: z.string(),
    runtime: z.object({
      node: z.string(),
    }),
    deployment: z
      .object({
        imageTag: z.string(),
      })
      .optional(),
  })
  .openapi("MetaResponse");

export function registerSystemRoutes(registry: OpenAPIRegistry) {
  registry.register("StatusResponse", StatusResponseSchema);
  registry.register("MetaResponse", MetaResponseSchema);

  // V2 Status endpoint - public route
  registry.registerPath({
    method: "get",
    path: "/api/v2/status",
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

  registry.registerPath({
    method: "get",
    path: "/api/v2/meta",
    description: "Returns build and runtime metadata for the backend",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Build and runtime metadata",
        content: {
          "application/json": {
            schema: MetaResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized",
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

export { StatusResponseSchema, MetaResponseSchema };
