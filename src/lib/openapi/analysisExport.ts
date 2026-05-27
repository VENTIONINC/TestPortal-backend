// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

export function registerAnalysisExportRoutes(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: "get",
    path: "/api/v2/analysis-export",
    description:
      "Exports AI analysis and human feedback data as JSONL for a project and date range",
    security: [{ BearerAuth: [] }],
    request: {
      query: z.object({
        projectId: z.string().uuid(),
        dateFrom: z.string().describe("Start date/time (ISO)"),
        dateTo: z.string().describe("End date/time (ISO)"),
      }),
    },
    responses: {
      200: {
        description: "JSONL export file",
        content: {
          "application/jsonl": {
            schema: z.string(),
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
        description: "Unauthorized",
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
    tags: ["Exports"],
  });
}
