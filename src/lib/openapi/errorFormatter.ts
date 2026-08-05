// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { errorFormatterRequestSchema } from "@/schemas/errorFormatterSchemas";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const ErrorFormatterRequestSchema = errorFormatterRequestSchema
  .extend({
    contextCategory: errorFormatterRequestSchema.shape.contextCategory.openapi({
      description:
        "Optional canonical prompt context category. Values must be lowercase.",
    }),
    category: errorFormatterRequestSchema.shape.category.openapi({
      deprecated: true,
      description:
        "Deprecated legacy prompt context alias. Case-insensitive; use contextCategory instead.",
    }),
  })
  .openapi("ErrorFormatterRequest");

const ErrorFormatterResponseSchema = z
  .object({
    name: z.string(),
    description: z.string(),
  })
  .openapi("ErrorFormatterResponse");

const ErrorSuggestionRequestSchema = z
  .object({
    resultId: z.string().uuid(),
    projectId: z.string().uuid(),
  })
  .openapi("ErrorSuggestionRequest");

const ErrorSuggestionResponseSchema = z
  .object({
    description: z.string(),
  })
  .openapi("ErrorSuggestionResponse");

export function registerErrorFormatterRoutes(registry: OpenAPIRegistry) {
  registry.register("ErrorFormatterRequest", ErrorFormatterRequestSchema);
  registry.register("ErrorFormatterResponse", ErrorFormatterResponseSchema);
  registry.register("ErrorSuggestionRequest", ErrorSuggestionRequestSchema);
  registry.register("ErrorSuggestionResponse", ErrorSuggestionResponseSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v2/error-formatter",
    description:
      "Formats error information using AI to make it clear and actionable (requires authentication)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: ErrorFormatterRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Error formatted successfully",
        content: {
          "application/json": {
            schema: ErrorFormatterResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid input format",
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
      500: {
        description: "Internal server error - formatting failed",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Error Formatter"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/error-formatter/result",
    description:
      "Suggests an issue description and investigation steps based on a failed/flaky result (requires authentication)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: ErrorSuggestionRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Suggestion generated successfully",
        content: {
          "application/json": {
            schema: ErrorSuggestionResponseSchema,
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
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - suggestion failed",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Error Formatter"],
  });
}

export {
  ErrorFormatterRequestSchema,
  ErrorFormatterResponseSchema,
  ErrorSuggestionRequestSchema,
  ErrorSuggestionResponseSchema,
};
