// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const CTRFTestStatusSchema = z
  .enum(["passed", "failed", "skipped", "pending", "other"])
  .openapi("CTRFTestStatus");

const CTRFToolSchema = z
  .object({
    name: z.string().describe("Test tool name (e.g., 'playwright', 'jest')"),
    version: z.string().optional().describe("Tool version"),
  })
  .openapi("CTRFTool");

const CTRFSummarySchema = z
  .object({
    tests: z.number().describe("Total number of tests"),
    passed: z.number().describe("Number of passed tests"),
    failed: z.number().describe("Number of failed tests"),
    pending: z.number().describe("Number of pending tests"),
    skipped: z.number().describe("Number of skipped tests"),
    other: z.number().describe("Number of tests with other status"),
    start: z.number().describe("Start timestamp (Unix epoch)"),
    stop: z.number().describe("End timestamp (Unix epoch)"),
  })
  .openapi("CTRFSummary");

const CTRFSourceSnippetSchema = z.object({
  path: z.string(),
  text: z.string(),
  startLine: z.number().int().positive(),
  failingLine: z.number().int().positive(),
});

const CTRFTestPortalErrorSchema = z.object({
  index: z.number().int().nonnegative(),
  message: z.string().optional(),
  stack: z.string().optional(),
  location: z.object({ file: z.string(), line: z.number().int(), column: z.number().int().optional() }).optional(),
  rawLogs: z.array(z.string()).optional(),
  sourceSnippet: CTRFSourceSnippetSchema.optional(),
  generatedTestCase: z.string().optional(),
});

const CTRFTestPortalExtraSchema = z.object({
  version: z.literal(1),
  errors: z.array(CTRFTestPortalErrorSchema),
});

const CTRFExtraSchema = z.object({
  testPortal: CTRFTestPortalExtraSchema,
}).passthrough();

const CTRFRetryAttemptSchema = z.object({
  attempt: z.number().int().positive(),
  status: CTRFTestStatusSchema,
  duration: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
  trace: z.string().optional(),
  line: z.number().int().optional(),
  snippet: z.string().optional(),
  stdout: z.array(z.string()).optional(),
  stderr: z.array(z.string()).optional(),
  start: z.number().int().optional(),
  stop: z.number().int().optional(),
  extra: CTRFExtraSchema.optional(),
});

const CTRFTestSchema = z
  .object({
    name: z.string().describe("Test name/title"),
    status: CTRFTestStatusSchema,
    duration: z.number().describe("Test duration in milliseconds"),
    start: z.number().optional().describe("Test start timestamp (Unix epoch)"),
    stop: z.number().optional().describe("Test end timestamp (Unix epoch)"),
    message: z.string().optional().describe("Error/failure message"),
    trace: z.string().optional().describe("Stack trace or detailed error info"),
    rawStatus: z.string().optional().describe("Original status from test framework"),
    type: z.string().optional().describe("Test type (e.g., 'unit', 'integration')"),
    filePath: z.string().optional().describe("Path to test file"),
    retries: z.number().int().nonnegative().optional().describe("Number of retries"),
    retryAttempts: z.array(CTRFRetryAttemptSchema).optional(),
    flaky: z.boolean().optional().describe("Whether test is flaky"),
    suite: z.array(z.string()).optional().describe("Test suite hierarchy"),
    tags: z.array(z.string()).optional().describe("Array of test tags"),
    snippet: z.string().optional(),
    line: z.number().int().optional(),
    stdout: z.array(z.string()).optional(),
    stderr: z.array(z.string()).optional(),
    extra: CTRFExtraSchema.optional(),
    meta: z.record(z.string(), z.any()).optional().describe("Custom test metadata"),
  })
  .openapi("CTRFTest");

