// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const PromptParameterSchema = z
  .object({
    type: z.string(),
    required: z.boolean(),
    description: z.string(),
    example: z.string().optional(),
    enum: z.array(z.string()).optional(),
  })
  .openapi("PromptParameter");

const PromptConfigSchema = z
  .object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.enum(["development", "reporting", "analysis", "performance", "documentation"]),
    parameters: z.record(z.string(), PromptParameterSchema),
  })
  .openapi("PromptConfig");

const PromptsListResponseSchema = z
  .object({
    prompts: z.array(PromptConfigSchema),
  })
  .openapi("PromptsListResponse");

const GeneratePromptRequestSchema = z
  .object({
    project_id: z.string().uuid().optional(),
    task: z.string().min(1).optional(),
    execution_mode: z.enum(["human_guided", "client_executed"]).optional(),
  }).catchall(z.any())
  .openapi("GeneratePromptRequest");

const PromptValidationErrorSchema = z.object({
  error: z.string(),
  fields: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
}).openapi("PromptValidationError");

const GeneratePromptResponseSchema = z
  .object({
    name: z.string(),
    parameters: z.record(z.string(), z.any()),
    generated_prompt: z.string(),
  })
  .openapi("GeneratePromptResponse");

export function registerPromptRoutes(registry: OpenAPIRegistry) {
  registry.register("PromptParameter", PromptParameterSchema);
  registry.register("PromptConfig", PromptConfigSchema);
  registry.register("PromptsListResponse", PromptsListResponseSchema);
  registry.register("GeneratePromptRequest", GeneratePromptRequestSchema);
  registry.register("GeneratePromptResponse", GeneratePromptResponseSchema);
  registry.register("PromptValidationError", PromptValidationErrorSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/prompts",
    description:
      "Retrieves a list of all prompt configurations with their metadata and parameters (requires authentication)",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of available prompts",
        content: {
          "application/json": {
            schema: PromptsListResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Prompts"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/prompts/{name}",
    description:
      "Retrieves the configuration for a specific prompt by name (requires authentication)",
    request: {
      params: z.object({
        name: z.enum([
          "developer-code-assistant",
          "test-portal-assistant",
          "issue-analysis-assistant",
          "environment-performance-assistant",
          "software-documentation-assistant",
          "tms-workflow-assistant",
        ]),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Prompt configuration",
        content: {
          "application/json": {
            schema: PromptConfigSchema,
          },
        },
      },
      400: {
        description: "Bad request - prompt name is required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Prompt not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Prompts"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/prompts/{name}/generate",
    description:
      "Generates a prompt using the specified template and provided parameters (requires authentication)",
    request: {
      params: z.object({
        name: z.enum([
          "developer-code-assistant",
          "test-portal-assistant",
          "issue-analysis-assistant",
          "environment-performance-assistant",
          "software-documentation-assistant",
          "tms-workflow-assistant",
        ]),
      }),
      body: {
        content: {
          "application/json": {
            schema: GeneratePromptRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Generated prompt",
        content: {
          "application/json": {
            schema: GeneratePromptResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid prompt parameters or missing name",
        content: {
          "application/json": {
            schema: PromptValidationErrorSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Prompt not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Prompts"],
  });
}

export {
  PromptParameterSchema,
  PromptConfigSchema,
  PromptsListResponseSchema,
  GeneratePromptRequestSchema,
  GeneratePromptResponseSchema,
};
