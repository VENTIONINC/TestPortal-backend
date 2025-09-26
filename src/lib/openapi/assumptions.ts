import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const AssumptionSchema = z
  .object({
    id: z.string(),
    issueId: z.number(),
    resultErrorId: z.number(),
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
    issueId: z.number(),
    resultErrorId: z.number(),
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

  registry.registerPath({
    method: "post",
    path: "/api/v1/assumptions",
    description: "Creates a new assumption",
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
        description: "Assumption created successfully",
        content: {
          "application/json": {
            schema: AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions", "Results"],
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
            schema: UpdateAssumptionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Assumption updated successfully",
        content: {
          "application/json": {
            schema: AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request",
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
    tags: ["Assumptions", "Results"],
  });
}

export {
  AssumptionSchema,
  CreateAssumptionRequestSchema,
  UpdateAssumptionRequestSchema,
};
