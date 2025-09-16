import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as Schemas from "../schemas";

export function registerPromptPaths(registry: OpenAPIRegistry): void {
  // Prompt routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/prompts",
    description: "List available prompts",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of prompts",
        content: {
          "application/json": {
            schema: Schemas.PromptsListResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Prompts"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/prompts/{name}",
    description: "Generate a prompt",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        name: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: Schemas.GeneratePromptRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Generated prompt",
        content: {
          "application/json": {
            schema: Schemas.GeneratePromptResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - prompt name is required",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Prompt not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
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
    tags: ["Prompts"],
  });

}
