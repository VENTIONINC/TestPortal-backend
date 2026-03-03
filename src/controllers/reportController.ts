import type { Request, Response } from "express";
import getLogger from "@/lib/logger";
import { reportService, ReportGenerationError } from "@/services/reportService";
import type { PdfExportFilters } from "@/types/dashboard";

const logger = getLogger("report-controller");

function safeToken(value: string | null | undefined): string {
  return (value ?? "").replace(/[^a-zA-Z0-9-_]/g, "");
}

function buildFilename(params: PdfExportFilters): string {
  const project = safeToken(params.project as unknown as string);
  const environment = safeToken(params.environment as unknown as string);
  const executionType = safeToken(params.executionType as unknown as string);

  return `${project}-${environment}-${executionType}-${params.periodStart}_${params.periodEnd}.pdf`;
}

export const reportController = {
  async exportPdf(req: Request, res: Response): Promise<void> {
    const params = res.locals.exportParams as PdfExportFilters | undefined;

    if (!params) {
      res.status(400).json({ error: "INVALID_PARAMS" });
      return;
    }

    let timedOut = false;
    req.setTimeout(10_000, () => {
      timedOut = true;
      logger.error("PDF export timed out");

      if (!res.headersSent) {
        res.status(503).json({ error: "EXPORT_TIMEOUT" });
      }
    });

    try {
      const pdf = await reportService.generatePdf(params);

      if (timedOut) {
        return;
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${buildFilename(params)}"`,
      );

      pdf.pipe(res);
      pdf.end();
    } catch (error) {
      logger.error("Failed to export PDF report", error);

      if (timedOut || res.headersSent) {
        return;
      }

      if (error instanceof ReportGenerationError) {
        if (error.code === "NOT_FOUND") {
          res.status(404).json({ error: "NOT_FOUND" });
          return;
        }
        if (error.code === "DATA_FETCH_FAILED") {
          res.status(500).json({ error: "DATA_FETCH_FAILED" });
          return;
        }
        if (error.code === "CHART_RENDER_FAILED") {
          res.status(500).json({ error: "CHART_RENDER_FAILED" });
          return;
        }
        if (error.code === "PDF_BUILD_FAILED") {
          res.status(500).json({ error: "PDF_BUILD_FAILED" });
          return;
        }
      }

      res.status(500).json({ error: "PDF_BUILD_FAILED" });
    }
  },
};
