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
    path: "/api/v1/specs/{specId}",
    description: "Retrieves a specific spec by its ID",
    request: {
      params: z.object({
        specId: z.string().uuid(),
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
      404: {
        description: "Spec not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Specs"],
  });
}

export { SpecSchema };
