import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";

const PdfExportRequestSchema = z
  .object({
    project: z.string().min(1),
    environment: z.string().min(1),
    executionType: z.string().min(1),
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
    granularity: z.enum(["daily", "weekly", "monthly"]),
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
    error: z.enum([
      "DATA_FETCH_FAILED",
      "CHART_RENDER_FAILED",
      "PDF_BUILD_FAILED",
    ]),
  })
  .openapi("PdfExportServerErrorResponse");

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

  registry.registerPath({
    method: "post",
    path: "/api/v2/reports/pdf-export",
    description: "Exports dashboard KPIs, trends, and failure breakdown as PDF",
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: PdfExportRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "PDF export",
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
            schema: PdfExportServerErrorSchema,
          },
        },
      },
    },
    tags: ["Reports", "Exports"],
  });
}
