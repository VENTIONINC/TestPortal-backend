// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";

const PdfExportRequestSchema = z
  .object({
    project: z.string().min(1).openapi({
      description: "Project UUID or project name",
      example: "web-app-qa",
    }),
    environment: z.string().min(1).openapi({
      description: "Execution environment filter",
      example: "staging",
    }),
    executionType: z.string().min(1).openapi({
      description: "Execution type filter, use 'all' to include all types",
      example: "Nightly",
    }),
    periodStart: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/)
      .openapi({
        example: "2026-01-01",
        description:
          "Accepts YYYY-MM-DD or ISO datetime; backend normalizes to YYYY-MM-DD",
      }),
    periodEnd: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/)
      .openapi({
        example: "2026-01-31",
        description:
          "Accepts YYYY-MM-DD or ISO datetime; backend normalizes to YYYY-MM-DD",
      }),
    granularity: z.enum(["daily", "weekly", "monthly"]).openapi({
      description:
        "Time-bucket aggregation level: daily = by day, weekly = ISO week, monthly = year-month",
      example: "daily",
    }),
    includeAiInsights: z.boolean().optional().openapi({
      description:
        "When true, the export includes an AI-generated insights section in the PDF. Defaults to false when omitted.",
      example: true,
      default: false,
    }),
  })
  .openapi("PdfExportRequest");

const InvalidParamsResponseSchema = z
  .object({
    error: z.literal("INVALID_PARAMS"),
    details: z.array(z.any()),
  })
  .openapi("PdfExportInvalidParamsResponse");

const PeriodTooLargeResponseSchema = z
  .object({
    error: z.literal("PERIOD_TOO_LARGE"),
    message: z.literal("Export period cannot exceed 365 days"),
  })
  .openapi("PdfExportPeriodTooLargeResponse");

const PdfExportServerErrorSchema = z
  .object({
    error: z
      .enum(["DATA_FETCH_FAILED", "CHART_RENDER_FAILED", "PDF_BUILD_FAILED"])
      .openapi({
        description:
          "Internal export failure code: DATA_FETCH_FAILED | CHART_RENDER_FAILED | PDF_BUILD_FAILED",
        example: "PDF_BUILD_FAILED",
      }),
  })
  .openapi("PdfExportServerErrorResponse");

const PdfExportTimeoutResponseSchema = z
  .object({
    error: z.literal("EXPORT_TIMEOUT").openapi({
      description: "PDF export exceeded server timeout window",
      example: "EXPORT_TIMEOUT",
    }),
  })
  .openapi("PdfExportTimeoutResponse");

const PdfExportNotFoundResponseSchema = z
  .object({
    error: z.literal("NOT_FOUND"),
  })
  .openapi("PdfExportNotFoundResponse");

export function registerPdfExportRoutes(registry: OpenAPIRegistry) {
  registry.register("PdfExportRequest", PdfExportRequestSchema);
  registry.register(
    "PdfExportInvalidParamsResponse",
    InvalidParamsResponseSchema,
  );
  registry.register(
    "PdfExportPeriodTooLargeResponse",
    PeriodTooLargeResponseSchema,
  );
  registry.register(
    "PdfExportNotFoundResponse",
    PdfExportNotFoundResponseSchema,
  );
  registry.register("PdfExportServerErrorResponse", PdfExportServerErrorSchema);
  registry.register("PdfExportTimeoutResponse", PdfExportTimeoutResponseSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v2/reports/pdf-export",
    description:
      "Exports dashboard KPIs, trends, and failure breakdown as PDF. Optionally includes an AI-generated insights section when includeAiInsights is true.",
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: PdfExportRequestSchema,
            example: {
              project: "web-app-qa",
              environment: "staging",
              executionType: "Nightly",
              periodStart: "2026-01-01",
              periodEnd: "2026-01-31",
              granularity: "daily",
              includeAiInsights: true,
            },
          },
        },
      },
    },
    responses: {
      200: {
        description:
          "PDF export stream. When includeAiInsights is true, the PDF may include an AI Insights section embedded in the document.",
        content: {
          "application/pdf": {
            schema: z.string().openapi({
              type: "string",
              format: "binary",
            }),
          },
        },
      },
      400: {
        description: "Invalid request parameters",
        content: {
          "application/json": {
            schema: z.union([
              InvalidParamsResponseSchema,
              PeriodTooLargeResponseSchema,
            ]),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": {
            schema: PdfExportNotFoundResponseSchema,
          },
        },
      },
      500: {
        description: "Server error",
        content: {
          "application/json": {
            schema: PdfExportServerErrorSchema,
          },
        },
      },
      503: {
        description: "Export timeout",
        content: {
          "application/json": {
            schema: PdfExportTimeoutResponseSchema,
          },
        },
      },
    },
    tags: ["Reports", "Exports"],
  });
}
