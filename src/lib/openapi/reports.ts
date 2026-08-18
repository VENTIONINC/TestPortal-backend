// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const JsonReportTestResultSchema = z
  .object({
    reportPortalLink: z.string().optional(),
    retry: z.number().optional(),
    status: z.string(),
    duration: z.number().optional(),
    startTime: z.string(),
    error: z
      .object({
        message: z.string(),
        stack: z.string().optional(),
        assertion: z.string().optional(),
      })
      .optional(),
  })
  .openapi("JsonReportTestResult");

const JsonReportTestSpecSchema = z
  .object({
    title: z.string(),
    custom_id: z.string().optional(),
    location: z
      .object({
        file: z.string().optional(),
      })
      .optional(),
    tags: z.array(z.string()).optional(),
    annotations: z.array(z.string()).optional(),
    results: z.array(JsonReportTestResultSchema),
  })
  .openapi("JsonReportTestSpec");

const JsonReportRequestSchema = z
  .object({
    runId: z.string().optional(),
    env: z.string().optional(),
    version: z.string().optional(),
    identifierStrategy: z.enum(["time-period", "hourly", "daily"]).optional(),
    stats: z
      .object({
        startTime: z.string(),
      })
      .optional(),
    tests: z.array(JsonReportTestSpecSchema),
  })
  .openapi("JsonReportRequest");

const JsonReportResponseSchema = z
  .object({
    success: z.boolean(),
    executionId: z.string().uuid(),
    specsProcessed: z.number(),
  })
  .openapi("JsonReportResponse");

const JsonReportResponseWithAnalysisSchema = z
  .object({
    success: z.boolean(),
    executionId: z.string().uuid(),
    specsProcessed: z.number(),
    analysis: z.array(z.any()).optional().openapi({
      description: "Optional AI analysis results for test failures",
    }),
  })
  .openapi("JsonReportResponseWithAnalysis");

const RawJsonReportRequestSchema = z
  .object({
    runId: z.string().optional(),
    hash: z.string().optional(),
    config: z
      .object({
        env: z.string().optional(),
        version: z.string().optional(),
      })
      .optional(),
    stats: z
      .object({
        startTime: z.string().optional(),
      })
      .optional(),
    suites: z.array(z.any()).optional(),
  })
  .openapi("RawJsonReportRequest");

export function registerReportRoutes(registry: OpenAPIRegistry) {
  registry.register("JsonReportTestResult", JsonReportTestResultSchema);
  registry.register("JsonReportTestSpec", JsonReportTestSpecSchema);
  registry.register("JsonReportRequest", JsonReportRequestSchema);
  registry.register("JsonReportResponse", JsonReportResponseSchema);
  registry.register("JsonReportResponseWithAnalysis", JsonReportResponseWithAnalysisSchema);
  registry.register("RawJsonReportRequest", RawJsonReportRequestSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v2/upload-json-report",
    description:
      "Accepts JSON test report files for processing. Supports large files that exceed POST body size limits.",
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              projectId: z
                .string()
                .uuid()
                .openapi({
                  description: "Project ID to associate the report with",
                }),
              report: z.string().openapi({
                type: "string",
                format: "binary",
                description: "JSON test report file to upload",
              }),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        description: "File report processed successfully",
        content: {
          "application/json": {
            schema: JsonReportResponseSchema,
          },
        },
      },
      400: {
        description:
          "Invalid file, future execution timestamp validation failure, or processing error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing JWT token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Reports", "Results"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/upload-json-report-api-key",
    description:
      "Accepts JSON test report files for processing with API key authentication. The project ID is automatically extracted from the validated API key. Supports large files and includes optional AI analysis of test failures.",
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              report: z.string().openapi({
                type: "string",
                format: "binary",
                description: "JSON test report file to upload (CTRF format)",
              }),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        description: "File report processed successfully with optional AI analysis",
        content: {
          "application/json": {
            schema: JsonReportResponseWithAnalysisSchema,
          },
        },
      },
      400: {
        description:
          "Invalid file, future execution timestamp validation failure, or processing error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Invalid or missing API key",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Reports", "Results", "Upload"],
  });
}

export {
  JsonReportRequestSchema,
  JsonReportResponseSchema,
  JsonReportResponseWithAnalysisSchema,
  JsonReportTestSpecSchema,
  JsonReportTestResultSchema,
  RawJsonReportRequestSchema,
};