const CTRFEnvironmentSchema = z
  .object({
    appName: z.string().optional().describe("Application name"),
    buildName: z.string().optional().describe("Build name"),
    buildNumber: z.string().optional().describe("Build number"),
    buildUrl: z.string().optional().describe("Build URL"),
    repositoryName: z.string().optional().describe("Repository name"),
    repositoryUrl: z.string().optional().describe("Repository URL"),
    branchName: z.string().optional().describe("Git branch name"),
    testEnvironment: z.string().optional().describe("Test environment (e.g., 'staging', 'prod')"),
    executionType: z
      .string()
      .optional()
      .describe("Execution type (e.g., nightly, release, ondemand)"),
    extra: z.record(z.string(), z.any()).optional().describe("Custom environment metadata"),
  })
  .openapi("CTRFEnvironment");

const CTRFResultsSchema = z
  .object({
    tool: CTRFToolSchema,
    summary: CTRFSummarySchema,
    tests: z.array(CTRFTestSchema),
    environment: CTRFEnvironmentSchema.optional(),
    extra: z.record(z.string(), z.any()).optional().describe("Custom metadata"),
  })
  .openapi("CTRFResults");

const CTRFReportRequestSchema = z
  .object({
    reportFormat: z.literal("CTRF"),
    specVersion: z.literal("0.0.0"),
    results: CTRFResultsSchema,
  })
  .openapi("CTRFReportRequest");

const CTRFReportResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    executionId: z
      .string()
      .uuid()
      .describe("Execution ID for the processed report"),
    data: z.object({
      specsProcessed: z.number().describe("Number of test specs processed"),
      executionId: z
        .string()
        .uuid()
        .describe("Database execution ID"),
    }),
  })
  .openapi("CTRFReportResponse");

const CTRFReportUpdateRequestSchema = z
  .object({
    results: CTRFResultsSchema.partial().extend({
      tests: z.array(CTRFTestSchema.partial()).optional(),
    }),
  })
  .openapi("CTRFReportUpdateRequest");

export function registerCtrfRoutes(registry: OpenAPIRegistry) {
  registry.register("CTRFTestStatus", CTRFTestStatusSchema);
  registry.register("CTRFTool", CTRFToolSchema);
  registry.register("CTRFSummary", CTRFSummarySchema);
  registry.register("CTRFTest", CTRFTestSchema);
  registry.register("CTRFEnvironment", CTRFEnvironmentSchema);
  registry.register("CTRFResults", CTRFResultsSchema);
  registry.register("CTRFReportRequest", CTRFReportRequestSchema);
  registry.register("CTRFReportResponse", CTRFReportResponseSchema);
  registry.register("CTRFReportUpdateRequest", CTRFReportUpdateRequestSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v2/upload-ctrf-report",
    summary: "Upload CTRF report file (JWT)",
    description: "Uploads and processes a CTRF (Common Test Result Format) report from a JSON file (requires JWT authentication)",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              report: z
                .any()
                .describe("CTRF report JSON file to upload")
                .openapi({
                  type: "string",
                  format: "binary",
                }),
              projectId: z.string().describe("Project ID to associate the report with"),
            }),
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "CTRF report file processed successfully",
        content: {
          "application/json": {
            schema: CTRFReportResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - Invalid file format, missing file, or missing projectId",
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
        description: "Internal server error - failed to process uploaded CTRF report",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["CTRF"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/upload-ctrf-report-api-key",
    summary: "Upload CTRF report file (API Key)",
    description: "Uploads and processes a CTRF (Common Test Result Format) report from a JSON file (requires API key authentication)",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              report: z
                .any()
                .describe("CTRF report JSON file to upload")
                .openapi({
                  type: "string",
                  format: "binary",
                }),
            }),
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    responses: {
      200: {
        description: "CTRF report file processed successfully",
        content: {
          "application/json": {
            schema: CTRFReportResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - Invalid file format, missing file, or missing projectId",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing API key",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - failed to process uploaded CTRF report",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["CTRF"],
  });
}

export {
  CTRFTestStatusSchema,
  CTRFToolSchema,
  CTRFSummarySchema,
  CTRFTestSchema,
  CTRFEnvironmentSchema,
  CTRFResultsSchema,
  CTRFReportRequestSchema,
  CTRFReportResponseSchema,
  CTRFReportUpdateRequestSchema,
};
