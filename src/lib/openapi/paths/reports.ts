import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import * as Schemas from "../schemas";

export function registerReportPaths(registry: OpenAPIRegistry): void {
  // JSON report routes
  registry.registerPath({
    method: "post",
    path: "/api/v1/json-report",
    description: "Processes a JSON report",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.JsonReportRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Report processed successfully",
        content: {
          "application/json": {
            schema: Schemas.JsonReportResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Reports"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/json-report/raw",
    description: "Processes a raw JSON report",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.RawJsonReportRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Raw report processed successfully",
        content: {
          "application/json": {
            schema: Schemas.JsonReportResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Reports"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/results-stats",
    description: "Retrieves aggregated results statistics",
    responses: {
      200: {
        description: "Results statistics",
        content: {
          "application/json": {
            schema: Schemas.ResultsStatsSchema,
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
    tags: ["Reports"],
  });
}
